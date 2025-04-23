/*
  Warnings:

  - You are about to drop the `bot_integrations` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `bot_id` on table `integrations` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "bot_integrations" DROP CONSTRAINT "bot_integrations_bot_id_fkey";

-- DropForeignKey
ALTER TABLE "bot_integrations" DROP CONSTRAINT "bot_integrations_integration_id_fkey";

-- AlterTable
ALTER TABLE "integrations" ALTER COLUMN "bot_id" SET NOT NULL;

-- DropTable
DROP TABLE "bot_integrations";
