interface Config {
  isProduction: boolean;
  port: number;
  mongoUri: string;
  sessionSecret: string;
  cookieDomain: string;
}

// Public URLs - these can be in code as they're not sensitive
export const URLS = {
  FRONTEND: 'https://wowcharacterviewer.com',
  API: 'https://api.wowcharacterviewer.com',
  CALLBACK: 'https://api.wowcharacterviewer.com/auth/callback'
} as const;

// Secret configurations - these come from environment variables
export const SECRETS = {
  BNET: {
    REGION: process.env.BNET_REGION!,
    CLIENT_ID: process.env.BNET_CLIENT_ID!,
    CLIENT_SECRET: process.env.BNET_CLIENT_SECRET!,
    CALLBACK_URL: process.env.BNET_CALLBACK_URL!
  },
  SESSION: {
    SECRET: process.env.SESSION_SECRET!
  },
  MONGODB: {
    URI: process.env.MONGODB_URI!
  }
} as const;

export const config: Config = {
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT || "3000", 10),
  mongoUri: SECRETS.MONGODB.URI,
  sessionSecret: SECRETS.SESSION.SECRET,
  cookieDomain: '.wowcharacterviewer.com'
};
