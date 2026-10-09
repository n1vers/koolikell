ALTER TABLE "Profile" ADD COLUMN "preBellMinutes" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Profile" ADD COLUMN "lessonDurationMinutes" INTEGER NOT NULL DEFAULT 45;
ALTER TABLE "Profile" ADD COLUMN "changeBellEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "changeBellSoundId" INTEGER;

CREATE INDEX "Profile_changeBellSoundId_idx" ON "Profile"("changeBellSoundId");
