import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import CharacterEquipment from "../models/CharacterEquipment";
import CharacterMedia from "../models/CharacterMedia";
import CharacterProfile from "../models/CharacterProfile";
import { handleApiError } from "../utils/errorHandler";

interface ItemMedia {
  assets: Array<{
    key: string;
    value: string;
  }>;
}

interface EquipmentItem {
  item: {
    id: number;
  };
  transmog?: {
    item: {
      id: number;
    };
  };
}

interface EquipmentData {
  equipped_items: EquipmentItem[];
  // Add other equipment properties as needed
}

export const getCharacterEquipment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { realmSlug, characterName } = req.params;
  try {
    const cachedEquipment = await CharacterEquipment.findOne({
      realmSlug,
      characterName,
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (cachedEquipment) {
      res.json(cachedEquipment.equipment);
      return;
    }

    const equipmentData = await BattleNetAPI.makeRequest<EquipmentData>(
      `/profile/wow/character/${realmSlug}/${characterName}/equipment`,
      {},
      "profile"
    );

    const equipmentWithIcons = await Promise.all(
      equipmentData.equipped_items.map(async (item: EquipmentItem) => {
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

    const finalEquipmentData = {
      ...equipmentData,
      equipped_items: equipmentWithIcons,
    };

    await CharacterEquipment.findOneAndUpdate(
      { realmSlug, characterName },
      { equipment: finalEquipmentData, lastUpdated: new Date() },
      { upsert: true }
    );

    res.json(finalEquipmentData);
  } catch (error) {
    handleApiError(error, res, "fetch character equipment");
  }
};

const getItemIcon = async (itemId: number): Promise<string> => {
  try {
    const mediaData = await getItemMedia(itemId);
    const iconAsset = mediaData?.assets?.find(
      (asset: any) => asset.key === "icon"
    );
    return iconAsset?.value || "";
  } catch (error) {
    console.error(`Error fetching icon for item ${itemId}:`, error);
    return "";
  }
};

const getItemMedia = async (itemId: number): Promise<ItemMedia | null> => {
  try {
    return await BattleNetAPI.makeRequest<ItemMedia>(
      `/data/wow/media/item/${itemId}`,
      {},
      "static"
    );
  } catch (error) {
    console.error(`Error fetching media for item ${itemId}:`, error);
    return null;
  }
};

export const getCharacterMedia = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { realmSlug, characterName } = req.params;
  try {
    const cachedMedia = await CharacterMedia.findOne({
      realmSlug,
      characterName,
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (cachedMedia) {
      res.json(cachedMedia.media);
      return;
    }

    const mediaData = await BattleNetAPI.makeRequest(
      `/profile/wow/character/${realmSlug}/${characterName}/character-media`,
      {},
      "profile"
    );

    await CharacterMedia.findOneAndUpdate(
      { realmSlug, characterName },
      { media: mediaData, lastUpdated: new Date() },
      { upsert: true }
    );

    res.json(mediaData);
  } catch (error) {
    handleApiError(error, res, "fetch character media");
  }
};

export const getCharacterProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { realmSlug, characterName } = req.params;
  try {
    const cachedProfile = await CharacterProfile.findOne({
      realmSlug,
      characterName,
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (cachedProfile) {
      res.json(cachedProfile.profile);
      return;
    }

    const profileData = await BattleNetAPI.makeRequest(
      `/profile/wow/character/${realmSlug}/${characterName}`,
      {},
      "profile"
    );

    await CharacterProfile.findOneAndUpdate(
      { realmSlug, characterName },
      { profile: profileData, lastUpdated: new Date() },
      { upsert: true }
    );

    res.json(profileData);
  } catch (error) {
    handleApiError(error, res, "fetch character profile");
  }
};
