import prisma from "../lib/prisma.js";
import { evaluateBossFight } from "../services/ai.service.js";

// ============================================
// GET BOSS BY QUEST ID
// GET /api/boss/:questId
// ============================================
export const getBossByQuestId = async (req, res) => {
  try {
    const { questId } = req.params;
    const userId = req.user.id;

    // ✅ Only allow access if the user has this quest assigned to them
    const userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    if (!userQuest) {
      return res.status(403).json({
        message: "You don't have access to this quest. Select a path first.",
      });
    }

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

    // ✅ Check that this quest belongs to the user (they must have a UserQuest record)
    let userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    if (!userQuest) {
      return res.status(403).json({
        message: "You don't have access to this quest. Select a path first.",
      });
    }

    // ✅ Quest must be IN_PROGRESS or NOT_STARTED — not LOCKED
    if (userQuest.status === "LOCKED") {
      return res.status(403).json({
        message:
          "This quest is still locked. Complete the previous quest first.",
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
        // For CODING questions — send the broken code to the student
        starterCode: q.type === "CODING" ? q.starterCode : null,
        codeLanguage: q.type === "CODING" ? q.codeLanguage : null,
        testCases: q.type === "CODING" ? q.testCases : null,
        // ✅ answer is NEVER sent
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

    // ✅ Get UserQuest record — must exist (user must own this quest)
    let userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    if (!userQuest) {
      return res.status(403).json({
        message: "You don't have access to this quest. Select a path first.",
      });
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
// HELPER: Unlock the next quest after beating a boss
// Weekly loop: beat this week's boss → next week's quest unlocks
// ============================================
const checkAndAdvanceStage = async (userId, questId) => {
  try {
    // Get the completed quest with its stage + ALL quests in the roadmap (ordered)
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
      include: {
        stage: {
          include: {
            roadmap: {
              include: {
                stages: {
                  orderBy: { stageNumber: "asc" },
                  include: {
                    quests: {
                      orderBy: { questNumber: "asc" },
                    },
                  },
                },
              },
            },
            quests: {
              orderBy: { questNumber: "asc" },
            },
          },
        },
      },
    });

    if (!quest) return;

    // Build a flat ordered list of ALL quests across all stages
    const allQuests = quest.stage.roadmap.stages.flatMap((s) => s.quests);

    // Find where the current quest is in the full list
    const currentIndex = allQuests.findIndex((q) => q.id === questId);
    const nextQuest = allQuests[currentIndex + 1];

    if (!nextQuest) {
      console.log(`🏆 User ${userId} completed the entire roadmap!`);
      return;
    }

    // Unlock the next quest (flip LOCKED → IN_PROGRESS)
    const nextUserQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId: nextQuest.id } },
    });

    if (nextUserQuest && nextUserQuest.status === "LOCKED") {
      await prisma.userQuest.update({
        where: { userId_questId: { userId, questId: nextQuest.id } },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });
      console.log(
        `✅ Unlocked next quest "${nextQuest.title}" for user ${userId}`,
      );
    }

    // Also advance currentStage if the completed quest was the last in its stage
    const stageQuestIds = quest.stage.quests.map((q) => q.id);
    const completedInStage = await prisma.userQuest.count({
      where: {
        userId,
        questId: { in: stageQuestIds },
        status: "COMPLETED",
      },
    });

    if (completedInStage === stageQuestIds.length) {
      await prisma.user.update({
        where: { id: userId },
        data: { currentStage: { increment: 1 } },
      });
      console.log(
        `✅ User ${userId} completed Stage ${quest.stage.stageNumber} — advanced to next stage!`,
      );
    }
  } catch (error) {
    console.error("Failed to advance stage:", error.message);
  }
};
