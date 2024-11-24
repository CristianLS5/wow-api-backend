import express from "express";
import * as mountController from "../controllers/mountController";

const router = express.Router();

router.get("/", mountController.getMountsIndex);
router.get("/search", mountController.searchMounts);
router.get("/all", mountController.getAllMounts);
router.get("/:mountId", mountController.getMountById);


export default router;
