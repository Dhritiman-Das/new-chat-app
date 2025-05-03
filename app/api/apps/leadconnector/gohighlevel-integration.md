# GoHighLevel Integration Setup

## Using LeadConnector OAuth Redirect

GoHighLevel doesn't allow redirect URLs that contain "gohighlevel" or "highlevel" references. To work around this limitation, we've created a middleware route using "leadconnector" (an alternative name for GoHighLevel) that handles the OAuth callback.

## Configuration Steps

1. Update your environment variables in `.env`:

```
# Original setup (contains the restricted word)
# NEXT_PUBLIC_GOHIGHLEVEL_OAUTH_REDIRECT_URL=https://your-app.com/api/apps/gohighlevel/oauth_callback

# New setup (uses leadconnector route)
NEXT_PUBLIC_GOHIGHLEVEL_OAUTH_REDIRECT_URL=https://your-app.com/api/apps/leadconnector/oauth
```

2. When registering your app in the GoHighLevel Marketplace, use this new URL as your OAuth redirect URL.

## How It Works

The middleware route at `/api/apps/leadconnector/oauth` preserves all query parameters and forwards them to the actual handler at `/api/apps/gohighlevel/oauth_callback`, which processes the OAuth callback as before.

This approach allows you to maintain the existing code while complying with GoHighLevel's naming restrictions.
