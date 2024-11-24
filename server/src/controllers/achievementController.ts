import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import Achievements from "../models/Achievements";
import { handleApiError } from "../utils/errorHandler";

interface AchievementCategory {
  categories: Array<{
    key: {
      href: string;
    };
    name: string;
    id: number;
  }>;
}

interface AchievementCategoryDetails {
  id: number;
  name: string;
  achievements: Array<{
    key: {
      href: string;
    };
    name: string;
    id: number;
  }>;
  parent_category: {
    key: {
      href: string;
    };
    name: string;
    id: number;
  };
  is_guild_category: boolean;
  display_order: number;
}

interface AchievementDetails {
  id: number;
  category: {
    name: string;
    id: number;
  };
  name: string;
  description: string;
  points: number;
  criteria?: {
    description: string;
    child_criteria?: Array<{
      description: string;
      amount: number;
    }>;
  };
  media: {
    id: number;
  };
}

interface AchievementMedia {
  assets: Array<{
    key: string;
    value: string;
  }>;
}

// Utility function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utility function to process achievements in batches
async function processBatch(
  achievements: Array<{ id: number; name: string }>,
  categoryDetails: AchievementCategoryDetails,
  startIdx: number,
  batchSize: number
) {
  const batch = achievements.slice(startIdx, startIdx + batchSize);
  const batchResults = [];
  const endIdx = startIdx + batch.length;
  
  console.log(`Processing achievements ${startIdx + 1} to ${endIdx} of category: ${categoryDetails.name}`);

  for (const achievement of batch) {
    try {
      const [achievementData, mediaData] = await Promise.all([
        BattleNetAPI.makeRequest<AchievementDetails>(
          `/data/wow/achievement/${achievement.id}`,
          {
            namespace: "static-eu",
            locale: "en_US",
          },
          "static"
        ),
        BattleNetAPI.makeRequest<AchievementMedia>(
          `/data/wow/media/achievement/${achievement.id}`,
          {
            namespace: "static-eu",
            locale: "en_US",
          },
          "static"
        ),
      ]);

      const achievementWithMedia = {
        ...achievementData,
        category: {
          ...achievementData.category,
          parent_category: categoryDetails.parent_category ? {
            id: categoryDetails.parent_category.id,
            name: categoryDetails.parent_category.name
          } : null
        },
        media: {
          ...achievementData.media,
          assets: mediaData.assets,
        },
      };

      const updatedAchievement = await Achievements.findOneAndUpdate(
        { achievementId: achievement.id },
        {
          achievementId: achievement.id,
          data: achievementWithMedia,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
      batchResults.push(updatedAchievement);
    } catch (error) {
      console.error(`Error processing achievement ${achievement.id}:`, error);
    }
  }

  console.log(`Completed batch: ${startIdx + 1} to ${endIdx} of category: ${categoryDetails.name}`);
  return batchResults;
}

export const getAllAchievements = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Starting getAllAchievements request...");

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const storedAchievements = await Achievements.find(
      { lastUpdated: { $gt: oneDayAgo } },
      { _id: 0, __v: 0 }
    ).sort({ achievementId: 1 });

    if (storedAchievements.length > 0) {
      console.log("Returning cached achievements data");
      res.json(storedAchievements);
      return;
    }

    console.log("Cache empty or expired, fetching from Blizzard API...");
    const categories = await BattleNetAPI.makeRequest<AchievementCategory>(
      "/data/wow/achievement-category/index",
      {
        namespace: "static-eu",
        locale: "en_US",
      },
      "static"
    );

    const updatedAchievements = [];
    const BATCH_SIZE = 100;
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second

    for (const category of categories.categories) {
      const categoryDetails = await BattleNetAPI.makeRequest<AchievementCategoryDetails>(
        `/data/wow/achievement-category/${category.id}`,
        {
          namespace: "static-eu",
          locale: "en_US",
        },
        "static"
      );

      if (categoryDetails.achievements && categoryDetails.achievements.length > 0) {
        console.log(`\nStarting category: ${categoryDetails.name} (${categoryDetails.achievements.length} achievements)`);
        
        for (let i = 0; i < categoryDetails.achievements.length; i += BATCH_SIZE) {
          const batchResults = await processBatch(
            categoryDetails.achievements,
            categoryDetails,
            i,
            BATCH_SIZE
          );
          
          updatedAchievements.push(...batchResults);

          if (i + BATCH_SIZE < categoryDetails.achievements.length) {
            await delay(DELAY_BETWEEN_BATCHES);
          }
        }
      }
    }

    console.log(`\nProcess completed. Total achievements updated: ${updatedAchievements.length}`);
    res.json(updatedAchievements);
  } catch (error) {
    console.error("Error in getAllAchievements:", error);
    handleApiError(error, res, "fetch and store all achievements");
  }
}; 