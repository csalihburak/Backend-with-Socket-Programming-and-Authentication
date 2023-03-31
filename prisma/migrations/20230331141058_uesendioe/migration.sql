/*
  Warnings:

  - You are about to drop the `stats` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "stats" DROP CONSTRAINT "stats_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "played" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "point" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "row" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "won" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "stats";
