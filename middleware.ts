import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";
import { canAccessModule, homeRouteFor, moduleForPath } from "@/lib/auth/permissions";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  // Every module route is protected; access is decided per module by canAccessModule.
  const module = moduleForPath(pathname);
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

  // Redirects must keep refreshed auth cookies, otherwise the session is lost.
  const redirect = (path: string) => {
    const target = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
    return target;
  };

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Restricted routes must fail closed if identity cannot be verified.
    if (module && (authError || !user)) {
      return redirect("/login?error=Fa%C3%A7a%20login%20para%20continuar");
    }

    if (user && (module || pathname === "/" || pathname === "/login")) {
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id,email,role,active")
        .eq("id", user.id)
        .maybeSingle();

      // Do not grant access when the profile lookup fails or the user is inactive.
      if (profileError || !profile?.active) {
        if (module) return redirect("/login?error=Acesso%20n%C3%A3o%20autorizado");
        return response;
      }

      // Logged-in users opening "/" or "/login" go straight to their home module.
      if (!module) return redirect(homeRouteFor(profile));

      if (!canAccessModule(profile, module)) {
        return redirect(`${homeRouteFor(profile)}?error=Sem%20permiss%C3%A3o%20para%20acessar%20este%20m%C3%B3dulo`);
      }
    }
  } catch {
    // Fail closed for restricted routes if Supabase cannot verify the user/profile.
    if (module) {
      return redirect("/login?error=Falha%20ao%20validar%20acesso");
    }
  }

  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
