Here's a walkthrough of the Slack developer setup process to make your integration work:

## 1. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From scratch"
4. Enter your app name (e.g., "Chat Assistant") and select a development workspace
5. Click "Create App"

## 2. Configure Basic Information

After creating your app, you'll be taken to the app's Basic Information page:

1. Under "App Credentials", note the following values to add to your environment variables:

   - Client ID → `NEXT_PUBLIC_SLACK_CLIENT_ID`
   - Client Secret → `SLACK_CLIENT_SECRET`
   - Signing Secret → `SLACK_SIGNING_SECRET`
   - App ID → `NEXT_PUBLIC_SLACK_APP_ID`

2. Generate a random string for `SLACK_STATE_SECRET` to use for OAuth state verification

## 3. Configure OAuth & Permissions

1. Navigate to "OAuth & Permissions" in the sidebar
2. Under "Redirect URLs", add your OAuth callback URL:

   - For local development: `http://localhost:3000/api/apps/slack/oauth_callback`
   - For production: `https://yourdomain.com/api/apps/slack/oauth_callback`

3. Set this URL as `NEXT_PUBLIC_SLACK_OAUTH_REDIRECT_URL` in your environment variables

4. Under "Bot Token Scopes", add the following scopes:
   - `chat:write` - to send messages
   - `channels:read` - to read channel information
   - `incoming-webhook` - to create an incoming webhook
   - `users:read` - to read user information

## 4. Configure Interactivity & Shortcuts

1. Navigate to "Interactivity & Shortcuts" in the sidebar
2. Toggle "Interactivity" to On
3. Add your interactive URL:
   - For local development: `http://localhost:3000/api/apps/slack/interactive`
   - For production: `https://yourdomain.com/api/apps/slack/interactive`
4. Save Changes

## 5. Configure Event Subscriptions

1. Navigate to "Event Subscriptions" in the sidebar
2. Toggle "Enable Events" to On
3. Add your events URL:

   - For local development: `http://localhost:3000/api/apps/slack/events`
   - For production: `https://yourdomain.com/api/apps/slack/events`

4. Under "Subscribe to bot events", add the following event:

   - `app_mention` - Subscribe to only the message events that mention your app or bot

5. Save Changes

## 6. Install to Workspace for Testing

1. Navigate to "Install App" in the sidebar
2. Click "Install to Workspace"
3. Review permissions and click "Allow"

## 7. Testing via Your Application

1. Update your `.env` file with all required variables:

```
NEXT_PUBLIC_SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_SLACK_OAUTH_REDIRECT_URL=your_redirect_url
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_STATE_SECRET=your_random_state_secret
NEXT_PUBLIC_SLACK_APP_ID=your_app_id
```

2. Run your application
3. Navigate to the page with the Slack integration button
4. Click the integration button to start the OAuth flow
5. After authorization, your app will be installed to your Slack workspace

## 8. Exposing Local Development to Internet (for testing)

For Slack to send events to your local development environment, you need to expose your local server to the internet using a tool like ngrok:

1. Install ngrok: `npm install -g ngrok` or download from [ngrok.com](https://ngrok.com/)
2. Run ngrok: `ngrok http 3000`
3. Use the HTTPS URL provided by ngrok for your redirect URLs, interactive URL, and events URL in the Slack app configuration

## 9. Verifying the Integration

After setting up:

1. Your Slack app should be installed in your workspace
2. Your app should post a welcome message in the selected channel
3. You should be able to send messages to your bot and receive responses
4. Interactive components like buttons should work if you implement them

The integration should now be working end-to-end with your application.
