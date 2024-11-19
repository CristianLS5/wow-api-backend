import express from "express";
import {
  getCharacterDungeonProfile,
  getCharacterDungeonSeasonDetails,
  getDungeonSeasons,
  getDungeonSeasonDetails
} from "../controllers/dungeonsController";

const router = express.Router();

// Character-specific routes
router.get(
  "/:realmSlug/:characterName",
  getCharacterDungeonProfile as express.RequestHandler
);

router.get(
  "/:realmSlug/:characterName/season/:seasonId",
  getCharacterDungeonSeasonDetails as express.RequestHandler
);

// Season routes
router.get(
  "/seasons",
  getDungeonSeasons as express.RequestHandler
);

router.get(
  "/seasons/:seasonId",
  getDungeonSeasonDetails as express.RequestHandler
);

export default router;
