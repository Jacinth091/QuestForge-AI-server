import express from "express";
import {
  getAllRoadmaps,
  getMyQuests,
  getMyRoadmap,
  selectPathAndGenerate,
} from "../controllers/roadmap.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/select-path", protect, selectPathAndGenerate); // POST /api/roadmap/select-path
router.get("/my-quests", protect, getMyQuests); // GET  /api/roadmap/my-quests
router.get("/my", protect, getMyRoadmap); // GET  /api/roadmap/my
router.get("/", protect, getAllRoadmaps); // GET  /api/roadmap

export default router;
