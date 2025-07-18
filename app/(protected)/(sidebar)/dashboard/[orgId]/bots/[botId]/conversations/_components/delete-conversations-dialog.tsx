"use client";

import type { Conversation } from "@/lib/generated/prisma";
import type { Row } from "@tanstack/react-table";
import { Icons } from "@/components/icons";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { deleteConversations } from "@/app/actions/conversation-tracking";

interface DeleteConversationsDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  conversations: Row<Conversation>["original"][];
  showTrigger?: boolean;
  onSuccess?: () => void;
}

export function DeleteConversationsDialog({
  conversations,
  showTrigger = true,
  onSuccess,
  ...props
}: DeleteConversationsDialogProps) {
  const [isDeletePending, startDeleteTransition] = React.useTransition();
  const isDesktop = useMediaQuery("(min-width: 640px)");

  function onDelete() {
    startDeleteTransition(async () => {
      const result = await deleteConversations({
        ids: conversations.map((conversation) => conversation.id),
      });

      if (!result?.data?.success) {
        toast.error(
          result?.data?.error?.message || "Failed to delete conversations"
        );
        return;
      }

      props.onOpenChange?.(false);
      toast.success(`${result.data?.data?.count} conversation(s) deleted`);
      onSuccess?.();
    });
  }

  if (isDesktop) {
    return (
      <Dialog {...props}>
        {showTrigger ? (
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Icons.Trash className="mr-2 size-4" aria-hidden="true" />
              Delete ({conversations.length})
            </Button>
          </DialogTrigger>
        ) : null}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your{" "}
              <span className="font-medium">{conversations.length}</span>
              {conversations.length === 1
                ? " conversation"
                : " conversations"}{" "}
              and all associated messages from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              aria-label="Delete selected rows"
              variant="destructive"
              onClick={onDelete}
              disabled={isDeletePending}
            >
              {isDeletePending && (
                <Icons.Loader
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer {...props}>
      {showTrigger ? (
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm">
            <Icons.Trash className="mr-2 size-4" aria-hidden="true" />
            Delete ({conversations.length})
          </Button>
        </DrawerTrigger>
      ) : null}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Are you absolutely sure?</DrawerTitle>
          <DrawerDescription>
            This action cannot be undone. This will permanently delete your{" "}
            <span className="font-medium">{conversations.length}</span>
            {conversations.length === 1
              ? " conversation"
              : " conversations"}{" "}
            and all associated messages from our servers.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="gap-2 sm:space-x-0">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
          <Button
            aria-label="Delete selected rows"
            variant="destructive"
            onClick={onDelete}
            disabled={isDeletePending}
          >
            {isDeletePending && (
              <Icons.Loader
                className="mr-2 size-4 animate-spin"
                aria-hidden="true"
              />
            )}
            Delete
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
