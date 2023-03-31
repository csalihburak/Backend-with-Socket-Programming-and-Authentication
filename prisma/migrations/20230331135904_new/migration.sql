/*
  Warnings:

  - You are about to drop the column `lost` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `played` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `point` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `row` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stat` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `won` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "lost",
DROP COLUMN "played",
DROP COLUMN "point",
DROP COLUMN "row",
DROP COLUMN "stat",
DROP COLUMN "won",
ADD COLUMN     "status" "stat" NOT NULL DEFAULT 'OFFLINE';

-- CreateTable
CREATE TABLE "stats" (
    "id" SERIAL NOT NULL,
    "point" INTEGER NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "row" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "stats_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "stats" ADD CONSTRAINT "stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
