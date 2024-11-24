import express from "express";
import * as achievementController from "../controllers/achievementController";

const router = express.Router();

router.get("/all", achievementController.getAllAchievements);

export default router; 