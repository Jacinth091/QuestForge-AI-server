import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

import prisma from "../lib/prisma.js";
import { parseSchedule } from "../services/ai.service.js";

// ============================================
// PARSE & SAVE SCHEDULE FROM TEXT
// POST /api/schedule/parse
// ============================================
export const parseAndSaveSchedule = async (req, res) => {
  try {
    const { scheduleText, semesterName } = req.body;
    const userId = req.user.id;

    if (!scheduleText) {
      return res.status(400).json({ message: "Schedule text is required" });
    }

    const result = await parseAndStore(userId, scheduleText, semesterName);

    return res.status(201).json({
      message: "Schedule parsed and saved successfully!",
      ...result,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to parse schedule", error: error.message });
  }
};

// ============================================
// PARSE & SAVE SCHEDULE FROM PDF UPLOAD
// POST /api/schedule/upload
// ============================================
export const uploadAndParseSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const { semesterName } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required." });
    }

    // Extract text from PDF buffer
    const pdfData = await pdfParse(req.file.buffer);
    const scheduleText = pdfData.text;

    if (!scheduleText || scheduleText.trim().length < 20) {
      return res.status(400).json({
        message:
          "Could not extract text from PDF. Try pasting the text instead.",
      });
    }

    console.log(`📄 Extracted ${scheduleText.length} characters from PDF`);

    const result = await parseAndStore(userId, scheduleText, semesterName);

    return res.status(201).json({
      message: "PDF schedule uploaded and parsed successfully!",
      extractedTextLength: scheduleText.length,
      ...result,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to parse PDF schedule", error: error.message });
  }
};

// ============================================
// GET MY ACTIVE SCHEDULE
// GET /api/schedule/my
// ============================================
export const getMySchedule = async (req, res) => {
  try {
    const userId = req.user.id;

    const schedule = await prisma.schedule.findFirst({
      where: { userId, isActive: true },
      include: {
        classBlocks: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });

    if (!schedule) {
      return res.status(404).json({ message: "No active schedule found." });
    }

    // Group class blocks by day
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const groupedByDay = days.reduce((acc, day, index) => {
      acc[day] = schedule.classBlocks.filter((b) => b.dayOfWeek === index + 1);
      return acc;
    }, {});

    return res.status(200).json({
      schedule: { ...schedule, groupedByDay },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch schedule", error: error.message });
  }
};

// ============================================
// GET QUEST PLAN (Quest slots mapped to gap windows)
// GET /api/schedule/quest-plan
// ============================================
export const getQuestPlan = async (req, res) => {
  try {
    const userId = req.user.id;

    const schedule = await prisma.schedule.findFirst({
      where: { userId, isActive: true },
      include: {
        classBlocks: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });

    if (!schedule) {
      return res.status(404).json({
        message: "No active schedule found. Please upload your schedule first.",
      });
    }

    const currentQuests = await prisma.userQuest.findMany({
      where: { userId, status: { in: ["IN_PROGRESS", "NOT_STARTED"] } },
      include: { quest: { include: { boss: true } } },
      take: 5,
    });

    const gapWindows = schedule.classBlocks.filter(
      (b) => b.type === "GAP_WINDOW",
    );
    const classBlocks = schedule.classBlocks.filter((b) => b.type === "CLASS");
    const deadZones = schedule.classBlocks.filter(
      (b) => b.type === "DEAD_ZONE",
    );

    // Assign quests to gap windows
    const questSlots = gapWindows.map((gap, index) => ({
      day: getDayName(gap.dayOfWeek),
      startTime: gap.startTime,
      endTime: gap.endTime,
      type: "QUEST_TIME",
      color: "GREEN",
      assignedQuest:
        currentQuests[index % currentQuests.length]?.quest?.title ||
        "Free Study Time",
      questId: currentQuests[index % currentQuests.length]?.quest?.id || null,
    }));

    return res.status(200).json({
      message: "Quest plan generated!",
      studySummary: schedule.rawData?.studySummary || null,
      weeklyPlan: {
        // School subjects in BLUE
        classes: classBlocks.map((b) => ({
          day: getDayName(b.dayOfWeek),
          startTime: b.startTime,
          endTime: b.endTime,
          subject: b.subject,
          type: "CLASS",
          color: "BLUE",
        })),
        // Career quests in GREEN
        questSlots,
        // Dead zones in RED
        deadZones: deadZones.map((b) => ({
          day: getDayName(b.dayOfWeek),
          startTime: b.startTime,
          endTime: b.endTime,
          type: "DEAD_ZONE",
          color: "RED",
          description: b.description,
        })),
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to generate quest plan", error: error.message });
  }
};

// ============================================
// SHARED: Parse and store schedule to DB
// ============================================
const parseAndStore = async (userId, scheduleText, semesterName) => {
  // Call Gemini AI
  const parsedData = await parseSchedule(scheduleText);

  // Deactivate old schedules
  await prisma.schedule.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });

  // Save new schedule
  const schedule = await prisma.schedule.create({
    data: {
      name: semesterName || parsedData.semesterName || "My Schedule",
      semester: parsedData.semesterName,
      rawData: {
        originalText: scheduleText,
        studySummary: parsedData.studySummary,
      },
      isParsed: true,
      isActive: true,
      userId,
      classBlocks: {
        create: parsedData.parsedBlocks.map((block) => ({
          dayOfWeek: block.dayOfWeek,
          startTime: block.startTime,
          endTime: block.endTime,
          subject: block.subject || null,
          type: block.type,
          description: block.description,
        })),
      },
    },
    include: { classBlocks: true },
  });

  return { schedule, studySummary: parsedData.studySummary };
};

// ============================================
// HELPER
// ============================================
const getDayName = (dayOfWeek) => {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  return days[dayOfWeek - 1] || "Unknown";
};
