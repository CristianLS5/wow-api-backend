import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import CharacterMounts from "../models/CollectionsMounts";
import CharacterPets from "../models/CollectionsPets";
import CharacterToys from "../models/CollectionsToys";
import { handleApiError } from "../utils/errorHandler";
import { Model } from "mongoose";

interface MountsResponse {
  mounts: Array<{
    mount: {
      id: number;
      name: string;
    };
  }>;
}

interface PetsResponse {
  pets: Array<{
    species: {
      id: number;
      name: string;
    };
  }>;
}

interface ToysResponse {
  toys: Array<{
    toy: {
      id: number;
      name: string;
    };
  }>;
}

type CollectionType = "mounts" | "pets" | "toys";
type CollectionResponse = MountsResponse | PetsResponse | ToysResponse;

const fetchCollectionData = async <T extends CollectionResponse>(
  req: Request,
  res: Response,
  collectionType: CollectionType,
  Model: Model<any>
): Promise<void> => {
  const { realmSlug, characterName } = req.params;
  try {
    const cachedData = await Model.findOne({
      realmSlug,
      characterName,
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (cachedData) {
      res.json(cachedData[collectionType]);
      return;
    }

    const data = await BattleNetAPI.makeRequest<T>(
      `/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}/collections/${collectionType}`,
      {},
      "profile"
    );

    await Model.findOneAndUpdate(
      { realmSlug, characterName },
      { [collectionType]: data, lastUpdated: new Date() },
      { upsert: true }
    );

    res.json(data);
  } catch (error) {
    handleApiError(error, res, `fetch character ${collectionType}`);
  }
};

export const getCharacterMounts = async (
  req: Request,
  res: Response
): Promise<void> => {
  await fetchCollectionData<MountsResponse>(
    req,
    res,
    "mounts",
    CharacterMounts
  );
};

export const getCharacterPets = async (
  req: Request,
  res: Response
): Promise<void> => {
  await fetchCollectionData<PetsResponse>(req, res, "pets", CharacterPets);
};

export const getCharacterToys = async (
  req: Request,
  res: Response
): Promise<void> => {
  await fetchCollectionData<ToysResponse>(req, res, "toys", CharacterToys);
};
