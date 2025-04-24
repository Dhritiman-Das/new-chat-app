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
            Slack Integration Guide
          </DrawerTitle>
          <DrawerDescription>
            Learn how to get the most out of your Slack integration
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div>
            <h3 className="text-lg font-medium">1. Connect to Slack</h3>
            <p className="text-muted-foreground mt-2">
              Use the &quot;Connect to Slack&quot; button to authorize the app
              in your workspace.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium">
              2. Invite the bot to channels
            </h3>
            <p className="text-muted-foreground mt-2">
              Type{" "}
              <code className="bg-muted px-1 py-0.5 rounded-sm">
                /invite @YourBot
              </code>{" "}
              in any Slack channel to add the bot.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium">3. Start conversations</h3>
            <p className="text-muted-foreground mt-2">
              Mention the bot using{" "}
              <code className="bg-muted px-1 py-0.5 rounded-sm">@YourBot</code>{" "}
              followed by your question or command.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium">4. Configure settings</h3>
            <p className="text-muted-foreground mt-2">
              Use the Settings page to customize your bot&apos;s behavior in
              Slack.
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
