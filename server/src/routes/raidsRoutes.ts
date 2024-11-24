import express from "express";
import { getCharacterRaids } from "../controllers/raidsController";

const router = express.Router();

router.get(
  "/:realmSlug/:characterName",
  getCharacterRaids as express.RequestHandler
);

export default router;
