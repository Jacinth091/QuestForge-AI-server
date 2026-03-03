import prisma from "../lib/prisma.js";
import { generateRoadmap } from "../services/ai.service.js";

// ============================================
// MAP: Frontend field.id  OR  plain string  →  Path enum
// Handles both "web-dev" (from frontend) and "FRONTEND" (direct enum)
// ============================================
const resolveToPathEnum = (input) => {
  if (!input) return null;

  // Frontend field.id → Path enum
  const fieldIdMap = {
    "web-dev": "WEB_DEV",
    "data-science": "DATA_SCIENCE",
    "mobile-dev": "MOBILE",
    cybersecurity: "CYBERSECURITY",
    "cloud-devops": "DEVOPS",
    "game-dev": "AI_ML", // closest available enum
  };

  // Direct enum passthrough (already uppercase)
  const validEnums = [
    "FRONTEND",
    "BACKEND",
    "FULLSTACK",
    "DEVOPS",
    "DATA_SCIENCE",
    "MOBILE",
    "AI_ML",
    "WEB_DEV",
    "DATA_ENGINEER",
    "CYBERSECURITY",
    "NONE",
  ];

  const lower = input.toLowerCase();
  const upper = input.toUpperCase();

  // 1. Exact frontend field.id match
  if (fieldIdMap[lower]) return fieldIdMap[lower];

  // 2. Already a valid enum
  if (validEnums.includes(upper)) return upper;

  // 3. Fuzzy string match (from generateAndSaveRoadmap)
  if (lower.includes("frontend") || lower.includes("front-end"))
    return "FRONTEND";
  if (lower.includes("backend") || lower.includes("back-end")) return "BACKEND";
  if (lower.includes("fullstack") || lower.includes("full stack"))
    return "FULLSTACK";
  if (lower.includes("devops") || lower.includes("cloud")) return "DEVOPS";
  if (lower.includes("data science") || lower.includes("data scientist"))
    return "DATA_SCIENCE";
  if (
    lower.includes("mobile") ||
    lower.includes("android") ||
    lower.includes("ios")
  )
    return "MOBILE";
  if (lower.includes("ai") || lower.includes("machine learning"))
    return "AI_ML";
  if (lower.includes("data engineer")) return "DATA_ENGINEER";
  if (lower.includes("cyber") || lower.includes("security"))
    return "CYBERSECURITY";
  if (lower.includes("web")) return "WEB_DEV";

  return null;
};

// ============================================
// SELECT PATH & GENERATE ROADMAP (Single unified endpoint)
// POST /api/roadmap/select-path
// Accepts any of:
//   { "path": "web-dev" }            ← frontend field.id
//   { "path": "FRONTEND" }           ← enum directly
//   { "itRole": "Frontend Developer" } ← free text string
// ============================================
export const selectPathAndGenerate = async (req, res) => {
  try {
    const { path, itRole } = req.body; // accept both
    const userId = req.user.id;

    const input = path || itRole; // use whichever is provided

    if (!input) {
      return res.status(400).json({
        message: "path or itRole is required.",
      });
    }

    const normalizedPath = resolveToPathEnum(input);

    if (!normalizedPath || normalizedPath === "NONE") {
      return res.status(400).json({
        message: `Invalid value "${input}". Use a field ID (web-dev, data-science, mobile-dev, cybersecurity, cloud-devops, game-dev) or enum (FRONTEND, BACKEND, etc.)`,
      });
    }

    // 1. Save path to user
    await prisma.user.update({
      where: { id: userId },
      data: { path: normalizedPath, currentStage: 1 },
    });

    // 2. Check if roadmap already exists for this path
    const existingRoadmap = await prisma.roadmap.findFirst({
      where: { path: normalizedPath },
      include: {
        stages: {
          orderBy: { stageNumber: "asc" },
          include: {
            quests: {
              orderBy: { questNumber: "asc" },
              include: { boss: { include: { questions: true } } },
            },
          },
        },
      },
    });

    if (existingRoadmap) {
      // Assign UserQuest records to this user for the existing roadmap
      await assignUserQuests(userId, existingRoadmap);

      return res.status(200).json({
        message: `Path set to ${normalizedPath}. Roadmap already exists!`,
        roadmap: existingRoadmap,
        generated: false,
      });
    }

    // 3. Generate new roadmap via Gemini AI using the path
    console.log(`Generating roadmap for path: ${normalizedPath}`);
    const roadmapData = await generateRoadmap(normalizedPath);
    const savedRoadmap = await saveRoadmapToDB(roadmapData, normalizedPath);

    // Assign UserQuest records to this user for the newly generated roadmap
    await assignUserQuests(userId, savedRoadmap);

    return res.status(201).json({
      message: `Path set to ${normalizedPath}. Roadmap generated!`,
      roadmap: savedRoadmap,
      generated: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to select path and generate roadmap",
      error: error.message,
    });
  }
};

// ============================================
// ============================================
// GET USER'S ROADMAP
// GET /api/roadmap/my
// ============================================
export const getMyRoadmap = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { path: true },
    });

    if (!user?.path || user.path === "NONE") {
      return res
        .status(404)
        .json({ message: "No roadmap found. Please select a path first." });
    }

    const roadmap = await prisma.roadmap.findFirst({
      where: { path: user.path },
      include: {
        stages: {
          orderBy: { stageNumber: "asc" },
          include: {
            quests: {
              orderBy: { questNumber: "asc" },
              include: {
                boss: {
                  include: { questions: true },
                },
                userQuests: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    });

    if (!roadmap) {
      return res
        .status(404)
        .json({ message: "No roadmap found for your selected path." });
    }

    return res.status(200).json({ roadmap });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch roadmap",
      error: error.message,
    });
  }
};

// ============================================
// GET USER'S QUESTS (flat list with progress)
// GET /api/roadmap/my-quests
// ============================================
export const getMyQuests = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all UserQuest records for this user with full quest + boss info
    const userQuests = await prisma.userQuest.findMany({
      where: { userId },
      include: {
        quest: {
          include: {
            boss: {
              select: {
                id: true,
                name: true,
                hp: true,
                damage: true,
                difficulty: true,
                xpReward: true,
                loot: true,
              },
            },
            stage: {
              select: {
                stageNumber: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        quest: { week: "asc" },
      },
    });

    if (userQuests.length === 0) {
      return res.status(404).json({
        message: "No quests found. Please select a path first.",
      });
    }

    // Shape the response — flat list, clean and frontend-friendly
    const quests = userQuests.map((uq) => ({
      userQuestId: uq.id,
      questId: uq.quest.id,
      title: uq.quest.title,
      description: uq.quest.description,
      week: uq.quest.week,
      duration: uq.quest.duration,
      goal: uq.quest.goal,
      keyTopics: uq.quest.keyTopics,
      xpReward: uq.quest.xpReward,
      badgeReward: uq.quest.badgeReward,
      // Resources
      courseLink: uq.quest.courseLink,
      videoSeriesLink: uq.quest.videoSeriesLink,
      documentationLink: uq.quest.documentationLink,
      // Stage info
      stage: uq.quest.stage,
      // Boss info (if exists)
      boss: uq.quest.boss || null,
      // User's personal progress on this quest
      progress: {
        status: uq.status,
        startedAt: uq.startedAt,
        completedAt: uq.completedAt,
        bossFightAttempts: uq.bossFightAttempts,
        bossFightPassed: uq.bossFightPassed,
        bossFightScore: uq.bossFightScore,
        xpEarned: uq.xpEarned,
      },
    }));

    return res.status(200).json({
      total: quests.length,
      quests,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch quests",
      error: error.message,
    });
  }
};

// ============================================
// GET MY ROADMAP (with UserQuest progress attached)
// GET /api/roadmap
// ============================================
export const getAllRoadmaps = async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ Only return the roadmap for the user's own path
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { path: true },
    });

    if (!user?.path || user.path === "NONE") {
      return res.status(404).json({
        message: "No roadmap found. Please select a path first.",
      });
    }

    const roadmap = await prisma.roadmap.findFirst({
      where: { path: user.path },
      include: {
        stages: {
          orderBy: { stageNumber: "asc" },
          include: {
            quests: {
              orderBy: { questNumber: "asc" },
              include: {
                boss: true,
                userQuests: {
                  where: { userId }, // ✅ attach this user's progress per quest
                },
              },
            },
          },
        },
      },
    });

    if (!roadmap) {
      return res.status(404).json({
        message: "No roadmap found for your selected path.",
      });
    }

    return res.status(200).json({ roadmap });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch roadmap",
      error: error.message,
    });
  }
};

// ============================================
// SHARED: Save AI-generated roadmap to DB
// ============================================
const saveRoadmapToDB = async (roadmapData, path) => {
  // Create roadmap + stages + quests
  const roadmap = await prisma.roadmap.create({
    data: {
      path,
      title: roadmapData.title,
      description: `AI-generated roadmap for ${path}`,
      estimatedWeeks: roadmapData.estimatedWeeks || 5,
      expectedDuration: roadmapData.expectedDuration,
      stages: {
        create: roadmapData.stages.map((stage) => ({
          stageNumber: stage.stageNumber,
          title: stage.title,
          description: stage.description,
          startWeek: stage.startWeek,
          endWeek: stage.endWeek,
          quests: {
            create: stage.quests.map((quest) => ({
              questNumber: quest.questNumber,
              title: quest.title,
              description: quest.goal,
              week: quest.week,
              duration: quest.duration,
              goal: quest.goal,
              keyTopics: quest.keyTopics,
              resourceDescription: quest.resourceDescription,
              courseLink: quest.courseLink,
              videoSeriesLink: quest.videoSeriesLink,
              documentationLink: quest.documentationLink,
              xpReward: quest.xpReward,
              badgeReward: quest.badgeReward,
            })),
          },
        })),
      },
    },
    include: {
      stages: { include: { quests: true } },
    },
  });

  // Create bosses & questions separately
  for (const stage of roadmapData.stages) {
    for (const questData of stage.quests) {
      const savedQuest = roadmap.stages
        .find((s) => s.stageNumber === stage.stageNumber)
        ?.quests.find((q) => q.questNumber === questData.questNumber);

      if (savedQuest && questData.boss) {
        await prisma.boss.create({
          data: {
            name: questData.boss.name,
            goal: questData.boss.goal,
            challenge: questData.boss.challenge,
            hp: questData.boss.hp,
            damage: questData.boss.damage,
            difficulty: questData.boss.difficulty,
            xpReward: questData.boss.xpReward,
            loot: questData.boss.loot,
            questId: savedQuest.id,
            questions: {
              create: questData.boss.questions.map((q) => ({
                question: q.question,
                type: q.type,
                choices: q.choices || [],
                answer: q.answer || [],
                // Coding-specific fields
                starterCode: q.starterCode || null,
                codeLanguage: q.codeLanguage || null,
                testCases: q.testCases || null,
              })),
            },
          },
        });
      }
    }
  }

  // Return full roadmap with bosses included
  return prisma.roadmap.findUnique({
    where: { id: roadmap.id },
    include: {
      stages: {
        orderBy: { stageNumber: "asc" },
        include: {
          quests: {
            orderBy: { questNumber: "asc" },
            include: {
              boss: { include: { questions: true } },
            },
          },
        },
      },
    },
  });
};

// ============================================
// SHARED: Assign UserQuest rows for every quest in a roadmap
// Skips quests that are already assigned (upsert-safe)
// First quest = IN_PROGRESS, rest = LOCKED
// ============================================
const assignUserQuests = async (userId, roadmap) => {
  // Collect all quests across all stages in order
  const allQuests = roadmap.stages
    .sort((a, b) => a.stageNumber - b.stageNumber)
    .flatMap((stage) =>
      stage.quests.sort((a, b) => a.questNumber - b.questNumber),
    );

  if (allQuests.length === 0) return;

  // Check which quests this user already has assigned
  const existingUserQuests = await prisma.userQuest.findMany({
    where: {
      userId,
      questId: { in: allQuests.map((q) => q.id) },
    },
    select: { questId: true },
  });

  const alreadyAssigned = new Set(existingUserQuests.map((uq) => uq.questId));

  // Only create rows for quests not yet assigned
  const toCreate = allQuests.filter((q) => !alreadyAssigned.has(q.id));

  if (toCreate.length === 0) return;

  // First quest of the entire roadmap = IN_PROGRESS, all others = LOCKED
  // But if user already has some quests, keep the first NEW one as NOT_STARTED
  const isFirstEver = alreadyAssigned.size === 0;

  await prisma.userQuest.createMany({
    data: toCreate.map((quest, index) => ({
      userId,
      questId: quest.id,
      status: isFirstEver && index === 0 ? "IN_PROGRESS" : "LOCKED",
      startedAt: isFirstEver && index === 0 ? new Date() : null,
    })),
    skipDuplicates: true,
  });

  console.log(`✅ Assigned ${toCreate.length} quests to user ${userId}`);
};
