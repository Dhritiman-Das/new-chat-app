"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface CopyEmbedCodeProps {
  code: string;
}

export function CopyEmbedCode({ code }: CopyEmbedCodeProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Embed code copied to clipboard");

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      toast.error("Failed to copy code");
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <Button onClick={copyToClipboard} className="gap-2">
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copy Embed Code
        </>
      )}
    </Button>
  );
}
