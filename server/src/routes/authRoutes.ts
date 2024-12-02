import express from "express";
import * as authController from "../controllers/authController";

const router = express.Router();

router.get("/bnet", authController.getAuthorizationUrl);
router.post("/callback", authController.handleOAuthCallback);
router.get("/callback", authController.handleCallback);
router.get("/validate", authController.validateToken);
router.post("/logout", authController.logout);

export default router;
