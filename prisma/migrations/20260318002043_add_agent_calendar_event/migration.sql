-- CreateTable
CREATE TABLE "AgentCalendarEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "start" TEXT,
    "end" TEXT,
    "organizer" TEXT,
    "classification" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentCalendarEvent_eventId_key" ON "AgentCalendarEvent"("eventId");
