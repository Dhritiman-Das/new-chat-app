"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icons } from "@/components/icons";
import { CreateTemplateForm } from "../settings/create-template-form";

export interface PlaceholderItem {
  id: string;
  name: string;
  description: string;
  type: string;
  required: boolean;
  defaultValue: string;
  options?: { value: string; label: string }[];
}

export interface PlaceholderSchema {
  placeholders: PlaceholderItem[];
  version: string;
}

export default function CreateTemplateDialog({
  orgId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  botId,
}: {
  orgId: string;
  botId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    // Optionally trigger a refresh of the parent component
    window.location.reload(); // Simple refresh for now
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Icons.Add className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </DialogTrigger>
      <DialogContent className="lg:max-w-screen-lg overflow-y-scroll max-h-screen">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Create a reusable template with placeholders for your bot prompts.
          </DialogDescription>
        </DialogHeader>

        <CreateTemplateForm
          orgId={orgId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          onSubmittingChange={setIsSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
