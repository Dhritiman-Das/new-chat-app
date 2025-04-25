-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "bot_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "calendar_id" TEXT,
    "external_event_id" TEXT,
    "calendar_provider" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "location" TEXT,
    "status" TEXT DEFAULT 'confirmed',
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "time_zone" TEXT,
    "organizer" JSONB,
    "attendees" JSONB,
    "recurring_pattern" TEXT,
    "meeting_link" TEXT,
    "source" TEXT DEFAULT 'chat',
    "properties" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointments_bot_id_idx" ON "appointments"("bot_id");

-- CreateIndex
CREATE INDEX "appointments_conversation_id_idx" ON "appointments"("conversation_id");

-- CreateIndex
CREATE INDEX "appointments_calendar_provider_idx" ON "appointments"("calendar_provider");

-- CreateIndex
CREATE INDEX "appointments_start_time_idx" ON "appointments"("start_time");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_created_at_idx" ON "appointments"("created_at");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
