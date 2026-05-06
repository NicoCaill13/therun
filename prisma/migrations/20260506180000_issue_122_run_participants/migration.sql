-- AlterTable
ALTER TABLE "users" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "spontaneous_runs" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "run_participants" (
    "userId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "run_participants_pkey" PRIMARY KEY ("userId","runId")
);

-- AddForeignKey
ALTER TABLE "run_participants" ADD CONSTRAINT "run_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_participants" ADD CONSTRAINT "run_participants_runId_fkey" FOREIGN KEY ("runId") REFERENCES "spontaneous_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
