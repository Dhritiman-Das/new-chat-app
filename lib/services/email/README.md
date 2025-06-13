# Email Notification System

A comprehensive, modular email notification system built with RESEND for handling automated emails in the application.

## Features

- **Modular Architecture**: Easy to extend for different types of notifications
- **Rate Limiting**: Built-in Redis-based rate limiting to prevent spam
- **Lead Capture Notifications**: Automatic notifications when leads are captured
- **Template System**: Reusable email templates with customizable data
- **Error Handling**: Comprehensive error handling and logging
- **TypeScript Support**: Fully typed for better development experience

## Setup

### 1. Environment Variables

Ensure the following environment variables are set:

```env
RESEND_API_KEY=your_resend_api_key_here
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2. Domain Configuration

Update the email configuration in `lib/services/email/config.ts`:

```typescript
export const EMAIL_CONFIG = {
  // Update with your verified domain in Resend
  FROM_EMAIL: "noreply@yourdomain.com",

  // Update with your application name
  FROM_NAME: "Your App Name",

  // Optional reply-to email
  REPLY_TO_EMAIL: "support@yourdomain.com",

  // Your application URL
  APP_URL: "https://yourdomain.com",
};
```

### 3. Verify Domain in Resend

Make sure to verify your sending domain in your Resend dashboard before sending emails in production.

## Usage

### Lead Capture Notifications

Lead capture notifications are automatically triggered when:

1. A lead is saved through the lead capture tool
2. The bot has `leadNotifications` enabled in its configuration
3. The organization has owners to notify

#### Configuration

Enable lead notifications in your bot's lead capture tool settings:

```typescript
{
  "leadNotifications": true,
  "requiredFields": ["name", "email", "phone"],
  "leadCaptureTriggers": ["pricing", "demo", "contact"]
}
```

#### Manual Triggering

You can also manually trigger lead notifications:

```typescript
import { notifyLeadCapture } from "@/lib/services/notifications/lead-notification-service";

// Simple notification
const success = await notifyLeadCapture(leadId, botId);

// Advanced notification with custom recipients
import { sendLeadNotification } from "@/lib/services/notifications/lead-notification-service";

const result = await sendLeadNotification({
  leadId: "lead_123",
  botId: "bot_456",
  notifyOwners: true,
  additionalRecipients: [{ email: "sales@company.com", name: "Sales Team" }],
});
```

## Architecture

### Core Components

1. **Email Service** (`email-service.ts`): Main email sending functionality
2. **Resend Client** (`resend-client.ts`): Wrapper around Resend API
3. **Notification Service** (`lead-notification-service.ts`): Business logic for notifications
4. **Templates** (`templates/`): Email template generators
5. **Configuration** (`config.ts`): Centralized configuration

### File Structure

```
lib/services/email/
├── email-service.ts          # Main email service
├── resend-client.ts          # Resend API wrapper
├── config.ts                 # Email configuration
├── templates/
│   └── lead-notification.ts  # Lead notification template
└── README.md                 # This file

lib/services/notifications/
└── lead-notification-service.ts  # Lead notification logic
```

### Data Flow

1. Lead is captured via lead capture tool
2. `saveLead` function creates lead in database
3. If notifications enabled, `notifyLeadCapture` is called
4. Service finds organization owners
5. Email template is generated with lead data
6. Emails are sent via Resend with rate limiting

## Extending the System

### Adding New Email Types

1. **Create a new template**:

```typescript
// lib/services/email/templates/appointment-reminder.ts
export interface AppointmentReminderData {
  appointmentId: string;
  customerName: string;
  appointmentDate: string;
  // ... other fields
}

export function generateAppointmentReminderEmail(
  data: AppointmentReminderData
): EmailTemplate {
  return {
    to: [],
    subject: `Reminder: Your appointment on ${data.appointmentDate}`,
    html: `...`, // HTML template
    text: `...`, // Plain text template
    tags: ["appointment", "reminder"],
  };
}
```

2. **Create a notification service**:

```typescript
// lib/services/notifications/appointment-notification-service.ts
export async function sendAppointmentReminder(
  appointmentId: string
): Promise<boolean> {
  // Implementation
}
```

3. **Add configuration**:

```typescript
// In config.ts
export const TEMPLATE_CONFIG = {
  APPOINTMENT_REMINDER: {
    TAGS: ["appointment", "reminder"],
    PRIORITY: "normal" as const,
  },
  // ... existing configs
} as const;
```

### Customizing Email Templates

Email templates use template literals for easy customization. Key areas to customize:

- **Styling**: Update CSS in the `<style>` section
- **Content**: Modify the HTML structure and copy
- **Branding**: Update colors, fonts, and logos
- **CTAs**: Customize call-to-action buttons and links

### Rate Limiting

The system includes built-in rate limiting:

- **Default**: 100 emails per hour per recipient
- **Storage**: Redis-based with automatic expiration
- **Customizable**: Update limits in `config.ts`

```typescript
// Customize rate limits
export const EMAIL_CONFIG = {
  RATE_LIMIT_MAX_EMAILS: 50, // Reduce to 50 emails per hour
  RATE_LIMIT_WINDOW: 1800, // Change to 30 minutes
};
```

## Error Handling

The system provides comprehensive error handling:

- **Rate Limiting**: Prevents spam and respects limits
- **Invalid Recipients**: Validates email addresses
- **API Failures**: Graceful degradation with logging
- **Template Errors**: Safe fallbacks for missing data

## Monitoring and Logging

All email operations are logged:

```typescript
// Success logs
console.log(`Lead notification sent: success`);

// Error logs
console.error("Error sending lead notification:", error);

// Rate limit warnings
console.warn(`Rate limit exceeded for ${email}`);
```

## Testing

### Development Testing

Use Resend's test domain for development:

```typescript
// Automatically used in development
FROM_EMAIL: "onboarding@resend.dev";
```

### Manual Testing

```typescript
import { sendEmail } from "@/lib/services/email/email-service";

const result = await sendEmail({
  to: [{ email: "test@example.com", name: "Test User" }],
  subject: "Test Email",
  html: "<h1>Test</h1>",
  text: "Test",
  tags: ["test"],
});

console.log(result);
```

## Security Considerations

- **Environment Variables**: Never commit API keys to version control
- **Rate Limiting**: Protects against abuse and spam
- **Validation**: All inputs are validated before processing
- **Error Handling**: Sensitive information is not exposed in error messages

## Troubleshooting

### Common Issues

1. **"Domain not verified"**: Verify your domain in Resend dashboard
2. **"Rate limit exceeded"**: Check Redis connection and rate limits
3. **"No recipients found"**: Ensure organization has owners
4. **"Template errors"**: Check for missing required template data

### Debug Mode

Enable detailed logging by checking the console output in your application logs.

## Contributing

When adding new email types:

1. Follow the existing pattern for templates and services
2. Add appropriate TypeScript types
3. Include error handling and logging
4. Update this README with new functionality
5. Test thoroughly in development environment

## Dependencies

- **Resend**: Email sending service
- **Redis**: Rate limiting and caching
- **Prisma**: Database operations for finding recipients
- **Next.js**: Server actions and environment management
