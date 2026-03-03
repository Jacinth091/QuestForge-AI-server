import prisma from "../lib/prisma.js";
import { evaluateBossFight } from "../services/ai.service.js";

// ============================================
// GET BOSS BY QUEST ID
// GET /api/boss/:questId
// ============================================
export const getBossByQuestId = async (req, res) => {
  try {
    const { questId } = req.params;

    const boss = await prisma.boss.findUnique({
      where: { questId },
      include: {
        questions: {
          select: {
            id: true,
            question: true,
            type: true,
            choices: true,
            // ✅ answer is NOT returned here (hidden from student)
          },
        },
        quest: {
          select: { title: true, xpReward: true },
        },
      },
    });

    if (!boss) {
      return res
        .status(404)
        .json({ message: "Boss not found for this quest." });
    }

    return res.status(200).json({ boss });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to get boss", error: error.message });
  }
};

// ============================================
// START BOSS FIGHT
// POST /api/boss/:questId/start
// ============================================
export const startBossFight = async (req, res) => {
  try {
    const { questId } = req.params;
    const userId = req.user.id;

    // Check if quest exists
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
      include: { boss: { include: { questions: true } } },
    });

    if (!quest || !quest.boss) {
      return res.status(404).json({ message: "Quest or boss not found." });
    }

    // Check or create UserQuest record
    let userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    if (!userQuest) {
      userQuest = await prisma.userQuest.create({
        data: {
          userId,
          questId,
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });
    }

    if (userQuest.bossFightPassed) {
      return res
        .status(400)
        .json({ message: "You have already defeated this boss!" });
    }

    // Return boss with questions (no answers)
    return res.status(200).json({
      message: `Boss fight started! Defeat ${quest.boss.name}!`,
      boss: {
        id: quest.boss.id,
        name: quest.boss.name,
        goal: quest.boss.goal,
        challenge: quest.boss.challenge,
        hp: quest.boss.hp,
        damage: quest.boss.damage,
        difficulty: quest.boss.difficulty,
        xpReward: quest.boss.xpReward,
        loot: quest.boss.loot,
      },
      questions: quest.boss.questions.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        choices: q.choices,
        // ✅ answers hidden
      })),
      attempts: userQuest.bossFightAttempts,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to start boss fight", error: error.message });
  }
};

// ============================================
// SUBMIT BOSS FIGHT ANSWERS
// POST /api/boss/:questId/submit
// ============================================
export const submitBossFight = async (req, res) => {
  try {
    const { questId } = req.params;
    const { answers } = req.body; // array of answers in order
    const userId = req.user.id;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Answers array is required." });
    }

    // Get quest and boss
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
      include: {
        boss: {
          include: { questions: true },
        },
      },
    });

    if (!quest || !quest.boss) {
      return res.status(404).json({ message: "Quest or boss not found." });
    }

    // Get user info for academic level
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { academicLevel: true, academicYear: true },
    });

    // Get UserQuest record
    let userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    if (!userQuest) {
      return res
        .status(400)
        .json({ message: "You must start the boss fight first." });
    }

    if (userQuest.bossFightPassed) {
      return res
        .status(400)
        .json({ message: "You have already defeated this boss!" });
    }

    // ✅ Evaluate with Gemini AI
    const evaluation = await evaluateBossFight(
      quest.boss,
      quest.boss.questions,
      answers,
      quest.title,
      `${user.academicYear || ""} ${user.academicLevel || ""}`.trim(),
    );

    const passed = evaluation.passed;
    const xpEarned = evaluation.xpEarned || 0;

    // Update UserQuest
    await prisma.userQuest.update({
      where: { userId_questId: { userId, questId } },
      data: {
        bossFightAttempts: { increment: 1 },
        bossFightPassed: passed,
        bossFightScore: evaluation.score,
        bossFightFeedback: evaluation.feedback,
        status: passed ? "COMPLETED" : "IN_PROGRESS",
        completedAt: passed ? new Date() : null,
        xpEarned: passed ? xpEarned : 0,
      },
    });

    // If passed - give XP to user profile
    if (passed) {
      await prisma.userProfile.update({
        where: { userId },
        data: {
          xp: { increment: xpEarned },
        },
      });

      // Level up check (every 1000 XP = 1 level)
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
      });
      const newLevel = Math.floor(profile.xp / 1000) + 1;
      if (newLevel > profile.level) {
        await prisma.userProfile.update({
          where: { userId },
          data: { level: newLevel },
        });
      }

      // Advance user stage if all quests in stage are done
      await checkAndAdvanceStage(userId, questId);
    }

    return res.status(200).json({
      message: passed ? "🎉 Boss Defeated!" : "💀 Boss Survived! Try again!",
      evaluation,
      xpEarned: passed ? xpEarned : 0,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to submit boss fight", error: error.message });
  }
};

// ============================================
// GET BOSS FIGHT HISTORY
// GET /api/boss/history
// ============================================
export const getBossFightHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const history = await prisma.userQuest.findMany({
      where: { userId, bossFightAttempts: { gt: 0 } },
      include: {
        quest: {
          include: { boss: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.status(200).json({ history });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to get history", error: error.message });
  }
};

// ============================================
// HELPER: Check and advance stage after quest completion
// ============================================
const checkAndAdvanceStage = async (userId, questId) => {
  try {
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
      include: {
        stage: {
          include: {
            quests: true,
          },
        },
      },
    });

    if (!quest) return;

    // Check if all quests in this stage are completed
    const stageQuestIds = quest.stage.quests.map((q) => q.id);
    const completedQuests = await prisma.userQuest.count({
      where: {
        userId,
        questId: { in: stageQuestIds },
        status: "COMPLETED",
      },
    });

    // If all quests in stage are done, advance to next stage
    if (completedQuests === stageQuestIds.length) {
      await prisma.user.update({
        where: { id: userId },
        data: { currentStage: { increment: 1 } },
      });

      console.log(`✅ User ${userId} advanced to next stage!`);
    }
  } catch (error) {
    console.error("Failed to advance stage:", error.message);
  }
};
