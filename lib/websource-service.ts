import FirecrawlApp, {
  CrawlStatusResponse,
  ScrapeResponse,
  ErrorResponse,
} from "@mendable/firecrawl-js";
import { ScrapingStatus, EmbeddingStatus } from "./generated/prisma";
import { getVectorDb } from "./vectordb";
import { splitDocument } from "./vectordb/utils";
import { prisma } from "./db/prisma";
import { env } from "@/src/env";

// Abstract crawler interface to support different providers in the future
interface WebCrawler {
  scrapeUrl(
    url: string,
    options?: Record<string, unknown>
  ): Promise<ScrapingResult>;
  crawlUrl(
    url: string,
    options?: Record<string, unknown>
  ): Promise<CrawlingResult>;
}

// Result types
interface ScrapingResult {
  success: boolean;
  content?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

interface CrawlingResult {
  success: boolean;
  pages?: Array<{
    url: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
  error?: string;
}

// FirecrawlCrawler implementation
class FirecrawlCrawler implements WebCrawler {
  private client: FirecrawlApp;

  constructor(apiKey?: string) {
    // Use the API key from env if not provided
    this.client = new FirecrawlApp({
      apiKey: apiKey || env.FIRECRAWL_API_KEY,
    });
  }

  async scrapeUrl(
    url: string,
    options: Record<string, unknown> = {}
  ): Promise<ScrapingResult> {
    try {
      const response = (await this.client.scrapeUrl(url, {
        formats: ["markdown"],
        ...options,
      })) as ScrapeResponse;

      if (!response.success) {
        return {
          success: false,
          error:
            (response as unknown as ErrorResponse).error ||
            "Failed to scrape URL",
        };
      }

      return {
        success: true,
        content: response.markdown || "",
        metadata: {
          title: response.title || "",
          description: response.description || "",
          //   html: response.html || "",
        },
      };
    } catch (error) {
      console.error("Error scraping URL:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async crawlUrl(
    url: string,
    options: Record<string, unknown> = {}
  ): Promise<CrawlingResult> {
    try {
      const response = (await this.client.crawlUrl(url, {
        limit: 100,
        scrapeOptions: {
          formats: ["markdown"],
        },
        ...options,
      })) as CrawlStatusResponse;

      if (!response.success) {
        return {
          success: false,
          error:
            (response as unknown as ErrorResponse).error ||
            "Failed to crawl URL",
        };
      }

      const pages =
        response.data?.map((page) => ({
          url: page.metadata?.sourceURL || url,
          content: page.markdown || "",
          metadata: {
            title: page.metadata?.title || "",
            description: page.metadata?.description || "",
            // html: page.metadata?.html || "",
          },
        })) || [];

      return {
        success: true,
        pages,
      };
    } catch (error) {
      console.error("Error crawling URL:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Factory function to get a crawler instance (can be extended for other providers)
export function getWebCrawler(
  provider = "firecrawl",
  apiKey?: string
): WebCrawler {
  switch (provider.toLowerCase()) {
    case "firecrawl":
      return new FirecrawlCrawler(apiKey);
    // Add other providers here
    default:
      return new FirecrawlCrawler(apiKey);
  }
}

/**
 * Process and store a website source in the vector database
 */
export async function processAndStoreWebsite(
  websiteData: {
    url: string;
    isDomain: boolean;
    botId: string;
    orgId: string;
    knowledgeBaseId: string;
  },
  options?: Record<string, unknown>
): Promise<{
  success: boolean;
  websiteId?: string;
  error?: string;
  pagesProcessed?: number;
}> {
  try {
    // Get the knowledge base, creating it if it doesn't exist
    let knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id: websiteData.knowledgeBaseId },
    });

    if (!knowledgeBase && websiteData.knowledgeBaseId === "default") {
      knowledgeBase = await prisma.knowledgeBase.create({
        data: {
          botId: websiteData.botId,
          name: "Default Knowledge Base",
          description: "Default knowledge base for this bot",
        },
      });
    } else if (!knowledgeBase) {
      throw new Error("Knowledge base not found");
    }

    // Create the website source record in the database - initially with PENDING status
    const website = await prisma.websiteSource.create({
      data: {
        knowledgeBaseId: knowledgeBase.id,
        url: websiteData.url,
        isDomain: websiteData.isDomain,
        scrapingStatus: ScrapingStatus.IN_PROGRESS,
        embeddingStatus: EmbeddingStatus.PENDING,
      },
    });

    // Get the web crawler
    const crawler = getWebCrawler();

    // The processing logic depends on whether we're crawling a domain or scraping a single page
    let content: string = "";
    let title: string = "";
    let description: string = "";
    let pagesProcessed = 0;

    if (websiteData.isDomain) {
      // Crawl the entire domain
      const result = await crawler.crawlUrl(websiteData.url, options);

      if (!result.success || !result.pages || result.pages.length === 0) {
        throw new Error(result.error || "Failed to crawl domain");
      }

      // Store each page
      const vectorDb = await getVectorDb();
      pagesProcessed = result.pages.length;

      // Get metadata from the first page if available
      if (result.pages[0]) {
        title = (result.pages[0].metadata?.title as string) || "";
        description = (result.pages[0].metadata?.description as string) || "";
      }

      // Process each page separately
      for (const page of result.pages) {
        // Split the document into chunks
        const documents = await splitDocument(page.content);

        // Prepare batch entries for this page
        const pageTitle = (page.metadata?.title as string) || "";
        const batchEntries = documents.map((doc) => ({
          text: doc.pageContent,
          additionalMetadata: {
            documentId: website.id,
            botId: websiteData.botId,
            namespace: `kb-${knowledgeBase.id}`,
            timestamp: new Date().toISOString(),
            sourceUrl: page.url,
            sourceType: "website",
            pageTitle: pageTitle,
          },
        }));

        // Use batch upsert for this page's chunks
        const upsertResult = await vectorDb.batchUpsert(batchEntries, false);
        if (!upsertResult.success) {
          throw new Error(
            `Failed to store chunks for page ${page.url}: ${upsertResult.error}`
          );
        }
      }
    } else {
      // Scrape a single page
      const result = await crawler.scrapeUrl(websiteData.url, options);

      if (!result.success || !result.content) {
        throw new Error(result.error || "Failed to scrape page");
      }

      content = result.content;
      title = (result.metadata?.title as string) || "";
      description = (result.metadata?.description as string) || "";
      pagesProcessed = 1;

      // Split the document into chunks
      const documents = await splitDocument(content);

      // Get the vector database
      const vectorDb = await getVectorDb();

      // Prepare all chunks for batch processing
      const batchEntries = documents.map((doc) => ({
        text: doc.pageContent,
        additionalMetadata: {
          documentId: website.id,
          botId: websiteData.botId,
          namespace: `kb-${knowledgeBase.id}`,
          timestamp: new Date().toISOString(),
          sourceUrl: websiteData.url,
          sourceType: "website",
          pageTitle: title,
        },
      }));

      // Use batch upsert for better performance
      const upsertResult = await vectorDb.batchUpsert(batchEntries, false);
      if (!upsertResult.success) {
        throw new Error(
          `Failed to store document chunks: ${upsertResult.error}`
        );
      }
    }

    // Update the website record with the metadata and status
    await prisma.websiteSource.update({
      where: { id: website.id },
      data: {
        title,
        description,
        scrapingStatus: ScrapingStatus.COMPLETED,
        embeddingStatus: EmbeddingStatus.COMPLETED,
        lastScrapedAt: new Date(),
        metadata: { pagesProcessed },
      },
    });

    return {
      success: true,
      websiteId: website.id,
      pagesProcessed,
    };
  } catch (error) {
    console.error("Error processing and storing website:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      pagesProcessed: 0,
    };
  }
}

/**
 * Delete a website source and its associated vector embeddings
 */
export async function deleteWebsiteSource(
  websiteId: string,
  botId: string,
  knowledgeBaseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, check if the website exists
    const website = await prisma.websiteSource.findUnique({
      where: { id: websiteId },
      include: { knowledgeBase: true },
    });

    if (!website) {
      throw new Error("Website source not found");
    }

    // Verify the website belongs to the specified knowledge base and bot
    if (
      website.knowledgeBaseId !== knowledgeBaseId ||
      website.knowledgeBase.botId !== botId
    ) {
      throw new Error("Unauthorized access to this website source");
    }

    // Get the vector database
    const vectorDb = await getVectorDb();

    // Delete all vector records associated with this website
    await vectorDb.deleteByFilter({ documentId: websiteId });

    // Delete the website record from the database
    await prisma.websiteSource.delete({
      where: { id: websiteId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting website source and vectors:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
