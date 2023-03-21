-- CreateEnum
CREATE TYPE "Stat" AS ENUM ('ONLINE', 'OFFLINE', 'IN_GAME', 'BUSY');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "pass" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "pictureUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "two_factor_auth" BOOLEAN NOT NULL DEFAULT false,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "row" INTEGER NOT NULL DEFAULT 0,
    "stat" "Stat" NOT NULL DEFAULT 'OFFLINE',
    "coalition" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessionTokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "loginIp" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "loginTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessionTokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Games" (
    "id" SERIAL NOT NULL,
    "leftPlayerId" INTEGER NOT NULL,
    "rightPlayerId" INTEGER NOT NULL,
    "map" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL,
    "hash" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "userIds" INTEGER[],
    "userCount" INTEGER NOT NULL,

    CONSTRAINT "Games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "validcode" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "expired_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessionTokens_token_key" ON "sessionTokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Games_hash_key" ON "Games"("hash");
