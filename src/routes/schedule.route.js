import express from "express";
import {
  getMySchedule,
  getQuestPlan,
  parseAndSaveSchedule,
  uploadAndParseSchedule,
} from "../controllers/schedule.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/parse", protect, parseAndSaveSchedule); // POST /api/schedule/parse (text)
router.post(
  "/upload",
  protect,
  upload.single("schedule"),
  uploadAndParseSchedule,
); // POST /api/schedule/upload (PDF)
router.get("/my", protect, getMySchedule); // GET  /api/schedule/my
router.get("/quest-plan", protect, getQuestPlan); // GET  /api/schedule/quest-plan

export default router;
