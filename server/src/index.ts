import express from "express";
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

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: "http://localhost:4200",
  optionsSuccessStatus: 200,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_session_secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

app.use("/auth", authRoutes);
app.use("/api/character", characterRoutes);
app.use("/api/collections", collectionsRoutes);
app.use("/api/mounts", mountRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/creatures", creatureRoutes);

const mongoUri =
  process.env.MONGODB_URI || "mongodb://mongodb:27017/wow_character_viewer";

mongoose
  .connect(mongoUri)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
