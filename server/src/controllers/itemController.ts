import { Request, Response } from "express";
import axios from "axios";
import BattleNetAPI from "../services/BattleNetAPI";
import Bottleneck from "bottleneck";

const limiter = new Bottleneck({
  minTime: 100, // Minimum time between requests (in ms)
});

export const getItemsIndex = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const token = await BattleNetAPI.ensureValidToken();
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 100;

    const response = await limiter.schedule(() =>
      axios.get(
        `https://${BattleNetAPI.region}.api.blizzard.com/data/wow/search/item`,
        {
          params: {
            namespace: `static-${BattleNetAPI.region}`,
            locale: "en_US",
            _page: page,
            _pageSize: pageSize,
            orderby: "id",
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
    );

    const items = response.data.results;
    const itemsWithDetails = items.map((item: any) => ({
      id: item.data.id,
      name: item.data.name.en_US,
      quality: item.data.quality.type,
      level: item.data.level,
      required_level: item.data.required_level,
      item_class: item.data.item_class.name.en_US,
      item_subclass: item.data.item_subclass.name.en_US,
    }));

    res.json({
      items: itemsWithDetails,
      pageInfo: {
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(response.data.pageSize / pageSize),
        totalItems: response.data.pageSize,
      },
    });
  } catch (error) {
    console.error("Error fetching items index:", error);
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", {
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });
    }
    res.status(500).json({ error: "An error occurred while fetching items" });
  }
};

export const getItemById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const itemId = parseInt(req.params.itemId);
    const itemDetails = await fetchItemDetails(itemId);
    res.json(itemDetails);
  } catch (error) {
    console.error(`Error fetching item ${req.params.itemId}:`, error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the item" });
  }
};

async function fetchItemDetails(itemId: number): Promise<any> {
  try {
    const token = await BattleNetAPI.ensureValidToken();
    const response = await limiter.schedule(() =>
      axios.get(`https://${BattleNetAPI.region}.api.blizzard.com/data/wow/item/${itemId}`, {
        params: {
          namespace: `static-${BattleNetAPI.region}`,
          locale: "en_US",
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );

    const mediaData = await fetchItemMedia(itemId);

    return {
      id: response.data.id,
      name: response.data.name,
      quality: response.data.quality?.type,
      level: response.data.level,
      required_level: response.data.required_level,
      item_class: response.data.item_class?.name,
      item_subclass: response.data.item_subclass?.name,
      media: mediaData,
    };
  } catch (error) {
    console.error(`Error fetching item details for ID ${itemId}:`, error);
    return null;
  }
}

async function fetchItemMedia(itemId: number): Promise<any> {
  try {
    const token = await BattleNetAPI.ensureValidToken();
    const response = await limiter.schedule(() =>
      axios.get(
        `https://${BattleNetAPI.region}.api.blizzard.com/data/wow/media/item/${itemId}`,
        {
          params: {
            namespace: `static-${BattleNetAPI.region}`,
            locale: "en_US",
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching item media for item ID ${itemId}:`, error);
    return null;
  }
}
