-- AlterTable
ALTER TABLE "integrations" ADD COLUMN     "config" JSONB;

-- CreateTable
CREATE TABLE "oauth_states" (
    "state" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("state")
);

-- CreateIndex
CREATE INDEX "oauth_states_expires_at_idx" ON "oauth_states"("expires_at");
