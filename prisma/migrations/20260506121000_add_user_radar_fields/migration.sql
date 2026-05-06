-- AlterTable (GitHub issue #113: radar / last known position + Expo push token)
ALTER TABLE "users" ADD COLUMN "lastKnownLatitude" DOUBLE PRECISION;
ALTER TABLE "users" ADD COLUMN "lastKnownLongitude" DOUBLE PRECISION;
ALTER TABLE "users" ADD COLUMN "expoPushToken" TEXT;
