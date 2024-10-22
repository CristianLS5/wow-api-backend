import { Request, Response } from "express";
import axios from "axios";
import BattleNetAPI from "../services/BattleNetAPI";
import Bottleneck from "bottleneck";
import CreatureMedia from "../models/CreatureMedia";

const limiter = new Bottleneck({
  minTime: 100,
});

export const getCreatureMedia = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const creatureDisplayId = parseInt(req.params.creatureId);

    // Check if we have recent data in the database
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let creatureMedia = await CreatureMedia.findOne({
      creatureDisplayId,
      lastUpdated: { $gt: oneDayAgo }
    });

    if (!creatureMedia) {
      // If no recent data, fetch from Blizzard API
      const token = await BattleNetAPI.ensureValidToken();
      const response = await limiter.schedule(() =>
        axios.get(
          `https://${BattleNetAPI.region}.api.blizzard.com/data/wow/media/creature-display/${creatureDisplayId}`,
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

      if (response.data) {
        // Store or update the fetched data in the database
        creatureMedia = await CreatureMedia.findOneAndUpdate(
          { creatureDisplayId },
          { 
            creatureDisplayId,
            assets: response.data.assets,
            lastUpdated: new Date()
          },
          { upsert: true, new: true }
        );
      }
    }

    if (creatureMedia) {
      res.json(creatureMedia);
    } else {
      res.status(404).json({ error: "Creature media not found" });
    }
  } catch (error) {
    console.error(
      `Error fetching creature media ${req.params.creatureId}:`,
      error
    );
    res
      .status(500)
      .json({ error: "An error occurred while fetching the creature media" });
  }
};
