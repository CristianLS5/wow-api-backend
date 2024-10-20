import { Request, Response, NextFunction } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import axios, { AxiosError } from "axios";

export const getAuthorizationUrl = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const frontendCallback =
    (req.query.callback as string) || "http://localhost:4200/auth/callback";
  BattleNetAPI.getAuthorizationUrl()
    .then(({ authUrl, state }) => {
      (req.session as any).oauthState = state;
      (req.session as any).frontendCallback = frontendCallback;
      res.redirect(authUrl);
    })
    .catch(next);
};

export const handleCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const frontendCallback =
    (req.session as any).frontendCallback ||
    "http://localhost:4200/auth/callback";

  if (state !== (req.session as any).oauthState) {
    res.status(403).json({ error: "Invalid state parameter" });
    return;
  }

  delete (req.session as any).oauthState;

  try {
    const { token, expiresIn } = await BattleNetAPI.getAccessToken(code as string);
    (req.session as any).accessToken = token;

    // Redirect to frontend with success status
    res.redirect(`${frontendCallback}?success=true&expiresIn=${expiresIn}`);
  } catch (error: unknown) {
    console.error("Error exchanging code for token:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.redirect(
      `${frontendCallback}?error=${encodeURIComponent(errorMessage)}`
    );
  }
};

export const validateToken = async (req: Request, res: Response) => {
  const accessToken = (req.session as any).accessToken;

  if (!accessToken) {
    res.json({ isAuthenticated: false, error: "No access token found" });
    return;
  }

  try {
    const isValid = await BattleNetAPI.validateToken(accessToken);
    if (isValid) {
      res.json({ isAuthenticated: true });
    } else {
      // Token is not valid, clear the session
      delete (req.session as any).accessToken;
      res.json({ isAuthenticated: false, error: "Invalid token" });
    }
  } catch (error) {
    console.error("Error validating token:", error);
    // In case of an error, assume the token is invalid
    delete (req.session as any).accessToken;
    res.json({ 
      isAuthenticated: false, 
      error: error instanceof Error ? error.message : "Unknown error validating token" 
    });
  }
};

export const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.status(500).json({ error: "Logout failed" });
    } else {
      res.clearCookie("connect.sid"); // Clear the session cookie
      res.json({ message: "Logged out successfully" });
    }
  });
};

 export const exchangeToken = async (
   req: Request,
   res: Response
 ): Promise<void> => {
   const { code, state } = req.body;
   
  if (state !== (req.session as any).oauthState) {
    res.status(403).json({ error: "Invalid state parameter" });
    return;
  }

   try {
     console.log("Attempting to exchange code:", code);
     const { token, expiresIn } = await BattleNetAPI.getAccessToken(code);
     console.log("Token received, expires in:", expiresIn);

     // Store the token in the session
     (req.session as any).accessToken = token;

     res.json({
       success: true,
       message: "Authentication successful",
       expiresIn: expiresIn,
     });
   } catch (error: unknown) {
     console.error("Error exchanging token:", error);

     if (axios.isAxiosError(error)) {
       const axiosError = error as AxiosError;
       if (axiosError.response) {
         console.error("Battle.net API error response:", {
           status: axiosError.response.status,
           data: axiosError.response.data,
           headers: axiosError.response.headers,
         });
       }
       res.status(500).json({
         error: "Authentication failed",
         details: axiosError.response?.data || axiosError.message,
       });
     } else {
       res.status(500).json({
         error: "Authentication failed",
         details: error instanceof Error ? error.message : "Unknown error",
       });
     }
   }
 };
