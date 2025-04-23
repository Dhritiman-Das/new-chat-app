-- AlterTable
ALTER TABLE "deployments" ADD COLUMN     "integration_id" TEXT;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
