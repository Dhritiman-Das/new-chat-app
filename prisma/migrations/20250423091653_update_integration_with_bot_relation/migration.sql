/*
  Warnings:

  - Added the required column `bot_id` to the `integrations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "integrations" ADD COLUMN     "bot_id" TEXT,
ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "integrations_bot_id_idx" ON "integrations"("bot_id");

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
