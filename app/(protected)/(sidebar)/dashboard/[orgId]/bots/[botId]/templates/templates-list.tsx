"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { UseTemplateDialog } from "./use-template-dialog";

interface Template {
  id: string;
  name: string;
  description: string;
  categories: { name: string }[];
  usageCount: number;
}

interface TemplatesListProps {
  orgId: string;
  botId: string;
  templateType: "public" | "organization" | "my";
}

export default function TemplatesList({
  orgId,
  botId,
  templateType,
}: TemplatesListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    // This would be replaced with an actual API call
    const fetchTemplates = async () => {
      setIsLoading(true);

      // Simulate API call with setTimeout
      setTimeout(() => {
        // Sample data - in a real implementation, this would come from the API
        const sampleTemplates: Template[] = [
          {
            id: "1",
            name: "Customer Support Bot",
            description:
              "A template for customer support bots with FAQ handling capabilities.",
            categories: [{ name: "Customer Support" }],
            usageCount: 245,
          },
          {
            id: "2",
            name: "Sales Assistant",
            description:
              "Helps qualify leads and answer questions about products.",
            categories: [{ name: "Sales" }, { name: "Lead Generation" }],
            usageCount: 120,
          },
          {
            id: "3",
            name: "Product Specialist",
            description:
              "Detailed knowledge about your product catalog with technical specifications.",
            categories: [{ name: "Support" }, { name: "Product" }],
            usageCount: 87,
          },
          {
            id: "4",
            name: "Educational Tutor",
            description:
              "Provides personalized learning assistance and answers academic questions across subjects.",
            categories: [{ name: "Education" }, { name: "Tutoring" }],
            usageCount: 178,
          },
          {
            id: "5",
            name: "Healthcare Advisor",
            description:
              "Offers general health information and helps users find appropriate medical resources.",
            categories: [{ name: "Healthcare" }, { name: "Wellness" }],
            usageCount: 156,
          },
          {
            id: "6",
            name: "HR Assistant",
            description:
              "Streamlines recruitment processes and answers common employee questions.",
            categories: [{ name: "HR" }, { name: "Recruiting" }],
            usageCount: 134,
          },
          {
            id: "7",
            name: "Financial Advisor",
            description:
              "Provides personal finance guidance and answers questions about budgeting and investments.",
            categories: [{ name: "Finance" }, { name: "Advisory" }],
            usageCount: 205,
          },
          {
            id: "8",
            name: "Travel Planner",
            description:
              "Helps users plan trips, find accommodations, and discover attractions.",
            categories: [{ name: "Travel" }, { name: "Hospitality" }],
            usageCount: 167,
          },
          {
            id: "9",
            name: "Fitness Coach",
            description:
              "Provides workout plans, nutrition advice, and motivation for fitness goals.",
            categories: [{ name: "Fitness" }, { name: "Health" }],
            usageCount: 143,
          },
          {
            id: "10",
            name: "E-commerce Assistant",
            description:
              "Guides shoppers through product selection and answers questions about inventory.",
            categories: [{ name: "E-commerce" }, { name: "Retail" }],
            usageCount: 223,
          },
          {
            id: "11",
            name: "Legal Guide",
            description:
              "Provides general legal information and helps direct users to appropriate resources.",
            categories: [{ name: "Legal" }, { name: "Advisory" }],
            usageCount: 98,
          },
          {
            id: "12",
            name: "Entertainment Recommender",
            description:
              "Suggests movies, music, and other entertainment based on user preferences.",
            categories: [
              { name: "Entertainment" },
              { name: "Recommendations" },
            ],
            usageCount: 188,
          },
          {
            id: "13",
            name: "Restaurant Concierge",
            description:
              "Handles reservations, menu inquiries, and special requests for dining establishments.",
            categories: [{ name: "Food Service" }, { name: "Hospitality" }],
            usageCount: 112,
          },
        ];

        setTemplates(sampleTemplates);
        setIsLoading(false);
      }, 1000);
    };

    fetchTemplates();
  }, [templateType]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <Icons.File className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No templates found</h3>
        <p className="text-muted-foreground">
          {templateType === "public"
            ? "There are no public templates available yet."
            : templateType === "organization"
            ? "Your organization has not created any templates yet."
            : "You haven't created any templates yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card key={template.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg line-clamp-1">
              {template.name}
            </CardTitle>
            <div className="flex flex-wrap gap-1 mt-1">
              {template.categories.map((category) => (
                <Badge
                  key={category.name}
                  variant="secondary"
                  className="text-xs"
                >
                  {category.name}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="line-clamp-2 min-h-[48px]">
              {template.description}
            </CardDescription>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              Used {template.usageCount} times
            </div>
            <UseTemplateDialog
              template={template}
              orgId={orgId}
              botId={botId}
            />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
