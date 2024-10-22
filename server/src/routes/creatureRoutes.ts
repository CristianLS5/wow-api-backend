import express from "express";
import * as creatureController from "../controllers/creatureController";

const router = express.Router();

// ... (keep existing routes)

router.get("/:creatureId/media", creatureController.getCreatureMedia);

export default router;
