import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "@/utils/supabase/server";
import { env } from "@/src/env";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/";
  }

  // Check for redirect_to parameter (used in Google auth flow)
  const redirectTo = searchParams.get("redirect_to");
  if (redirectTo && redirectTo.startsWith("/")) {
    next = redirectTo;
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      //   const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";

      // Always use the APP_URL in production for consistent behavior
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else {
        const baseUrl = env.NEXT_PUBLIC_APP_URL;
        return NextResponse.redirect(`${baseUrl}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(
    `${env.NEXT_PUBLIC_APP_URL}/auth/auth-code-error`
  );
}
