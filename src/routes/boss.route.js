import express from "express";
import {
  getBossByQuestId,
  getBossFightHistory,
  startBossFight,
  submitBossFight,
} from "../controllers/boss.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/history", protect, getBossFightHistory); // GET  /api/boss/history
router.get("/:questId", protect, getBossByQuestId); // GET  /api/boss/:questId
router.post("/:questId/start", protect, startBossFight); // POST /api/boss/:questId/start
router.post("/:questId/submit", protect, submitBossFight); // POST /api/boss/:questId/submit

export default router;
