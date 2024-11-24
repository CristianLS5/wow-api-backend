import express from "express";
import * as collectionsController from "../controllers/collectionsController";

const router = express.Router();

router.get(
  "/:realmSlug/:characterName/mounts",
  collectionsController.getCharacterMounts as express.RequestHandler
);
router.get(
  "/:realmSlug/:characterName/toys",
  collectionsController.getCharacterToys as express.RequestHandler
);
router.get(
  "/:realmSlug/:characterName/pets",
  collectionsController.getCharacterPets as express.RequestHandler
);
router.get(
  "/:realmSlug/:characterName/transmogs",
  collectionsController.getCharacterTransmogs as express.RequestHandler
);
router.get(
  "/:realmSlug/:characterName/heirlooms",
  collectionsController.getCharacterHeirlooms
);

export default router;
