/*
  Warnings:

  - Added the required column `userCount` to the `Games` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Games" ADD COLUMN     "userCount" INTEGER NOT NULL;
