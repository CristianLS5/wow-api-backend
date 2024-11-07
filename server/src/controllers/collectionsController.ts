import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import CharacterMounts from "../models/CollectionsMounts";
import CharacterPets from "../models/CollectionsPets";
import CharacterToys from "../models/CollectionsToys";
import CharacterTransmogs from "../models/CollectionsTransmogs";
import { handleApiError } from "../utils/errorHandler";
import { Model } from "mongoose";

interface MountsResponse {
  mounts: Array<{ mount: { id: number; name: string; }; }>;
}

interface PetsResponse {
  pets: Array<{ species: { id: number; name: string; }; }>;
}

interface ToysResponse {
  toys: Array<{ toy: { id: number; name: string; }; }>;
}

interface TransmogResponse {
  _links: { self: { href: string; }; };
  appearance_sets: Array<{
    id: number;
    name: string;
    key: { href: string; };
  }>;
}

type CollectionType = "mounts" | "pets" | "toys" | "transmogs";
type CollectionResponse = MountsResponse | PetsResponse | ToysResponse | TransmogResponse;

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
      {
        namespace: "profile-eu",
        locale: "en_GB"
      },
      "profile"
    );

    if (!data || !isValidResponse(data, collectionType)) {
      throw new Error('Invalid API response');
    }

    await Model.findOneAndUpdate(
      { realmSlug, characterName },
      { [collectionType]: data, lastUpdated: new Date() },
      { upsert: true, new: true }
    );

    res.json(data);
  } catch (error: any) {
    handleApiError(error, res, `fetch character ${collectionType}`);
  }
};

function isValidResponse(
  data: CollectionResponse, 
  type: CollectionType
): boolean {
  switch (type) {
    case 'mounts':
      return Array.isArray((data as MountsResponse).mounts);
    case 'pets':
      return Array.isArray((data as PetsResponse).pets);
    case 'toys':
      return Array.isArray((data as ToysResponse).toys);
    case 'transmogs':
      return Array.isArray((data as TransmogResponse).appearance_sets);
    default:
      return false;
  }
}

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

export const getCharacterTransmogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  await fetchCollectionData<TransmogResponse>(
    req,
    res,
    "transmogs",
    CharacterTransmogs
  );
};
