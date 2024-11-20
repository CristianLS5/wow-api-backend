import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import { handleApiError } from "../utils/errorHandler";
import CharacterDungeons from "../models/CharacterDungeons";
import DungeonSeason from "../models/DungeonsSeason";

interface DungeonSeason {
  season: {
    id: number;
  };
  best_runs?: Array<DungeonRun>;
  rating?: number;
}

interface DungeonRun {
  completed_timestamp: number;
  duration: number;
  keystone_level: number;
  dungeon: {
    id: number;
    name: string;
    media?: string;
  };
  is_completed: boolean;
  affixes: Array<{
    id: number;
    name: string;
  }>;
  rating: number;
}

interface DungeonSeasonDetails {
  _links: {
    self: {
      href: string;
    };
  };
  id: number;
  start_timestamp: number;
  periods: Array<{
    key: {
      href: string;
    };
    id: number;
  }>;
  season_name: string;
}

interface DungeonSeasonResponse {
  season: {
    id: number;
  };
  best_runs: Array<{
    completed_timestamp: number;
    duration: number;
    keystone_level: number;
    dungeon: {
      name: string;
      id: number;
    };
    is_completed_within_time: boolean;
    mythic_rating: {
      rating: number;
    };
  }>;
  character: {
    name: string;
    id: number;
  };
  mythic_rating: {
    rating: number;
  };
}

export const getCharacterDungeonProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { realmSlug, characterName } = req.params;

  try {
    // Check cache first
    const cachedData = await CharacterDungeons.findOne({
      realmSlug,
      characterName: characterName.toLowerCase(),
      lastUpdated: { $gt: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    });

    if (cachedData) {
      res.json(cachedData);
      return;
    }

    // Get current season data
    const currentSeason = await DungeonSeason.findOne({ isCurrent: true });
    
    let seasonsMap = new Map();
    
    if (currentSeason) {
      try {
        const seasonData = await BattleNetAPI.makeRequest<DungeonSeasonResponse>(
          `/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}/mythic-keystone-profile/season/${currentSeason.id}`,
          {},
          "profile"
        );

        seasonsMap.set(currentSeason.id.toString(), {
          seasonId: currentSeason.id,
          bestRuns: seasonData.best_runs.map(run => ({
            completedTimestamp: new Date(run.completed_timestamp),
            duration: run.duration,
            keystoneLevel: run.keystone_level,
            dungeon: {
              id: run.dungeon.id,
              name: run.dungeon.name,
            },
            isCompleted: run.is_completed_within_time,
            rating: run.mythic_rating.rating
          })),
          rating: seasonData.mythic_rating?.rating || 0
        });
      } catch (error) {
        console.error("Error fetching season data:", error);
      }
    }

    // Transform the data to match your schema
    const transformedData = {
      realmSlug,
      characterName: characterName.toLowerCase(),
      seasons: seasonsMap,
      lastUpdated: new Date(),
    };

    // Save to cache
    await CharacterDungeons.findOneAndUpdate(
      { realmSlug, characterName: characterName.toLowerCase() },
      transformedData,
      { upsert: true, new: true }
    );

    res.json(transformedData);
  } catch (error) {
    handleApiError(error, res, "fetch character mythic keystone profile");
  }
};

export const getCharacterDungeonSeasonDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { realmSlug, characterName, seasonId } = req.params;

    // Get season details from API
    const seasonData = await BattleNetAPI.makeRequest<DungeonSeasonResponse>(
      `/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}/mythic-keystone-profile/season/${seasonId}`,
      {},
      "profile"
    );

    // Get dungeon index to map journal IDs
    const dungeonIndex = await BattleNetAPI.makeRequest<{
      instances: Array<{
        id: number;
        name: string;
      }>;
    }>("/data/wow/journal-instance/index", {}, "static");

    // Create a map to store best runs per dungeon
    const bestRunsMap = new Map();

    // Helper function to find journal instance and get media
    const getDungeonMedia = async (dungeonName: string): Promise<string | null> => {
      // Clean up dungeon names for comparison
      const cleanName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const searchName = cleanName(dungeonName);
      
      const journalInstance = dungeonIndex.instances.find(
        instance => cleanName(instance.name) === searchName
      );

      if (journalInstance) {
        try {
          const mediaData = await BattleNetAPI.makeRequest<{
            assets: Array<{ key: string; value: string }>;
          }>(`/data/wow/media/journal-instance/${journalInstance.id}`, {}, "static");
          
          return mediaData.assets.find(asset => asset.key === "tile")?.value || null;
        } catch (error) {
          console.error(`Failed to fetch media for dungeon ${dungeonName}:`, error);
          return null;
        }
      }
      return null;
    };

    // First pass: Add completed runs
    for (const run of seasonData.best_runs) {
      if (run.is_completed_within_time) {
        const dungeonId = run.dungeon.id;
        if (!bestRunsMap.has(dungeonId)) {
          const media = await getDungeonMedia(run.dungeon.name);
          bestRunsMap.set(dungeonId, {
            ...run,
            media
          });
        }
      }
    }

    // Second pass: Add non-completed runs only if no completed run exists
    for (const run of seasonData.best_runs) {
      if (!run.is_completed_within_time) {
        const dungeonId = run.dungeon.id;
        if (!bestRunsMap.has(dungeonId)) {
          const media = await getDungeonMedia(run.dungeon.name);
          bestRunsMap.set(dungeonId, {
            ...run,
            media
          });
        }
      }
    }

    // Construct response
    const response = {
      ...seasonData,
      best_runs: Array.from(bestRunsMap.values()),
    };

    res.json(response);
    return;

  } catch (error) {
    console.error("Error in getCharacterDungeonSeasonDetails:", error);
    handleApiError(error, res, "fetch character dungeon season details");
    return;
  }
};

export const getDungeonSeasons = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check cache first
    const cachedSeasons = await DungeonSeason.find({
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).sort({ id: -1 });

    if (cachedSeasons.length > 0) {
      const currentSeason = cachedSeasons.find((season) => season.isCurrent);
      res.json({
        seasons: cachedSeasons,
        currentSeason,
      });
      return;
    }

    // First, get the current season index
    const indexData = await BattleNetAPI.makeRequest<{
      _links: { self: { href: string } };
      seasons: Array<{ key: { href: string }; id: number }>;
      current_season: { key: { href: string }; id: number };
    }>(
      "/data/wow/mythic-keystone/season/", // Changed to match exact API endpoint
      {},
      "dynamic" // This will be converted to dynamic-eu in BattleNetAPI
    );

    if (!indexData.current_season) {
      throw new Error("No current season found in the API response");
    }

    // Update all seasons in database
    const updatePromises = indexData.seasons.map(async (season) => {
      const seasonDetails =
        await BattleNetAPI.makeRequest<DungeonSeasonDetails>(
          `/data/wow/mythic-keystone/season/${season.id}`,
          {},
          "dynamic"
        );

      return DungeonSeason.findOneAndUpdate(
        { id: season.id },
        {
          id: season.id,
          seasonName: seasonDetails.season_name,
          startTimestamp: new Date(seasonDetails.start_timestamp),
          periods: seasonDetails.periods.map((period) => period.id),
          isCurrent: indexData.current_season.id === season.id,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
    });

    const updatedSeasons = await Promise.all(updatePromises);
    res.json({
      seasons: updatedSeasons,
      currentSeason: updatedSeasons.find((season) => season.isCurrent),
    });
  } catch (error) {
    console.error("Error in getDungeonSeasons:", error);
    handleApiError(error, res, "fetch mythic keystone seasons");
  }
};

export const getDungeonSeasonDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { seasonId } = req.params;

  try {
    // First get the season index to check current season
    const indexData = await BattleNetAPI.makeRequest<{
      _links: { self: { href: string } };
      seasons: Array<{ key: { href: string }; id: number }>;
      current_season: { key: { href: string }; id: number };
    }>("/data/wow/mythic-keystone/season/", {}, "dynamic");

    // Get the specific season details
    const seasonData = await BattleNetAPI.makeRequest<DungeonSeasonDetails>(
      `/data/wow/mythic-keystone/season/${seasonId}`,
      {},
      "dynamic"
    );

    const updatedSeason = await DungeonSeason.findOneAndUpdate(
      { id: parseInt(seasonId) },
      {
        id: seasonData.id,
        seasonName: seasonData.season_name,
        startTimestamp: new Date(seasonData.start_timestamp),
        periods: seasonData.periods.map((period) => period.id),
        isCurrent: indexData.current_season.id === parseInt(seasonId),
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json(updatedSeason);
  } catch (error) {
    console.error("Error in getDungeonSeasonDetails:", error);
    handleApiError(error, res, "fetch mythic keystone season details");
  }
};
