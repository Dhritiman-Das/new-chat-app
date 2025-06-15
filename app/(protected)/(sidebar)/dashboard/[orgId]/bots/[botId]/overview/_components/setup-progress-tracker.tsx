import Link from "next/link";
import { CheckCircle, Circle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  href: string;
  icon: React.ReactNode;
}

interface SetupProgressTrackerProps {
  orgId: string;
  botId: string;
  counts: {
    knowledgeBases: number;
    botTools: number;
    deployments: number;
    conversations: number;
  };
}

export function SetupProgressTracker({
  orgId,
  botId,
  counts,
}: SetupProgressTrackerProps) {
  const steps: SetupStep[] = [
    {
      id: "tools",
      title: "Add your first tool",
      description: "Connect tools to enable advanced functionality",
      isCompleted: counts.botTools > 0,
      href: `/dashboard/${orgId}/bots/${botId}/tools`,
      icon: <Icons.Hammer className="h-4 w-4" />,
    },
    {
      id: "knowledge",
      title: "Add knowledge base",
      description: "Upload documents or connect websites for context",
      isCompleted: counts.knowledgeBases > 0,
      href: `/dashboard/${orgId}/bots/${botId}/knowledge`,
      icon: <Icons.Database className="h-4 w-4" />,
    },
    {
      id: "conversation",
      title: "Start a conversation",
      description: "Test your bot in the playground",
      isCompleted: counts.conversations > 0,
      href: `/dashboard/${orgId}/bots/${botId}/playground`,
      icon: <Icons.MessageSquare className="h-4 w-4" />,
    },
    {
      id: "deploy",
      title: "Deploy your bot",
      description: "Make your bot available to users",
      isCompleted: counts.deployments > 0,
      href: `/dashboard/${orgId}/bots/${botId}/deployments`,
      icon: <Icons.Globe className="h-4 w-4" />,
    },
  ];

  const completedSteps = steps.filter((step) => step.isCompleted).length;
  const totalSteps = steps.length;
  const isComplete = completedSteps === totalSteps;

  // Find the next step to highlight
  const nextStep = steps.find((step) => !step.isCompleted);

  if (isComplete) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Setup Progress</CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedSteps} of {totalSteps} completed
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(completedSteps / totalSteps) * 100}%`,
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {step.isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {step.icon}
                  <p
                    className={`text-sm font-medium ${
                      step.isCompleted
                        ? "text-green-900 line-through"
                        : step === nextStep
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
                <p
                  className={`text-xs ${
                    step.isCompleted
                      ? "text-green-700"
                      : step === nextStep
                      ? "text-muted-foreground"
                      : "text-muted-foreground/70"
                  }`}
                >
                  {step.description}
                </p>
              </div>
              {!step.isCompleted && step === nextStep && (
                <Button asChild size="sm" variant="outline">
                  <Link href={step.href} className="flex items-center gap-1">
                    Get started
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
