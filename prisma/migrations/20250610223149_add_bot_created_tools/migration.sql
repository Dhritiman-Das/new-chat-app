-- AlterTable
ALTER TABLE "tools" ADD COLUMN     "created_by_bot_id" TEXT;

-- CreateIndex
CREATE INDEX "tools_created_by_bot_id_idx" ON "tools"("created_by_bot_id");

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_created_by_bot_id_fkey" FOREIGN KEY ("created_by_bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE; 