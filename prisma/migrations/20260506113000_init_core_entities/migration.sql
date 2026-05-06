-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "garminToken" TEXT,
    "stravaToken" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spontaneous_runs" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "vibe" TEXT NOT NULL,
    "maxParticipants" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "spontaneous_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phantom_traces" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phantom_traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crews" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "crews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spontaneous_runs_latitude_longitude_idx" ON "spontaneous_runs"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "phantom_traces_latitude_longitude_idx" ON "phantom_traces"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "spontaneous_runs" ADD CONSTRAINT "spontaneous_runs_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crews" ADD CONSTRAINT "crews_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
