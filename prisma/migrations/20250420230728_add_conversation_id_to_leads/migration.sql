-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "conversation_id" TEXT;

-- CreateIndex
CREATE INDEX "leads_conversation_id_idx" ON "leads"("conversation_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
