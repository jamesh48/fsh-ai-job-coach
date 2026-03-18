-- CreateTable
CREATE TABLE "AgentEmail" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "classification" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentEmail_emailId_key" ON "AgentEmail"("emailId");
