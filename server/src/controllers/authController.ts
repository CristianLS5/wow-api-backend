import { Request, Response, NextFunction } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import { handleApiError } from "../utils/errorHandler";
import crypto from "crypto";
import { Session, SessionData } from "express-session";
import store from "../config/sessionStore";
import { Cookie } from "express-session";

// Define custom session data
interface CustomSessionData {
  oauthState?: string;
  frontendCallback?: string;
  accessToken?: string;
  refreshToken?: string;
  isPersistent?: boolean;
  consent?: string;
}

// Extend the Session interface
interface CustomSession extends Session, CustomSessionData {
  cookie: Cookie;
}

// Extend the Request interface
interface CustomRequest extends Request {
  session: CustomSession;
}

// Interface for stored session
interface StoredSession extends SessionData {
  cookie: Cookie;
  oauthState?: string;
  frontendCallback?: string;
  accessToken?: string;
  refreshToken?: string;
  isPersistent?: boolean;
  consent?: string;
}

export const getAuthorizationUrl = async (
  req: CustomRequest,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const frontendCallback =
      (req.query.callback as string) || "http://localhost:4200/auth/callback";
    const consent = req.query.consent as string;
    const state = crypto.randomBytes(16).toString("hex");

    const authUrl = new URL(
      `https://${BattleNetAPI.region}.battle.net/oauth/authorize`
    );
    authUrl.searchParams.set("client_id", process.env.BNET_CLIENT_ID!);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", process.env.BNET_CALLBACK_URL!);
    authUrl.searchParams.set("scope", "wow.profile");
    authUrl.searchParams.set("state", state);

    // Store both state and consent in session
    req.session.oauthState = state;
    req.session.consent = consent;
    req.session.frontendCallback = frontendCallback;

    res.redirect(authUrl.toString());
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
    const consent = req.session.consent === "true"; // Get consent from session

    if (state !== req.session.oauthState) {
      res.status(403).json({ error: "Invalid state parameter" });
      return;
    }

    const { token, refreshToken } = await BattleNetAPI.getAccessToken(
      code as string
    );

    // Set session values based on consent
    req.session.accessToken = token;
    req.session.isPersistent = consent;

    if (consent) {
      // Persistent session (30 days)
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      req.session.refreshToken = refreshToken;
    } else {
      // Session cookie (browser session only)
      req.session.cookie.maxAge = undefined;
      delete req.session.refreshToken;
    }

    // Force session save before redirect
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Include session ID and persistence info in redirect
    const sessionID = req.sessionID;
    const redirectUrl = new URL(frontendCallback);
    redirectUrl.searchParams.set("success", "true");
    redirectUrl.searchParams.set("hasToken", "true");
    redirectUrl.searchParams.set("persistentSession", consent.toString());
    redirectUrl.searchParams.set("sid", sessionID);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    handleApiError(error, res, "handle OAuth callback");
  }
};

export const validateToken = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const sessionId = req.headers["x-session-id"] as string;
    const storageType = req.headers["x-storage-type"] as string; // 'session' or 'local'

    // If there's no session ID or storage type, user is not authenticated
    if (!sessionId || !storageType) {
      res.json({
        isAuthenticated: false,
        isPersistent: false,
        error: "Missing session information",
      });
      return;
    }

    // Get the session
    const session = await new Promise<StoredSession | null>(
      (resolve, reject) => {
        store.get(sessionId, (error, session) => {
          if (error) reject(error);
          resolve(session as StoredSession | null);
        });
      }
    );

    if (!session || !session.accessToken) {
      res.json({
        isAuthenticated: false,
        isPersistent: false,
        error: "Invalid session",
      });
      return;
    }

    // Validate storage type matches session persistence
    const isPersistent = !!session.isPersistent;
    const correctStorageType = isPersistent
      ? storageType === "local"
      : storageType === "session";

    if (!correctStorageType) {
      res.json({
        isAuthenticated: false,
        isPersistent: false,
        error: "Storage type mismatch",
      });
      return;
    }

    const isValid = await BattleNetAPI.validateToken(session.accessToken);

    if (isValid) {
      // Touch the session
      session.cookie.expires = new Date(
        Date.now() + (session.cookie.maxAge || 24 * 60 * 60 * 1000)
      );

      await new Promise<void>((resolve, reject) => {
        store.set(sessionId, session, (error) => {
          if (error) reject(error);
          resolve();
        });
      });

      res.json({
        isAuthenticated: true,
        isPersistent: isPersistent,
      });
    } else {
      res.json({
        isAuthenticated: false,
        isPersistent: false,
        error: "Invalid token",
      });
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
        res.clearCookie("bnet_refresh_token");
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
    const { token, persistentSession } = req.body;

    if (!token) {
      res.status(400).json({ error: "No token provided" });
      return;
    }

    // Validate the token with Battle.net
    const isValid = await BattleNetAPI.validateToken(token);

    if (!isValid) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // Set the session
    req.session.accessToken = token;
    req.session.isPersistent = persistentSession;

    if (persistentSession) {
      // Set long-lived session for persistent
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
      // Session cookie for non-persistent
      req.session.cookie.maxAge = undefined;
    }

    // Save the session explicitly
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      isAuthenticated: true,
      isPersistent: persistentSession,
    });
  } catch (error) {
    handleApiError(error, res, "exchange token");
  }
};


export const refreshToken = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const refreshToken = req.cookies.bnet_refresh_token;

    if (!refreshToken) {
      res.status(401).json({ error: "No refresh token found" });
      return;
    }

    const {
      token,
      refreshToken: newRefreshToken,
      expiresIn,
    } = await BattleNetAPI.refreshAccessToken(refreshToken);

    // Update session
    req.session.accessToken = token;
    req.session.refreshToken = newRefreshToken;

    // Update refresh token cookie
    res.cookie("bnet_refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Change this
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      success: true,
      token,
      expiresIn,
    });
  } catch (error) {
    handleApiError(error, res, "refresh token");
  }
};

export const updateConsent = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { consent } = req.body;
    const { accessToken, refreshToken } = req.session;

    if (consent) {
      // User has given consent, store tokens
      if (accessToken && refreshToken) {
        res.cookie("bnet_refresh_token", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: "/",
        });
      }
    } else {
      // User has revoked consent, remove stored tokens
      req.session.accessToken = undefined;
      req.session.refreshToken = undefined;
      res.clearCookie("bnet_refresh_token");
    }

    res.json({ success: true });
  } catch (error) {
    handleApiError(error, res, "update consent");
  }
};

export const validateSession = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { sid, persistentSession } = req.body;

    // Validate the session exists with proper typing
    const session = await new Promise<StoredSession | null>((resolve, reject) => {
      store.get(sid, (error, session) => {
        if (error) reject(error);
        resolve(session as StoredSession | null);
      });
    });

    if (!session || !session.accessToken) {
      res.json({
        isAuthenticated: false,
        isPersistent: false,
        error: "Invalid session",
      });
      return;
    }

    // Validate the token
    const isValid = await BattleNetAPI.validateToken(session.accessToken);
    if (!isValid) {
      res.json({
        isAuthenticated: false,
        isPersistent: false,
        error: "Invalid token",
      });
      return;
    }

    // Update session persistence if needed
    if (persistentSession) {
      session.isPersistent = true;
      session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    // Save the updated session
    await new Promise<void>((resolve, reject) => {
      store.set(sid, session, (error) => {
        if (error) reject(error);
        resolve();
      });
    });

    res.json({
      isAuthenticated: true,
      isPersistent: !!session.isPersistent,
    });
  } catch (error) {
    handleApiError(error, res, "validate session");
  }
};
