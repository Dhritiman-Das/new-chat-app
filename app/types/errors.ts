export class AppError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AppError";
  }
}

// Common app errors
export const appErrors = {
  AUTHENTICATION_ERROR: new AppError("auth/error", "Authentication error"),
  INVALID_CREDENTIALS: new AppError(
    "auth/invalid-credentials",
    "Invalid email or password"
  ),
  USER_NOT_FOUND: new AppError("auth/user-not-found", "User not found"),
  EMAIL_ALREADY_IN_USE: new AppError(
    "auth/email-in-use",
    "Email already in use"
  ),
  WEAK_PASSWORD: new AppError("auth/weak-password", "Password is too weak"),
  UNAUTHORIZED: new AppError("auth/unauthorized", "You are not authorized"),
  UNEXPECTED_ERROR: new AppError(
    "app/unexpected",
    "An unexpected error occurred"
  ),
};
