import { Request, Response } from "express";
import axios from "axios";
import BattleNetAPI from "../services/BattleNetAPI";
import Mount from "../models/Mounts";

export const getMountsIndex = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const token = await BattleNetAPI.ensureValidToken();

    const mountIndexResponse = await axios.get(
      `https://${BattleNetAPI.region}.api.blizzard.com/data/wow/mount/index`,
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

    res.json(mountIndexResponse.data);
  } catch (error) {
    console.error("Error fetching mounts index:", error);
    res.status(500).json({ error: "Error fetching mounts index" });
  }
};

export const searchMounts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const token = await BattleNetAPI.ensureValidToken();
    const { name } = req.query;

    const searchResponse = await axios.get(
      `https://${BattleNetAPI.region}.api.blizzard.com/data/wow/search/mount`,
      {
        params: {
          namespace: `static-${BattleNetAPI.region}`,
          name: name,
          orderby: "id",
          _page: 1,
          locale: "en_US",
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    res.json(searchResponse.data);
  } catch (error) {
    console.error("Error searching mounts:", error);
    res.status(500).json({ error: "Error searching mounts" });
  }
};

export const getMountById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const token = await BattleNetAPI.ensureValidToken();
    const { mountId } = req.params;

    const mountResponse = await axios.get(
      `https://${BattleNetAPI.region}.api.blizzard.com/data/wow/mount/${mountId}`,
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

    res.json(mountResponse.data);
  } catch (error) {
    console.error(`Error fetching mount with ID ${req.params.mountId}:`, error);
    res
      .status(500)
      .json({ error: `Error fetching mount with ID ${req.params.mountId}` });
  }
};

export const getAllMounts = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check if we have recent data in the database
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const storedMounts = await Mount.find(
      { lastUpdated: { $gt: oneDayAgo } },
      { _id: 0, __v: 0 }
    ).sort({ mountId: 1 });

    if (storedMounts.length > 0) {
      // If we have recent data, return it
      res.json(storedMounts);
      return;
    }

    // If no recent data, fetch from Blizzard API
    const token = await BattleNetAPI.ensureValidToken();
    const mountIndexResponse = await axios.get(
      `https://${BattleNetAPI.region}.api.blizzard.com/data/wow/mount/index`,
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

    const mounts = mountIndexResponse.data.mounts;
    const updatedMounts = [];

    for (const mount of mounts) {
      const mountResponse = await axios.get(
        `https://${BattleNetAPI.region}.api.blizzard.com/data/wow/mount/${mount.id}`,
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

      const updatedMount = await Mount.findOneAndUpdate(
        { mountId: mount.id },
        {
          mountId: mount.id,
          data: mountResponse.data,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );

      updatedMounts.push(updatedMount);
    }

    res.json(updatedMounts);
  } catch (error) {
    console.error("Error fetching and storing all mounts:", error);
    res.status(500).json({ error: "Error fetching and storing all mounts" });
  }
};