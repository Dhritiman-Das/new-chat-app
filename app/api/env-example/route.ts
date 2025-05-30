import { NextResponse } from "next/server";
import { env } from "@/src/env";

export async function GET() {
  // Example of using server-side environment variables
  // Note: Never expose sensitive server-side env vars to the client
  return NextResponse.json({
    message: "Server environment variables loaded successfully",
    // Sending public information only
    appUrl: env.NEXT_PUBLIC_APP_URL,
    // Database URL would be available here, but we don't expose it
    // dbUrl: env.DATABASE_URL, <- available but not exposed
  });
}
