import {
  Organization,
  KnowledgeBase as PrismaKnowledgeBase,
  KnowledgeFile as PrismaKnowledgeFile,
  WebsiteSource as PrismaWebsiteSource,
  UserRole,
} from "@/lib/generated/prisma";

// Extend the metadata type for KnowledgeFile
export interface KnowledgeFileMetadata {
  characterCount?: number;
  [key: string]: unknown;
}

// Extend the metadata type for WebsiteSource
export interface WebsiteSourceMetadata {
  pagesProcessed?: number;
  [key: string]: unknown;
}

// Extend the PrismaKnowledgeFile to add typed metadata
export interface KnowledgeFile extends Omit<PrismaKnowledgeFile, "metadata"> {
  metadata?: KnowledgeFileMetadata;
}

// Extend the PrismaWebsiteSource to add typed metadata
export interface WebsiteSource extends Omit<PrismaWebsiteSource, "metadata"> {
  metadata?: WebsiteSourceMetadata;
}

// Extend the PrismaKnowledgeBase to ensure files property exists
export interface KnowledgeBase extends PrismaKnowledgeBase {
  files: KnowledgeFile[];
  websiteSources?: WebsiteSource[];
}

export interface UserOrganization extends Organization {
  role: UserRole;
}
