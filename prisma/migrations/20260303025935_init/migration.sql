-- CreateEnum
CREATE TYPE "Path" AS ENUM ('NONE', 'FRONTEND', 'BACKEND', 'FULLSTACK', 'DEVOPS', 'DATA_SCIENCE', 'MOBILE', 'AI_ML', 'WEB_DEV', 'DATA_ENGINEER', 'CYBERSECURITY');

-- CreateEnum
CREATE TYPE "Badge" AS ENUM ('WARRIOR', 'MAGE', 'ARCHER', 'ROGUE', 'PALADIN', 'WIZARD', 'SEMANTIC_ARCHITECT', 'RESPONSIVE_WARRIOR', 'LOGIC_INITIATE', 'DOM_DOMINATOR', 'GIT_CHRONOMANCER');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'LOCKED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('COURSE', 'VIDEO', 'DOCUMENTATION', 'INTERACTIVE', 'ARTICLE', 'TUTORIAL', 'BOOK');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('CLASS', 'GAP_WINDOW', 'DEAD_ZONE', 'STUDY_TIME', 'BREAK', 'OTHER');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('HINT', 'EXPLANATION', 'DEEP_DIVE', 'MOCK_EXAM', 'STUDY_MATERIAL', 'BOSS_RETRY', 'XP_BOOST');

-- CreateEnum
CREATE TYPE "AiSessionType" AS ENUM ('DEEP_DIVE', 'MOCK_EXAM', 'MENTOR', 'BOSS_FIGHT', 'TUTOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "academicYear" TEXT,
    "academicLevel" TEXT,
    "path" "Path" NOT NULL DEFAULT 'NONE',
    "currentStage" INTEGER NOT NULL DEFAULT 1,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL DEFAULT 100,
    "maxHp" INTEGER NOT NULL DEFAULT 100,
    "badge" "Badge" NOT NULL DEFAULT 'WARRIOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roadmap" (
    "id" TEXT NOT NULL,
    "path" "Path" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "estimatedWeeks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "stageNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startWeek" INTEGER NOT NULL,
    "endWeek" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roadmapId" TEXT NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "keyTopics" TEXT[],
    "bossName" TEXT,
    "bossChallenge" TEXT,
    "bossHp" INTEGER NOT NULL DEFAULT 0,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "badgeReward" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stageId" TEXT NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL DEFAULT 'COURSE',
    "description" TEXT,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questId" TEXT NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuest" (
    "id" TEXT NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "bossFightAttempts" INTEGER NOT NULL DEFAULT 0,
    "bossFightPassed" BOOLEAN NOT NULL DEFAULT false,
    "bossFightScore" INTEGER,
    "bossFightFeedback" TEXT,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,

    CONSTRAINT "UserQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semester" TEXT,
    "rawData" JSONB,
    "isParsed" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassBlock" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "subject" TEXT,
    "type" "BlockType" NOT NULL DEFAULT 'CLASS',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "ClassBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "xpCost" INTEGER NOT NULL,
    "type" "ItemType" NOT NULL,
    "details" JSONB,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "xpSpent" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInventory" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "UserInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSession" (
    "id" TEXT NOT NULL,
    "type" "AiSessionType" NOT NULL,
    "topic" TEXT NOT NULL,
    "context" JSONB,
    "response" JSONB,
    "xpCost" INTEGER NOT NULL DEFAULT 0,
    "rating" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AiSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_path_idx" ON "User"("path");

-- CreateIndex
CREATE INDEX "User_isPremium_idx" ON "User"("isPremium");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_xp_idx" ON "UserProfile"("xp");

-- CreateIndex
CREATE INDEX "UserProfile_level_idx" ON "UserProfile"("level");

-- CreateIndex
CREATE INDEX "Roadmap_path_idx" ON "Roadmap"("path");

-- CreateIndex
CREATE INDEX "Stage_roadmapId_stageNumber_idx" ON "Stage"("roadmapId", "stageNumber");

-- CreateIndex
CREATE INDEX "Quest_stageId_week_idx" ON "Quest"("stageId", "week");

-- CreateIndex
CREATE INDEX "Resource_questId_idx" ON "Resource"("questId");

-- CreateIndex
CREATE INDEX "UserQuest_userId_status_idx" ON "UserQuest"("userId", "status");

-- CreateIndex
CREATE INDEX "UserQuest_completedAt_idx" ON "UserQuest"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuest_userId_questId_key" ON "UserQuest"("userId", "questId");

-- CreateIndex
CREATE INDEX "Schedule_userId_isActive_idx" ON "Schedule"("userId", "isActive");

-- CreateIndex
CREATE INDEX "ClassBlock_scheduleId_dayOfWeek_idx" ON "ClassBlock"("scheduleId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "StoreItem_type_isAvailable_idx" ON "StoreItem"("type", "isAvailable");

-- CreateIndex
CREATE INDEX "StoreItem_xpCost_idx" ON "StoreItem"("xpCost");

-- CreateIndex
CREATE INDEX "Purchase_userId_purchasedAt_idx" ON "Purchase"("userId", "purchasedAt");

-- CreateIndex
CREATE INDEX "Purchase_itemId_idx" ON "Purchase"("itemId");

-- CreateIndex
CREATE INDEX "UserInventory_userId_idx" ON "UserInventory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInventory_userId_itemId_key" ON "UserInventory"("userId", "itemId");

-- CreateIndex
CREATE INDEX "AiSession_userId_type_idx" ON "AiSession"("userId", "type");

-- CreateIndex
CREATE INDEX "AiSession_createdAt_idx" ON "AiSession"("createdAt");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "Roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassBlock" ADD CONSTRAINT "ClassBlock_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StoreItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StoreItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
