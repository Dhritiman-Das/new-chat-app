// Common type definitions for server actions

export interface AppError {
  code: string;
  message: string;
}

export const appErrors = {
  INVALID_INPUT: {
    code: "INVALID_INPUT",
    message: "The provided input is invalid",
  },
  UNEXPECTED_ERROR: {
    code: "UNEXPECTED_ERROR",
    message: "An unexpected error occurred",
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    message: "You are not authorized to perform this action",
  },
  NOT_FOUND: {
    code: "NOT_FOUND",
    message: "Resource not found",
  },
};

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: AppError;
}
