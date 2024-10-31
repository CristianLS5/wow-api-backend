import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import CreatureMedia from "../models/CreatureMedia";
import { handleApiError } from "../utils/errorHandler";

interface CreatureMediaResponse {
  _links: {
    self: {
      href: string;
    };
  };
  assets: Array<{
    key: string;
    value: string;
  }>;
}

export const getCreatureMedia = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const creatureDisplayId = parseInt(req.params.creatureId);

    // Check cache
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let creatureMedia = await CreatureMedia.findOne({
      creatureDisplayId,
      lastUpdated: { $gt: oneDayAgo }
    });

    if (creatureMedia) {
      // If we have a cached "not found" entry, return null assets
      if (creatureMedia.notFound) {
        res.json({ assets: [] });
        return;
      }
      res.json(creatureMedia);
      return;
    }

    try {
      // Fetch new data
      const mediaData = await BattleNetAPI.makeRequest<CreatureMediaResponse>(
        `/data/wow/media/creature-display/${creatureDisplayId}`,
        {},
        'static'
      );

      // Update cache with successful response
      creatureMedia = await CreatureMedia.findOneAndUpdate(
        { creatureDisplayId },
        { 
          creatureDisplayId,
          assets: mediaData.assets,
          notFound: false,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );

      res.json(creatureMedia);
    } catch (error: any) {
      // If it's a 404, cache this information and return empty assets
      if (error?.status === 404) {
        await CreatureMedia.findOneAndUpdate(
          { creatureDisplayId },
          { 
            creatureDisplayId,
            assets: [],
            notFound: true,
            lastUpdated: new Date()
          },
          { upsert: true }
        );
        res.json({ assets: [] });
        return;
      }
      // Re-throw other errors
      throw error;
    }
  } catch (error) {
    handleApiError(error, res, `fetch creature media ${req.params.creatureId}`);
  }
};
