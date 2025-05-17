-- CreateEnum
CREATE TYPE "ScrapingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'RATE_LIMITED');

-- CreateTable
CREATE TABLE "website_sources" (
    "id" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "is_domain" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "description" TEXT,
    "scraping_status" "ScrapingStatus" NOT NULL DEFAULT 'PENDING',
    "embedding_status" "EmbeddingStatus" NOT NULL DEFAULT 'PENDING',
    "last_scraped_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "website_sources_knowledge_base_id_idx" ON "website_sources"("knowledge_base_id");

-- CreateIndex
CREATE INDEX "website_sources_url_idx" ON "website_sources"("url");

-- CreateIndex
CREATE INDEX "website_sources_scraping_status_idx" ON "website_sources"("scraping_status");

-- CreateIndex
CREATE INDEX "website_sources_embedding_status_idx" ON "website_sources"("embedding_status");

-- AddForeignKey
ALTER TABLE "website_sources" ADD CONSTRAINT "website_sources_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
