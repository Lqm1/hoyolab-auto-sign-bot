-- DropIndex
DROP INDEX "HoYoLABAccount_ltoken_v2_key";

-- DropIndex
DROP INDEX "HoYoLABAccount_ltuid_v2_key";

-- CreateIndex
CREATE UNIQUE INDEX "HoYoLABAccount_ltuid_v2_discordUserId_key" ON "HoYoLABAccount"("ltuid_v2", "discordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "HoYoLABAccount_ltoken_v2_discordUserId_key" ON "HoYoLABAccount"("ltoken_v2", "discordUserId");
