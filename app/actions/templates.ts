"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { getUser } from "@/utils/auth";
import type { ActionResponse } from "./types";
import { revalidateTag } from "next/cache";
import prisma from "@/lib/db/prisma";
// Action client
const action = createSafeActionClient();

// Input schema for creating a template
const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  content: z.string().min(1, "Template content is required"),
  isPublic: z.boolean().default(false),
  organizationId: z.string(),
  categories: z.array(z.string()),
  placeholderSchema: z.record(z.any()).optional(),
});

// Create template action
export const createTemplate = action
  .schema(createTemplateSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const user = await getUser();
      const {
        categories,
        content,
        description,
        isPublic,
        name,
        organizationId,
        placeholderSchema: placeholderSchemaInput,
      } = parsedInput;
      if (!user) {
        return {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        };
      }

      // Extract placeholders from content using regex
      const placeholderRegex = /\{\{([^}]+)\}\}/g;
      const matches = [...content.matchAll(placeholderRegex)];
      const placeholders = matches.map((match) => match[1].trim());

      // Generate placeholder schema if not provided
      const placeholderSchema = placeholderSchemaInput || {
        placeholders: placeholders.map((placeholder) => ({
          id: placeholder,
          name: placeholder
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
          description: `Enter value for ${placeholder}`,
          type: "string",
          required: true,
          defaultValue: "",
        })),
      };
      console.log(
        JSON.stringify({
          name,
          description: description || null,
          content,
          isPublic,
          organizationId,
          createdBy: user.id,
          placeholderSchema: placeholderSchema,
          categories: {
            connect: categories.map((id) => ({ id })),
          },
        })
      );

      // Check if categories exist, create them if they don't
      const categoryPromises = categories.map(async (categorySlug) => {
        const existingCategory = await prisma.templateCategory.findUnique({
          where: { slug: categorySlug },
        });

        if (!existingCategory) {
          // If the category doesn't exist, create it with the slug
          console.log(`Category ${categorySlug} not found, creating it...`);
          await prisma.templateCategory.create({
            data: {
              name: categorySlug
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" "),
              slug: categorySlug,
            },
          });
        }
      });

      await Promise.all(categoryPromises);

      // Get fresh category IDs using the slugs
      const categoryEntities = await prisma.templateCategory.findMany({
        where: {
          slug: { in: categories },
        },
      });

      // Create template with categories
      const template = await prisma.template.create({
        data: {
          name,
          description: description || null,
          content,
          isPublic,
          organizationId,
          createdBy: user.id,
          placeholderSchema: placeholderSchema,
          categories: {
            connect: categoryEntities.map((category) => ({ id: category.id })),
          },
        },
      });

      revalidateTag("templates");

      return {
        success: true,
        data: template,
      };
    } catch (error) {
      console.error("Error creating template:", error);
      return {
        success: false,
        error: {
          code: "FAILED_TO_CREATE_TEMPLATE",
          message: "Failed to create template",
        },
      };
    }
  });

// Input schema for applying a template
const applyTemplateSchema = z.object({
  templateId: z.string(),
  botId: z.string(),
  values: z.record(z.string()),
});

// Apply template action - updates a bot's system prompt with template content
export const applyTemplate = action
  .schema(applyTemplateSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const user = await getUser();
      const { templateId, botId, values } = parsedInput;
      if (!user) {
        return {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        };
      }

      // Get the template
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return {
          success: false,
          error: {
            code: "TEMPLATE_NOT_FOUND",
            message: "Template not found",
          },
        };
      }

      // Get the bot and verify user has access
      const bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId: user.id,
        },
      });

      if (!bot) {
        return {
          success: false,
          error: {
            code: "BOT_NOT_FOUND_OR_UNAUTHORIZED",
            message: "Bot not found or unauthorized",
          },
        };
      }

      // Replace placeholders in template content
      let content = template.content;
      for (const [key, value] of Object.entries(values)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      }

      // Update bot's system prompt
      const updatedBot = await prisma.bot.update({
        where: { id: botId },
        data: {
          systemPrompt: content,
        },
      });

      // Increment template usage count
      await prisma.template.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      });

      revalidateTag("bots");

      return {
        success: true,
        data: updatedBot,
      };
    } catch (error) {
      console.error("Error applying template:", error);
      return {
        success: false,
        error: {
          code: "FAILED_TO_APPLY_TEMPLATE",
          message: "Failed to apply template",
        },
      };
    }
  });

// Input schema for categories
const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  slug: z.string().min(1, "Slug is required"),
});

// Create category action
export const createCategory = action
  .schema(createCategorySchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const user = await getUser();
      const { name, description, slug } = parsedInput;
      if (!user) {
        return {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          },
        };
      }

      const category = await prisma.templateCategory.create({
        data: {
          name,
          description: description || null,
          slug,
        },
      });

      revalidateTag("template-categories");

      return {
        success: true,
        data: category,
      };
    } catch (error) {
      console.error("Error creating category:", error);
      return {
        success: false,
        error: {
          code: "FAILED_TO_CREATE_CATEGORY",
          message: "Failed to create category",
        },
      };
    }
  });
