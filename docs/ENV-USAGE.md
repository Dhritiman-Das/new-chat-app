# Typesafe Environment Variables

This project uses `@t3-oss/env-nextjs` and `zod` to provide typesafe environment variables.

## How It Works

1. Environment variables are defined and validated in `src/env.ts`
2. The validation happens at build time and during runtime
3. You get full TypeScript autocompletion and validation

## Usage

### Client-Side Usage

```tsx
"use client";

import { env } from "@/src/env";

export function MyComponent() {
  return (
    <div>
      {/* You can only access NEXT_PUBLIC_ variables on the client */}
      <p>App URL: {env.NEXT_PUBLIC_APP_URL}</p>
    </div>
  );
}
```

### Server-Side Usage

```tsx
// Server Component or API Route
import { env } from "@/src/env";

export async function MyServerComponent() {
  // You can access both server and client variables on the server
  const dbUrl = env.DATABASE_URL;
  const apiKey = env.OPENAI_API_KEY;

  // Do something with these variables...

  return <div>Server Component</div>;
}
```

## Adding New Environment Variables

1. Add your variable to the `.env` file
2. Define its schema in `src/env.ts`:

```ts
// For server-side variables:
server: {
  MY_NEW_SERVER_VAR: z.string().min(1),
},

// For client-side variables:
client: {
  NEXT_PUBLIC_MY_NEW_CLIENT_VAR: z.string().url(),
},

// If using Next.js >= 13.4.4, add client vars to experimental__runtimeEnv:
experimental__runtimeEnv: {
  NEXT_PUBLIC_MY_NEW_CLIENT_VAR: env.NEXT_PUBLIC_MY_NEW_CLIENT_VAR,
},
```

## Environment Variable Rules

1. Server-side variables:
   - Can only be used in server components, API routes, or server actions
   - Must NOT be prefixed with `NEXT_PUBLIC_`
2. Client-side variables:
   - Can be used anywhere (client and server)
   - MUST be prefixed with `NEXT_PUBLIC_`
   - Will be included in the client bundle, so don't put sensitive data here

## Benefits

- Type safety: TypeScript will error if you try to access a non-existent env var
- Validation: Zod validates the format and presence of your variables
- Better DX: Autocomplete shows available env vars based on context
