import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import { handleApiError } from "../utils/errorHandler";
import CharacterRaids from "../models/CharacterRaids";

interface RaidInstance {
  instance: {
    name: string;
    id: number;
  };
  modes: Array<{
    difficulty: {
      type: string;
      name: string;
    };
    status: {
      type: string;
      name: string;
    };
    progress: {
      completed_count: number;
      total_count: number;
    };
  }>;
}

interface RaidExpansion {
  expansion: {
    name: string;
    id: number;
  };
  instances: Array<RaidInstance>;
}

interface RaidProfile {
  _links: {
    self: {
      href: string;
    };
  };
  expansions: Array<RaidExpansion>;
  character: {
    name: string;
    id: number;
    realm: {
      slug: string;
    };
  };
}

export const getCharacterRaids = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { realmSlug, characterName } = req.params;

  try {
    // Check cache first
    const cachedData = await CharacterRaids.findOne({
      realmSlug,
      characterName: characterName.toLowerCase(),
      lastUpdated: { $gt: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    });

    if (cachedData) {
      res.json(cachedData);
      return;
    }

    // Fetch fresh data from API
    const raidsData = await BattleNetAPI.makeRequest<RaidProfile>(
      `/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}/encounters/raids`,
      {},
      "profile"
    );

    // Helper function to get media for an instance
    const getInstanceMedia = async (instanceId: number): Promise<string | null> => {
      try {
        const mediaData = await BattleNetAPI.makeRequest<{
          assets: Array<{ key: string; value: string }>;
        }>(`/data/wow/media/journal-instance/${instanceId}`, {}, "static");

        return mediaData.assets[0]?.value || null;
      } catch (error) {
        console.error(`Failed to fetch media for instance ${instanceId}:`, error);
        return null;
      }
    };

    // Transform the data and fetch media for each instance
    const transformedData = {
      realmSlug,
      characterName: characterName.toLowerCase(),
      expansions: await Promise.all(raidsData.expansions.map(async (exp) => ({
        name: exp.expansion.name,
        instances: await Promise.all(exp.instances.map(async (instance) => {
          const media = await getInstanceMedia(instance.instance.id);
          return {
            instance: {
              name: instance.instance.name,
              id: instance.instance.id,
              media
            },
            modes: instance.modes.map((mode) => ({
              difficulty: {
                type: mode.difficulty.type,
                name: mode.difficulty.name,
              },
              status: {
                type: mode.status.type,
                name: mode.status.name,
              },
              progress: {
                completedCount: mode.progress.completed_count,
                totalCount: mode.progress.total_count,
              },
            })),
          };
        })),
      }))),
      lastUpdated: new Date(),
    };

    // Save to cache
    await CharacterRaids.findOneAndUpdate(
      { realmSlug, characterName: characterName.toLowerCase() },
      transformedData,
      { upsert: true, new: true }
    );

    res.json(transformedData);
  } catch (error) {
    handleApiError(error, res, "fetch character raids");
  }
};
