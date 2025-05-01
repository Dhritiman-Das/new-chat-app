import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChevronRight,
  Database,
  Hammer,
  MessageCircle,
  ArrowUpRight,
} from "@/components/icons";
import { Bot } from "@/lib/generated/prisma";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Extended type for the bot with organization information
export interface BotWithOrg extends Bot {
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  _count: {
    knowledgeBases: number;
    botTools: number;
    deployments: number;
    conversations: number;
  };
}

interface BotCardProps {
  bot: BotWithOrg;
  orgId: string;
}

export function BotCard({ bot, orgId }: BotCardProps) {
  return (
    <Link
      href={`/dashboard/${orgId}/bots/${bot.id}/overview`}
      className="group"
    >
      <Card className="h-full transition-all border-border/40 hover:border-border/80 hover:shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  bot.isActive ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              <CardTitle className="text-lg">{bot.name}</CardTitle>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <CardDescription className="line-clamp-2 h-10">
            {bot.description || "No description provided"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" />
                    <span>{bot._count.knowledgeBases}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Knowledge Bases</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1">
                    <Hammer className="h-3.5 w-3.5" />
                    <span>{bot._count.botTools}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Active Tools</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span>{bot._count.deployments}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Active Deployments</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>
              {bot._count.conversations
                ? `${bot._count.conversations} conversations in last 7 days`
                : "No recent conversations"}
            </span>
          </div>
          <div>Created {new Date(bot.createdAt).toLocaleDateString()}</div>
        </CardFooter>
      </Card>
    </Link>
  );
}
