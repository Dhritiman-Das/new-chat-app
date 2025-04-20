-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'TIMEOUT');

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "client_info" JSONB,
ADD COLUMN     "error_log" JSONB,
ADD COLUMN     "sentiment" DOUBLE PRECISION,
ADD COLUMN     "source" TEXT DEFAULT 'playground',
ADD COLUMN     "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "context_used" JSONB,
ADD COLUMN     "processing_time" INTEGER,
ADD COLUMN     "token_count" INTEGER;

-- CreateTable
CREATE TABLE "tool_executions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "function_name" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "result" JSONB,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP(3),
    "execution_time" INTEGER,
    "error" JSONB,

    CONSTRAINT "tool_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tool_executions_message_id_idx" ON "tool_executions"("message_id");

-- CreateIndex
CREATE INDEX "tool_executions_conversation_id_idx" ON "tool_executions"("conversation_id");

-- CreateIndex
CREATE INDEX "tool_executions_tool_id_idx" ON "tool_executions"("tool_id");

-- CreateIndex
CREATE INDEX "tool_executions_status_idx" ON "tool_executions"("status");

-- CreateIndex
CREATE INDEX "conversations_external_user_id_idx" ON "conversations"("external_user_id");

-- CreateIndex
CREATE INDEX "conversations_source_idx" ON "conversations"("source");

-- CreateIndex
CREATE INDEX "conversations_started_at_idx" ON "conversations"("started_at");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- CreateIndex
CREATE INDEX "messages_timestamp_idx" ON "messages"("timestamp");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
