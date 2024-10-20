import { Request, Response } from "express";
import axios from "axios";
import BattleNetAPI from "../services/BattleNetAPI";
import CharacterEquipment from "../models/CharacterEquipment";
import CharacterMedia from "../models/CharacterMedia";
import CharacterProfile from "../models/CharacterProfile";

export const getCharacterEquipment = async (req: Request, res: Response): Promise<void> => {
  const { realmSlug, characterName } = req.params;
  try {
    // Check if we have recent data in the database
    const cachedEquipment = await CharacterEquipment.findOne({
      realmSlug,
      characterName,
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Data less than 24 hours old
    });

    if (cachedEquipment) {
      res.json(cachedEquipment.equipment);
      return;
    }

    // If no recent data, fetch from API
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
        if (item.transmog) {
          const transmogIconUrl = await getItemIcon(item.transmog.item.id);
          return {
            ...item,
            iconUrl,
            transmog: {
              ...item.transmog,
              iconUrl: transmogIconUrl,
            },
          };
        }
        return { ...item, iconUrl };
      })
    );

    const equipmentData = {
      ...response.data,
      equipped_items: equipmentWithIcons,
    };

    // Update or create the database entry
    await CharacterEquipment.findOneAndUpdate(
      { realmSlug, characterName },
      { equipment: equipmentData, lastUpdated: new Date() },
      { upsert: true, new: true }
    );

    res.json(equipmentData);
  } catch (error) {
    console.error("Error fetching character equipment:", error);
    res.status(500).json({ error: "Failed to fetch character equipment" });
  }
};

const getItemIcon = async (itemId: number): Promise<string> => {
  try {
    const mediaData = await getItemMedia(itemId);
    if (mediaData && mediaData.assets) {
      const iconAsset = mediaData.assets.find((asset: any) => asset.key === "icon");
      if (iconAsset) {
        return iconAsset.value;
      }
    }
    return ""; // Return an empty string if no icon found
  } catch (error) {
    console.error(`Error fetching icon for item ${itemId}:`, error);
    return ""; // Return an empty string in case of error
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

export const getCharacterMedia = async (req: Request, res: Response): Promise<void> => {
  const { realmSlug, characterName } = req.params;
  try {
    // Check if we have recent data in the database
    const cachedMedia = await CharacterMedia.findOne({
      realmSlug,
      characterName,
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Data less than 24 hours old
    });

    if (cachedMedia) {
      res.json(cachedMedia.media);
      return;
    }

    // If no recent data, fetch from API
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

    // Update or create the database entry
    await CharacterMedia.findOneAndUpdate(
      { realmSlug, characterName },
      { media: response.data, lastUpdated: new Date() },
      { upsert: true, new: true }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching character media:", error);
    res.status(500).json({ error: "Failed to fetch character media" });
  }
};

export const getCharacterProfile = async (req: Request, res: Response): Promise<void> => {
  const { realmSlug, characterName } = req.params;
  try {
    // Check if we have recent data in the database
    const cachedProfile = await CharacterProfile.findOne({
      realmSlug,
      characterName,
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Data less than 24 hours old
    });

    if (cachedProfile) {
      res.json(cachedProfile.profile);
      return;
    }

    // If no recent data, fetch from API
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

    // Update or create the database entry
    await CharacterProfile.findOneAndUpdate(
      { realmSlug, characterName },
      { profile: response.data, lastUpdated: new Date() },
      { upsert: true, new: true }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching character profile:", error);
    res.status(500).json({ error: "Failed to fetch character profile" });
  }
};
