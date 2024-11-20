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
  is_completed_within_time: boolean;
  mythic_rating: {
    color: {
      r: number;
      g: number;
      b: number;
      a: number;
    };
    rating: number;
  };
  keystone_affixes: Array<{
    id: number;
    name: string;
    description: string;
    icon: string;
  }>;
  media: string;
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
  _links: {
    self: {
      href: string;
    };
  };
  season: {
    id: number;
  };
  best_runs: DungeonRun[];
  mythic_rating: {
    color: {
      r: number;
      g: number;
      b: number;
      a: number;
    };
    rating: number;
  };
  character: {
    name: string;
    id: number;
    realm: {
      name: string;
      id: number;
      slug: string;
    };
  };
}

const getDungeonMedia = async (dungeonName: string): Promise<string | null> => {
  try {
    // Get dungeon index first
    const dungeonIndex = await BattleNetAPI.makeRequest<{
      instances: Array<{
        id: number;
        name: string;
      }>;
    }>("/data/wow/journal-instance/index", {}, "static");

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
  } catch (error) {
    console.error(`Failed to fetch dungeon index:`, error);
    return null;
  }
};

export const getCharacterDungeonProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { realmSlug, characterName } = req.params;

  try {
    console.log('=== DUNGEON PROFILE START ===');
    console.log('Request params:', { realmSlug, characterName });

    // Check cache first
    const cachedData = await CharacterDungeons.findOne({
      realmSlug,
      characterName: characterName.toLowerCase(),
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    console.log('Cache check result:', cachedData ? 'Found in cache' : 'Not in cache');

    if (cachedData) {
      console.log('Returning cached data');
      res.json(cachedData);
      return;
    }

    // Get current season
    const currentSeason = await DungeonSeason.findOne({ isCurrent: true });
    console.log('Current season:', currentSeason);
    
    if (!currentSeason) {
      console.error('No current season found!');
      throw new Error("No current season found");
    }

    // API request
    console.log('Making API request for season:', currentSeason.id);
    const seasonData = await BattleNetAPI.makeRequest<DungeonSeasonResponse>(
      `/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}/mythic-keystone-profile/season/${currentSeason.id}`,
      {},
      "profile"
    );
    console.log('API Response received:', JSON.stringify(seasonData, null, 2));

    // Transform the season data with media
    const bestRunsWithMedia = await Promise.all(
      (seasonData.best_runs || []).map(async (run) => {
        const media = await getDungeonMedia(run.dungeon.name);
        return {
          completedTimestamp: new Date(run.completed_timestamp),
          duration: run.duration,
          keystoneLevel: run.keystone_level,
          dungeon: {
            id: run.dungeon.id,
            name: run.dungeon.name,
            media,
          },
          isCompleted: run.is_completed_within_time,
          mythic_rating: {
            color: run.mythic_rating?.color || {
              r: 0,
              g: 0,
              b: 0,
              a: 0
            },
            rating: run.mythic_rating?.rating || 0
          },
          keystone_affixes: run.keystone_affixes?.map(affix => ({
            id: affix.id,
            name: affix.name,
            description: affix.description || '',
            icon: affix.icon || ''
          })) || []
        };
      })
    );

    console.log('Transformed runs:', bestRunsWithMedia);

    const seasonsData = {
      [currentSeason.id]: {
        seasonId: currentSeason.id,
        bestRuns: bestRunsWithMedia,
        mythic_rating: {
          color: seasonData.mythic_rating?.color || {
            r: 0,
            g: 0,
            b: 0,
            a: 0
          },
          rating: seasonData.mythic_rating?.rating || 0
        },
        character: seasonData.character
      }
    };

    console.log('Final seasons data structure:', seasonsData);

    // Update or create document
    const savedData = await CharacterDungeons.findOneAndUpdate(
      { 
        realmSlug, 
        characterName: characterName.toLowerCase() 
      },
      {
        $set: {
          realmSlug,
          characterName: characterName.toLowerCase(),
          seasons: seasonsData,
          lastUpdated: new Date()
        }
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true 
      }
    );

    console.log('Saved data:', savedData);

    if (!savedData) {
      console.error('Failed to save data - savedData is null');
    }

    console.log('=== DUNGEON PROFILE END ===');
    res.json(savedData);

  } catch (error) {
    console.error('=== DUNGEON PROFILE ERROR ===');
    console.error('Error details:', error);
    handleApiError(error, res, "fetch character mythic keystone profile");
  }
};

export const getCharacterDungeonSeasonDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { realmSlug, characterName, seasonId } = req.params;

  try {
    console.log('\n=== DUNGEON SEASON DETAILS START ===');
    console.log('Params:', { realmSlug, characterName, seasonId });

    // Check cache first
    const cachedData = await CharacterDungeons.findOne({
      realmSlug,
      characterName: characterName.toLowerCase(),
      [`seasons.${seasonId}`]: { $exists: true },
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    console.log('Cache check result:', cachedData ? 'Found in cache' : 'Not in cache');

    if (cachedData?.seasons?.[seasonId]) {
      console.log('Returning cached season data');
      res.json(cachedData.seasons[seasonId]);
      return;
    }

    console.log('Fetching fresh data from API');
    // Get season data from API
    const seasonData = await BattleNetAPI.makeRequest<DungeonSeasonResponse>(
      `/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}/mythic-keystone-profile/season/${seasonId}`,
      {},
      "profile"
    );
    console.log('API Response received:', JSON.stringify(seasonData, null, 2));

    // Transform the data
    const bestRunsWithMedia = await Promise.all(
      (seasonData.best_runs || []).map(async (run) => {
        const media = await getDungeonMedia(run.dungeon.name);
        return {
          completedTimestamp: new Date(run.completed_timestamp),
          duration: run.duration,
          keystoneLevel: run.keystone_level,
          dungeon: {
            id: run.dungeon.id,
            name: run.dungeon.name,
            media,
          },
          isCompleted: run.is_completed_within_time,
          mythic_rating: {
            color: run.mythic_rating?.color || {
              r: 0,
              g: 0,
              b: 0,
              a: 0
            },
            rating: run.mythic_rating?.rating || 0
          },
          keystone_affixes: run.keystone_affixes?.map(affix => ({
            id: affix.id,
            name: affix.name,
            description: affix.description || '',
            icon: affix.icon || ''
          })) || []
        };
      })
    );

    console.log('Transformed runs:', JSON.stringify(bestRunsWithMedia, null, 2));

    // Update the document
    const savedData = await CharacterDungeons.findOneAndUpdate(
      { 
        realmSlug, 
        characterName: characterName.toLowerCase() 
      },
      {
        $set: {
          [`seasons.${seasonId}`]: {
            seasonId: parseInt(seasonId),
            bestRuns: bestRunsWithMedia,
            mythic_rating: {
              color: seasonData.mythic_rating?.color || {
                r: 0,
                g: 0,
                b: 0,
                a: 0
              },
              rating: seasonData.mythic_rating?.rating || 0
            },
            character: seasonData.character
          },
          lastUpdated: new Date()
        }
      },
      { 
        upsert: true, 
        new: true 
      }
    );

    console.log('Saved data:', JSON.stringify(savedData, null, 2));
    console.log('=== DUNGEON SEASON DETAILS END ===\n');

    res.json(savedData?.seasons?.[seasonId]);

  } catch (error) {
    console.error('=== DUNGEON SEASON DETAILS ERROR ===');
    console.error('Error details:', error);
    handleApiError(error, res, "fetch character dungeon season details");
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
