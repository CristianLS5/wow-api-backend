import { Request, Response } from "express";
import axios from "axios";
import BattleNetAPI from "../services/BattleNetAPI";


export const getCharacterEquipment = async (req: Request, res: Response) => {
  const { realmSlug, characterName } = req.params;
  try {
    const token = await BattleNetAPI.ensureValidToken();
    const response = await axios.get(
      `https://${BattleNetAPI.region}.api.blizzard.com/profile/wow/character/${realmSlug}/${characterName}/equipment`,
      {
        params: {
          namespace: `profile-${BattleNetAPI.region}`,
          locale: "en_US",
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const equipmentWithIcons = await Promise.all(
      response.data.equipped_items.map(async (item: any) => {
        const iconUrl = await getItemIcon(item.item.id);
        return { ...item, iconUrl };
      })
    );

    res.json({ ...response.data, equipped_items: equipmentWithIcons });
  } catch (error) {
    console.error("Error fetching character equipment:", error);
    res.status(500).json({ error: "Failed to fetch character equipment" });
  }
};

const getItemIcon = async (itemId: number): Promise<string | null> => {
  try {
    const mediaData = await getItemMedia(itemId);
    if (mediaData && mediaData.assets) {
      const iconAsset = mediaData.assets.find(
        (asset: any) => asset.key === "icon"
      );
      if (iconAsset) {
        return iconAsset.value;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching icon for item ${itemId}:`, error);
    return null;
  }
};

const getItemMedia = async (itemId: number): Promise<any> => {
  try {
    const token = await BattleNetAPI.ensureValidToken();
    const response = await axios.get(
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
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching media for item ${itemId}:`, error);
    return null;
  }
};

export const getCharacterMedia = async (req: Request, res: Response) => {
  const { realmSlug, characterName } = req.params;
  try {
    const token = await BattleNetAPI.ensureValidToken();
    const response = await axios.get(
      `https://${BattleNetAPI.region}.api.blizzard.com/profile/wow/character/${realmSlug}/${characterName}/character-media`,
      {
        params: {
          namespace: `profile-${BattleNetAPI.region}`,
          locale: "en_US",
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching character media:", error);
    res.status(500).json({ error: "Failed to fetch character media" });
  }
};

export const getCharacterProfile = async (req: Request, res: Response) => {
  const { realmSlug, characterName } = req.params;
  try {
    const token = await BattleNetAPI.ensureValidToken();
    const response = await axios.get(
      `https://${BattleNetAPI.region}.api.blizzard.com/profile/wow/character/${realmSlug}/${characterName}`,
      {
        params: {
          namespace: `profile-${BattleNetAPI.region}`,
          locale: "en_US",
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching character profile:", error);
    res.status(500).json({ error: "Failed to fetch character profile" });
  }
};
