-- CreateTable
CREATE TABLE "Listen" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "userId" TEXT,
    "listenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Listen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Listen_trackId_idx" ON "Listen"("trackId");

-- CreateIndex
CREATE INDEX "Listen_userId_idx" ON "Listen"("userId");

-- CreateIndex
CREATE INDEX "Listen_listenedAt_idx" ON "Listen"("listenedAt");

-- CreateIndex
CREATE INDEX "Listen_ipAddress_idx" ON "Listen"("ipAddress");

-- AddForeignKey
ALTER TABLE "Listen" ADD CONSTRAINT "Listen_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listen" ADD CONSTRAINT "Listen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
