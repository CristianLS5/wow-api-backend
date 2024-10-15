import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import BattleNetAPI from "./battlenet-api";
import CharacterEquipment from "./models/CharacterEquipment";
import CharacterMedia from "./models/CharacterMedia";
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

interface ExtendedRequest extends Request {
  session: session.Session &
    Partial<session.SessionData> & {
      oauthState?: string;
      accessToken?: string;
    };
}

app.get("/auth/bnet", (req: Request, res: Response, next: NextFunction) => {
  const extendedReq = req as ExtendedRequest;
  BattleNetAPI.getAuthorizationUrl()
    .then(({ authUrl, state }) => {
      extendedReq.session.oauthState = state;
      res.redirect(authUrl);
    })
    .catch(next);
});

app.get("/auth/callback", (req: Request, res: Response) => {
  const extendedReq = req as ExtendedRequest;
  const { code, state } = extendedReq.query;

  if (state !== extendedReq.session.oauthState) {
    res.status(403).json({ error: "Invalid state parameter" });
    return;
  }

  delete extendedReq.session.oauthState;

  BattleNetAPI.getAccessToken(code as string)
    .then((accessToken) => {
      extendedReq.session.accessToken = accessToken;
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
});

app.get(
  "/api/character/:realmSlug/:characterName/equipment",
  async (req: Request, res: Response) => {
    const { realmSlug, characterName } = req.params;

    try {
      let cachedData = await CharacterEquipment.findOne({
        realmSlug: realmSlug.toLowerCase(),
        characterName: characterName.toLowerCase(),
      });

      if (cachedData && cachedData.equipment) {
        console.log("Found cached character equipment data");

        // Check if icon URLs are missing and add them if necessary
        let dataUpdated = false;
        for (const item of cachedData.equipment.equipped_items) {
          if (!item.iconUrl && item.item && item.item.id) {
            console.log(`Fetching missing icon URL for item ${item.item.id}`);
            item.iconUrl = await BattleNetAPI.getItemIcon(item.item.id);
            dataUpdated = true;
          }
        }

        if (dataUpdated) {
          console.log("Updating cached data with new icon URLs");
          await cachedData.save();
        }

        res.json(cachedData.equipment);
        return;
      }

      console.log("Fetching new character equipment data");
      const equipmentData = await BattleNetAPI.getCharacterEquipment(
        realmSlug,
        characterName
      );

      const newCachedData = await CharacterEquipment.findOneAndUpdate(
        {
          realmSlug: realmSlug.toLowerCase(),
          characterName: characterName.toLowerCase(),
        },
        {
          equipment: equipmentData,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log("Character equipment data saved to database");
      res.json(newCachedData.equipment);
    } catch (error: unknown) {
      console.error("Error fetching character equipment data:", error);
      if (error instanceof Error) {
        res.status(500).json({
          error: "Failed to fetch character equipment data",
          details: error.message,
          stack: error.stack,
        });
      } else {
        res.status(500).json({
          error: "Failed to fetch character equipment data",
          details: "An unknown error occurred",
        });
      }
    }
  }
);

app.get(
  "/api/character/:realmSlug/:characterName/media",
  async (req: Request, res: Response) => {
    const { realmSlug, characterName } = req.params;

    try {
      let cachedData = await CharacterMedia.findOne({
        realmSlug: realmSlug.toLowerCase(),
        characterName: characterName.toLowerCase(),
      });

      if (cachedData && cachedData.media) {
        console.log("Found cached character media data");
        res.json(cachedData.media);
        return;
      }

      console.log("Fetching new character media data");
      const mediaData = await BattleNetAPI.getCharacterMedia(
        realmSlug,
        characterName
      );

      const newCachedData = await CharacterMedia.findOneAndUpdate(
        {
          realmSlug: realmSlug.toLowerCase(),
          characterName: characterName.toLowerCase(),
        },
        {
          media: mediaData,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log("Character media data saved to database");
      res.json(newCachedData.media);
    } catch (error: unknown) {
      console.error("Error fetching character media data:", error);
      if (error instanceof Error) {
        res.status(500).json({
          error: "Failed to fetch character media data",
          details: error.message,
          stack: error.stack,
        });
      } else {
        res.status(500).json({
          error: "Failed to fetch character media data",
          details: "An unknown error occurred",
        });
      }
    }
  }
);

const mongoUri =
  process.env.MONGODB_URI || "mongodb://mongodb:27017/wow_character_viewer";

mongoose
  .connect(mongoUri)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
