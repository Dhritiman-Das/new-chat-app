// Verify that the request is coming from the iframe
export const verify = (req: Request) => {
  const origin = req.headers.get("origin");
  if (!origin) {
    return false;
  }

  const allowedOrigins = ["http://localhost:3000", process.env.NEXT_PUBLIC_URL];
  return allowedOrigins.includes(origin);
};
