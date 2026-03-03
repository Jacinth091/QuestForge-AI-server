import express from "express";
import {
  generateAndSaveRoadmap,
  getAllRoadmaps,
  getMyRoadmap,
  selectPathAndGenerate,
} from "../controllers/roadmap.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/select-path", protect, selectPathAndGenerate); // POST /api/roadmap/select-path ✅ Main flow
router.post("/generate", protect, generateAndSaveRoadmap); // POST /api/roadmap/generate (manual)
router.get("/my", protect, getMyRoadmap); // GET  /api/roadmap/my
router.get("/", protect, getAllRoadmaps); // GET  /api/roadmap

export default router;
