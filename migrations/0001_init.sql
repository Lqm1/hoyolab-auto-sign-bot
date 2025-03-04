-- CreateTable
CREATE TABLE "DiscordUser" (
    "id" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "HoYoLABAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ltuid_v2" INTEGER NOT NULL,
    "ltoken_v2" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    CONSTRAINT "HoYoLABAccount_discordUserId_fkey" FOREIGN KEY ("discordUserId") REFERENCES "DiscordUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HoYoLABAccount_ltuid_v2_key" ON "HoYoLABAccount"("ltuid_v2");

-- CreateIndex
CREATE UNIQUE INDEX "HoYoLABAccount_ltoken_v2_key" ON "HoYoLABAccount"("ltoken_v2");
