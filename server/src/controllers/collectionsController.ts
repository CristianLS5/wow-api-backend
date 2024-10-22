import { Request, Response } from "express";
import axios from "axios";
import BattleNetAPI from "../services/BattleNetAPI";
import CharacterMounts from "../models/CollectionsMounts";
import CharacterPets from "../models/CollectionsPets";
import CharacterToys from "../models/CollectionsToys";

const fetchCollectionData = async (
  req: Request,
  res: Response,
  collectionType: string,
  Model: any
): Promise<void> => {
  const { realmSlug, characterName } = req.params;
  try {
    // Check if we have recent data in the database
    const cachedData = await Model.findOne({
      realmSlug,
      characterName,
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Data less than 24 hours old
    });

    if (cachedData) {
      res.json(cachedData[collectionType]);
      return;
    }

    // If no recent data, fetch from API
    const token = await BattleNetAPI.ensureValidToken();
    const response = await axios.get(
      `https://${
        BattleNetAPI.region
      }.api.blizzard.com/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}/collections/${collectionType}`,
      {
        params: {
          namespace: `profile-${BattleNetAPI.region}`,
          locale: "en_US",
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Update or create the database entry
    await Model.findOneAndUpdate(
      { realmSlug, characterName },
      { [collectionType]: response.data, lastUpdated: new Date() },
      { upsert: true, new: true }
    );

    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching character ${collectionType}:`, error);
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", error.response?.data);
    }
    res
      .status(500)
      .json({ error: `Failed to fetch character ${collectionType}` });
  }
};

export const getCharacterMounts = async (req: Request, res: Response): Promise<void> => {
  await fetchCollectionData(req, res, "mounts", CharacterMounts);
};

export const getCharacterPets = async (req: Request, res: Response): Promise<void> => {
  await fetchCollectionData(req, res, "pets", CharacterPets);
};

export const getCharacterToys = async (req: Request, res: Response): Promise<void> => {
  await fetchCollectionData(req, res, "toys", CharacterToys);
};
