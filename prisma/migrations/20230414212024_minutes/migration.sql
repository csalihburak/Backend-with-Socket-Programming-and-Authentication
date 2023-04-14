-- AlterTable
ALTER TABLE "friendRequests" ALTER COLUMN "time" SET DEFAULT CURRENT_TIMESTAMP + INTERVAL '3 hours';

-- AlterTable
ALTER TABLE "validations" ALTER COLUMN "expired_date" SET DEFAULT (now() + interval '2 minutes');
