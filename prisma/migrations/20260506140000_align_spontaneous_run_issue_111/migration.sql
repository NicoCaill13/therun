-- Align SpontaneousRun with GitHub issue #111 (locationName, createdAt, maxParticipants default, drop status).

ALTER TABLE "spontaneous_runs" ADD COLUMN "locationName" TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE "spontaneous_runs" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "spontaneous_runs" ALTER COLUMN "maxParticipants" SET DEFAULT 15;
ALTER TABLE "spontaneous_runs" DROP COLUMN "status";

ALTER TABLE "spontaneous_runs" ALTER COLUMN "locationName" DROP DEFAULT;
