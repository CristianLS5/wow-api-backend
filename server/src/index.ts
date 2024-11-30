import express, { NextFunction, Request, Response } from "express";
import session from "express-session";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import characterRoutes from "./routes/characterRoutes";
import collectionsRoutes from "./routes/collectionsRoutes";
import mountRoutes from "./routes/mountRoutes";
import itemRoutes from "./routes/itemRoutes";
import creatureRoutes from "./routes/creatureRoutes";
import petRoutes from "./routes/petRoutes";
import toyRoutes from "./routes/toyRoutes";
import transmogRoutes from "./routes/transmogRoutes";
import heirloomRoutes from "./routes/heirloomRoutes";
import achievementRoutes from "./routes/achievementRoutes";
import characterAchievementRoutes from "./routes/characterAchievementRoutes";
import reputationsRoutes from "./routes/reputationsRoutes";
import dungeonsRoutes from "./routes/dungeonsRoutes";
import affixesRoutes from "./routes/affixesRoutes";
import raidsRoutes from "./routes/raidsRoutes";
import healthRoutes from './routes/healthRoutes';
import { initializeStore } from './config/sessionStore';

// Load environment variables first
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  "BNET_REGION",
  "BNET_CLIENT_ID",
  "BNET_CLIENT_SECRET",
  "BNET_CALLBACK_URL",
  "SESSION_SECRET",
  "MONGODB_URI",
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI!;

// Add this before session middleware
app.enable('trust proxy');

// Initialize store first
const store = initializeStore(mongoUri);

// Then use it in session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    name: "wcv.sid",
    store: store,
    proxy: true,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: 'none',
      domain: '.wowcharacterviewer.com',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

// CORS and other middleware after session
app.use(cors({
  origin: [
    'https://wowcharacterviewer.com',
    'https://api.wowcharacterviewer.com',
    'https://www.wowcharacterviewer.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/api/character", characterRoutes);
app.use("/api/collections", collectionsRoutes);
app.use("/api/mounts", mountRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/creatures", creatureRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/toys", toyRoutes);
app.use("/api/transmogs", transmogRoutes);
app.use("/api/heirlooms", heirloomRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/character", characterAchievementRoutes);
app.use("/api/reputations", reputationsRoutes);
app.use("/api/dungeons", dungeonsRoutes);
app.use("/api/affixes", affixesRoutes);
app.use("/api/raids", raidsRoutes);
app.use('/health', healthRoutes);

// Add after session middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log('Session Debug:', {
    url: req.url,
    sessionID: req.sessionID,
    hasSession: !!req.session,
    cookies: req.headers.cookie
  });
  next();
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// MongoDB DEV connection
// mongoose
//   .connect(mongoUri)
//   .then(() => console.log("Connected to MongoDB"))
//   .catch((err) => {
//     console.error("MongoDB connection error:", err);
//     process.exit(1); // Exit if MongoDB connection fails
//   });

// MongoDB PRD connection
mongoose
  .connect(mongoUri, {
    ssl: true,
    tls: true,
    tlsAllowInvalidCertificates: true,
    dbName: "wow_character_viewer"
  } as mongoose.ConnectOptions)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Battle.net Region: ${process.env.BNET_REGION}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
