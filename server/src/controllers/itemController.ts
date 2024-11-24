import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import { handleApiError } from "../utils/errorHandler";

interface ItemSearchResult {
  data: {
    id: number;
    name: {
      en_US: string;
    };
    quality: {
      type: string;
    };
    level: number;
    required_level: number;
    item_class: {
      name: {
        en_US: string;
      };
    };
    item_subclass: {
      name: {
        en_US: string;
      };
    };
  };
}

interface ItemSearchResponse {
  results: ItemSearchResult[];
  pageSize: number;
}

interface ItemDetails {
  id: number;
  name: string;
  quality?: {
    type: string;
  };
  level: number;
  required_level: number;
  item_class?: {
    name: string;
  };
  item_subclass?: {
    name: string;
  };
  media?: ItemMediaResponse | null;
}

interface ItemMediaResponse {
  assets: Array<{
    key: string;
    value: string;
  }>;
}

export const getItemsIndex = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 100;

    const response = await BattleNetAPI.makeRequest<ItemSearchResponse>(
      '/data/wow/search/item',
      {
        _page: page,
        _pageSize: pageSize,
        orderby: "id"
      },
      'static'
    );

    const itemsWithDetails = response.results.map((item: ItemSearchResult) => ({
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
        page,
        pageSize,
        totalPages: Math.ceil(response.pageSize / pageSize),
        totalItems: response.pageSize,
      },
    });
  } catch (error) {
    handleApiError(error, res, 'fetch items index');
  }
};

export const getItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const itemId = parseInt(req.params.itemId);
    const itemDetails = await fetchItemDetails(itemId);
    
    if (!itemDetails) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    
    res.json(itemDetails);
  } catch (error) {
    handleApiError(error, res, `fetch item ${req.params.itemId}`);
  }
};

async function fetchItemDetails(itemId: number): Promise<ItemDetails | null> {
  try {
    const [itemData, mediaData] = await Promise.all([
      BattleNetAPI.makeRequest<ItemDetails>(
        `/data/wow/item/${itemId}`,
        {},
        'static'
      ),
      fetchItemMedia(itemId)
    ]);

    return {
      id: itemData.id,
      name: itemData.name,
      quality: itemData.quality,
      level: itemData.level,
      required_level: itemData.required_level,
      item_class: itemData.item_class,
      item_subclass: itemData.item_subclass,
      media: mediaData,
    };
  } catch (error) {
    console.error(`Error fetching item details for ID ${itemId}:`, error);
    return null;
  }
}

async function fetchItemMedia(itemId: number): Promise<ItemMediaResponse | null> {
  try {
    return await BattleNetAPI.makeRequest<ItemMediaResponse>(
      `/data/wow/media/item/${itemId}`,
      {},
      'static'
    );
  } catch (error) {
    console.error(`Error fetching item media for ID ${itemId}:`, error);
    return null;
  }
}
