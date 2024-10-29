import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import Mount from "../models/Mounts";
import { handleApiError } from "../utils/errorHandler";

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
    const data = await BattleNetAPI.makeRequest(`/data/wow/mount/${mountId}`);
    res.json(data);
  } catch (error) {
    handleApiError(error, res, `fetch mount ${req.params.mountId}`);
  }
};

export const getAllMounts = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Starting getAllMounts request...");

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const storedMounts = await Mount.find(
      { lastUpdated: { $gt: oneDayAgo } },
      { _id: 0, __v: 0 }
    ).sort({ mountId: 1 });

    console.log(`Found ${storedMounts.length} mounts in cache`);

    if (storedMounts.length > 0) {
      console.log("Returning cached mounts data");
      res.json(storedMounts);
      return;
    }

    console.log("Cache empty or expired, fetching from Blizzard API...");
    const mountIndex = await BattleNetAPI.makeRequest<MountIndex>(
      "/data/wow/mount/index",
      {
        namespace: "static-eu",
        locale: "en_US",
      },
      "static"
    );
    console.log(`Found ${mountIndex.mounts.length} mounts in index`);

    const updatedMounts = [];
    console.log("Starting to fetch individual mount details...");

    for (const mount of mountIndex.mounts) {
      console.log(`Fetching details for mount ID: ${mount.id}`);
      const mountData = await BattleNetAPI.makeRequest<MountData>(
        `/data/wow/mount/${mount.id}`,
        {
          namespace: "static-eu",
          locale: "en_US",
        },
        "static"
      );

      console.log(`Updating mount in database: ${mountData.name.en_US}`);
      const updatedMount = await Mount.findOneAndUpdate(
        { mountId: mount.id },
        {
          mountId: mount.id,
          data: mountData,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
      updatedMounts.push(updatedMount);
    }

    console.log(`Successfully updated ${updatedMounts.length} mounts`);
    res.json(updatedMounts);
  } catch (error) {
    console.error("Error in getAllMounts:", error);
    handleApiError(error, res, "fetch and store all mounts");
  }
};
