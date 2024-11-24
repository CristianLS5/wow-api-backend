import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import CharacterAchievements from "../models/CharacterAchievements";
import { handleApiError } from "../utils/errorHandler";

interface CharacterAchievementSummary {
  total_quantity: number;
  total_points: number;
  achievements: Array<{
    id: number;
    achievement: {
      key: { href: string };
      name: string;
      id: number;
    };
    criteria: {
      id: number;
      is_completed: boolean;
      child_criteria: Array<{
        id: number;
        amount: number;
        is_completed: boolean;
      }>;
    };
    completed_timestamp: number;
  }>;
}

interface CharacterAchievementStatistics {
  categories: Array<{
    id: number;
    name: string;
    sub_categories: Array<{
      id: number;
      name: string;
      statistics: Array<{
        id: number;
        name: string;
        last_updated_timestamp: number;
        quantity: number;
      }>;
    }>;
  }>;
}

export const getCharacterAchievements = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { realmSlug, characterName } = req.params;
  try {
    const cachedAchievements = await CharacterAchievements.findOne({
      "characterId.realm": realmSlug,
      "characterId.name": characterName,
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (cachedAchievements?.achievementSummary) {
      res.json(cachedAchievements.achievementSummary);
      return;
    }

    const achievementSummary = await BattleNetAPI.makeRequest<CharacterAchievementSummary>(
      `/profile/wow/character/${realmSlug}/${characterName}/achievements`,
      {
        namespace: "profile-eu",
        locale: "en_US"
      },
      "profile"
    );

    await CharacterAchievements.findOneAndUpdate(
      { 
        "characterId.realm": realmSlug, 
        "characterId.name": characterName 
      },
      { 
        achievementSummary,
        lastUpdated: new Date() 
      },
      { upsert: true }
    );

    res.json(achievementSummary);
  } catch (error) {
    handleApiError(error, res, `fetch achievements for character ${characterName}-${realmSlug}`);
  }
};

export const getCharacterAchievementStatistics = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { realmSlug, characterName } = req.params;
  try {
    const cachedAchievements = await CharacterAchievements.findOne({
      "characterId.realm": realmSlug,
      "characterId.name": characterName,
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (cachedAchievements?.statistics) {
      res.json(cachedAchievements.statistics);
      return;
    }

    const statistics = await BattleNetAPI.makeRequest<CharacterAchievementStatistics>(
      `/profile/wow/character/${realmSlug}/${characterName}/achievements/statistics`,
      {
        namespace: "profile-eu",
        locale: "en_US"
      },
      "profile"
    );

    await CharacterAchievements.findOneAndUpdate(
      { 
        "characterId.realm": realmSlug, 
        "characterId.name": characterName 
      },
      { 
        statistics,
        lastUpdated: new Date() 
      },
      { upsert: true }
    );

    res.json(statistics);
  } catch (error) {
    handleApiError(error, res, `fetch achievement statistics for character ${characterName}-${realmSlug}`);
  }
}; 