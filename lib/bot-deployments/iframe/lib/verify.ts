// Verify that the request is coming from the iframe
import { env } from "@/src/env";

export const verify = (req: Request) => {
  const origin = req.headers.get("origin");
  if (!origin) {
    return false;
  }

  const allowedOrigins = ["http://localhost:3000", env.NEXT_PUBLIC_URL];
  return allowedOrigins.includes(origin);
};
