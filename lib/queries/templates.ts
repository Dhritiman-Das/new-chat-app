import { unstable_cache } from "next/cache";
import prisma from "../db/prisma";

// Get all template categories
export const getTemplateCategories = unstable_cache(
  async () => {
    try {
      const categories = await prisma.templateCategory.findMany({
        orderBy: { name: "asc" },
      });

      return {
        success: true,
        data: categories,
      };
    } catch (error) {
      console.error("Error fetching template categories:", error);
      return {
        success: false,
        error: "Failed to fetch template categories",
      };
    }
  },
  ["template-categories"],
  { revalidate: 60, tags: ["template-categories"] }
);

// Get all public templates
export const getPublicTemplates = unstable_cache(
  async (search?: string) => {
    try {
      const templates = await prisma.template.findMany({
        where: {
          isPublic: true,
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { description: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { usageCount: "desc" },
      });

      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      console.error("Error fetching public templates:", error);
      return {
        success: false,
        error: "Failed to fetch public templates",
      };
    }
  },
  ["public-templates"],
  { revalidate: 60, tags: ["templates"] }
);

// Get organization templates
export const getOrganizationTemplates = unstable_cache(
  async (organizationId: string, search?: string) => {
    try {
      const templates = await prisma.template.findMany({
        where: {
          organizationId,
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { description: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      console.error("Error fetching organization templates:", error);
      return {
        success: false,
        error: "Failed to fetch organization templates",
      };
    }
  },
  ["organization-templates"],
  { revalidate: 60, tags: ["templates"] }
);

// Get user created templates
export const getUserTemplates = unstable_cache(
  async (userId: string, search?: string) => {
    try {
      const templates = await prisma.template.findMany({
        where: {
          createdBy: userId,
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { description: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      console.error("Error fetching user templates:", error);
      return {
        success: false,
        error: "Failed to fetch user templates",
      };
    }
  },
  ["user-templates"],
  { revalidate: 60, tags: ["templates"] }
);

// Get a single template by ID
export const getTemplateById = unstable_cache(
  async (templateId: string) => {
    try {
      const template = await prisma.template.findUnique({
        where: { id: templateId },
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!template) {
        return {
          success: false,
          error: "Template not found",
        };
      }

      return {
        success: true,
        data: template,
      };
    } catch (error) {
      console.error("Error fetching template:", error);
      return {
        success: false,
        error: "Failed to fetch template",
      };
    }
  },
  ["template-by-id"],
  { revalidate: 60, tags: ["templates"] }
);
