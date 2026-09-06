import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

const adminOnly = ["/dashboard", "/financeiro", "/audiovisual", "/equipe", "/auditoria"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("users").select("id,email,role,active").eq("id", user.id).maybeSingle();
      const isAdmin = Boolean(profile?.active && (profile.role === "ceo" || profile.role === "cofundador" || profile.email?.toLowerCase() === "korvixdigital@gmail.com"));
      const pathname = request.nextUrl.pathname;
      const restricted = adminOnly.some((route) => pathname === route || pathname.startsWith(`${route}/`));
      if (restricted && !isAdmin) return NextResponse.redirect(new URL("/crm?error=Sem%20permissao", request.url));
    }
  } catch {
    // Keep authentication resilient if the auth/profile service is temporarily unavailable.
  }

  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
