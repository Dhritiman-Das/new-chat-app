/*
  Warnings:

  - A unique constraint covering the columns `[bot_id,provider]` on the table `credentials` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "credentials_user_id_provider_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "credentials_bot_id_provider_key" ON "credentials"("bot_id", "provider");
