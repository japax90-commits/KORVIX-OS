import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";
import { isKorvixAdmin } from "@/lib/auth/permissions";

const adminOnly = ["/dashboard", "/financeiro", "/audiovisual", "/equipe", "/auditoria"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const restricted = adminOnly.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Restricted routes must fail closed if identity cannot be verified.
    if (restricted && (authError || !user)) {
      const loginUrl = new URL("/login?error=Acesso%20restrito", request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (user && restricted) {
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id,email,role,active")
        .eq("id", user.id)
        .maybeSingle();

      // Do not grant access when the profile lookup fails or the user is inactive.
      if (profileError || !profile?.active) {
        return NextResponse.redirect(new URL("/login?error=Acesso%20não%20autorizado", request.url));
      }

      if (!isKorvixAdmin(profile)) {
        return NextResponse.redirect(new URL("/crm?error=Sem%20permissao", request.url));
      }
    }
  } catch {
    // Fail closed for restricted routes if Supabase cannot verify the user/profile.
    if (restricted) {
      return NextResponse.redirect(new URL("/login?error=Falha%20ao%20validar%20acesso", request.url));
    }
  }

  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
