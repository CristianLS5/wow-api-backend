import express from "express";
import * as itemController from "../controllers/itemController";

const router = express.Router();

router.get("/", itemController.getItemsIndex);
router.get("/:itemId", itemController.getItemById);

export default router;
