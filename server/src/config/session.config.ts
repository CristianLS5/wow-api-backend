import session, { SessionOptions, Session } from "express-session";
import { Application, Request, Response, NextFunction } from "express";
import { initializeStore } from "./sessionStore";
import { SECRETS } from "./config";
import cookieParser from "cookie-parser";

// Extend Session type to include all custom properties
interface CustomSession extends Session {
  isNew?: boolean;
  oauthState?: string;
  authTimestamp?: string;
  frontendCallback?: string;
  accessToken?: string;
  refreshToken?: string;
  isPersistent?: boolean;
  consent?: boolean;
}

interface CustomRequest extends Request {
  session: CustomSession;
}

export const initializeSession = (app: Application): void => {
  // Initialize store first
  const store = initializeStore(SECRETS.MONGODB.URI);

  // Then use it in session configuration
  const sessionConfig: SessionOptions = {
    secret: SECRETS.SESSION.SECRET,
    resave: false,
    saveUninitialized: true,
    name: "wcv.sid",
    store,
    proxy: true,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "none",
      domain:
        process.env.NODE_ENV === "production"
          ? ".wowcharacterviewer.com"
          : undefined,
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    },
    unset: "destroy",
  };

  // Enable trust proxy before session middleware
  app.set("trust proxy", 1);

  app.use(cookieParser(SECRETS.SESSION.SECRET));
  app.use(session(sessionConfig));

  // Add session debug middleware in development
  if (process.env.NODE_ENV !== "production") {
    app.use((req: CustomRequest, _res: Response, next: NextFunction) => {
      console.log("Session Debug:", {
        id: req.sessionID,
        cookie: req.session?.cookie,
        isNew: req.session?.isNew,
        oauthState: req.session?.oauthState,
      });
      next();
    });
  }
};
