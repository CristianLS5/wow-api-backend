import express from "express";
import * as characterController from "../controllers/characterController";

const router = express.Router();

router.get(
  "/:realmSlug/:characterName/equipment",
  characterController.getCharacterEquipment
);
router.get(
  "/:realmSlug/:characterName/media",
  characterController.getCharacterMedia
);
router.get(
  "/:realmSlug/:characterName/profile",
  characterController.getCharacterProfile
);

export default router;
