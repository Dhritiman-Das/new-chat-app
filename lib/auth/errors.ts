/**
 * Custom error classes for the auth system
 */

// Base error class for authentication-related errors
export class AuthError extends Error {
  code: string;

  constructor(message: string, code = "AUTH_ERROR") {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

// Error class for token-related issues
export class TokenError extends AuthError {
  constructor(message: string, code = "TOKEN_ERROR") {
    super(message, code);
    this.name = "TokenError";
  }
}

// Error class for provider-specific errors
export class ProviderError extends AuthError {
  provider: string;

  constructor(message: string, provider: string, code = "PROVIDER_ERROR") {
    super(message, code);
    this.name = "ProviderError";
    this.provider = provider;
  }
}

// Error class for credential-related issues
export class CredentialError extends AuthError {
  constructor(message: string, code = "CREDENTIAL_ERROR") {
    super(message, code);
    this.name = "CredentialError";
  }
}
