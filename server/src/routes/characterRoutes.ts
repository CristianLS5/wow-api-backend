import express from "express";
import * as characterController from "../controllers/characterController";

const router = express.Router();

router.get(
  "/:realmSlug/:characterName/equipment",
  characterController.getCharacterEquipment as express.RequestHandler
);
router.get(
  "/:realmSlug/:characterName/media",
  characterController.getCharacterMedia as express.RequestHandler
);
router.get(
  "/:realmSlug/:characterName/profile",
  characterController.getCharacterProfile as express.RequestHandler
);

export default router;
