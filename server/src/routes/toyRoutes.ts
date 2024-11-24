import express from "express";
import * as toyController from "../controllers/toyController";
const router = express.Router();

router.get("/", toyController.getToysIndex);
router.get("/all", toyController.getAllToys);
router.get("/:toyId", toyController.getToyById);

export default router;
