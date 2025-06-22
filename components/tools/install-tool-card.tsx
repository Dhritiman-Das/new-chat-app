"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { installTool } from "@/app/actions/bots";
import { useRouter } from "next/navigation";

interface ToolInfo {
  id: string;
  name: string;
  description: string;
  type: string;
  integrationType?: string;
  defaultConfig?: Record<string, unknown>;
  beta?: boolean;
}

interface InstallToolCardProps {
  tool: ToolInfo;
  botId: string;
}

export default function InstallToolCard({ tool, botId }: InstallToolCardProps) {
  const [installing, setInstalling] = useState(false);
  const router = useRouter();

  // Map tool types to their corresponding icons
  const iconMap: Record<string, React.ReactNode> = {
    CALENDAR_BOOKING: <Icons.Calendar className="h-10 w-10" />,
    CONTACT_FORM: <Icons.MessageCircle className="h-10 w-10" />,
    CRM_TAG: <Icons.Database className="h-10 w-10" />,
    DATA_QUERY: <Icons.Database className="h-10 w-10" />,
    CUSTOM: <Icons.Settings className="h-10 w-10" />,
  };

  // Handle installation
  const handleInstall = async () => {
    setInstalling(true);
    try {
      const result = await installTool({
        botId,
        toolId: tool.id,
        config: tool.defaultConfig || {},
      });

      if (result.success) {
        toast.success(`${tool.name} has been installed successfully`);
        // Refresh the page to show the tool
        router.refresh();
      } else {
        toast.error(result.error?.message || `Failed to install ${tool.name}`);
      }
    } catch (error) {
      console.error("Error installing tool:", error);
      toast.error(`An unexpected error occurred while installing ${tool.name}`);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-md bg-muted flex items-center justify-center">
            {iconMap[tool.type] || <Icons.Hammer className="h-10 w-10" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-xl">{tool.name}</CardTitle>
              {tool.beta && (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/50"
                >
                  Beta
                </Badge>
              )}
            </div>
            <CardDescription>
              {tool.beta
                ? "This tool is in beta and requires access approval"
                : "This tool is available but not installed"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-4">
          <p className="text-muted-foreground">{tool.description}</p>

          {tool.beta && (
            <div className="rounded-md bg-amber-50 p-4 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/50">
              <h3 className="font-medium mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Icons.Warning className="h-4 w-4" />
                Beta Tool - Access Required
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                This tool is currently in beta testing. To get access, please
                contact us with your use case and requirements.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Icons.Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <a
                  href={`mailto:iamdhritiman01@gmail.com?subject=${encodeURIComponent(
                    `Beta Access Request for ${tool.name}`
                  )}`}
                  className="text-amber-600 dark:text-amber-400 hover:underline"
                >
                  iamdhritiman01@gmail.com
                </a>
              </div>
            </div>
          )}

          <div className="rounded-md bg-muted/50 p-4 border border-muted">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Icons.Info className="h-4 w-4 text-muted-foreground" />
              Additional Information
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {tool.integrationType && (
                <li className="flex items-center gap-2">
                  <Icons.Cable className="h-4 w-4" />
                  Integrates with {tool.integrationType}
                </li>
              )}
              <li className="flex items-center gap-2">
                <Icons.Settings className="h-4 w-4" />
                Configurable settings available
              </li>
              <li className="flex items-center gap-2">
                <Icons.Hammer className="h-4 w-4" />
                Adds new capabilities to your bot
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t">
        {tool.beta ? (
          <Button asChild variant="outline" className="w-full">
            <a
              href={`mailto:iamdhritiman01@gmail.com?subject=${encodeURIComponent(
                `Beta Access Request for ${tool.name}`
              )}&body=${encodeURIComponent(
                `Hi,\n\nI would like to request beta access for the ${tool.name} tool.\n\nMy use case:\n\n\nThank you!`
              )}`}
              className="flex items-center justify-center"
            >
              <Icons.Mail className="mr-2 h-4 w-4" />
              Request Beta Access
            </a>
          </Button>
        ) : (
          <Button
            onClick={handleInstall}
            className="w-full"
            disabled={installing}
          >
            {installing ? (
              <>
                <Icons.Loader className="mr-2 h-4 w-4 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Icons.PlusCircle className="mr-2 h-4 w-4" />
                Install Tool
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
