interface Config {
  isProduction: boolean;
  port: number;
  mongoUri: string;
  sessionSecret: string;
  cookieDomain: string;
}

export const config: Config = {
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT || "3000", 10),
  mongoUri:
    process.env.MONGODB_URI || "mongodb://localhost:27017/wow-character-viewer",
  sessionSecret: process.env.SESSION_SECRET || "your-secret-key",
  cookieDomain: process.env.COOKIE_DOMAIN || "localhost",
};
