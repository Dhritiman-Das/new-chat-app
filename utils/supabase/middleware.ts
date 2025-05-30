import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/src/env";

export const updateSession = async (request: NextRequest) => {
  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get the pathname from the URL
    const pathname = request.nextUrl.pathname;

    // Protected routes - any route under (protected)
    if (
      pathname.includes("/(protected)") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/protected")
    ) {
      if (!user) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }
    }

    // Auth pages - redirect to dashboard if already authenticated
    if (
      (pathname === "/sign-in" ||
        pathname === "/sign-up" ||
        pathname === "/") &&
      user
    ) {
      return NextResponse.redirect(new URL("/dashboard/bots", request.url));
    }

    return response;
  } catch (e) {
    console.error(e);
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
