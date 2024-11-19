import express from "express";
import { getAffixes, getAffixById } from "../controllers/affixesController";

const router = express.Router();

router.get("/", getAffixes as express.RequestHandler);
router.get("/:affixId", getAffixById as express.RequestHandler);

export default router;
