/*
  Warnings:

  - Added the required column `leftPlayerImg` to the `gameHistorys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rightPlayerImg` to the `gameHistorys` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "gameHistorys" ADD COLUMN     "leftPlayerImg" TEXT NOT NULL,
ADD COLUMN     "rightPlayerImg" TEXT NOT NULL;
