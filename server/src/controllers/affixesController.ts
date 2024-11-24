import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import { handleApiError } from "../utils/errorHandler";
import Affix from "../models/Affix";

interface AffixIndex {
  affixes: Array<{
    key: { href: string };
    name: string;
    id: number;
  }>;
}

interface AffixDetails {
  id: number;
  name: string;
  description: string;
  media: {
    key: { href: string };
    id: number;
  };
}

interface AffixMedia {
  assets: Array<{
    key: string;
    value: string;
    file_data_id: number;
  }>;
}

export const getAffixes = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check cache first
    const cachedAffixes = await Affix.find({
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (cachedAffixes.length > 0) {
      res.json(cachedAffixes);
      return;
    }

    // Fetch affix index
    const indexData = await BattleNetAPI.makeRequest<AffixIndex>(
      "/data/wow/keystone-affix/index",
      {},
      "static"
    );

    // Fetch details and media for each affix
    const affixPromises = indexData.affixes.map(async (affix) => {
      // Get affix details
      const affixDetails = await BattleNetAPI.makeRequest<AffixDetails>(
        `/data/wow/keystone-affix/${affix.id}`,
        {},
        "static"
      );

      // Get affix media
      const mediaData = await BattleNetAPI.makeRequest<AffixMedia>(
        `/data/wow/media/keystone-affix/${affix.id}`,
        {},
        "static"
      );

      const iconUrl = mediaData.assets.find(
        (asset) => asset.key === "icon"
      )?.value;

      return Affix.findOneAndUpdate(
        { id: affix.id },
        {
          id: affix.id,
          name: affixDetails.name,
          description: affixDetails.description,
          icon: iconUrl,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
    });

    const updatedAffixes = await Promise.all(affixPromises);
    res.json(updatedAffixes);
  } catch (error) {
    handleApiError(error, res, "fetch mythic keystone affixes");
  }
};

export const getAffixById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { affixId } = req.params;

    // Check cache first
    const cachedAffix = await Affix.findOne({
      id: parseInt(affixId),
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (cachedAffix) {
      res.json(cachedAffix);
      return;
    }

    // Fetch fresh data
    const affixDetails = await BattleNetAPI.makeRequest<AffixDetails>(
      `/data/wow/keystone-affix/${affixId}`,
      {},
      "static"
    );

    const mediaData = await BattleNetAPI.makeRequest<AffixMedia>(
      `/data/wow/media/keystone-affix/${affixId}`,
      {},
      "static"
    );

    const iconUrl = mediaData.assets.find(
      (asset) => asset.key === "icon"
    )?.value;

    const updatedAffix = await Affix.findOneAndUpdate(
      { id: parseInt(affixId) },
      {
        id: affixDetails.id,
        name: affixDetails.name,
        description: affixDetails.description,
        icon: iconUrl,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json(updatedAffix);
  } catch (error) {
    handleApiError(error, res, "fetch mythic keystone affix details");
  }
};
