import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import Mount from "../models/Mounts";
import MountItems from "../models/MountItems";
import { handleApiError } from "../utils/errorHandler";
import mongoose from "mongoose";
import { runMountItemAggregation } from '../scripts/mountItemAggregate';

interface MountIndex {
  mounts: Array<{
    id: number;
    name: string;
  }>;
}

interface MountData {
  id: number;
  name: { en_US: string };
  // Add other mount properties as needed
}

// Add interface for mount details
interface MountDetails {
  id: number;
  name: {
    en_US: string;
    [key: string]: string;
  };
  creature_displays: number[];
  description: {
    en_US: string;
    [key: string]: string;
  };
  source: {
    type: string;
    name: {
      en_US: string;
      [key: string]: string;
    };
  };
  [key: string]: any; // For any additional fields
}

const syncMountItems = async (): Promise<void> => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const existingData = await MountItems.findOne({
      lastUpdated: { $gt: sevenDaysAgo },
    });

    if (existingData) {
      console.log("Mount items data is up to date");
      return;
    }

    console.log("Starting mount items sync...");

    if (!mongoose.connection || !mongoose.connection.db) {
      throw new Error("Database connection not established");
    }
    
    // Then run the mount items aggregation
    await runMountItemAggregation(mongoose.connection.db);
    
    console.log("Mount items sync completed successfully");
  } catch (error) {
    console.error("Error syncing mount items:", error);
    throw error;
  }
};

export const getMountsIndex = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Starting getMountsIndex request...");

    const data = await BattleNetAPI.makeRequest<MountIndex>(
      "/data/wow/mount/index",
      {
        namespace: "static-eu",
        locale: "en_US",
      },
      "static"
    );

    console.log(`Total number of mounts in index: ${data.mounts.length}`);
    res.json(data);
  } catch (error) {
    handleApiError(error, res, "fetch mounts index");
  }
};

export const searchMounts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name } = req.query;
    const data = await BattleNetAPI.makeRequest("/data/wow/search/mount", {
      name,
      orderby: "id",
      _page: 1,
    });
    res.json(data);
  } catch (error) {
    handleApiError(error, res, "search mounts");
  }
};

export const getMountById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { mountId } = req.params;
    const mountData = await BattleNetAPI.makeRequest<MountDetails>(
      `/data/wow/mount/${mountId}`,
      {
        namespace: "static-eu",
        locale: "en_US",
      },
      "static"
    );

    // Get item data for this mount
    const mountItems = await MountItems.findOne(
      { MOUNTID: parseInt(mountId) },
      { _id: 0, __v: 0, lastUpdated: 0 }
    );

    const response = {
      ...mountData,
      itemData: mountItems || null,
    };

    res.json(response);
  } catch (error) {
    handleApiError(error, res, `fetch mount ${req.params.mountId}`);
  }
};

export const getAllMounts = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    await syncMountItems();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const storedMounts = await Mount.find(
      { lastUpdated: { $gt: oneDayAgo } },
      { _id: 0, __v: 0 }
    ).sort({ mountId: 1 });

    if (storedMounts.length > 0) {
      const mountItems = await MountItems.find(
        {},
        { _id: 0, __v: 0, lastupdated: 0, buildversion: 0 }
      );
      
      const mountItemsMap = new Map(
        mountItems.map((item) => [item.mountid, item])
      );

      // Update stored mounts with spell and item IDs
      for (const mount of storedMounts) {
        const mountItem = mountItemsMap.get(mount.mountId);
        if (mountItem) {
          await Mount.updateOne(
            { mountId: mount.mountId },
            { 
              spellId: mountItem.spellid,
              itemId: mountItem.itemid
            }
          );
        }
      }

      // Fetch updated mounts
      const updatedMounts = await Mount.find(
        { lastUpdated: { $gt: oneDayAgo } },
        { _id: 0, __v: 0 }
      ).sort({ mountId: 1 });

      res.json(updatedMounts);
      return;
    }

    const mountIndex = await BattleNetAPI.makeRequest<MountIndex>(
      "/data/wow/mount/index",
      {
        namespace: "static-eu",
        locale: "en_US",
      },
      "static"
    );

    const BATCH_SIZE = 100;
    const updatedMounts = [];
    
    // Get mount items for lookup
    const mountItems = await MountItems.find({});
    const mountItemsMap = new Map(
      mountItems.map((item) => [item.mountid, item])
    );
    
    // Process mounts in batches
    for (let i = 0; i < mountIndex.mounts.length; i += BATCH_SIZE) {
      const batch = mountIndex.mounts.slice(i, i + BATCH_SIZE);
      
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const batchPromises = batch.map(async (mount) => {
        const mountData = await BattleNetAPI.makeRequest<MountData>(
          `/data/wow/mount/${mount.id}`,
          {
            namespace: "static-eu",
            locale: "en_US",
          },
          "static"
        );

        const mountItem = mountItemsMap.get(mount.id);

        return Mount.findOneAndUpdate(
          { mountId: mount.id },
          {
            mountId: mount.id,
            data: mountData,
            spellId: mountItem?.spellid || null,
            itemId: mountItem?.itemid || null,
            lastUpdated: new Date(),
          },
          { upsert: true, new: true }
        );
      });

      const batchResults = await Promise.all(batchPromises);
      updatedMounts.push(...batchResults);

      console.log(`Processed ${i + batch.length} of ${mountIndex.mounts.length} mounts`);
    }

    res.json(updatedMounts);
  } catch (error) {
    handleApiError(error, res, "fetch and store all mounts");
  }
};
