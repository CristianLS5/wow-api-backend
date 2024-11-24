import express from "express";
import { getCharacterReputations } from "../controllers/reputationsController";

const router = express.Router();

router.get(
  "/:realmSlug/:characterName",
  getCharacterReputations as express.RequestHandler
);

export default router;
