import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Server-side environment variables schema
   */
  server: {
    // Database
    DATABASE_URL: z.string().url(),
    SUPABASE_DATABASE_URL: z.string().url(),
    SUPABASE_SERVICE_KEY: z.string().min(1),

    // Credentials encryption
    CREDENTIALS_ENCRYPTION_KEY: z.string().min(32),

    // Vector DB
    VECTOR_DB_PROVIDER: z.string().default("pinecone"),
    PINECONE_API_KEY: z.string().min(1),
    PINECONE_INDEX: z.string().default("default-index"),

    // OpenAI
    OPENAI_API_KEY: z.string().min(1),
    FIRECRAWL_API_KEY: z.string().min(1),

    // Redis
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

    // Payment
    PAYMENT_PROVIDER: z.string().default("dodo"),
    DODO_PAYMENTS_API_KEY: z.string().min(1),
    DODO_WEBHOOK_KEY: z.string().min(1),

    // Product IDs
    PRODUCT_ID_HOBBY_MONTHLY: z.string().min(1),
    PRODUCT_ID_HOBBY_YEARLY: z.string().min(1),
    PRODUCT_ID_STANDARD_MONTHLY: z.string().min(1),
    PRODUCT_ID_STANDARD_YEARLY: z.string().min(1),
    PRODUCT_ID_PRO_MONTHLY: z.string().min(1),
    PRODUCT_ID_PRO_YEARLY: z.string().min(1),
    PRODUCT_ID_CREDIT_PACK: z.string().min(1),

    // OAuth Secrets
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GOHIGHLEVEL_CLIENT_SECRET: z.string().min(1),
    SLACK_CLIENT_SECRET: z.string().min(1),
    SLACK_SIGNING_SECRET: z.string().min(1),
    SLACK_STATE_SECRET: z.string().min(1),

    // Node environment
    NODE_ENV: z.enum(["development", "production"]).default("development"),
  },

  /**
   * Client-side environment variables schema
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

    // OAuth Client IDs
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1),
    NEXT_PUBLIC_GOHIGHLEVEL_CLIENT_ID: z.string().min(1),
    NEXT_PUBLIC_SLACK_CLIENT_ID: z.string().min(1),
    NEXT_PUBLIC_SLACK_APP_ID: z.string().min(1),

    // OAuth Redirect URLs
    NEXT_PUBLIC_GOHIGHLEVEL_OAUTH_REDIRECT_URL: z.string().url(),
    NEXT_PUBLIC_SLACK_OAUTH_REDIRECT_URL: z.string().url(),
  },

  /**
   * For Next.js >= 13.4.4, you only need to destructure client variables
   */
  experimental__runtimeEnv: {
    // Client vars only
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_GOHIGHLEVEL_CLIENT_ID:
      process.env.NEXT_PUBLIC_GOHIGHLEVEL_CLIENT_ID,
    NEXT_PUBLIC_SLACK_CLIENT_ID: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID,
    NEXT_PUBLIC_SLACK_APP_ID: process.env.NEXT_PUBLIC_SLACK_APP_ID,
    NEXT_PUBLIC_GOHIGHLEVEL_OAUTH_REDIRECT_URL:
      process.env.NEXT_PUBLIC_GOHIGHLEVEL_OAUTH_REDIRECT_URL,
    NEXT_PUBLIC_SLACK_OAUTH_REDIRECT_URL:
      process.env.NEXT_PUBLIC_SLACK_OAUTH_REDIRECT_URL,
  },

  /**
   * Skip validation of environment variables in development
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
