import prisma from "../lib/prisma.js";
import { generateRoadmap } from "../services/ai.service.js";

// ============================================
// SELECT PATH & GENERATE ROADMAP (Main Flow)
// POST /api/roadmap/select-path
// Body: { path: "FRONTEND" }
// ============================================
export const selectPathAndGenerate = async (req, res) => {
  try {
    const { path } = req.body;
    const userId = req.user.id;

    if (!path) {
      return res.status(400).json({ message: "Path is required." });
    }

    // Validate path is a valid enum value
    const validPaths = [
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
    ];

    if (!validPaths.includes(path.toUpperCase())) {
      return res.status(400).json({
        message: `Invalid path. Choose from: ${validPaths.join(", ")}`,
      });
    }

    const normalizedPath = path.toUpperCase();

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
// GENERATE & SAVE ROADMAP (Manual / Admin)
// POST /api/roadmap/generate
// Body: { itRole: "Frontend Developer" }
// ============================================
export const generateAndSaveRoadmap = async (req, res) => {
  try {
    const { itRole } = req.body;
    const userId = req.user.id;

    if (!itRole) {
      return res.status(400).json({ message: "IT role is required" });
    }

    const mappedPath = mapRoleToPath(itRole);

    // Update user's path
    await prisma.user.update({
      where: { id: userId },
      data: { path: mappedPath, currentStage: 1 },
    });

    console.log(`Generating roadmap for: ${itRole} → ${mappedPath}`);
    const roadmapData = await generateRoadmap(itRole);
    const savedRoadmap = await saveRoadmapToDB(roadmapData, mappedPath);

    return res.status(201).json({
      message: "Roadmap generated successfully!",
      roadmap: savedRoadmap,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to generate roadmap",
      error: error.message,
    });
  }
};

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
// GET ALL ROADMAPS
// GET /api/roadmap
// ============================================
export const getAllRoadmaps = async (req, res) => {
  try {
    const roadmaps = await prisma.roadmap.findMany({
      include: {
        stages: {
          include: {
            quests: {
              include: {
                boss: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({ roadmaps });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch roadmaps",
      error: error.message,
    });
  }
};

// ============================================
// HELPER: Map IT Role string to Path enum
// ============================================
const mapRoleToPath = (itRole) => {
  const role = itRole.toLowerCase();
  if (
    role.includes("frontend") ||
    role.includes("front-end") ||
    role.includes("web dev")
  )
    return "FRONTEND";
  if (role.includes("backend") || role.includes("back-end")) return "BACKEND";
  if (
    role.includes("fullstack") ||
    role.includes("full-stack") ||
    role.includes("full stack")
  )
    return "FULLSTACK";
  if (role.includes("devops") || role.includes("dev ops")) return "DEVOPS";
  if (role.includes("data science") || role.includes("data scientist"))
    return "DATA_SCIENCE";
  if (
    role.includes("mobile") ||
    role.includes("android") ||
    role.includes("ios")
  )
    return "MOBILE";
  if (
    role.includes("ai") ||
    role.includes("machine learning") ||
    role.includes("ml")
  )
    return "AI_ML";
  if (role.includes("data engineer")) return "DATA_ENGINEER";
  if (role.includes("cyber") || role.includes("security"))
    return "CYBERSECURITY";
  return "FULLSTACK"; // default
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
                choices: q.choices,
                answer: q.answer,
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
