# Lead Capture Tool

A tool for capturing user information during conversations based on trigger keywords.

## Features

- **Keyword Detection**: Automatically detects when users mention keywords like "pricing", "demo", "contact", "quote", or "trial"
- **Information Collection**: Gathers required user information (name, phone) and optional information (email)
- **Customized Messaging**: Tailors information request messages based on the trigger keyword
- **Data Storage**: Saves lead information for follow-up

## Functions

### detectTriggerKeyword

Detects when a user message contains trigger keywords that should initiate the lead capture process.

```typescript
const result = await detectTriggerKeyword({
  message: "I'd like to see a demo of your product",
});
// Returns: { success: true, detected: true, triggerKeyword: "demo", ... }
```

### requestLeadInfo

Requests specific information from the user based on what fields are needed.

```typescript
const result = await requestLeadInfo({
  fields: ["name", "phone", "email"],
  triggerKeyword: "demo",
});
// Returns instructions for requesting information
```

### saveLead

Saves the collected lead information.

```typescript
const result = await saveLead({
  name: "John Doe",
  phone: "123-456-7890",
  email: "john@example.com",
  company: "ACME Inc",
  triggerKeyword: "demo",
});
// Returns confirmation of saved lead
```

## Configuration

The lead capture tool can be configured with:

- `requiredFields`: Fields that must be collected (default: ["name", "phone"])
- `leadNotifications`: Whether to send notifications for new leads (default: true)
- `notificationEmail`: Email address to send lead notifications to (optional)
- `leadCaptureTriggers`: Keywords that trigger lead capture (default: ["pricing", "demo", "contact", "quote", "trial"])

## Usage Flow

1. The tool automatically detects trigger keywords in user messages
2. When detected, it requests the required information from the user
3. After collecting the information, it saves the lead details
4. Confirmation is provided to indicate successful capture
