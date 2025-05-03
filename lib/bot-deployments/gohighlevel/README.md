# GoHighLevel Integration

This module implements the integration between our chatbot application and GoHighLevel, allowing bots to respond to messages from various channels in GoHighLevel (SMS, Email, WhatsApp, Facebook, Instagram, Live Chat, Voicemail).

## Features

- OAuth2 authentication with GoHighLevel
- Webhook handling for incoming messages
- Response generation using the bot's AI capabilities
- Support for multiple message channels
- Kill-switch functionality using tags
- Conversation opt-out mechanism
- Webhook signature validation for security

## Architecture

The GoHighLevel integration follows the same modular architecture as our other integrations:

- `config.ts` - Configuration options and settings
- `types.ts` - TypeScript types and interfaces
- `index.ts` - Core functionality (client creation, API helpers)
- `initialize.ts` - OAuth popup initialization
- `lib/events/conversation/message.ts` - Message handling logic

## API Routes

- `/api/apps/gohighlevel/install-url` - Generate OAuth URL
- `/api/apps/gohighlevel/oauth_callback` - Handle OAuth callback
- `/api/apps/gohighlevel/events` - Webhook endpoint for incoming messages

## Setup

1. Create a GoHighLevel Marketplace App in the GoHighLevel developer portal
2. Configure the following environment variables:

```
NEXT_PUBLIC_GOHIGHLEVEL_CLIENT_ID=your_client_id
GOHIGHLEVEL_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_GOHIGHLEVEL_OAUTH_REDIRECT_URL=https://your-app.com/api/apps/gohighlevel/oauth_callback
```

3. Set up a webhook in your GoHighLevel app that points to:

```
https://your-app.com/api/apps/gohighlevel/events
```

## Models

The integration uses the following data models:

### Integration Model

Stores the connection information between a bot and a GoHighLevel account:

```json
{
  "id": "integration-uuid",
  "userId": "user-uuid",
  "botId": "bot-uuid",
  "name": "GoHighLevel Integration",
  "provider": "gohighlevel",
  "type": "CRM",
  "connectionStatus": "CONNECTED",
  "metadata": {
    "locationId": "ghl-location-id"
  },
  "config": {
    "messageStyle": "text",
    "maxMessagesToProcess": 10
  }
}
```

### Deployment Model

Configures where and how the bot is deployed in GoHighLevel:

```json
{
  "id": "deployment-uuid",
  "botId": "bot-uuid",
  "type": "GOHIGHLEVEL",
  "status": "ACTIVE",
  "integrationId": "integration-uuid",
  "config": {
    "locationId": "ghl-location-id",
    "channels": [
      {
        "type": "SMS",
        "active": true
      },
      {
        "type": "Email",
        "active": true
      }
    ],
    "globalSettings": {
      "checkKillSwitch": true,
      "defaultResponseTime": "immediate"
    },
    "optedOutConversations": []
  }
}
```

## Additional Information

- GoHighLevel supports various message types: SMS, Email, WhatsApp, Facebook, Instagram, Live Chat, and Call/Voicemail
- Contact tags can be used to control bot behavior (e.g., a "kill_switch" tag disables bot responses)
- Each deployment is linked to a specific location (sub-account) in GoHighLevel
