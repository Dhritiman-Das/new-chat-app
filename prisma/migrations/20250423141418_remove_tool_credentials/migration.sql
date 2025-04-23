/*
  Warnings:

  - You are about to drop the column `tool_credential_id` on the `bot_tools` table. All the data in the column will be lost.
  - You are about to drop the `tool_credentials` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bot_tools" DROP CONSTRAINT "bot_tools_tool_credential_id_fkey";

-- DropForeignKey
ALTER TABLE "tool_credentials" DROP CONSTRAINT "tool_credentials_tool_id_fkey";

-- DropForeignKey
ALTER TABLE "tool_credentials" DROP CONSTRAINT "tool_credentials_user_id_fkey";

-- DropIndex
DROP INDEX "bot_tools_tool_credential_id_idx";

-- AlterTable
ALTER TABLE "bot_tools" DROP COLUMN "tool_credential_id";

-- DropTable
DROP TABLE "tool_credentials";
