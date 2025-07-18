"use client";

import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/icons";
import GoHighLevelCalendarTool from "./gohighlevel-calendar";
import CustomToolComponent from "./custom-tool-component";

// Define a serializable tool interface
interface SerializableTool {
  id: string;
  name: string;
  description: string;
  type: string;
  integrationType?: string;
  version: string;
  defaultConfig?: Record<string, unknown>;
  functionsMeta: Record<string, { description: string }>;
  beta?: boolean;
}

// Dynamically import tool-specific components
const GoogleCalendarTool = dynamic(() => import("./google-calendar"), {
  ssr: false,
  loading: () => <ToolLoading name="Google Calendar" />,
});

const LeadCaptureTool = dynamic(() => import("./lead-capture"), {
  ssr: false,
  loading: () => <ToolLoading name="Lead Capture" />,
});

const PauseConversationTool = dynamic(() => import("./pause-conversation"), {
  ssr: false,
  loading: () => <ToolLoading name="Pause Conversation" />,
});

interface ToolComponentWrapperProps {
  toolSlug: string;
  tool: SerializableTool;
  botId: string;
  orgId: string;
}

// Loading placeholder component
function ToolLoading({ name }: { name: string }) {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>Loading tool configuration...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Icons.Clock className="h-10 w-10 opacity-50" />
            <span>Loading tool components...</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Fallback component for unknown tools

function DefaultToolComponent({
  tool,
  botId,
  orgId,
}: {
  tool: SerializableTool;
  botId: string;
  orgId: string;
}) {
  console.log("botId", botId);
  console.log("orgId", orgId);
  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Available Functions</CardTitle>
          <CardDescription>
            Functions that this tool provides for your bot to use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(tool.functionsMeta).map(([name, func]) => (
              <div key={name} className="flex items-start space-x-4">
                <Icons.MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">{name}</div>
                  <div className="text-sm text-muted-foreground">
                    {func.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tool Configuration</CardTitle>
          <CardDescription>
            Configure how this tool should work with your bot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Configuration form for {tool.name} will be available here.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

export default function ToolComponentWrapper({
  toolSlug,
  tool,
  botId,
  orgId,
}: ToolComponentWrapperProps) {
  // Check if this is a custom tool
  if (tool.type === "CUSTOM") {
    return <CustomToolComponent tool={tool} botId={botId} orgId={orgId} />;
  }

  // Render the appropriate component based on toolSlug
  switch (toolSlug) {
    case "google-calendar":
      return <GoogleCalendarTool tool={tool} botId={botId} orgId={orgId} />;
    case "lead-capture":
      return <LeadCaptureTool tool={tool} botId={botId} orgId={orgId} />;
    case "gohighlevel-calendar":
      return (
        <GoHighLevelCalendarTool tool={tool} botId={botId} orgId={orgId} />
      );
    case "pause-conversation":
      return <PauseConversationTool tool={tool} botId={botId} orgId={orgId} />;
    default:
      return <DefaultToolComponent tool={tool} botId={botId} orgId={orgId} />;
  }
}
