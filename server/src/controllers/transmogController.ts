import { Request, Response } from "express";
import BattleNetAPI from "../services/BattleNetAPI";
import { handleApiError } from "../utils/errorHandler";
import TransmogSet from "../models/Transmogs";
import winston from "winston";

// Simplified logger configuration - console only
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

interface TransmogSet {
  key: {
    href: string;
  };
  name: string;
  id: number;
}

interface TransmogSetIndex {
  appearance_sets: TransmogSet[];
}

interface TransmogSetDetail {
  id: number;
  set_name: string;
  appearances: Array<{
    id: number;
  }>;
}

interface AppearanceDetail {
  id: number;
  slot: {
    type: string;
    name: string;
  };
  items: Array<{
    name: string;
    id: number;
  }>;
  media: {
    id: number;
  };
}

interface ItemMedia {
  assets: Array<{
    key: string;
    value: string;
  }>;
}

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function for API requests with retry logic
async function makeRequestWithRetry<T>(
  url: string,
  params: object,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  try {
    return await BattleNetAPI.makeRequest<T>(url, params, "static");
  } catch (error: any) {
    if (error?.response?.status === 429 && retries > 0) {
      console.log(`Rate limited, retrying after ${delayMs}ms...`);
      await delay(delayMs);
      return makeRequestWithRetry<T>(url, params, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

export const getTransmogSets = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const startTime = Date.now();
  logger.info("Starting transmog sets fetch process");

  try {
    // 1. Get API index to compare with database
    logger.info("Fetching transmog set index from API");
    const setIndex = await makeRequestWithRetry<TransmogSetIndex>(
      "/data/wow/item-appearance/set/index",
      {
        namespace: "static-eu",
        locale: "en_US",
      }
    );

    // 2. Get existing setIds from database
    logger.info("Checking existing transmog sets in database");
    const existingSets = await TransmogSet.distinct('setId');
    
    // 3. Find missing setIds
    const missingSetIds = setIndex.appearance_sets
      .map(set => set.id)
      .filter(id => !existingSets.includes(id));

    logger.info({
      message: "Database comparison completed",
      totalSets: setIndex.appearance_sets.length,
      existingSets: existingSets.length,
      missingSets: missingSetIds.length
    });

    // 4. If there are missing sets, process them
    if (missingSetIds.length > 0) {
      logger.info(`Starting sync for ${missingSetIds.length} missing transmog sets`);
      
      const BATCH_SIZE = 10;
      let processedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < missingSetIds.length; i += BATCH_SIZE) {
        const batch = missingSetIds.slice(i, i + BATCH_SIZE);
        logger.debug(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(missingSetIds.length / BATCH_SIZE)}`);
        
        const batchPromises = batch.map(async (setId) => {
          try {
            logger.debug(`Processing set ID: ${setId}`);
            
            // Fetch set details
            const setDetails = await makeRequestWithRetry<TransmogSetDetail>(
              `/data/wow/item-appearance/set/${setId}`,
              {
                namespace: "static-eu",
                locale: "en_US",
              }
            );

            const appearances = [];
            logger.debug(`Processing ${setDetails.appearances.length} appearances for set ${setId}`);

            for (const appearance of setDetails.appearances) {
              await delay(100);

              const appearanceDetails = await makeRequestWithRetry<AppearanceDetail>(
                `/data/wow/item-appearance/${appearance.id}`,
                {
                  namespace: "static-eu",
                  locale: "en_US",
                }
              );

              if (appearanceDetails.items?.[0]) {
                const itemMedia = await makeRequestWithRetry<ItemMedia>(
                  `/data/wow/media/item/${appearanceDetails.items[0].id}`,
                  {
                    namespace: "static-eu",
                    locale: "en_US",
                  }
                );

                appearances.push({
                  id: appearanceDetails.id,
                  slot: appearanceDetails.slot,
                  item: {
                    id: appearanceDetails.items[0].id,
                    name: appearanceDetails.items[0].name,
                  },
                  icon: itemMedia.assets.find(asset => asset.key === "icon")?.value,
                });
              }
            }

            // Save to database
            await TransmogSet.findOneAndUpdate(
              { setId: setDetails.id },
              {
                setId: setDetails.id,
                name: setDetails.set_name,
                appearances,
                lastUpdated: new Date()
              },
              { upsert: true }
            );

            processedCount++;
            logger.debug(`Successfully processed and saved set ${setId}`);

          } catch (error) {
            errorCount++;
            logger.error(`Error processing set ${setId}:`, error);
          }
        });

        await Promise.all(batchPromises);
        
        if (i + BATCH_SIZE < missingSetIds.length) {
          await delay(1000);
        }

        logger.info({
          message: "Batch processing status",
          processedSets: processedCount,
          totalMissingSets: missingSetIds.length,
          errorCount,
          progress: `${((processedCount / missingSetIds.length) * 100).toFixed(2)}%`
        });
      }

      logger.info({
        message: "Sync completed",
        addedSets: processedCount,
        errorCount,
        duration: `${((Date.now() - startTime) / 1000).toFixed(2)} seconds`
      });
    }

    // 5. Finally, return all transmog sets from database
    logger.info("Fetching all transmog sets from database");
    const allTransmogSets = await TransmogSet.find().lean();
    
    const endTime = Date.now();
    logger.info({
      message: "Request completed",
      totalSets: allTransmogSets.length,
      duration: `${((endTime - startTime) / 1000).toFixed(2)} seconds`
    });

    res.json(allTransmogSets);

  } catch (error) {
    logger.error("Error in getTransmogSets:", error);
    handleApiError(error, res, "fetch transmog sets");
  }
};

// Optional: Add a force refresh endpoint
export const forceRefreshTransmogSets = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const startTime = Date.now();
  logger.info("Starting force refresh of transmog sets");

  try {
    // Clear existing data
    logger.info("Clearing existing transmog sets from database");
    await TransmogSet.deleteMany({});
    
    // Call getTransmogSets to repopulate
    logger.info("Starting repopulation of transmog sets");
    await getTransmogSets(_req, res);

    const endTime = Date.now();
    logger.info({
      message: "Force refresh completed",
      duration: `${((endTime - startTime) / 1000).toFixed(2)} seconds`
    });

  } catch (error) {
    logger.error("Error in forceRefreshTransmogSets:", error);
    handleApiError(error, res, "force refresh transmog sets");
  }
}; 