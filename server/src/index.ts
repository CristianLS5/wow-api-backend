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
import MongoDBStore from "connect-mongodb-session";

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

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:4200",
  optionsSuccessStatus: 200,
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cookie",
    "X-Session-ID",
    "X-Storage-Type",
  ],
  exposedHeaders: ["X-Session-ID"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Create MongoDB store with proper type for error
const MongoDBStoreSession = MongoDBStore(session);
const store = new MongoDBStoreSession({
  uri: mongoUri,
  collection: 'sessions',
  expires: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  databaseName: 'wow_character_viewer'
});

// Handle store errors with proper typing
store.on('error', function(error: Error) {
  console.error('Session store error:', error);
});

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    name: "bnet_session",
    store: store,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
    },
  })
);

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

// MongoDB connection
mongoose
  .connect(mongoUri)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit if MongoDB connection fails
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
