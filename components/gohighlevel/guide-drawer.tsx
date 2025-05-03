"use client";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";

interface GuideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuideDrawer({ open, onOpenChange }: GuideDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full max-w-md">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle className="flex items-center gap-2">
            <Icons.BookOpen className="h-5 w-5" />
            GoHighLevel Integration Guide
          </DrawerTitle>
          <DrawerDescription>
            Learn how to get the most out of your GoHighLevel integration
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div>
            <h3 className="text-lg font-medium">1. Connect to GoHighLevel</h3>
            <p className="text-muted-foreground mt-2">
              Use the &quot;Connect to GoHighLevel&quot; button to authorize the
              app in your account.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium">
              2. Configure communication channels
            </h3>
            <p className="text-muted-foreground mt-2">
              Select which GoHighLevel communication channels you want the bot
              to respond to. You can enable or disable channels at any time.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium">3. Start using your bot</h3>
            <p className="text-muted-foreground mt-2">
              Your bot will automatically respond to messages in the channels
              you&apos;ve enabled. You can view conversation history in your
              GoHighLevel dashboard.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium">4. Configure settings</h3>
            <p className="text-muted-foreground mt-2">
              Use the Settings page to customize your bot&apos;s behavior in
              GoHighLevel.
            </p>
          </div>
        </div>
        <DrawerFooter className="border-t pt-4">
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
