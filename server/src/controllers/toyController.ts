import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import Toys from "../models/Toys";
import { handleApiError } from "../utils/errorHandler";

interface ToyIndex {
  toys: Array<{
    id: number;
    name: string;
    key: {
      href: string;
    };
  }>;
}

interface ToyData {
  id: number;
  name: string;
  item: {
    id: number;
    key: {
      href: string;
    };
  };
  source: {
    type: string;
    name: string;
  };
  should_exclude_if_uncollected: boolean;
  media: {
    id: number;
  };
}

interface ItemMediaResponse {
  assets: Array<{
    key: string;
    value: string;
  }>;
}

export const getToysIndex = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await BattleNetAPI.makeRequest<ToyIndex>(
      "/data/wow/toy/index",
      {},
      "static"
    );
    res.json(data);
  } catch (error) {
    handleApiError(error, res, "fetch toys index");
  }
};

export const getAllToys = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const storedToys = await Toys.find(
      { lastUpdated: { $gt: oneDayAgo } },
      { _id: 0, __v: 0 }
    ).sort({ toyId: 1 });

    if (storedToys.length > 0) {
      res.json(storedToys);
      return;
    }

    const toyIndex = await BattleNetAPI.makeRequest<ToyIndex>(
      "/data/wow/toy/index",
      {},
      "static"
    );

    const updatedToys = [];

    for (const toy of toyIndex.toys) {
      const [toyData, mediaData] = await Promise.all([
        BattleNetAPI.makeRequest<ToyData>(
          `/data/wow/toy/${toy.id}`,
          {},
          "static"
        ),
        BattleNetAPI.makeRequest<ItemMediaResponse>(
          `/data/wow/media/item/${toy.id}`,
          {},
          "static"
        ),
      ]);

      const toyWithMedia = {
        ...toyData,
        media: {
          ...toyData.media,
          assets: mediaData.assets,
        },
      };

      const updatedToy = await Toys.findOneAndUpdate(
        { toyId: toy.id },
        {
          toyId: toy.id,
          data: toyWithMedia,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
      updatedToys.push(updatedToy);
    }

    res.json(updatedToys);
  } catch (error) {
    handleApiError(error, res, "fetch and store all toys");
  }
};

export const getToyById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const toyId = parseInt(req.params.toyId);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check cache first
    const cachedToy = await Toys.findOne({
      toyId,
      lastUpdated: { $gt: oneDayAgo },
    });

    if (cachedToy) {
      res.json(cachedToy.data);
      return;
    }

    // Fetch new data
    const [toyData, mediaData] = await Promise.all([
      BattleNetAPI.makeRequest<ToyData>(`/data/wow/toy/${toyId}`, {}, "static"),
      BattleNetAPI.makeRequest<ItemMediaResponse>(
        `/data/wow/media/item/${toyId}`,
        {},
        "static"
      ),
    ]);

    const toyWithMedia = {
      ...toyData,
      media: {
        ...toyData.media,
        assets: mediaData.assets,
      },
    };

    // Update cache
    await Toys.findOneAndUpdate(
      { toyId },
      {
        toyId,
        data: toyWithMedia,
        lastUpdated: new Date(),
      },
      { upsert: true }
    );

    res.json(toyWithMedia);
  } catch (error) {
    handleApiError(error, res, `fetch toy ${req.params.toyId}`);
  }
};
