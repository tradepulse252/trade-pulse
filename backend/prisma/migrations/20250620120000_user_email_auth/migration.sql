-- AlterTable
ALTER TABLE "users" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "verifyToken" TEXT;
ALTER TABLE "users" ADD COLUMN "verifyCode" TEXT;
ALTER TABLE "users" ADD COLUMN "verifyExpiresAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "users" ADD COLUMN "resetCode" TEXT;
ALTER TABLE "users" ADD COLUMN "resetExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_verifyToken_key" ON "users"("verifyToken");
CREATE UNIQUE INDEX "users_resetToken_key" ON "users"("resetToken");

-- Existing users are treated as verified
UPDATE "users" SET "emailVerified" = true WHERE "emailVerified" = false;
