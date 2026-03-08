/*
  Warnings:

  - A unique constraint covering the columns `[date]` on the table `DailyLog` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "anthropicApiKey" TEXT,
    "defaultPrinter" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_date_key" ON "DailyLog"("date");
