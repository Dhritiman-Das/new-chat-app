"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { User } from "@/lib/generated/prisma";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/app/actions/storage";
import { updateAvatar } from "@/app/actions/user";
import { FileMetadata, STORAGE_BUCKETS } from "@/lib/storage/types";

interface AvatarUploadProps {
  user: User;
}

export function AvatarUpload({ user }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user.avatarUrl || null
  );

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    try {
      setIsUploading(true);

      // Upload file to storage
      const uploadResult = await uploadFile({
        file,
        fileName: `avatar-${Date.now()}.${file.name.split(".").pop()}`,
        contentType: file.type,
        bucket: STORAGE_BUCKETS.PUBLIC, // Using public bucket for avatars
        path: "avatars",
      });

      // Check if upload was successful
      if (uploadResult?.data?.error) {
        toast.error(
          uploadResult.data?.error?.message || "Failed to upload avatar"
        );
        return;
      }

      // Extract the URL from the response data
      // We're using a more defensive approach with optional chaining and type checking
      const responseData = uploadResult?.data?.data as FileMetadata;
      const fileUrl = responseData?.url;

      if (!fileUrl) {
        toast.error("No URL returned from upload");
        return;
      }

      // Update user profile with new avatar URL
      const updateResult = await updateAvatar({
        avatarUrl: fileUrl,
      });

      if (updateResult?.data?.success) {
        setAvatarUrl(fileUrl);
        toast.success("Avatar updated successfully");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error: unknown) {
      console.error("Error uploading avatar:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsUploading(false);
    }
  };

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
                setIsUploading(true);
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
              } finally {
                setIsUploading(false);
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
