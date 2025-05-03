/*
  Warnings:

  - A unique constraint covering the columns `[user_id,provider,name]` on the table `credentials` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "credentials_user_id_provider_key";

-- AlterTable
ALTER TABLE "credentials" ADD COLUMN     "bot_id" TEXT,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Default';

-- CreateIndex
CREATE INDEX "credentials_bot_id_idx" ON "credentials"("bot_id");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_user_id_provider_name_key" ON "credentials"("user_id", "provider", "name");

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
