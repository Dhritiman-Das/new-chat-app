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
  Building,
  MessageCircle,
} from "@/components/icons";
import { Bot } from "@/lib/generated/prisma";

// Extended type for the bot with organization information
export interface BotWithOrg extends Bot {
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
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
        <CardContent className="pb-2 text-sm text-muted-foreground space-y-2">
          <div className="flex items-center gap-1">
            <Database className="h-3.5 w-3.5" />
            <span>Knowledge Bases: 0</span>
          </div>
          <div className="flex items-center gap-1">
            <Building className="h-3.5 w-3.5" />
            <span>Organization: {bot.organization.name}</span>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>No recent conversations</span>
          </div>
          <div>Created {new Date(bot.createdAt).toLocaleDateString()}</div>
        </CardFooter>
      </Card>
    </Link>
  );
}
