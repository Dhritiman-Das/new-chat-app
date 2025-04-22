import { useState, useCallback } from "react";
import { toast } from "sonner";

interface UseClipboardOptions {
  /**
   * Duration in milliseconds for the "copied" state to reset
   */
  timeout?: number;
  /**
   * Custom success message to show when content is copied
   */
  successMessage?: string;
  /**
   * Function to call when copy is successful
   */
  onSuccess?: () => void;
  /**
   * Function to call when copy fails
   */
  onError?: (error: Error) => void;
}

/**
 * Hook for copying content to clipboard with status tracking
 */
export function useClipboard({
  timeout = 2000,
  successMessage = "Copied to clipboard",
  onSuccess,
  onError,
}: UseClipboardOptions = {}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      if (!navigator.clipboard) {
        toast.error("Clipboard API not available in your browser");
        onError?.(new Error("Clipboard API not available"));
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(successMessage);
        onSuccess?.();

        // Reset after timeout
        setTimeout(() => {
          setCopied(false);
        }, timeout);

        return true;
      } catch (error) {
        console.error("Failed to copy:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to copy text";
        toast.error(errorMessage);
        onError?.(error instanceof Error ? error : new Error(errorMessage));
        return false;
      }
    },
    [timeout, successMessage, onSuccess, onError]
  );

  return { copied, copy };
}
