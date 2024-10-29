import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import Pets from "../models/Pets";
import { handleApiError } from "../utils/errorHandler";

interface PetIndex {
  pets: Array<{
    id: number;
    name: string;
    key: {
      href: string;
    };
  }>;
}

interface PetData {
  id: number;
  name: string;
  battle_pet_type: {
    id: number;
    type: string;
    name: string;
  };
  description: string;
  is_capturable: boolean;
  is_tradable: boolean;
  is_battlepet: boolean;
  abilities: Array<{
    ability: {
      name: string;
      id: number;
    };
    slot: number;
    required_level: number;
  }>;
  media: {
    id: number;
  };
}

interface PetMediaResponse {
  assets: Array<{
    key: string;
    value: string;
  }>;
}

export const getPetsIndex = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Starting getPetsIndex request...");

    const data = await BattleNetAPI.makeRequest<PetIndex>(
      "/data/wow/pet/index",
      {
        namespace: "static-eu",
        locale: "en_US",
      },
      "static"
    );

    console.log(`Total number of pets in index: ${data.pets.length}`);
    res.json(data);
  } catch (error) {
    handleApiError(error, res, "fetch pets index");
  }
};

export const getAllPets = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Starting getAllPets request...");

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const storedPets = await Pets.find(
      { lastUpdated: { $gt: oneDayAgo } },
      { _id: 0, __v: 0 }
    ).sort({ petId: 1 });

    console.log(`Found ${storedPets.length} pets in cache`);

    if (storedPets.length > 0) {
      console.log("Returning cached pets data");
      res.json(storedPets);
      return;
    }

    console.log("Cache empty or expired, fetching from Blizzard API...");
    const petIndex = await BattleNetAPI.makeRequest<PetIndex>(
      "/data/wow/pet/index",
      {
        namespace: "static-eu",
        locale: "en_US",
      },
      "static"
    );
    console.log(`Found ${petIndex.pets.length} pets in index`);

    const updatedPets = [];
    console.log("Starting to fetch individual pet details...");

    for (const pet of petIndex.pets) {
      console.log(`Fetching details for pet ID: ${pet.id}`);
      const [petData, mediaData] = await Promise.all([
        BattleNetAPI.makeRequest<PetData>(
          `/data/wow/pet/${pet.id}`,
          {
            namespace: "static-eu",
            locale: "en_US",
          },
          "static"
        ),
        BattleNetAPI.makeRequest<PetMediaResponse>(
          `/data/wow/media/pet/${pet.id}`,
          {
            namespace: "static-eu",
            locale: "en_US",
          },
          "static"
        ),
      ]);

      // Combine pet data with its media
      const petWithMedia = {
        ...petData,
        media: {
          ...petData.media,
          assets: mediaData.assets,
        },
      };

      console.log(`Updating pet in database: ${petData.name}`);
      const updatedPet = await Pets.findOneAndUpdate(
        { petId: pet.id },
        {
          petId: pet.id,
          data: petWithMedia,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
      updatedPets.push(updatedPet);
    }

    console.log(`Successfully updated ${updatedPets.length} pets`);
    res.json(updatedPets);
  } catch (error) {
    console.error("Error in getAllPets:", error);
    handleApiError(error, res, "fetch and store all pets");
  }
};

export const getPetById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const petId = parseInt(req.params.petId);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check cache first
    const cachedPet = await Pets.findOne({
      petId,
      lastUpdated: { $gt: oneDayAgo },
    });

    if (cachedPet) {
      res.json(cachedPet.data);
      return;
    }

    // Fetch new data
    const [petData, mediaData] = await Promise.all([
      BattleNetAPI.makeRequest<PetData>(
        `/data/wow/pet/${petId}`,
        {
          namespace: "static-eu",
          locale: "en_US",
        },
        "static"
      ),
      BattleNetAPI.makeRequest<PetMediaResponse>(
        `/data/wow/media/pet/${petId}`,
        {
          namespace: "static-eu",
          locale: "en_US",
        },
        "static"
      ),
    ]);

    const petWithMedia = {
      ...petData,
      media: {
        ...petData.media,
        assets: mediaData.assets,
      },
    };

    // Update cache
    await Pets.findOneAndUpdate(
      { petId },
      {
        petId,
        data: petWithMedia,
        lastUpdated: new Date(),
      },
      { upsert: true }
    );

    res.json(petWithMedia);
  } catch (error) {
    handleApiError(error, res, `fetch pet ${req.params.petId}`);
  }
};
