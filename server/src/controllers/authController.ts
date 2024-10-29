import { Request, Response, NextFunction } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import { handleApiError } from "../utils/errorHandler";
import crypto from "crypto";
import { Session } from "express-session";

// Extend the Session interface
interface CustomSession extends Session {
  oauthState?: string;
  frontendCallback?: string;
  accessToken?: string;
}

// Extend the Request interface to use our CustomSession
interface CustomRequest extends Request {
  session: CustomSession;
}

export const getAuthorizationUrl = async (
  req: CustomRequest,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const frontendCallback =
      (req.query.callback as string) || "http://localhost:4200/auth/callback";
    const state = crypto.randomBytes(16).toString("hex");

    const authUrl =
      `https://${BattleNetAPI.region}.battle.net/oauth/authorize?` +
      `client_id=${process.env.BNET_CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(process.env.BNET_CALLBACK_URL!)}&` +
      `scope=wow.profile&` +
      `state=${state}`;

    req.session.oauthState = state;
    req.session.frontendCallback = frontendCallback;

    res.redirect(authUrl);
  } catch (error) {
    handleApiError(error, res, "generate authorization URL");
  }
};

export const handleCallback = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { code, state } = req.query;
    const frontendCallback =
      req.session.frontendCallback || "http://localhost:4200/auth/callback";

    if (state !== req.session.oauthState) {
      res.status(403).json({ error: "Invalid state parameter" });
      return;
    }

    delete req.session.oauthState;

    const { token, expiresIn } = await BattleNetAPI.getAccessToken(
      code as string
    );
    req.session.accessToken = token;

    res.redirect(`${frontendCallback}?success=true&expiresIn=${expiresIn}`);
  } catch (error) {
    handleApiError(error, res, "handle OAuth callback");
  }
};

export const validateToken = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const accessToken = req.session.accessToken;

    if (!accessToken) {
      res.json({ isAuthenticated: false, error: "No access token found" });
      return;
    }

    const isValid = await BattleNetAPI.validateToken(accessToken);

    if (isValid) {
      res.json({ isAuthenticated: true });
    } else {
      delete req.session.accessToken;
      res.json({ isAuthenticated: false, error: "Invalid token" });
    }
  } catch (error) {
    handleApiError(error, res, "validate token");
  }
};

export const logout = (req: CustomRequest, res: Response): Promise<void> => {
  return new Promise((resolve) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        res.status(500).json({ error: "Logout failed" });
      } else {
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      }
      resolve();
    });
  });
};

export const exchangeToken = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { code, state } = req.body;

    if (state !== req.session.oauthState) {
      res.status(403).json({ error: "Invalid state parameter" });
      return;
    }

    const { token, expiresIn } = await BattleNetAPI.getAccessToken(code);
    req.session.accessToken = token;

    res.json({
      success: true,
      message: "Authentication successful",
      expiresIn: expiresIn,
    });
  } catch (error) {
    handleApiError(error, res, "exchange token");
  }
};
