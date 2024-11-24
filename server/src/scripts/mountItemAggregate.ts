import { Db } from "mongodb";
import { getMountData, getItemEffectData, getItemXItemEffectData } from "../utils/csvParser";
import fs from "fs";
import path from "path";

const getLatestCSVVersion = (): string => {
  const csvDir = path.join(__dirname, "..", "data", "csv");
  const files = fs.readdirSync(csvDir);
  const mountFile = files.find(file => file.toLowerCase().startsWith('mount.') && file.endsWith('.csv'));
  
  if (!mountFile) {
    throw new Error('Mount CSV file not found');
  }

  // Extract version from filename (e.g., "Mount.11.0.7.57361.csv" -> "11.0.7.57361")
  const version = mountFile.split('.').slice(1, -1).join('.');
  return version;
};

export const runMountItemAggregation = async (db: Db): Promise<void> => {
  try {
    const currentVersion = getLatestCSVVersion();
    
    // Check if we already processed this version
    const existingVersion = await db.collection("mountitems").findOne(
      {}, 
      { projection: { buildversion: 1 } }
    );
    
    if (existingVersion && existingVersion.buildversion === currentVersion) {
      console.log('Mount items are up to date with CSV version:', currentVersion);
      return;
    }

    console.log('New CSV version detected:', currentVersion, 'Starting aggregation...');

    // Get data from CSVs
    const mounts = getMountData();
    const itemEffects = getItemEffectData();
    const itemXEffects = getItemXItemEffectData();

    // Filter and transform the data
    const mountItems = mounts.flatMap(mount => {
      const matchingEffect = itemEffects.find(effect => 
        effect.SpellID === mount.SourceSpellID && 
        effect.TriggerType === 6
      );

      if (!matchingEffect) {
        return [];
      }

      const matchingItemXEffect = itemXEffects.find(ix => 
        ix.ItemEffectID === matchingEffect.ID
      );

      if (!matchingItemXEffect) {
        return [];
      }

      return [{
        mountid: mount.ID,
        spellid: mount.SourceSpellID,
        itemid: matchingItemXEffect.ItemID,
        buildversion: currentVersion,
        lastupdated: new Date()
      }];
    });

    // Insert the processed data into MongoDB
    if (mountItems.length > 0) {
      await db.collection("mountitems").deleteMany({});
      await db.collection("mountitems").insertMany(mountItems);
      console.log(`Aggregation completed. Processed ${mountItems.length} mount items for version ${currentVersion}`);
    }

  } catch (error) {
    console.error("Error in mount items aggregation:", error);
    throw error;
  }
};

// For direct script execution
if (require.main === module) {
  const { MongoClient } = require("mongodb");
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/yourdb";
  
  MongoClient.connect(uri)
    .then(async (client: any) => {
      const db = client.db();
      await runMountItemAggregation(db);
      await client.close();
    })
    .catch((error: Error) => {
      console.error("Error:", error);
      process.exit(1);
    });
}
