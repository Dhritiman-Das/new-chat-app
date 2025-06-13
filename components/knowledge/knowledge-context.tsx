"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { KnowledgeFile, WebsiteSource } from "@/lib/types/prisma";
import { EmbeddingStatus } from "@/lib/generated/prisma";

interface OptimisticFile extends KnowledgeFile {
  isOptimistic?: boolean;
  isUploading?: boolean;
}

interface OptimisticWebsite extends WebsiteSource {
  isOptimistic?: boolean;
  isProcessing?: boolean;
}

interface KnowledgeContextType {
  // Files
  files: OptimisticFile[];
  setFiles: (files: OptimisticFile[]) => void;
  addOptimisticFile: (
    file: File,
    botId: string,
    knowledgeBaseId: string
  ) => string;
  updateFileAfterUpload: (tempId: string, uploadedFile: KnowledgeFile) => void;
  removeOptimisticFile: (tempId: string) => void;
  removeFile: (fileId: string) => void;
  rollbackFileRemoval: (file: OptimisticFile) => void;

  // Websites
  websites: OptimisticWebsite[];
  setWebsites: (websites: OptimisticWebsite[]) => void;
  addOptimisticWebsite: (
    url: string,
    isDomain: boolean,
    botId: string,
    knowledgeBaseId: string
  ) => string;
  updateWebsiteAfterAdd: (tempId: string, addedWebsite: WebsiteSource) => void;
  removeOptimisticWebsite: (tempId: string) => void;
  removeWebsite: (websiteId: string) => void;
  rollbackWebsiteRemoval: (website: OptimisticWebsite) => void;
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(
  undefined
);

interface KnowledgeProviderProps {
  children: ReactNode;
  initialFiles: KnowledgeFile[];
  initialWebsites: WebsiteSource[];
}

export function KnowledgeProvider({
  children,
  initialFiles,
  initialWebsites,
}: KnowledgeProviderProps) {
  const [files, setFiles] = useState<OptimisticFile[]>(initialFiles);
  const [websites, setWebsites] =
    useState<OptimisticWebsite[]>(initialWebsites);

  // File operations
  const addOptimisticFile = useCallback(
    (file: File, botId: string, knowledgeBaseId: string): string => {
      const tempId = `temp-file-${Date.now()}-${Math.random()}`;
      const optimisticFile: OptimisticFile = {
        id: tempId,
        knowledgeBaseId,
        fileName: file.name,
        fileType: file.type,
        filePath: "",
        fileSize: file.size,
        embeddingStatus: EmbeddingStatus.PENDING,
        metadata: { characterCount: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
        isOptimistic: true,
        isUploading: true,
      };

      setFiles((prev) => [optimisticFile, ...prev]);
      return tempId;
    },
    []
  );

  const updateFileAfterUpload = useCallback(
    (tempId: string, uploadedFile: KnowledgeFile) => {
      setFiles((prev) =>
        prev.map((file) =>
          file.id === tempId
            ? { ...uploadedFile, isOptimistic: false, isUploading: false }
            : file
        )
      );
    },
    []
  );

  const removeOptimisticFile = useCallback((tempId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== tempId));
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
  }, []);

  const rollbackFileRemoval = useCallback((file: OptimisticFile) => {
    setFiles((prev) => [file, ...prev]);
  }, []);

  // Website operations
  const addOptimisticWebsite = useCallback(
    (
      url: string,
      isDomain: boolean,
      botId: string,
      knowledgeBaseId: string
    ): string => {
      const tempId = `temp-website-${Date.now()}-${Math.random()}`;
      const optimisticWebsite: OptimisticWebsite = {
        id: tempId,
        knowledgeBaseId,
        url,
        isDomain,
        title: new URL(url).hostname,
        description: null,
        scrapingStatus: "PENDING" as const,
        embeddingStatus: EmbeddingStatus.PENDING,
        lastScrapedAt: null,
        metadata: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        isOptimistic: true,
        isProcessing: true,
      };

      setWebsites((prev) => [optimisticWebsite, ...prev]);
      return tempId;
    },
    []
  );

  const updateWebsiteAfterAdd = useCallback(
    (tempId: string, addedWebsite: WebsiteSource) => {
      setWebsites((prev) =>
        prev.map((website) =>
          website.id === tempId
            ? { ...addedWebsite, isOptimistic: false, isProcessing: false }
            : website
        )
      );
    },
    []
  );

  const removeOptimisticWebsite = useCallback((tempId: string) => {
    setWebsites((prev) => prev.filter((website) => website.id !== tempId));
  }, []);

  const removeWebsite = useCallback((websiteId: string) => {
    setWebsites((prev) => prev.filter((website) => website.id !== websiteId));
  }, []);

  const rollbackWebsiteRemoval = useCallback((website: OptimisticWebsite) => {
    setWebsites((prev) => [website, ...prev]);
  }, []);

  const value: KnowledgeContextType = {
    files,
    setFiles,
    addOptimisticFile,
    updateFileAfterUpload,
    removeOptimisticFile,
    removeFile,
    rollbackFileRemoval,
    websites,
    setWebsites,
    addOptimisticWebsite,
    updateWebsiteAfterAdd,
    removeOptimisticWebsite,
    removeWebsite,
    rollbackWebsiteRemoval,
  };

  return (
    <KnowledgeContext.Provider value={value}>
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledge() {
  const context = useContext(KnowledgeContext);
  if (context === undefined) {
    throw new Error("useKnowledge must be used within a KnowledgeProvider");
  }
  return context;
}
