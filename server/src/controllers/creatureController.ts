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
      res.json(creatureMedia);
      return;
    }

    // Fetch new data
    const mediaData = await BattleNetAPI.makeRequest<CreatureMediaResponse>(
      `/data/wow/media/creature-display/${creatureDisplayId}`,
      {},
      'static'
    );

    // Update cache
    creatureMedia = await CreatureMedia.findOneAndUpdate(
      { creatureDisplayId },
      { 
        creatureDisplayId,
        assets: mediaData.assets,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );

    res.json(creatureMedia);
  } catch (error) {
    handleApiError(error, res, `fetch creature media ${req.params.creatureId}`);
  }
};
