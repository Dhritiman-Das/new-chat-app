# Auth Module

This module provides a unified interface for authentication and OAuth operations across different service providers.

## Folder Structure

```
lib/auth/
  ├── clients/             # Client implementations for APIs
  │   ├── gohighlevel/     # GoHighLevel-specific clients
  │   │   ├── index.ts     # Main client entry point
  │   │   ├── calendar.ts  # Calendar service client
  │   │   ├── messaging.ts # Messaging service client
  │   │   └── contacts.ts  # Contacts service client
  │   └── google/          # Google-specific clients (future)
  ├── config/              # Provider configuration
  │   └── providers-config.ts
  ├── providers/           # OAuth provider implementations
  │   ├── gohighlevel.ts   # GoHighLevel provider
  │   └── google.ts        # Google provider (future)
  ├── utils/               # Utility functions
  │   ├── store.ts         # Credential storage utilities
  │   ├── validate.ts      # Token validation utilities
  │   └── refresh.ts       # Token refresh utilities
  ├── services/            # High-level service abstractions (optional)
  ├── errors.ts            # Error classes
  ├── provider-registry.ts # Provider registry
  ├── types.ts             # Common types and interfaces
  └── index.ts             # Module entry point
```

## Key Concepts

### OAuth Credentials

Credentials for different providers are stored in the database and are managed through a common interface. Each provider has its own credential type that extends `BaseOAuthCredentials`.

### Provider Interface

All OAuth providers implement the `OAuthProvider<T>` interface, which requires:

- `getToken(context)`: Get a valid access token
- `refreshToken(refreshToken)`: Refresh an expired token
- `createClient(credentials)`: Create a client instance

### Token Management

The module includes utilities for:

- Retrieving credentials from the database
- Validating tokens
- Refreshing expired tokens
- Updating credentials in the database

### Client Organization

Clients are organized by provider rather than by service type. Each provider may have multiple service clients:

- **GoHighLevel**: Calendar, Messaging, Contacts
- **Google**: (To be implemented)

## Usage Examples

### Getting a Token

```typescript
import { getToken, createTokenContext } from "@/lib/auth";

const context = createTokenContext(userId, "gohighlevel", { botId });
const token = await getToken(context);
```

### Using a Client

```typescript
import { createGoHighLevelClient, createTokenContext } from "@/lib/auth";

const context = createTokenContext(userId, "gohighlevel", { botId });
const client = createGoHighLevelClient(context, locationId);

// Use calendar features
const calendars = await client.calendar.getCalendars();

// Use messaging features
await client.messaging.sendMessage({
  type: "SMS",
  contactId: contactId,
  message: "Hello from the API",
});

// Use contact features
const contacts = await client.contacts.searchContacts("John");
```

### Using the Service Client Factory

```typescript
import { createServiceClient, createTokenContext } from "@/lib/auth";

const context = createTokenContext(userId, "gohighlevel", { botId });
const calendarClient = await createServiceClient(context, "calendar", {
  locationId,
});

const calendars = await calendarClient.getCalendars();
```

## Adding New Providers

To add a new provider:

1. Create a new provider implementation in `providers/`
2. Register it in the provider registry
3. Create client implementations in `clients/`
4. Add configuration to `config/providers-config.ts`

## Error Handling

All errors thrown by the module extend the `AuthError` class, making it easy to catch and handle them appropriately:

```typescript
try {
  // Use the auth module
} catch (error) {
  if (error instanceof AuthError) {
    // Handle auth errors
  } else {
    // Handle other errors
  }
}
```
