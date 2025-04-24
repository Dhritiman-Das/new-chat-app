"use client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useState } from "react";
import { GuideDrawer } from "./guide-drawer";

export function GuideButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Icons.BookOpen className="mr-2 h-4 w-4" />
        Guide
      </Button>
      <GuideDrawer open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
