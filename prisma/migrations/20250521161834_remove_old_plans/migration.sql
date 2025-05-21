/*
  Warnings:

  - The values [FREE,STARTER,ENTERPRISE] on the enum `PlanType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlanType_new" AS ENUM ('HOBBY', 'STANDARD', 'PRO', 'CUSTOM');
ALTER TABLE "organizations" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "organizations" ALTER COLUMN "plan" TYPE "PlanType_new" USING ("plan"::text::"PlanType_new");
ALTER TABLE "plan_limits" ALTER COLUMN "planType" TYPE "PlanType_new" USING ("planType"::text::"PlanType_new");
ALTER TABLE "subscriptions" ALTER COLUMN "planType" TYPE "PlanType_new" USING ("planType"::text::"PlanType_new");
ALTER TYPE "PlanType" RENAME TO "PlanType_old";
ALTER TYPE "PlanType_new" RENAME TO "PlanType";
DROP TYPE "PlanType_old";
ALTER TABLE "organizations" ALTER COLUMN "plan" SET DEFAULT 'HOBBY';
COMMIT;

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "plan" SET DEFAULT 'HOBBY';
