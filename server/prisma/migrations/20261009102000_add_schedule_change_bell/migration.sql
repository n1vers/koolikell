ALTER TABLE "Schedule" ADD COLUMN "changeBellEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Schedule" ADD COLUMN "changeBellSoundId" INTEGER;

CREATE INDEX "Schedule_changeBellSoundId_idx" ON "Schedule"("changeBellSoundId");
