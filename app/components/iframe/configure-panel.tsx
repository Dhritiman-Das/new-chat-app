"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { IframeConfig } from "./types";
import { defaultIframeConfig } from "./config";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { saveIframeConfiguration } from "@/app/actions/bots";
import { Icons } from "@/components/icons";
import { useImageUpload } from "@/hooks/use-image-upload";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConfigurePanelProps {
  botId: string;
  config: IframeConfig;
  setConfig: React.Dispatch<React.SetStateAction<IframeConfig>>;
}

export function ConfigurePanel({
  botId,
  config,
  setConfig,
}: ConfigurePanelProps) {
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [embedCode, setEmbedCode] = useState("");

  useEffect(() => {
    // Set embed code after component mounts (client-side only)
    setEmbedCode(`<iframe
  src="${window.location.origin}/iframe?botId=${botId}"
  width="100%"
  height="600px"
  frameborder="0"
  allow="microphone"
></iframe>`);
  }, [botId]);

  const handleThemeChange = (
    field: keyof IframeConfig["theme"],
    value: string
  ) => {
    setConfig({
      ...config,
      theme: {
        ...config.theme,
        [field]: value,
      },
    });
  };

  const handleMessagesChange = (
    field: keyof IframeConfig["messages"],
    value: string
  ) => {
    setConfig({
      ...config,
      messages: {
        ...config.messages,
        [field]: value,
      },
    });
  };

  const handleAvatarChange = (
    field: keyof IframeConfig["avatar"],
    value: boolean | string
  ) => {
    setConfig({
      ...config,
      avatar: {
        ...config.avatar,
        [field]: value,
      },
    });
  };

  const handleLayoutChange = (
    field: keyof IframeConfig["layout"],
    value: boolean | string
  ) => {
    setConfig({
      ...config,
      layout: {
        ...config.layout,
        [field]: value,
      },
    });
  };

  const handleBrandingChange = (
    field: keyof IframeConfig["branding"],
    value: boolean | string
  ) => {
    setConfig({
      ...config,
      branding: {
        ...config.branding,
        [field]: value,
      },
    });
  };

  const handleFeaturesChange = (
    field: keyof IframeConfig["features"],
    value: boolean
  ) => {
    setConfig({
      ...config,
      features: {
        ...config.features,
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await saveIframeConfiguration({
        botId,
        config: config as unknown as Record<string, unknown>,
      });

      if (response.success) {
        toast.success("Configuration saved successfully");
      } else {
        toast.error(response.error?.message || "Failed to save configuration");
      }
    } catch (error) {
      toast.error("An error occurred while saving");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Embed code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setConfig({
      ...defaultIframeConfig,
    });
  };

  const handleAvatarSuccess = (fileUrl: string) => {
    handleAvatarChange("avatarUrl", fileUrl);
    toast.success("Avatar uploaded successfully");
  };

  const handleBrandingLogoSuccess = (fileUrl: string) => {
    handleBrandingChange("brandingLogo", fileUrl);
    toast.success("Branding logo uploaded successfully");
  };

  const {
    isUploading: isUploadingAvatar,
    handleFileChange: handleAvatarFileChange,
  } = useImageUpload({
    path: "iframe-avatars",
    fileNamePrefix: "avatar",
    onSuccess: handleAvatarSuccess,
  });

  const {
    isUploading: isUploadingBrandingLogo,
    handleFileChange: handleBrandingLogoFileChange,
  } = useImageUpload({
    path: "iframe-branding",
    fileNamePrefix: "branding-logo",
    onSuccess: handleBrandingLogoSuccess,
  });

  // Font family options
  const fontOptions = [
    { value: "Inter, sans-serif", label: "Inter" },
    { value: "Arial, sans-serif", label: "Arial" },
    { value: "Helvetica, sans-serif", label: "Helvetica" },
    { value: "Roboto, sans-serif", label: "Roboto" },
    { value: "Open Sans, sans-serif", label: "Open Sans" },
    { value: "Georgia, serif", label: "Georgia" },
    { value: "Times New Roman, serif", label: "Times New Roman" },
    { value: "Courier New, monospace", label: "Courier New" },
    { value: "system-ui, sans-serif", label: "System UI" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 w-full max-w-full overflow-hidden"
    >
      <Tabs defaultValue="theme" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="avatar">Avatar</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visual Theme</CardTitle>
              <CardDescription>
                Customize the look and feel of your chat iframe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={config.theme.primaryColor}
                      onChange={(e) =>
                        handleThemeChange("primaryColor", e.target.value)
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={config.theme.primaryColor}
                      onChange={(e) =>
                        handleThemeChange("primaryColor", e.target.value)
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={config.theme.secondaryColor}
                      onChange={(e) =>
                        handleThemeChange("secondaryColor", e.target.value)
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={config.theme.secondaryColor}
                      onChange={(e) =>
                        handleThemeChange("secondaryColor", e.target.value)
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={config.theme.backgroundColor}
                      onChange={(e) =>
                        handleThemeChange("backgroundColor", e.target.value)
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={config.theme.backgroundColor}
                      onChange={(e) =>
                        handleThemeChange("backgroundColor", e.target.value)
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="textColor"
                      type="color"
                      value={config.theme.textColor}
                      onChange={(e) =>
                        handleThemeChange("textColor", e.target.value)
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={config.theme.textColor}
                      onChange={(e) =>
                        handleThemeChange("textColor", e.target.value)
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontFamily">Font Family</Label>
                <Select
                  value={config.theme.fontFamily}
                  onValueChange={(value) =>
                    handleThemeChange("fontFamily", value)
                  }
                >
                  <SelectTrigger id="fontFamily">
                    <SelectValue placeholder="Select a font family" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>System Fonts</SelectLabel>
                      {fontOptions.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>
                Configure chat messages and display text
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="initialMessage">Initial Message</Label>
                <Textarea
                  id="initialMessage"
                  value={config.messages.initialMessage}
                  onChange={(e) =>
                    handleMessagesChange("initialMessage", e.target.value)
                  }
                  placeholder="Hi there! How can I help you today?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="placeholderText">Input Placeholder</Label>
                <Input
                  id="placeholderText"
                  value={config.messages.placeholderText}
                  onChange={(e) =>
                    handleMessagesChange("placeholderText", e.target.value)
                  }
                  placeholder="Type your message here..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="headerText">Header Text</Label>
                <Input
                  id="headerText"
                  value={config.messages.headerText}
                  onChange={(e) =>
                    handleMessagesChange("headerText", e.target.value)
                  }
                  placeholder="Chat with our AI"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loadingText">Loading Text</Label>
                <Input
                  id="loadingText"
                  value={config.messages.loadingText}
                  onChange={(e) =>
                    handleMessagesChange("loadingText", e.target.value)
                  }
                  placeholder="Thinking..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avatar Tab */}
        <TabsContent value="avatar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Avatar</CardTitle>
              <CardDescription>
                Configure the chat avatar appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="showAvatar"
                  checked={config.avatar.showAvatar}
                  onCheckedChange={(checked) =>
                    handleAvatarChange("showAvatar", checked)
                  }
                />
                <Label htmlFor="showAvatar">Show Avatar</Label>
              </div>

              {config.avatar.showAvatar && (
                <>
                  {/* Avatar Preview */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative h-16 w-16">
                      {config.avatar.avatarUrl ? (
                        <Image
                          src={config.avatar.avatarUrl}
                          alt="Avatar"
                          className="rounded-full object-cover"
                          fill
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                          <Icons.User className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                          <Icons.Spinner className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Avatar URL Input */}
                  <div className="space-y-2">
                    <Label htmlFor="avatarUrl">Avatar URL</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="avatarUrl"
                        value={config.avatar.avatarUrl || ""}
                        onChange={(e) =>
                          handleAvatarChange("avatarUrl", e.target.value)
                        }
                        placeholder="https://example.com/avatar.png"
                        className="flex-1"
                      />
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          disabled={isUploadingAvatar}
                          asChild
                        >
                          <label htmlFor="avatar-upload">
                            <Icons.FileUp className="h-4 w-4" />
                          </label>
                        </Button>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarFileChange}
                          disabled={isUploadingAvatar}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter URL or upload a new image (Max: 5MB)
                    </p>
                  </div>

                  {/* Clear Avatar Button */}
                  {config.avatar.avatarUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => handleAvatarChange("avatarUrl", "")}
                    >
                      <Icons.Trash className="h-4 w-4 mr-2" />
                      Remove Avatar
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Layout</CardTitle>
              <CardDescription>
                Configure the dimensions and layout
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="fullHeight"
                  checked={config.layout.fullHeight}
                  onCheckedChange={(checked) =>
                    handleLayoutChange("fullHeight", checked)
                  }
                />
                <Label htmlFor="fullHeight">Full Height</Label>
              </div>

              {!config.layout.fullHeight && (
                <div className="space-y-2">
                  <Label htmlFor="maxHeight">Max Height</Label>
                  <Input
                    id="maxHeight"
                    value={config.layout.maxHeight || ""}
                    onChange={(e) =>
                      handleLayoutChange("maxHeight", e.target.value)
                    }
                    placeholder="600px"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="fullWidth"
                  checked={config.layout.fullWidth}
                  onCheckedChange={(checked) =>
                    handleLayoutChange("fullWidth", checked)
                  }
                />
                <Label htmlFor="fullWidth">Full Width</Label>
              </div>

              {!config.layout.fullWidth && (
                <div className="space-y-2">
                  <Label htmlFor="maxWidth">Max Width</Label>
                  <Input
                    id="maxWidth"
                    value={config.layout.maxWidth || ""}
                    onChange={(e) =>
                      handleLayoutChange("maxWidth", e.target.value)
                    }
                    placeholder="400px"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Configure branding and attribution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="showBranding"
                  checked={config.branding.showBranding}
                  onCheckedChange={(checked) =>
                    handleBrandingChange("showBranding", checked)
                  }
                />
                <Label htmlFor="showBranding">Show Branding</Label>
              </div>

              {config.branding.showBranding && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="brandingText">Branding Text</Label>
                    <Input
                      id="brandingText"
                      value={config.branding.brandingText}
                      onChange={(e) =>
                        handleBrandingChange("brandingText", e.target.value)
                      }
                      placeholder="Powered by AI"
                    />
                  </div>

                  {/* Branding Logo Preview */}
                  {config.branding.brandingLogo && (
                    <div className="flex justify-center py-2">
                      <div className="relative h-12 w-48">
                        <Image
                          src={config.branding.brandingLogo}
                          alt="Branding Logo"
                          className="object-contain"
                          fill
                          sizes="192px"
                        />
                        {isUploadingBrandingLogo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Icons.Spinner className="h-6 w-6 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="brandingLogo">Branding Logo URL</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="brandingLogo"
                        value={config.branding.brandingLogo || ""}
                        onChange={(e) =>
                          handleBrandingChange("brandingLogo", e.target.value)
                        }
                        placeholder="https://example.com/logo.png"
                        className="flex-1"
                      />
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          disabled={isUploadingBrandingLogo}
                          asChild
                        >
                          <label htmlFor="branding-logo-upload">
                            <Icons.FileUp className="h-4 w-4" />
                          </label>
                        </Button>
                        <input
                          id="branding-logo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleBrandingLogoFileChange}
                          disabled={isUploadingBrandingLogo}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter URL or upload a new image (Max: 5MB)
                    </p>
                  </div>

                  {/* Clear Branding Logo Button */}
                  {config.branding.brandingLogo && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => handleBrandingChange("brandingLogo", "")}
                    >
                      <Icons.Trash className="h-4 w-4 mr-2" />
                      Remove Logo
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>Enable or disable chat features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableFileUpload"
                  checked={config.features.enableFileUpload}
                  onCheckedChange={(checked) =>
                    handleFeaturesChange("enableFileUpload", checked)
                  }
                />
                <Label htmlFor="enableFileUpload">Enable File Upload</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enableRichText"
                  checked={config.features.enableRichText}
                  onCheckedChange={(checked) =>
                    handleFeaturesChange("enableRichText", checked)
                  }
                />
                <Label htmlFor="enableRichText">Enable Rich Text</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enableTypingIndicator"
                  checked={config.features.enableTypingIndicator}
                  onCheckedChange={(checked) =>
                    handleFeaturesChange("enableTypingIndicator", checked)
                  }
                />
                <Label htmlFor="enableTypingIndicator">
                  Enable Typing Indicator
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enableInitialMessages"
                  checked={config.features.enableInitialMessages}
                  onCheckedChange={(checked) =>
                    handleFeaturesChange("enableInitialMessages", checked)
                  }
                />
                <Label htmlFor="enableInitialMessages">
                  Enable Initial Messages
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset}>
          <Icons.RefreshCcw className="h-4 w-4 mr-1" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>

      {/* Embed Code */}
      <Card>
        <CardHeader>
          <CardTitle>Embed Code</CardTitle>
          <CardDescription>
            Copy this code to embed the chat on your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-secondary p-4 rounded-lg text-sm overflow-x-auto">
              {embedCode}
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={copyToClipboard}
            >
              {copied ? (
                <>
                  <Icons.Check className="h-4 w-4 mr-1" />
                </>
              ) : (
                <>
                  <Icons.Copy className="h-4 w-4 mr-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
