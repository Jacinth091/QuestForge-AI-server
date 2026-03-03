/*
  Warnings:

  - Added the required column `questNumber` to the `Quest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'CODING');

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "bossDamage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bossDifficulty" TEXT,
ADD COLUMN     "bossGoal" TEXT,
ADD COLUMN     "bossLoot" TEXT,
ADD COLUMN     "bossXpReward" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "courseLink" TEXT,
ADD COLUMN     "dateUnlocked" TIMESTAMP(3),
ADD COLUMN     "documentationLink" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "goal" TEXT,
ADD COLUMN     "questNumber" INTEGER NOT NULL,
ADD COLUMN     "resourceDescription" TEXT,
ADD COLUMN     "videoSeriesLink" TEXT;

-- AlterTable
ALTER TABLE "Roadmap" ADD COLUMN     "expectedDuration" TEXT;

-- CreateTable
CREATE TABLE "BossQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "choices" TEXT[],
    "answer" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questId" TEXT NOT NULL,

    CONSTRAINT "BossQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BossQuestion_questId_idx" ON "BossQuestion"("questId");

-- AddForeignKey
ALTER TABLE "BossQuestion" ADD CONSTRAINT "BossQuestion_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
