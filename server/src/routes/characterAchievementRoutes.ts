import express from "express";
import * as characterAchievementController from "../controllers/characterAchievementController";

const router = express.Router();

router.get(
  "/:realmSlug/:characterName/achievements",
  characterAchievementController.getCharacterAchievements
);

router.get(
  "/:realmSlug/:characterName/achievements/statistics",
  characterAchievementController.getCharacterAchievementStatistics
);

export default router;
