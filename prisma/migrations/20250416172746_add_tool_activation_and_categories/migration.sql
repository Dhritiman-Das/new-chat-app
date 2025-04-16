-- AlterTable
ALTER TABLE "bot_tools" ADD COLUMN     "is_enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "tool_credentials" ADD COLUMN     "expires_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tools" ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "functions_schema" JSONB,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "version" TEXT NOT NULL DEFAULT '1.0.0';

-- CreateTable
CREATE TABLE "tool_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_usage_metrics" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "bot_id" TEXT NOT NULL,
    "function_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "last_used" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_usage_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_execution_errors" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "bot_id" TEXT,
    "function_name" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "error_stack" TEXT,
    "params" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_execution_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tool_categories_slug_key" ON "tool_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tool_usage_metrics_tool_id_bot_id_function_id_key" ON "tool_usage_metrics"("tool_id", "bot_id", "function_id");

-- CreateIndex
CREATE INDEX "tool_execution_errors_tool_id_idx" ON "tool_execution_errors"("tool_id");

-- CreateIndex
CREATE INDEX "tool_credentials_provider_idx" ON "tool_credentials"("provider");

-- CreateIndex
CREATE INDEX "tools_category_id_idx" ON "tools"("category_id");

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "tool_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_usage_metrics" ADD CONSTRAINT "tool_usage_metrics_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_usage_metrics" ADD CONSTRAINT "tool_usage_metrics_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_execution_errors" ADD CONSTRAINT "tool_execution_errors_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
