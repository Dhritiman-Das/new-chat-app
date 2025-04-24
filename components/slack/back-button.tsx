"use client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";

interface BackButtonProps {
  href: string;
}

export function BackButton({ href }: BackButtonProps) {
  const handleClick = () => {
    window.history.back();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="rounded-full"
      asChild
    >
      <a href={href}>
        <Icons.ArrowLeft className="h-4 w-4" />
      </a>
    </Button>
  );
}
