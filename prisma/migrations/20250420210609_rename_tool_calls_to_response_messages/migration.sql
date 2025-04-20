/*
  Warnings:

  - You are about to drop the column `tool_calls` on the `messages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "messages" DROP COLUMN "tool_calls",
ADD COLUMN     "response_messages" JSONB;
