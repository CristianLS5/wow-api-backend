import { Request, Response, NextFunction } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import { handleApiError } from "../utils/errorHandler";
import crypto from "crypto";
import { Session, SessionData } from "express-session";
import { Cookie } from "express-session";
import { getStore } from '../config/sessionStore';
import { URLS } from '../config/config';

// Define custom session data
interface CustomSessionData {
  oauthState?: string;
  frontendCallback?: string;
  accessToken?: string;
  refreshToken?: string;
  isPersistent?: boolean;
  consent?: boolean;
  authTimestamp?: string;
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
  consent?: boolean;
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
    const state = req.query.state as string || crypto.randomBytes(16).toString("hex");

    console.log('Auth Request Details:', {
      frontendCallback,
      consent,
      state,
      BNET_CALLBACK_URL: process.env.BNET_CALLBACK_URL,
      BNET_CLIENT_ID: process.env.BNET_CLIENT_ID?.substring(0, 8) + '...',
      sessionID: req.sessionID
    });

    // Ensure session is created and saved before redirect
    req.session.oauthState = state;
    req.session.consent = consent === 'true';
    req.session.frontendCallback = frontendCallback;

    // Force session save before redirect
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          reject(err);
        } else {
          console.log('Session saved successfully:', {
            sessionID: req.sessionID,
            state: state,
            hasState: !!req.session.oauthState
          });
          resolve();
        }
      });
    });

    const authUrl = new URL(`https://${process.env.BNET_REGION}.battle.net/oauth/authorize`);
    authUrl.searchParams.set("client_id", process.env.BNET_CLIENT_ID!);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", process.env.BNET_CALLBACK_URL!);
    authUrl.searchParams.set("scope", "wow.profile");
    authUrl.searchParams.set("state", state);

    const finalUrl = authUrl.toString();
    console.log('Generated Auth URL:', finalUrl.replace(process.env.BNET_CLIENT_ID!, 'MASKED_CLIENT_ID'));

    // Instead of redirecting, send the URL back to the client
    res.json({ url: finalUrl });
  } catch (error: unknown) {
    console.error('Error in getAuthorizationUrl:', error);
    if (error instanceof Error) {
      handleApiError(error, res, "generate authorization URL");
    } else {
      handleApiError(new Error('Unknown error'), res, "generate authorization URL");
    }
  }
};

export const handleCallback = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const code = req.query.code || req.body.code;
    const state = req.query.state || req.body.state;
    
    console.log('Callback received:', {
      hasCode: !!code,
      hasState: !!state,
      receivedState: state,
      sessionID: req.sessionID,
      sessionState: req.session?.oauthState,
      hasSession: !!req.session,
      method: req.method,
      isCodeUsed: !!req.session?.accessToken
    });

    if (!req.session) {
      console.error('No session found in callback');
      res.redirect(`${URLS.FRONTEND}/auth/callback?error=no_session`);
      return;
    }

    // If we already have a token, don't try to get another one
    if (req.session.accessToken) {
      console.log('Token already exists, skipping token exchange');
      if (req.method === 'POST') {
        res.json({
          isAuthenticated: true,
          isPersistent: req.session.isPersistent,
          sessionId: req.sessionID
        });
      } else {
        const redirectUrl = new URL(req.session.frontendCallback || `${URLS.FRONTEND}/auth/callback`);
        redirectUrl.searchParams.set("code", code as string);
        redirectUrl.searchParams.set("state", state as string);
        res.redirect(redirectUrl.toString());
      }
      return;
    }

    if (!state || !req.session.oauthState) {
      console.error('Missing state parameters:', {
        state,
        sessionState: req.session.oauthState
      });
      res.redirect(`${URLS.FRONTEND}/auth/callback?error=missing_state`);
      return;
    }

    if (state !== req.session.oauthState) {
      console.error('State mismatch:', {
        receivedState: state,
        sessionState: req.session.oauthState
      });
      res.redirect(`${URLS.FRONTEND}/auth/callback?error=invalid_state`);
      return;
    }

    try {
      const { token, refreshToken } = await BattleNetAPI.getAccessToken(code as string);

      // Update session
      req.session.accessToken = token;
      req.session.refreshToken = refreshToken;
      req.session.isPersistent = !!req.session.consent;

      if (req.session.isPersistent) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }

      // Clear OAuth state after successful token exchange
      delete req.session.oauthState;

      // Save session
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Send response based on request method
      if (req.method === 'POST') {
        res.json({
          isAuthenticated: true,
          isPersistent: req.session.isPersistent,
          sessionId: req.sessionID
        });
      } else {
        const redirectUrl = new URL(req.session.frontendCallback || `${URLS.FRONTEND}/auth/callback`);
        redirectUrl.searchParams.set("code", code as string);
        redirectUrl.searchParams.set("state", state as string);
        res.redirect(redirectUrl.toString());
      }
    } catch (tokenError) {
      console.error('Token exchange failed:', tokenError);
      const errorMessage = tokenError instanceof Error ? tokenError.message : 'Token exchange failed';
      if (req.method === 'POST') {
        res.status(400).json({ error: 'token_exchange_failed', message: errorMessage });
      } else {
        res.redirect(`${URLS.FRONTEND}/auth/callback?error=token_exchange_failed&message=${encodeURIComponent(errorMessage)}`);
      }
    }
  } catch (error) {
    console.error('Callback Error:', error);
    const errorResponse = {
      error: "server_error",
      message: error instanceof Error ? error.message : "Unknown error"
    };

    if (req.method === 'POST') {
      res.status(500).json(errorResponse);
    } else {
      res.redirect(`${URLS.FRONTEND}/auth/callback?error=${encodeURIComponent(JSON.stringify(errorResponse))}`);
    }
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      handleApiError(error, res, "validate token");
    } else {
      handleApiError(new Error('Unknown error'), res, "validate token");
    }
  }
};

export const logout = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
      }
      
      // Clear cookies
      res.clearCookie('wcv.sid');
      res.clearCookie('bnet_refresh_token');
      
      res.json({ success: true });
    });
  } catch (error) {
    handleApiError(error as Error, res, "logout");
  }
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      handleApiError(error, res, "exchange token");
    } else {
      handleApiError(new Error('Unknown error'), res, "exchange token");
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      handleApiError(error, res, "refresh token");
    } else {
      handleApiError(new Error('Unknown error'), res, "refresh token");
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
      handleApiError(new Error('Unknown error'), res, "update consent");
    }
  }
};

export const validateSession = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const sessionId = req.headers['x-session-id'];
    const storageType = req.headers['x-storage-type'];

    console.log("Validating session:", {
      sessionId,
      currentSessionId: req.sessionID,
      storageType,
      hasAccessToken: !!req.session?.accessToken
    });

    if (!req.session?.accessToken) {
      res.json({
        isAuthenticated: false,
        isPersistent: false
      });
      return;
    }

    // Validate the token with Battle.net
    const isValid = await BattleNetAPI.validateToken(req.session.accessToken);

    if (!isValid) {
      // Try to refresh the token if available
      if (req.session.refreshToken) {
        try {
          const { token, refreshToken } = await BattleNetAPI.refreshAccessToken(
            req.session.refreshToken
          );
          req.session.accessToken = token;
          req.session.refreshToken = refreshToken;
          await req.session.save();
        } catch (error) {
          console.error("Token refresh failed:", error);
          res.json({
            isAuthenticated: false,
            isPersistent: false
          });
          return;
        }
      } else {
        res.json({
          isAuthenticated: false,
          isPersistent: false
        });
        return;
      }
    }

    res.json({
      isAuthenticated: true,
      isPersistent: !!req.session.isPersistent
    });
  } catch (error) {
    handleApiError(error as Error, res, "validate session");
  }
};

export const initiateBnetAuth = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { callback, consent, state, timestamp } = req.query;

    if (!callback || !state) {
      res.status(400).json({ error: "Missing required parameters" });
      return;
    }

    // Store state and timestamp in session
    req.session.oauthState = state as string;
    req.session.authTimestamp = timestamp as string;
    req.session.frontendCallback = callback as string;
    req.session.consent = (consent as string) === 'true';

    // Save session before redirect
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const authUrl = BattleNetAPI.getAuthorizationUrl(
      callback as string,
      state as string
    );

    res.json({ url: authUrl });
  } catch (error) {
    handleApiError(error as Error, res, "initiate auth");
  }
};

export const handleOAuthCallback = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { code, state, sessionId, storageType, storedState } = req.body;

    console.log("OAuth callback received:", {
      hasCode: !!code,
      state,
      sessionId,
      storageType,
      storedState,
      sessionState: req.session?.oauthState
    });

    if (!code || !state) {
      res.status(400).json({
        error: "missing_parameters",
        message: "Missing code or state"
      });
      return;
    }

    // Validate state
    if (state !== req.session?.oauthState) {
      console.error("State mismatch:", {
        receivedState: state,
        sessionState: req.session?.oauthState,
        storedState
      });
      res.status(400).json({
        error: "invalid_state",
        message: "State validation failed"
      });
      return;
    }

    // Exchange code for tokens
    const { token, refreshToken } = await BattleNetAPI.getAccessToken(code);

    // Update session
    req.session.accessToken = token;
    req.session.refreshToken = refreshToken;
    req.session.isPersistent = !!req.session.consent;

    if (req.session.isPersistent) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    // Clear OAuth state
    delete req.session.oauthState;
    delete req.session.authTimestamp;

    // Save session
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      isAuthenticated: true,
      isPersistent: req.session.isPersistent,
      sessionId: req.sessionID,
      expiresIn: req.session.cookie.maxAge
    });
  } catch (error) {
    handleApiError(error as Error, res, "oauth callback");
  }
};
