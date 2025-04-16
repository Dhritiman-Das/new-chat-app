-- AlterTable
ALTER TABLE "bot_tools" ADD COLUMN     "tool_credential_id" TEXT;

-- AlterTable
ALTER TABLE "tools" ADD COLUMN     "functions" JSONB;

-- CreateTable
CREATE TABLE "tool_credentials" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "credentials" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tool_credentials_tool_id_idx" ON "tool_credentials"("tool_id");

-- CreateIndex
CREATE INDEX "tool_credentials_user_id_idx" ON "tool_credentials"("user_id");

-- CreateIndex
CREATE INDEX "bot_tools_tool_credential_id_idx" ON "bot_tools"("tool_credential_id");

-- AddForeignKey
ALTER TABLE "tool_credentials" ADD CONSTRAINT "tool_credentials_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_credentials" ADD CONSTRAINT "tool_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_tools" ADD CONSTRAINT "bot_tools_tool_credential_id_fkey" FOREIGN KEY ("tool_credential_id") REFERENCES "tool_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
