"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function AllDonePage() {
  const searchParams = useSearchParams();
  const event = searchParams.get("event");

  useEffect(() => {
    // Send message to parent window and close this popup
    if (window.opener && event) {
      window.opener.postMessage(event, "*");
      setTimeout(() => {
        window.close();
      }, 1000);
    }
  }, [event]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center">
      <div className="max-w-md px-4">
        <h1 className="mb-4 text-2xl font-bold">Setup Complete!</h1>
        <p className="mb-8 text-muted-foreground">
          You can close this window and return to the application.
        </p>
        <p className="text-sm text-muted-foreground">
          This window will close automatically...
        </p>
      </div>
    </div>
  );
}
