import model from "../lib/gemini.js";

// ============================================
// ROADMAP PROMPT
// ============================================
const buildRoadmapPrompt = (itRole) => `
You are an expert IT career mentor and curriculum designer.

Your task is to generate a beginner-friendly learning roadmap for the IT role: ${itRole}.

The roadmap should be designed like a game progression system, where learners complete quests and defeat a boss challenge after each quest. Each boss has exactly 3 questions.

Return the result STRICTLY in JSON format using the structure below. No extra text, only JSON.

{
  "pathName": "${itRole}",
  "title": "string - creative roadmap title",
  "expectedDuration": "string - e.g. 1-2 months",
  "estimatedWeeks": number,
  "stages": [
    {
      "stageNumber": number,
      "title": "string",
      "description": "string",
      "startWeek": number,
      "endWeek": number,
      "quests": [
        {
          "questNumber": number,
          "title": "string",
          "week": number,
          "duration": "string - e.g. Week 1-2",
          "goal": "string - learning goal",
          "keyTopics": ["string"],
          "resourceDescription": "string",
          "courseLink": "string - real free course URL",
          "videoSeriesLink": "string - real YouTube URL",
          "documentationLink": "string - real docs URL",
          "xpReward": number,
          "badgeReward": "string - badge name",
          "boss": {
            "name": "string - creative boss name",
            "goal": "string",
            "challenge": "string - what the student must build or do",
            "hp": number,
            "damage": number,
            "difficulty": "Easy | Medium | Hard",
            "xpReward": number,
            "loot": "string - badge or reward name",
            "questions": [
              {
                "question": "string",
                "type": "MULTIPLE_CHOICE | CODING",
                "choices": ["string"],
                "answer": ["string"]
              }
            ]
          }
        }
      ]
    }
  ]
}

Rules:
- Generate exactly 3 stages with 1-2 quests each
- Each boss must have exactly 3 questions
- Use real, working URLs for resources (freeCodeCamp, MDN, YouTube, etc.)
- XP rewards should increase with difficulty (100, 200, 300, 500...)
- Boss HP should increase with difficulty (500, 800, 1200, 1500...)
- Make it beginner-friendly and fun
`;

// ============================================
// SCHEDULE PROMPT
// ============================================
const buildSchedulePrompt = (scheduleText) => `
You are an expert academic scheduler and study planner.

A student has provided their class schedule. Parse it and identify:
1. CLASS blocks - when they have classes
2. GAP_WINDOW blocks - free time that is good for studying (golden hours)
3. DEAD_ZONE blocks - late nights or early mornings when studying is not ideal
4. BREAK blocks - lunch/short breaks

Return the result STRICTLY in JSON format. No extra text, only JSON.

Student Schedule:
"""
${scheduleText}
"""

Return this structure:
{
  "semesterName": "string - inferred semester name if available",
  "parsedBlocks": [
    {
      "dayOfWeek": number (1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday),
      "startTime": "HH:MM in 24hr format",
      "endTime": "HH:MM in 24hr format",
      "subject": "string or null",
      "type": "CLASS | GAP_WINDOW | DEAD_ZONE | BREAK",
      "description": "string - short description"
    }
  ],
  "studySummary": {
    "totalClassHours": number,
    "totalGapWindows": number,
    "bestStudyDays": ["string - day names"],
    "recommendation": "string - AI recommendation for scheduling quests"
  }
}

Rules:
- 22:00 to 06:00 = DEAD_ZONE
- Free gaps between classes of 1.5hrs+ = GAP_WINDOW
- Lunch break 12:00-13:00 = BREAK
- Be precise with times
- If a day has no classes, mark it as a GAP_WINDOW for the whole day (8am-10pm)
`;

// ============================================
// BOSS FIGHT PROMPT
// ============================================
const buildBossFightPrompt = (
  boss,
  questions,
  userAnswer,
  questTitle,
  academicLevel,
) => `
You are an expert IT mentor evaluating a student's boss fight attempt.

Student Info:
- Academic Level: ${academicLevel || "College Student"}
- Current Quest: ${questTitle}
- Boss: ${boss.name}
- Boss Challenge: ${boss.challenge}

The student answered the following questions:

${questions
  .map((q, i) => {
    const answer = userAnswer[i];
    return `
Question ${i + 1}: ${q.question}
Type: ${q.type}
${q.type === "MULTIPLE_CHOICE" ? `Choices: ${q.choices.join(", ")}` : ""}
Correct Answer: ${q.answer.join(", ")}
Student's Answer: ${answer || "No answer provided"}
`;
  })
  .join("\n")}

Evaluate the student's performance and return STRICTLY in JSON format. No extra text, only JSON.

{
  "passed": true or false,
  "score": number (0-100),
  "xpEarned": number (based on score percentage of ${boss.xpReward} XP),
  "hpDealt": number (damage dealt to boss based on score, max ${boss.hp}),
  "feedback": "string - encouraging feedback mentioning their name",
  "questionResults": [
    {
      "questionIndex": number,
      "isCorrect": true or false,
      "explanation": "string - explain why the answer is correct or wrong in a fun way"
    }
  ],
  "bossStatus": "DEFEATED | SURVIVED",
  "motivationalMessage": "string - short game-like message e.g. 'The Skeleton King has fallen!'"
}

Rules:
- passed = true if score >= 70
- xpEarned = Math.floor((score/100) * ${boss.xpReward})
- hpDealt = Math.floor((score/100) * ${boss.hp})
- bossStatus = DEFEATED if passed, SURVIVED if not
- Be encouraging even if they fail
- Use game-like language
`;

// ============================================
// SERVICE FUNCTIONS
// ============================================

export const generateRoadmap = async (itRole) => {
  try {
    const prompt = buildRoadmapPrompt(itRole);
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const roadmapData = JSON.parse(response);
    return roadmapData;
  } catch (error) {
    throw new Error(`Failed to generate roadmap: ${error.message}`);
  }
};

export const parseSchedule = async (scheduleText) => {
  try {
    const prompt = buildSchedulePrompt(scheduleText);
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const scheduleData = JSON.parse(response);
    return scheduleData;
  } catch (error) {
    throw new Error(`Failed to parse schedule: ${error.message}`);
  }
};

export const evaluateBossFight = async (
  boss,
  questions,
  userAnswers,
  questTitle,
  academicLevel,
) => {
  try {
    const prompt = buildBossFightPrompt(
      boss,
      questions,
      userAnswers,
      questTitle,
      academicLevel,
    );
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const evaluation = JSON.parse(response);
    return evaluation;
  } catch (error) {
    throw new Error(`Failed to evaluate boss fight: ${error.message}`);
  }
};
