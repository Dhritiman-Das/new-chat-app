/*
  Warnings:

  - A unique constraint covering the columns `[user_id,tool_id,provider]` on the table `tool_credentials` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "tool_credentials_user_id_tool_id_provider_key" ON "tool_credentials"("user_id", "tool_id", "provider");
