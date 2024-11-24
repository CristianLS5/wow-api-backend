import express from "express";
import * as heirloomController from "../controllers/heirloomController";
const router = express.Router();

router.get("/", heirloomController.getHeirloomsIndex);
router.get("/all", heirloomController.getAllHeirlooms);
router.get("/:heirloomId", heirloomController.getHeirloomById);

export default router; 