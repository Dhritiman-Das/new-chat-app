// Common type definitions for server actions

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

// Common app errors
export const appErrors = {
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    message: "You are not authorized to perform this action",
  },
  UNEXPECTED_ERROR: {
    code: "UNEXPECTED_ERROR",
    message: "An unexpected error occurred",
  },
  NOT_FOUND: {
    code: "NOT_FOUND",
    message: "The requested resource was not found",
  },
  INVALID_INPUT: {
    code: "INVALID_INPUT",
    message: "The provided input is invalid",
  },
};
