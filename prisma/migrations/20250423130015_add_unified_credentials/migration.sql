-- AlterTable
ALTER TABLE "bot_tools" ADD COLUMN     "credential_id" TEXT;

-- AlterTable
ALTER TABLE "integrations" ADD COLUMN     "credential_id" TEXT;

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "credentials" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credentials_user_id_idx" ON "credentials"("user_id");

-- CreateIndex
CREATE INDEX "credentials_provider_idx" ON "credentials"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_user_id_provider_key" ON "credentials"("user_id", "provider");

-- CreateIndex
CREATE INDEX "bot_tools_credential_id_idx" ON "bot_tools"("credential_id");

-- CreateIndex
CREATE INDEX "integrations_credential_id_idx" ON "integrations"("credential_id");

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_tools" ADD CONSTRAINT "bot_tools_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
