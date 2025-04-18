import {
  Organization,
  KnowledgeBase as PrismaKnowledgeBase,
  KnowledgeFile as PrismaKnowledgeFile,
  UserRole,
} from "@/lib/generated/prisma";

// Extend the metadata type for KnowledgeFile
export interface KnowledgeFileMetadata {
  characterCount?: number;
  [key: string]: unknown;
}

// Extend the PrismaKnowledgeFile to add typed metadata
export interface KnowledgeFile extends Omit<PrismaKnowledgeFile, "metadata"> {
  metadata?: KnowledgeFileMetadata;
}

// Extend the PrismaKnowledgeBase to ensure files property exists
export interface KnowledgeBase extends PrismaKnowledgeBase {
  files: KnowledgeFile[];
}

export interface UserOrganization extends Organization {
  role: UserRole;
}
