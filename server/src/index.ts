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

// Load environment variables first
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'BNET_REGION',
  'BNET_CLIENT_ID',
  'BNET_CLIENT_SECRET',
  'BNET_CALLBACK_URL',
  'SESSION_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:4200",
  optionsSuccessStatus: 200,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false, // Changed to false for better security
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
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

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || "mongodb://mongodb:27017/wow_character_viewer";

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
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
