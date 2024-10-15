import express from "express";
import * as authController from "../controllers/authController";

const router = express.Router();

router.get("/bnet", authController.getAuthorizationUrl);
router.get("/callback", authController.handleCallback);

export default router;
