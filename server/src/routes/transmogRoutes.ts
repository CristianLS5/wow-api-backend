import express from "express";
import { getTransmogSets, forceRefreshTransmogSets } from "../controllers/transmogController";

const router = express.Router();

router.get("/", getTransmogSets);
router.post("/refresh", forceRefreshTransmogSets);

export default router; 