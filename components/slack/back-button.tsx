"use client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  const handleClick = () => {
    router.back();
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} className="">
      <Icons.ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
