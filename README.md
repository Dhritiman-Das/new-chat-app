This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

````bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```rou

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase

In your `.env` please use the DB Direct Connection URI instead of the Pooled connection.

## Environment Variables

The application requires the following environment variables:

```
# Database connection
DATABASE_URL=your_supabase_direct_connection_uri

# Authentication (for Next Auth)
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (for tool integrations)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Credentials Security
# Must be at least 32 characters long for AES-256 encryption
CREDENTIALS_ENCRYPTION_KEY=your_secure_random_32_character_key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

To generate a secure random key for credentials encryption, you can use:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
````
