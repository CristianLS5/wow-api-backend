import { Request, Response, NextFunction } from "express";
import BattleNetAPI from "../services/BattleNetAPI";

export const getAuthorizationUrl = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  BattleNetAPI.getAuthorizationUrl()
    .then(({ authUrl, state }) => {
      (req as any).session.oauthState = state;
      res.redirect(authUrl);
    })
    .catch(next);
};

export const handleCallback = (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (state !== (req as any).session.oauthState) {
    res.status(403).json({ error: "Invalid state parameter" });
    return;
  }

  delete (req as any).session.oauthState;

  BattleNetAPI.getAccessToken(code as string)
    .then((accessToken) => {
      (req as any).session.accessToken = accessToken;
      res.redirect("http://localhost:4200/");
    })
    .catch((error) => {
      console.error(
        "Error exchanging code for token:",
        error.response ? error.response.data : error.message
      );
      res
        .status(500)
        .json({ error: "Authentication failed", details: error.message });
    });
};
