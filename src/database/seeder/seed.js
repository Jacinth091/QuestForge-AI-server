import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { PrismaClient } from "../../generated/prisma/index.js";

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- Starting Seed ---");

  // ============================================
  // 0. CLEANUP (so seed is re-run safe)
  // Delete user-specific data first (FK order), keep store items
  // ============================================
  console.log("Cleaning up old seed data...");
  await prisma.aiSession.deleteMany({
    where: { user: { email: "jacinth@example.com" } },
  });
  await prisma.userInventory.deleteMany({
    where: { user: { email: "jacinth@example.com" } },
  });
  await prisma.userQuest.deleteMany({
    where: { user: { email: "jacinth@example.com" } },
  });
  await prisma.schedule.deleteMany({
    where: { user: { email: "jacinth@example.com" } },
  });
  // Delete global roadmap for FRONTEND path (cascades to stages, quests, bosses, questions)
  await prisma.roadmap.deleteMany({ where: { id: "roadmap-fe-101" } });
  console.log("✅ Cleanup done");

  // ============================================
  // 1. STORE ITEMS
  // ============================================
  console.log("Seeding store items...");

  const storeItems = await Promise.all([
    prisma.storeItem.upsert({
      where: { id: "item-xp-boost" },
      update: {},
      create: {
        id: "item-xp-boost",
        name: "Scholar's Elixir",
        description: "Double XP for the next 24 hours.",
        xpCost: 1000,
        type: "XP_BOOST",
        isAvailable: true,
      },
    }),
    prisma.storeItem.upsert({
      where: { id: "item-hint" },
      update: {},
      create: {
        id: "item-hint",
        name: "Sage's Hint",
        description: "Get a hint for the current boss question.",
        xpCost: 200,
        type: "HINT",
        isAvailable: true,
      },
    }),
    prisma.storeItem.upsert({
      where: { id: "item-deep-dive" },
      update: {},
      create: {
        id: "item-deep-dive",
        name: "Deep Dive Session",
        description:
          "AI explains a difficult concept using your favorite analogies.",
        xpCost: 500,
        type: "DEEP_DIVE",
        isAvailable: true,
      },
    }),
    prisma.storeItem.upsert({
      where: { id: "item-mock-exam" },
      update: {},
      create: {
        id: "item-mock-exam",
        name: "Mock Exam Scroll",
        description: "AI generates a mock exam for your current quest.",
        xpCost: 750,
        type: "MOCK_EXAM",
        isAvailable: true,
      },
    }),
    prisma.storeItem.upsert({
      where: { id: "item-boss-retry" },
      update: {},
      create: {
        id: "item-boss-retry",
        name: "Phoenix Feather",
        description: "Retry a failed boss fight.",
        xpCost: 300,
        type: "BOSS_RETRY",
        isAvailable: true,
      },
    }),
  ]);

  console.log(`✅ Seeded ${storeItems.length} store items`);

  // ============================================
  // 2. USERS
  // ============================================
  console.log("Seeding users...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "jacinth@example.com" },
    update: {},
    create: {
      email: "jacinth@example.com",
      password: hashedPassword,
      name: "Jacinth",
      academicYear: "3rd Year",
      academicLevel: "BSIT",
      path: "FRONTEND",
      currentStage: 1,
      isPremium: true,
      premiumUntil: new Date("2026-12-31"),
      profile: {
        create: {
          level: 5,
          xp: 1250,
          hp: 100,
          maxHp: 100,
          badge: "WARRIOR",
        },
      },
    },
  });

  // Schedule (safe because we deleted it in cleanup above)
  const schedule = await prisma.schedule.create({
    data: {
      name: "2nd Semester 2025-2026",
      semester: "2nd Semester",
      isActive: true,
      isParsed: true,
      rawData: {
        studentId: "23784994",
        program: "BSIT 3",
        totalUnits: 24,
        studySummary: {
          totalClassHours: 24,
          totalGapWindows: 5,
          bestStudyDays: ["Sunday", "Wednesday Morning", "Thursday Morning"],
          recommendation:
            "Your schedule is heavily loaded Mon–Fri evenings (4PM–9:30PM). Best quest time is Sunday all day, weekday mornings (before 4PM), and Saturday mornings before 1:30PM.",
        },
      },
      userId: user.id,
      classBlocks: {
        create: [
          // ── MONDAY (dayOfWeek: 1) ──────────────────────────────
          {
            dayOfWeek: 1,
            startTime: "16:00",
            endTime: "17:00",
            subject: "IT-ELNETI",
            type: "CLASS",
            description: "Room 537",
          },
          {
            dayOfWeek: 1,
            startTime: "17:01",
            endTime: "18:31",
            subject: "IT-ELNETI LAB",
            type: "CLASS",
            description: "Room 530",
          },
          {
            dayOfWeek: 1,
            startTime: "19:01",
            endTime: "20:01",
            subject: "IT-IMDBSYS32",
            type: "CLASS",
            description: "Room 530C",
          },
          {
            dayOfWeek: 1,
            startTime: "20:01",
            endTime: "21:31",
            subject: "IT-IMDBSYS32 LAB",
            type: "CLASS",
            description: "Room 530",
          },
          {
            dayOfWeek: 1,
            startTime: "21:31",
            endTime: "23:59",
            subject: null,
            type: "DEAD_ZONE",
            description: "Late night — avoid scheduling",
          },
          {
            dayOfWeek: 1,
            startTime: "08:00",
            endTime: "16:00",
            subject: null,
            type: "GAP_WINDOW",
            description: "Monday morning — good for quests before classes",
          },

          // ── TUESDAY (dayOfWeek: 2) ─────────────────────────────
          {
            dayOfWeek: 2,
            startTime: "16:00",
            endTime: "17:00",
            subject: "IT-SYSADMN32",
            type: "CLASS",
            description: "Room 530B",
          },
          {
            dayOfWeek: 2,
            startTime: "17:01",
            endTime: "18:31",
            subject: "IT-SYSADMN32 LAB",
            type: "CLASS",
            description: "Room 526",
          },
          {
            dayOfWeek: 2,
            startTime: "19:01",
            endTime: "20:01",
            subject: "IT-INTPROG32",
            type: "CLASS",
            description: "Room 530C",
          },
          {
            dayOfWeek: 2,
            startTime: "20:01",
            endTime: "21:31",
            subject: "IT-INTPROG32 LAB",
            type: "CLASS",
            description: "Room 526",
          },
          {
            dayOfWeek: 2,
            startTime: "21:31",
            endTime: "23:59",
            subject: null,
            type: "DEAD_ZONE",
            description: "Late night — avoid scheduling",
          },
          {
            dayOfWeek: 2,
            startTime: "08:00",
            endTime: "16:00",
            subject: null,
            type: "GAP_WINDOW",
            description: "Tuesday morning — good for quests before classes",
          },

          // ── WEDNESDAY (dayOfWeek: 3) ───────────────────────────
          {
            dayOfWeek: 3,
            startTime: "16:00",
            endTime: "17:00",
            subject: "IT-ELNETI",
            type: "CLASS",
            description: "Room 537",
          },
          {
            dayOfWeek: 3,
            startTime: "17:01",
            endTime: "18:31",
            subject: "IT-ELNETI LAB",
            type: "CLASS",
            description: "Room 530",
          },
          {
            dayOfWeek: 3,
            startTime: "19:01",
            endTime: "20:01",
            subject: "IT-IMDBSYS32",
            type: "CLASS",
            description: "Room 530C",
          },
          {
            dayOfWeek: 3,
            startTime: "20:01",
            endTime: "21:31",
            subject: "IT-IMDBSYS32 LAB",
            type: "CLASS",
            description: "Room 530",
          },
          {
            dayOfWeek: 3,
            startTime: "21:31",
            endTime: "23:59",
            subject: null,
            type: "DEAD_ZONE",
            description: "Late night — avoid scheduling",
          },
          {
            dayOfWeek: 3,
            startTime: "08:00",
            endTime: "16:00",
            subject: null,
            type: "GAP_WINDOW",
            description: "Wednesday morning — good for quests before classes",
          },

          // ── THURSDAY (dayOfWeek: 4) ────────────────────────────
          {
            dayOfWeek: 4,
            startTime: "16:00",
            endTime: "17:00",
            subject: "IT-SYSADMN32",
            type: "CLASS",
            description: "Room 530B",
          },
          {
            dayOfWeek: 4,
            startTime: "17:01",
            endTime: "18:31",
            subject: "IT-SYSADMN32 LAB",
            type: "CLASS",
            description: "Room 526",
          },
          {
            dayOfWeek: 4,
            startTime: "19:01",
            endTime: "20:01",
            subject: "IT-INTPROG32",
            type: "CLASS",
            description: "Room 530C",
          },
          {
            dayOfWeek: 4,
            startTime: "20:01",
            endTime: "21:31",
            subject: "IT-INTPROG32 LAB",
            type: "CLASS",
            description: "Room 526",
          },
          {
            dayOfWeek: 4,
            startTime: "21:31",
            endTime: "23:59",
            subject: null,
            type: "DEAD_ZONE",
            description: "Late night — avoid scheduling",
          },
          {
            dayOfWeek: 4,
            startTime: "08:00",
            endTime: "16:00",
            subject: null,
            type: "GAP_WINDOW",
            description: "Thursday morning — good for quests before classes",
          },

          // ── FRIDAY (dayOfWeek: 5) ──────────────────────────────
          {
            dayOfWeek: 5,
            startTime: "13:30",
            endTime: "16:30",
            subject: "CC-TECHNO32",
            type: "CLASS",
            description: "Room 5300",
          },
          {
            dayOfWeek: 5,
            startTime: "16:30",
            endTime: "18:31",
            subject: "IT-INFOSEC32",
            type: "CLASS",
            description: "Room 530C",
          },
          {
            dayOfWeek: 5,
            startTime: "18:31",
            endTime: "21:31",
            subject: "IT-INFOSEC32 LAB",
            type: "CLASS",
            description: "Room 542",
          },
          {
            dayOfWeek: 5,
            startTime: "21:31",
            endTime: "23:59",
            subject: null,
            type: "DEAD_ZONE",
            description: "Late night — avoid scheduling",
          },
          {
            dayOfWeek: 5,
            startTime: "08:00",
            endTime: "13:30",
            subject: null,
            type: "GAP_WINDOW",
            description: "Friday morning — good for quests before classes",
          },

          // ── SATURDAY (dayOfWeek: 6) ────────────────────────────
          {
            dayOfWeek: 6,
            startTime: "13:30",
            endTime: "16:30",
            subject: "IT-FRETRNDS",
            type: "CLASS",
            description: "Room 5300",
          },
          {
            dayOfWeek: 6,
            startTime: "14:30",
            endTime: "16:30",
            subject: "IT-SYSARCH32",
            type: "CLASS",
            description: "Room 530C",
          },
          {
            dayOfWeek: 6,
            startTime: "16:30",
            endTime: "19:31",
            subject: "IT-SYSARCH32 LAB",
            type: "CLASS",
            description: "Room 528",
          },
          {
            dayOfWeek: 6,
            startTime: "19:31",
            endTime: "23:59",
            subject: null,
            type: "DEAD_ZONE",
            description: "Late night — avoid scheduling",
          },
          {
            dayOfWeek: 6,
            startTime: "08:00",
            endTime: "13:30",
            subject: null,
            type: "GAP_WINDOW",
            description: "Saturday morning — good for quests before classes",
          },

          // ── SUNDAY (dayOfWeek: 7) ──────────────────────────────
          {
            dayOfWeek: 7,
            startTime: "08:00",
            endTime: "22:00",
            subject: null,
            type: "GAP_WINDOW",
            description: "Sunday — No classes, best full quest day",
          },
          {
            dayOfWeek: 7,
            startTime: "22:00",
            endTime: "23:59",
            subject: null,
            type: "DEAD_ZONE",
            description: "Late night — avoid scheduling",
          },
        ],
      },
    },
  });

  // Inventory
  await prisma.userInventory.upsert({
    where: {
      userId_itemId: {
        userId: user.id,
        itemId: "item-xp-boost",
      },
    },
    update: { quantity: 2 },
    create: {
      userId: user.id,
      itemId: "item-xp-boost",
      quantity: 2,
    },
  });

  await prisma.userInventory.upsert({
    where: {
      userId_itemId: {
        userId: user.id,
        itemId: "item-hint",
      },
    },
    update: { quantity: 5 },
    create: {
      userId: user.id,
      itemId: "item-hint",
      quantity: 5,
    },
  });
  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@questforge.com" },
    update: {},
    create: {
      email: "admin@questforge.com",
      password: await bcrypt.hash("admin123", 10),
      name: "Admin",
      path: "NONE",
      isPremium: true,
      profile: {
        create: {
          level: 99,
          xp: 99999,
          hp: 100,
          maxHp: 100,
          badge: "WIZARD",
        },
      },
    },
  });

  console.log(`✅ Seeded users: ${user.name}, ${adminUser.name}`);
  // ============================================
  // 3. ROADMAP
  // ============================================
  console.log("Seeding roadmap...");

  const roadmap = await prisma.roadmap.upsert({
    where: { id: "roadmap-fe-101" },
    update: {},
    create: {
      id: "roadmap-fe-101",
      path: "FRONTEND",
      title: "Web Development Roadmap",
      description: "From zero to React Hero. Master the modern web.",
      estimatedWeeks: 5,
      expectedDuration: "1-2 months",
    },
  });

  console.log(`✅ Seeded roadmap: ${roadmap.title}`);

  // ============================================
  // 4. STAGES
  // ============================================
  console.log("Seeding stages...");

  const stage1 = await prisma.stage.create({
    data: {
      id: "stage-fe-1",
      stageNumber: 1,
      title: "The Foundation",
      description: "Master the structure and styling of the modern web.",
      startWeek: 1,
      endWeek: 2,
      roadmapId: roadmap.id,
    },
  });

  const stage2 = await prisma.stage.create({
    data: {
      id: "stage-fe-2",
      stageNumber: 2,
      title: "The Logic Engine",
      description: "Move from static pages to functional applications.",
      startWeek: 3,
      endWeek: 4,
      roadmapId: roadmap.id,
    },
  });

  const stage3 = await prisma.stage.create({
    data: {
      id: "stage-fe-3",
      stageNumber: 3,
      title: "The Modern Workflow",
      description: "Learn how professionals actually build software.",
      startWeek: 5,
      endWeek: 5,
      roadmapId: roadmap.id,
    },
  });

  console.log(`✅ Seeded 3 stages`);

  // ============================================
  // 5. QUESTS
  // ============================================
  console.log("Seeding quests...");

  const quest1 = await prisma.quest.create({
    data: {
      id: "quest-fe-1",
      questNumber: 1,
      title: "The Architect's Blueprint (HTML5 & CSS3)",
      description: "Master the structure and styling of the modern web.",
      week: 1,
      duration: "Week 1-2",
      goal: "Master the structure and styling of the modern web. You aren't just making sites; you're learning how the browser interprets visual data.",
      keyTopics: [
        "Semantic HTML",
        "Flexbox/Grid (Layouts)",
        "Responsive Design (Mobile-first)",
      ],
      resourceDescription: "Free resources to master HTML5 & CSS3",
      courseLink: "https://www.freecodecamp.org/learn/responsive-web-design/",
      videoSeriesLink:
        "https://www.youtube.com/playlist?list=PL4cUxeGkcC9ivBf_eKCPIAYXWzLlPAm6G",
      documentationLink: "https://developer.mozilla.org/en-US/docs/Web/HTML",
      xpReward: 100,
      badgeReward: "SEMANTIC_ARCHITECT",
      stageId: stage1.id,
    },
  });

  const quest2 = await prisma.quest.create({
    data: {
      id: "quest-fe-2",
      questNumber: 2,
      title: "The Shape-Shifter (CSS Layouts)",
      description: "Master responsive design and CSS layouts.",
      week: 2,
      duration: "Week 2",
      goal: "Master Media Queries and CSS Grid to make your site look perfect on any device.",
      keyTopics: [
        "Media Queries",
        "CSS Grid",
        "Flexbox",
        "Mobile-first Design",
      ],
      resourceDescription: "Free resources to master CSS layouts",
      courseLink: "https://www.freecodecamp.org/learn/responsive-web-design/",
      videoSeriesLink: "https://www.youtube.com/watch?v=EiNiSFIPIQE",
      documentationLink:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout",
      xpReward: 200,
      badgeReward: "RESPONSIVE_WARRIOR",
      stageId: stage1.id,
    },
  });

  const quest3 = await prisma.quest.create({
    data: {
      questNumber: 3,
      title: "The Logic Engine (JavaScript Fundamentals)",
      description: "Move from static pages to functional applications.",
      week: 3,
      duration: "Week 3-4",
      goal: "Move from static pages to functional applications. This is where you learn to handle user data and if/then logic.",
      keyTopics: [
        "DOM Manipulation",
        "ES6 Syntax (Arrow functions, Destructuring)",
        "Fetch API (Async/Await)",
      ],
      resourceDescription: "Free resources to master JavaScript",
      courseLink:
        "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/",
      videoSeriesLink:
        "https://www.youtube.com/playlist?list=PL4cUxeGkcC9i9Ae2D9Ee1RvylH38dKuET",
      documentationLink: "https://javascript.info/",
      xpReward: 300,
      badgeReward: "LOGIC_INITIATE",
      stageId: stage2.id,
    },
  });

  const quest4 = await prisma.quest.create({
    data: {
      questNumber: 4,
      title: "The Modern Workflow (Git & Version Control)",
      description: "Learn how professionals actually build software.",
      week: 5,
      duration: "Week 5",
      goal: "Learn how professionals actually build software. Without Git, you can't work in a team or contribute to Open Source.",
      keyTopics: [
        "Repositories",
        "Commits",
        "Branching",
        "Merging",
        "GitHub Pull Requests",
      ],
      resourceDescription: "Free resources to master Git",
      courseLink:
        "https://www.udacity.com/course/version-control-with-git--ud123",
      videoSeriesLink: "https://www.youtube.com/watch?v=RGOj5yH7evk",
      documentationLink:
        "https://docs.github.com/en/get-started/quickstart/hello-world",
      xpReward: 500,
      badgeReward: "GIT_CHRONOMANCER",
      stageId: stage3.id,
    },
  });

  console.log(`✅ Seeded 4 quests`);

  // ============================================
  // 5b. USER QUESTS (assign roadmap quests to Jacinth)
  // ============================================
  console.log("Seeding user quests...");

  await prisma.userQuest.createMany({
    data: [
      {
        userId: user.id,
        questId: quest1.id,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
      {
        userId: user.id,
        questId: quest2.id,
        status: "LOCKED",
      },
      {
        userId: user.id,
        questId: quest3.id,
        status: "LOCKED",
      },
      {
        userId: user.id,
        questId: quest4.id,
        status: "LOCKED",
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Seeded 4 user quests`);

  // ============================================
  // 6. BOSSES
  // ============================================
  console.log("Seeding bosses...");

  const boss1 = await prisma.boss.create({
    data: {
      name: "The Skeleton King",
      goal: "Build a purely semantic HTML page for a Technical Documentation site.",
      challenge:
        "Build a purely semantic HTML page without using a single <div> tag.",
      hp: 500,
      damage: 50,
      difficulty: "Easy",
      xpReward: 100,
      loot: "Semantic Architect Badge",
      questId: quest1.id,
    },
  });

  const boss2 = await prisma.boss.create({
    data: {
      name: "The Shape-Shifter",
      goal: "Make your Week 1 site Break-Proof.",
      challenge:
        "Take your Week 1 site and make it break-proof. It must look perfect on an iPhone SE, an iPad, and a 4K Monitor.",
      hp: 800,
      damage: 80,
      difficulty: "Medium",
      xpReward: 200,
      loot: "Responsive Warrior Badge",
      questId: quest2.id,
    },
  });

  const boss3 = await prisma.boss.create({
    data: {
      name: "The Silent Calculator",
      goal: "Master variables, arrays, and math operators.",
      challenge:
        "Create a GPA Calculator using only JavaScript logic. It should take an array of grades and return the average.",
      hp: 1200,
      damage: 120,
      difficulty: "Medium",
      xpReward: 300,
      loot: "Logic Initiate Badge",
      questId: quest3.id,
    },
  });

  const boss4 = await prisma.boss.create({
    data: {
      name: "The Time Traveler",
      goal: "Prove you can manage versions and handle errors professionally.",
      challenge:
        "Create a bug in your code on purpose, commit it to Git, then use git revert or git checkout to fix it.",
      hp: 1500,
      damage: 150,
      difficulty: "Hard",
      xpReward: 500,
      loot: "Git Chronomancer Badge",
      questId: quest4.id,
    },
  });

  console.log(`✅ Seeded 4 bosses`);

  // ============================================
  // 7. BOSS QUESTIONS
  // ============================================
  console.log("Seeding boss questions...");

  // Boss 1 Questions
  await prisma.bossQuestion.createMany({
    data: [
      {
        question:
          "Which HTML5 tag is most appropriate for the main navigation menu of a website?",
        type: "MULTIPLE_CHOICE",
        choices: ["<div>", "<nav>", "<section>", "<header>"],
        answer: ["<nav>"],
        bossId: boss1.id,
      },
      {
        question:
          "What is the correct HTML5 tag for an independent, self-contained piece of content?",
        type: "MULTIPLE_CHOICE",
        choices: ["<section>", "<div>", "<article>", "<aside>"],
        answer: ["<article>"],
        bossId: boss1.id,
      },
      {
        question:
          "Write semantic HTML for a blog post with a title, publication date, and content paragraph.",
        type: "CODING",
        choices: [],
        answer: ["<article>", "<h1>", "<time>", "<p>"],
        bossId: boss1.id,
      },
    ],
  });

  // Boss 2 Questions
  await prisma.bossQuestion.createMany({
    data: [
      {
        question:
          "What CSS property is used to create a responsive grid layout?",
        type: "MULTIPLE_CHOICE",
        choices: [
          "display: flex",
          "display: grid",
          "display: block",
          "display: inline",
        ],
        answer: ["display: grid"],
        bossId: boss2.id,
      },
      {
        question: "Which media query targets screens smaller than 768px?",
        type: "MULTIPLE_CHOICE",
        choices: [
          "@media (min-width: 768px)",
          "@media (max-width: 768px)",
          "@media (width: 768px)",
          "@media screen and (768px)",
        ],
        answer: ["@media (max-width: 768px)"],
        bossId: boss2.id,
      },
      {
        question:
          "Write a CSS media query that changes the font size to 14px on screens smaller than 600px.",
        type: "CODING",
        choices: [],
        answer: ["@media", "max-width: 600px", "font-size: 14px"],
        bossId: boss2.id,
      },
    ],
  });

  // Boss 3 Questions
  await prisma.bossQuestion.createMany({
    data: [
      {
        question:
          "What does the following code return? [1,2,3].reduce((acc, val) => acc + val, 0)",
        type: "MULTIPLE_CHOICE",
        choices: ["0", "1", "6", "3"],
        answer: ["6"],
        bossId: boss3.id,
      },
      {
        question:
          "Which ES6 feature allows you to extract values from arrays into variables?",
        type: "MULTIPLE_CHOICE",
        choices: [
          "Spread operator",
          "Array destructuring",
          "Arrow functions",
          "Template literals",
        ],
        answer: ["Array destructuring"],
        bossId: boss3.id,
      },
      {
        question:
          "Write a JavaScript function that takes an array of numbers and returns their average.",
        type: "CODING",
        choices: [],
        answer: ["reduce", "length", "return"],
        bossId: boss3.id,
      },
    ],
  });

  // Boss 4 Questions
  await prisma.bossQuestion.createMany({
    data: [
      {
        question:
          "What Git command creates a new branch and switches to it immediately?",
        type: "MULTIPLE_CHOICE",
        choices: [
          "git branch new-branch",
          "git checkout -b new-branch",
          "git switch new-branch",
          "git create new-branch",
        ],
        answer: ["git checkout -b new-branch"],
        bossId: boss4.id,
      },
      {
        question: "What is the difference between git revert and git reset?",
        type: "MULTIPLE_CHOICE",
        choices: [
          "They are the same",
          "git revert creates a new commit, git reset removes commits",
          "git reset creates a new commit, git revert removes commits",
          "git revert only works on branches",
        ],
        answer: ["git revert creates a new commit, git reset removes commits"],
        bossId: boss4.id,
      },
      {
        question:
          "Write the Git commands to: create a new branch called 'fix-bug', switch to it, and push it to remote.",
        type: "CODING",
        choices: [],
        answer: ["git checkout -b fix-bug", "git push origin fix-bug"],
        bossId: boss4.id,
      },
    ],
  });

  console.log(`✅ Seeded boss questions`);

  // ============================================
  // 8. AI SESSION
  // ============================================
  console.log("Seeding AI session...");

  await prisma.aiSession.upsert({
    where: { id: "session-001" },
    update: {},
    create: {
      id: "session-001",
      userId: user.id,
      type: "DEEP_DIVE",
      topic: "CSS Flexbox vs Grid",
      context: {
        questId: quest1.id,
        userLevel: 5,
      },
      response: {
        explanation:
          "Think of Flexbox as a bookshelf (1D) and Grid as a chessboard (2D)...",
      },
      xpCost: 500,
      rating: 5,
    },
  });

  console.log(`✅ Seeded AI session`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n--- Seed Summary ---");
  console.log(`✅ Store Items: ${storeItems.length}`);
  console.log(`✅ Users: ${user.name}, ${adminUser.name}`);
  console.log(`✅ Schedule: ${schedule.name}`);
  console.log(`✅ Roadmap: ${roadmap.title}`);
  console.log(`✅ Stages: 3`);
  console.log(`✅ Quests: 4`);
  console.log(`✅ User Quests: 4 (assigned to Jacinth)`);
  console.log(`✅ Bosses: 4`);
  console.log(`✅ Boss Questions: 12 (3 per boss)`);
  console.log("--- Seed Completed ✅ ---");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
