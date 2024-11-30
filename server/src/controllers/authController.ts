import { Request, Response } from "express";
import { handleApiError } from "../utils/errorHandler";
import crypto from "crypto";
import { Session, SessionData } from "express-session";
import { Cookie } from "express-session";
import { getStore } from "../config/sessionStore";
import BattleNetAPIInstance, { BattleNetAPI } from "../services/BattleNetAPI";

// Define custom session data
interface CustomSessionData {
  oauthState?: string;
  frontendCallback?: string;
  accessToken?: string;
  refreshToken?: string;
  isPersistent?: boolean;
  consent?: string;
  region?: string;
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
  region?: string;
}

export const getAuthorizationUrl = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store the callback URL if provided
    const frontendCallback = req.query.callback as string;
    if (frontendCallback) {
      req.session.frontendCallback = frontendCallback;
    }
    
    // Set the state in session
    req.session.oauthState = state;
    req.session.cookie.sameSite = 'none';
    req.session.cookie.secure = true;
    req.session.cookie.domain = '.wowcharacterviewer.com';
    req.session.cookie.path = '/';
    
    // Force session save and wait for completion
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Session save failed:', err);
          reject(err);
          return;
        }
        console.log('Session saved:', {
          sessionID: req.sessionID,
          state: state,
          oauthState: req.session.oauthState,
          frontendCallback: req.session.frontendCallback,
          cookie: req.session.cookie
        });
        resolve();
      });
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.BNET_CLIENT_ID!,
      scope: 'wow.profile',
      state: state,
      redirect_uri: process.env.BNET_CALLBACK_URL!
    });

    // Set cookie headers explicitly
    res.setHeader('Set-Cookie', [
      `wcv.sid=${req.sessionID}; Path=/; Domain=.wowcharacterviewer.com; Secure; HttpOnly; SameSite=None; Max-Age=86400`
    ]);

    const authUrl = `https://${process.env.BNET_REGION}.battle.net/oauth/authorize?${params}`;
    
    // Perform the redirect instead of sending JSON
    res.redirect(authUrl);
  } catch (error) {
    console.error('Auth URL Error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
};

export const handleCallback = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    console.log("Callback received:", {
      state: req.query.state,
      sessionState: req.session.oauthState,
      hasCode: !!req.query.code,
      sessionId: req.sessionID,
    });

    // 1. Verify state parameter
    if (
      !req.query.state ||
      !req.session.oauthState ||
      req.query.state !== req.session.oauthState
    ) {
      console.error("State mismatch:", {
        receivedState: req.query.state,
        sessionState: req.session.oauthState,
      });
      // Let frontend handle the error
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=invalid_state`);
      return;
    }

    // 2. Clear state after verification
    delete req.session.oauthState;

    // 3. Handle the OAuth code
    const code = req.query.code as string;
    if (!code) {
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=missing_code`);
      return;
    }

    try {
      const { token, refreshToken } = await BattleNetAPI.getAccessToken(code);
      
      // Store tokens and save session
      req.session.accessToken = token;
      req.session.refreshToken = refreshToken;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => err ? reject(err) : resolve());
      });

      // Redirect with success
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?code=${code}&state=${req.query.state}`);
    } catch (error) {
      console.error('Token exchange error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=token_exchange_failed`);
    }
  } catch (error) {
    console.error("Callback Error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=server_error`);
  }
};

export const validateToken = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const store = getStore();
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

    const isValid = await BattleNetAPIInstance.validateToken(
      session.accessToken
    );

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
  } catch (error: unknown) {
    if (error instanceof Error) {
      handleApiError(error, res, "validate token");
    } else {
      handleApiError(new Error("Unknown error"), res, "validate token");
    }
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
    const isValid = await BattleNetAPIInstance.validateToken(token);

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
  } catch (error: unknown) {
    if (error instanceof Error) {
      handleApiError(error, res, "exchange token");
    } else {
      handleApiError(new Error("Unknown error"), res, "exchange token");
    }
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
    } = await BattleNetAPIInstance.refreshAccessToken(refreshToken);

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
  } catch (error: unknown) {
    if (error instanceof Error) {
      handleApiError(error, res, "refresh token");
    } else {
      handleApiError(new Error("Unknown error"), res, "refresh token");
    }
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      handleApiError(error, res, "update consent");
    } else {
      handleApiError(new Error("Unknown error"), res, "update consent");
    }
  }
};

export const validateSession = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { sid, persistentSession } = req.body;

    // Validate the session exists with proper typing
    const session = await new Promise<StoredSession | null>(
      (resolve, reject) => {
        const store = getStore();
        store.get(sid, (error, session) => {
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

    // Validate the token
    const isValid = await BattleNetAPIInstance.validateToken(
      session.accessToken
    );
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
      const store = getStore();
      store.set(sid, session, (error) => {
        if (error) reject(error);
        resolve();
      });
    });

    res.json({
      isAuthenticated: true,
      isPersistent: !!session.isPersistent,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      handleApiError(error, res, "validate session");
    } else {
      handleApiError(new Error("Unknown error"), res, "validate session");
    }
  }
};

export const authorize = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const state = crypto.randomBytes(16).toString("hex");
    req.session.oauthState = state;

    // Ensure session is saved before redirect
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        resolve();
      });
    });

    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.BNET_CLIENT_ID!,
      scope: "wow.profile",
      state,
      redirect_uri: process.env.BNET_CALLBACK_URL!,
    });

    res.redirect(
      `https://${process.env.BNET_REGION}.battle.net/oauth/authorize?${params}`
    );
  } catch (error) {
    console.error("Auth Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleOAuthExchange = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { code, state } = req.body;

    console.log("OAuth Exchange received:", {
      hasCode: !!code,
      hasState: !!state,
      sessionState: req.session.oauthState,
      sessionId: req.sessionID,
      cookies: req.headers.cookie
    });

    // Ensure session exists
    if (!req.session) {
      console.error("No session found");
      res.status(401).json({
        error: "no_session",
        isAuthenticated: false
      });
      return;
    }

    // More lenient state validation during development
    if (process.env.NODE_ENV === 'development') {
      if (!state) {
        res.status(400).json({
          error: "missing_state",
          isAuthenticated: false
        });
        return;
      }
    } else {
      // Strict state validation in production
      if (!state || !req.session.oauthState || state !== req.session.oauthState) {
        console.error("State mismatch:", {
          receivedState: state,
          sessionState: req.session.oauthState
        });
        res.status(400).json({
          error: "invalid_state",
          isAuthenticated: false
        });
        return;
      }
    }

    // Clear state after verification
    delete req.session.oauthState;

    // Exchange code for tokens
    const { token, refreshToken } = await BattleNetAPI.getAccessToken(code);
    
    // Store in session
    req.session.accessToken = token;
    req.session.refreshToken = refreshToken;
    
    // Force session save
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Set cookie headers explicitly
    res.setHeader('Set-Cookie', [
      `wcv.sid=${req.sessionID}; Path=/; Domain=.wowcharacterviewer.com; Secure; HttpOnly; SameSite=None`
    ]);

    res.json({
      isAuthenticated: true,
      isPersistent: !!req.session.isPersistent,
      sessionId: req.sessionID
    });
  } catch (error) {
    console.error("OAuth Exchange Error:", error);
    res.status(500).json({ 
      error: "server_error",
      isAuthenticated: false 
    });
  }
};

export const handleOAuthCallback = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { code, state } = req.body;

    console.log("OAuth Exchange received:", {
      hasCode: !!code,
      hasState: !!state,
      sessionState: req.session.oauthState,
      sessionId: req.sessionID,
      cookies: req.headers.cookie
    });

    // Ensure session exists
    if (!req.session) {
      console.error("No session found");
      res.status(401).json({
        error: "no_session",
        message: "Session not found",
        isAuthenticated: false
      });
      return;
    }

    // More lenient state validation during development
    if (process.env.NODE_ENV === 'development') {
      if (!state || !code) {
        res.status(400).json({
          error: "missing_parameters",
          message: "Missing code or state",
          isAuthenticated: false
        });
        return;
      }
    } else {
      // Strict state validation in production
      if (!state || !req.session.oauthState || state !== req.session.oauthState) {
        console.error("State mismatch:", {
          receivedState: state,
          sessionState: req.session.oauthState
        });
        res.status(400).json({
          error: "invalid_state",
          message: "State validation failed",
          isAuthenticated: false
        });
        return;
      }
    }

    // Clear state after verification
    delete req.session.oauthState;

    // Exchange code for tokens
    const { token, refreshToken } = await BattleNetAPI.getAccessToken(code);
    
    // Store in session
    req.session.accessToken = token;
    req.session.refreshToken = refreshToken;
    
    // Force session save
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          reject(err);
        } else {
          console.log("Session saved successfully:", {
            sessionId: req.sessionID,
            hasAccessToken: !!req.session.accessToken
          });
          resolve();
        }
      });
    });

    res.json({
      isAuthenticated: true,
      isPersistent: !!req.session.isPersistent,
      sessionId: req.sessionID,
      message: "Authentication successful"
    });
  } catch (error) {
    console.error("OAuth Exchange Error:", error);
    res.status(500).json({ 
      error: "server_error",
      message: "Internal server error during OAuth exchange",
      isAuthenticated: false 
    });
  }
};
