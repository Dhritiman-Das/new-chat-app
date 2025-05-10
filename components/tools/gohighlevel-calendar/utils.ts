// Format date for display
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

// Format time for display
export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
