-- CreateTable: User
CREATE TABLE "User" (
    "id"           TEXT NOT NULL,
    "username"     TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Insert the default user from the existing singleton Settings row.
-- Copies the existing passwordHash so the current password keeps working.
INSERT INTO "User" ("id", "username", "passwordHash", "createdAt")
SELECT
    'usr_default_jamesh4852',
    'jamesh4852',
    COALESCE("passwordHash", ''),
    NOW()
FROM "Settings"
WHERE "id" = 'singleton';

-- Add nullable userId columns for backfill
ALTER TABLE "DailyLog"          ADD COLUMN "userId" TEXT;
ALTER TABLE "AgentEmail"        ADD COLUMN "userId" TEXT;
ALTER TABLE "AgentCalendarEvent" ADD COLUMN "userId" TEXT;
ALTER TABLE "Settings"          ADD COLUMN "userId" TEXT;

-- Backfill all existing rows to the default user
UPDATE "DailyLog"           SET "userId" = 'usr_default_jamesh4852';
UPDATE "AgentEmail"         SET "userId" = 'usr_default_jamesh4852';
UPDATE "AgentCalendarEvent" SET "userId" = 'usr_default_jamesh4852';
UPDATE "Settings"           SET "userId" = 'usr_default_jamesh4852';

-- Make userId NOT NULL
ALTER TABLE "DailyLog"           ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "AgentEmail"         ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "AgentCalendarEvent" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Settings"           ALTER COLUMN "userId" SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE "DailyLog"           ADD CONSTRAINT "DailyLog_userId_fkey"           FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentEmail"         ADD CONSTRAINT "AgentEmail_userId_fkey"         FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentCalendarEvent" ADD CONSTRAINT "AgentCalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Settings"           ADD CONSTRAINT "Settings_userId_fkey"           FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old single-column unique indexes
DROP INDEX "DailyLog_date_key";
DROP INDEX "AgentEmail_emailId_key";
DROP INDEX "AgentCalendarEvent_eventId_key";

-- Add composite unique constraints
CREATE UNIQUE INDEX "DailyLog_userId_date_key"              ON "DailyLog"("userId", "date");
CREATE UNIQUE INDEX "AgentEmail_userId_emailId_key"         ON "AgentEmail"("userId", "emailId");
CREATE UNIQUE INDEX "AgentCalendarEvent_userId_eventId_key" ON "AgentCalendarEvent"("userId", "eventId");

-- Add unique constraint on Settings.userId (one row per user)
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- Drop passwordHash from Settings (now lives on User)
ALTER TABLE "Settings" DROP COLUMN "passwordHash";
