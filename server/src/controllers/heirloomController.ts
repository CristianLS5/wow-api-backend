import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import Heirlooms from "../models/Heirlooms";
import { handleApiError } from "../utils/errorHandler";

interface HeirloomIndex {
  heirlooms: Array<{
    id: number;
    name: string;
    key: {
      href: string;
    };
  }>;
}

interface HeirloomData {
  id: number;
  name: string;
  item: {
    id: number;
    name: string;
  };
  source: {
    type: string;
    name: string;
  };
  source_description: string;
}

interface ItemMediaResponse {
  assets: Array<{
    key: string;
    value: string;
  }>;
}

export const getHeirloomsIndex = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await BattleNetAPI.makeRequest<HeirloomIndex>(
      "/data/wow/heirloom/index",
      {},
      "static"
    );
    res.json(data);
  } catch (error) {
    handleApiError(error, res, "fetch heirlooms index");
  }
};

export const getAllHeirlooms = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const storedHeirlooms = await Heirlooms.find(
      { lastUpdated: { $gt: oneDayAgo } },
      { _id: 0, __v: 0 }
    ).sort({ heirloomId: 1 });

    if (storedHeirlooms.length > 0) {
      res.json(storedHeirlooms);
      return;
    }

    const heirloomIndex = await BattleNetAPI.makeRequest<HeirloomIndex>(
      "/data/wow/heirloom/index",
      {},
      "static"
    );

    const updatedHeirlooms = [];

    for (const heirloom of heirloomIndex.heirlooms) {
      const heirloomData = await BattleNetAPI.makeRequest<HeirloomData>(
        `/data/wow/heirloom/${heirloom.id}`,
        {},
        "static"
      );

      const mediaData = await BattleNetAPI.makeRequest<ItemMediaResponse>(
        `/data/wow/media/item/${heirloomData.item.id}`,
        {},
        "static"
      );

      const heirloomWithMedia = {
        ...heirloomData,
        media: {
          assets: mediaData.assets,
        },
      };

      const updatedHeirloom = await Heirlooms.findOneAndUpdate(
        { heirloomId: heirloom.id },
        {
          heirloomId: heirloom.id,
          data: heirloomWithMedia,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
      updatedHeirlooms.push(updatedHeirloom);
    }

    res.json(updatedHeirlooms);
  } catch (error) {
    handleApiError(error, res, "fetch and store all heirlooms");
  }
};

export const getHeirloomById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const heirloomId = parseInt(req.params.heirloomId);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check cache first
    const cachedHeirloom = await Heirlooms.findOne({
      heirloomId,
      lastUpdated: { $gt: oneDayAgo },
    });

    if (cachedHeirloom) {
      res.json(cachedHeirloom.data);
      return;
    }

    const heirloomData = await BattleNetAPI.makeRequest<HeirloomData>(
      `/data/wow/heirloom/${heirloomId}`,
      {},
      "static"
    );

    const mediaData = await BattleNetAPI.makeRequest<ItemMediaResponse>(
      `/data/wow/media/item/${heirloomData.item.id}`,
      {},
      "static"
    );

    const heirloomWithMedia = {
      ...heirloomData,
      media: {
        assets: mediaData.assets,
      },
    };

    // Update cache
    await Heirlooms.findOneAndUpdate(
      { heirloomId },
      {
        heirloomId,
        data: heirloomWithMedia,
        lastUpdated: new Date(),
      },
      { upsert: true }
    );

    res.json(heirloomWithMedia);
  } catch (error) {
    handleApiError(error, res, `fetch heirloom ${req.params.heirloomId}`);
  }
}; 