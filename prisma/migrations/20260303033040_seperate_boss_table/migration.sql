/*
  Warnings:

  - You are about to drop the column `questId` on the `BossQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `bossChallenge` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `bossDamage` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `bossDifficulty` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `bossGoal` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `bossHp` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `bossLoot` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `bossName` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `bossXpReward` on the `Quest` table. All the data in the column will be lost.
  - Added the required column `bossId` to the `BossQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BossQuestion" DROP CONSTRAINT "BossQuestion_questId_fkey";

-- DropIndex
DROP INDEX "BossQuestion_questId_idx";

-- AlterTable
ALTER TABLE "BossQuestion" DROP COLUMN "questId",
ADD COLUMN     "bossId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Quest" DROP COLUMN "bossChallenge",
DROP COLUMN "bossDamage",
DROP COLUMN "bossDifficulty",
DROP COLUMN "bossGoal",
DROP COLUMN "bossHp",
DROP COLUMN "bossLoot",
DROP COLUMN "bossName",
DROP COLUMN "bossXpReward";

-- CreateTable
CREATE TABLE "Boss" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "hp" INTEGER NOT NULL DEFAULT 0,
    "damage" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "loot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questId" TEXT NOT NULL,

    CONSTRAINT "Boss_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Boss_questId_key" ON "Boss"("questId");

-- CreateIndex
CREATE INDEX "Boss_questId_idx" ON "Boss"("questId");

-- CreateIndex
CREATE INDEX "BossQuestion_bossId_idx" ON "BossQuestion"("bossId");

-- AddForeignKey
ALTER TABLE "Boss" ADD CONSTRAINT "Boss_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BossQuestion" ADD CONSTRAINT "BossQuestion_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "Boss"("id") ON DELETE CASCADE ON UPDATE CASCADE;
