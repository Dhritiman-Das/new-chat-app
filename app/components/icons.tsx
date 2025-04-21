"use client";

// Export specific icons from Lucide React
import {
  Loader2 as Loader2Icon,
  Send as SendIcon,
  Check as CheckIcon,
  Copy as CopyIcon,
  // Add more icons as needed
} from "lucide-react";

// Re-export with our naming convention (without 'Icon' suffix)
export const Loader2 = Loader2Icon;
export const Send = SendIcon;
export const Check = CheckIcon;
export const Copy = CopyIcon;

// Add any custom icons here if needed
// export function CustomIcon() {
//   return (
//     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//       <path d="..." fill="currentColor" />
//     </svg>
//   );
// }
