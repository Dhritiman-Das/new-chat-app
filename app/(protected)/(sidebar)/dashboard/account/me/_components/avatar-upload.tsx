"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { User } from "@/lib/generated/prisma";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { updateAvatar } from "@/app/actions/user";
import { useImageUpload } from "@/hooks/use-image-upload";

interface AvatarUploadProps {
  user: User;
}

export function AvatarUpload({ user }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user.avatarUrl || null
  );

  const handleAvatarSuccess = async (fileUrl: string) => {
    try {
      const updateResult = await updateAvatar({
        avatarUrl: fileUrl,
      });

      if (updateResult?.data?.success) {
        setAvatarUrl(fileUrl);
        toast.success("Avatar updated successfully");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast.error("Failed to update profile");
    }
  };

  const { isUploading, handleFileChange } = useImageUpload({
    path: "avatars",
    fileNamePrefix: "avatar",
    onSuccess: handleAvatarSuccess,
  });

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative h-24 w-24">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="User avatar"
            className="rounded-full object-cover"
            fill
            priority
            sizes="(max-width: 768px) 100px, 96px"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <Icons.User className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <Icons.Spinner className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center space-y-2">
        <label htmlFor="avatar-upload">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={isUploading}
            asChild
          >
            <span>
              <Icons.FileUp className="mr-2 h-4 w-4" />
              {avatarUrl ? "Change avatar" : "Upload avatar"}
            </span>
          </Button>
        </label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {avatarUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={async () => {
              try {
                const result = await updateAvatar({ avatarUrl: "" });
                if (result?.data?.success) {
                  setAvatarUrl(null);
                  toast.success("Avatar removed");
                } else {
                  toast.error("Failed to remove avatar");
                }
              } catch (error: unknown) {
                console.error("Error removing avatar:", error);
                toast.error("Failed to remove avatar");
              }
            }}
            disabled={isUploading}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
