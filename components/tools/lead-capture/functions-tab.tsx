"use client";

import { Icons } from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SerializableTool } from "./types";

interface FunctionsTabProps {
  tool: SerializableTool;
}

export function FunctionsTab({ tool }: FunctionsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Functions</CardTitle>
        <CardDescription>
          Functions this tool provides for your bot to use
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(tool.functionsMeta).map(([name, func]) => (
            <div key={name} className="space-y-2">
              <div className="flex items-start space-x-4">
                <Icons.MessageCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{name}</h3>
                    <div className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Function
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {func.description}
                  </p>
                </div>
              </div>
              <Separator className="my-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
