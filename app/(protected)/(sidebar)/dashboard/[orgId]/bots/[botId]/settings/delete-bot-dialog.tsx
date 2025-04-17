"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteBot } from "@/app/actions/bots";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface DeleteBotDialogProps {
  bot: {
    id: string;
    name: string;
  };
  orgId: string;
}

export default function DeleteBotDialog({ bot, orgId }: DeleteBotDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmName !== bot.name) return;

    setIsDeleting(true);
    try {
      const response = await deleteBot({ id: bot.id });

      if (response.success) {
        toast("Bot deleted successfully", {
          description: "Your bot has been permanently deleted",
        });
        setIsOpen(false);
        // Redirect to bots list after deletion
        router.push(`/dashboard/${orgId}/bots`);
      } else {
        toast("Failed to delete bot", {
          description:
            response.error?.message || "An unexpected error occurred",
        });
      }
    } catch (error: unknown) {
      console.error("Error deleting bot:", error);
      toast("Failed to delete bot", {
        description: "An unexpected error occurred",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmDisabled = confirmName !== bot.name || isDeleting;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Bot</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Bot</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your bot
            and all of its data including knowledge bases, integrations, and
            conversation history.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Please type <span className="font-bold">{bot.name}</span> to
              confirm.
            </p>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={bot.name}
              disabled={isDeleting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isConfirmDisabled}
          >
            {isDeleting ? "Deleting..." : "Delete Bot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
