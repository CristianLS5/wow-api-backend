import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import CharacterReputations from "../models/CharacterReputations";
import { handleApiError } from "../utils/errorHandler";
import { factionExpansions } from "../data/schema/factionExpansions";

interface BaseReputation {
  faction: {
    name: string;
    id: number;
  };
  standing: {
    raw: number;
    value: number;
    max: number;
    tier: number;
    name: string;
  };
  paragon?: {
    raw: number;
    value: number;
    max: number;
  };
}

interface ReputationResponse {
  reputations: BaseReputation[];
}

interface EnhancedReputation extends BaseReputation {
  expansion: string;
}

interface GroupedReputations {
  [key: string]: EnhancedReputation[];
}

export const getCharacterReputations = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { realmSlug, characterName } = req.params;

  try {
    const cachedData = await CharacterReputations.findOne({
      realmSlug,
      characterName,
      lastUpdated: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (cachedData) {
      res.json(cachedData.reputations);
      return;
    }

    const data = await BattleNetAPI.makeRequest<ReputationResponse>(
      `/profile/wow/character/${realmSlug}/${characterName.toLowerCase()}/reputations`,
      {
        namespace: "profile-eu",
        locale: "en_GB",
      },
      "profile"
    );

    if (!data || !Array.isArray(data.reputations)) {
      throw new Error("Invalid API response");
    }

    // Enhance the data with expansion information and group by expansion
    const enhancedReputations: GroupedReputations = data.reputations.reduce((acc, rep) => {
      const expansionInfo = factionExpansions.find(f => f.id === rep.faction.id);
      if (expansionInfo) {
        const expansion = expansionInfo.expansion;
        if (!acc[expansion]) {
          acc[expansion] = [];
        }
        acc[expansion].push({
          ...rep,
          expansion
        });
      }
      return acc;
    }, {} as GroupedReputations);

    // Sort expansions chronologically
    const expansionOrder = [
      "Classic",
      "The Burning Crusade",
      "Wrath of the Lich King",
      "Cataclysm",
      "Mists of Pandaria",
      "Warlords of Draenor",
      "Legion",
      "Battle for Azeroth",
      "Shadowlands",
      "Dragonflight",
      "The War Within"
    ];

    const sortedReputations = Object.fromEntries(
      expansionOrder
        .filter(exp => enhancedReputations[exp])
        .map(exp => [exp, enhancedReputations[exp]])
    );

    await CharacterReputations.findOneAndUpdate(
      { realmSlug, characterName },
      { reputations: sortedReputations, lastUpdated: new Date() },
      { upsert: true }
    );

    res.json(sortedReputations);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      res.status(404).json({
        error: "Reputations not available",
        details: `Unable to fetch reputations for ${characterName} on ${realmSlug}. This might be due to the character being inactive or the data being temporarily unavailable.`,
      });
      return;
    }
    handleApiError(error, res, "fetch character reputations");
  }
};
