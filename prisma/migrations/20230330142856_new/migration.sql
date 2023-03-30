/*
  Warnings:

  - You are about to alter the column `likes` on the `posts` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `retweets` on the `posts` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "posts" ALTER COLUMN "likes" SET DATA TYPE INTEGER,
ALTER COLUMN "retweets" SET DATA TYPE INTEGER;
