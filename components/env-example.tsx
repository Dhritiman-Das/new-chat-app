"use client";

import { env } from "@/src/env";

export function EnvExample() {
  return (
    <div className="p-4 border rounded-md">
      <h2 className="text-xl font-semibold mb-2">
        Environment Variable Example
      </h2>
      <p className="mb-2">
        This component demonstrates how to use type-safe environment variables.
      </p>
      <p className="text-sm font-mono bg-muted p-2 rounded">
        App URL: {env.NEXT_PUBLIC_APP_URL}
      </p>
    </div>
  );
}
