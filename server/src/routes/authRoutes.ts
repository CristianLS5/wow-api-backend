import express from "express";
import * as authController from "../controllers/authController";

const router = express.Router();

router.get("/bnet", authController.getAuthorizationUrl);
router.get("/callback", authController.handleCallback);
router.get("/validate", authController.validateToken);
router.post("/logout", authController.logout);
router.post('/exchange-token', authController.exchangeToken);
router.post('/refresh-token', authController.refreshToken);
router.post('/update-consent', authController.updateConsent);
router.post("/validate-session", authController.validateSession);
router.get('/auth/callback', (req, _res, next) => {
  console.log('Route hit: /auth/callback', {
    method: req.method,
    query: req.query,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
  next();
}, authController.handleCallback);

export default router;
