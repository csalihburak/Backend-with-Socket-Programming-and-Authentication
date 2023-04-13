-- CreateEnum
CREATE TYPE "stat" AS ENUM ('ONLINE', 'OFFLINE', 'IN_GAME', 'BUSY');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "pass" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "pictureUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "achievements" TEXT[],
    "friends" INTEGER[],
    "blockedUsers" INTEGER[],
    "two_factor_auth" BOOLEAN NOT NULL DEFAULT false,
    "status" "stat" NOT NULL DEFAULT 'OFFLINE',
    "point" INTEGER NOT NULL DEFAULT 0,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "row" INTEGER NOT NULL DEFAULT 0,
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
CREATE TABLE "games" (
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

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "friendRequests" (
    "id" SERIAL NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '3 hours',

    CONSTRAINT "friendRequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gameHistorys" (
    "id" SERIAL NOT NULL,
    "leftPlayer" TEXT NOT NULL,
    "rightPlayer" TEXT NOT NULL,
    "leftPlayerScore" INTEGER NOT NULL,
    "rightPlayerScore" INTEGER NOT NULL,
    "leftPlayerImg" TEXT NOT NULL,
    "rightPlayerImg" TEXT NOT NULL,
    "gameTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gameHistorys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userMute" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "mutedTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelsId" INTEGER,

    CONSTRAINT "userMute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" SERIAL NOT NULL,
    "channelName" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "userIds" INTEGER[],
    "adminIds" INTEGER[],
    "BannedUsers" INTEGER[],
    "public" BOOLEAN NOT NULL DEFAULT true,
    "password" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channelMessages" (
    "id" SERIAL NOT NULL,
    "channelId" INTEGER NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channelMessages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "content" TEXT NOT NULL,
    "likes" INTEGER NOT NULL,
    "retweets" INTEGER NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessionTokens_token_key" ON "sessionTokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "games_gameId_key" ON "games"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "games_hash_key" ON "games"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "channels_channelName_key" ON "channels"("channelName");

-- AddForeignKey
ALTER TABLE "userMute" ADD CONSTRAINT "userMute_channelsId_fkey" FOREIGN KEY ("channelsId") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
