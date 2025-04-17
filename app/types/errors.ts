/**
 * Custom application error class
 */
export class AppError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AppError";
  }
}

/**
 * Common application errors
 */
export const appErrors = {
  UNEXPECTED_ERROR: {
    code: "common/unexpected",
    message: "An unexpected error occurred",
  },
  UNAUTHORIZED: {
    code: "auth/unauthorized",
    message: "You are not authorized to perform this action",
  },
  NOT_FOUND: {
    code: "common/not-found",
    message: "The requested resource was not found",
  },
  VALIDATION_ERROR: {
    code: "common/validation",
    message: "Invalid input data",
  },
  // Knowledge specific errors
  KNOWLEDGE_BASE_NOT_FOUND: {
    code: "knowledge/kb-not-found",
    message: "Knowledge base not found",
  },
  FILE_NOT_FOUND: {
    code: "knowledge/file-not-found",
    message: "File not found",
  },
  FILE_TOO_LARGE: {
    code: "knowledge/file-too-large",
    message: "File exceeds the maximum size limit",
  },
  INVALID_FILE_TYPE: {
    code: "knowledge/invalid-file-type",
    message: "Invalid file type",
  },
  PROCESSING_ERROR: {
    code: "knowledge/processing-error",
    message: "Error processing file",
  },
};
