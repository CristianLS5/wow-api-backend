import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function dropCollections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    // Get all collection names
    const collections = await db.listCollections().toArray();
    console.log(
      "Existing collections:",
      collections.map((c) => c.name)
    );

    for (const collection of collections) {
      try {
        await db.dropCollection(collection.name);
        console.log(`Dropped collection: ${collection.name}`);
      } catch (error) {
        console.error(`Error dropping collection ${collection.name}:`, error);
      }
    }

    console.log("All collections have been dropped");
  } catch (error) {
    console.error("Error dropping collections:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

dropCollections();
