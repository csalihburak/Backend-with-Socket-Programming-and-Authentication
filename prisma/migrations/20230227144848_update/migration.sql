-- CreateEnum
CREATE TYPE "Stat" AS ENUM ('ONLINE', 'OFFLINE', 'IN_GAME', 'BUSY');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "pass" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "two_factor_auth" BOOLEAN NOT NULL,
    "played" INTEGER NOT NULL,
    "won" INTEGER NOT NULL,
    "lost" INTEGER NOT NULL,
    "row" INTEGER NOT NULL,
    "stat" "Stat" NOT NULL DEFAULT 'OFFLINE',
    "coalition" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
