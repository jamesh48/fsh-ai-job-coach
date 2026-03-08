/*
  Warnings:

  - You are about to drop the column `defaultPrinter` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `printerType` on the `Settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "defaultPrinter",
DROP COLUMN "printerType";
