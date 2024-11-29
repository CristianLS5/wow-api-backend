import MongoStore from "connect-mongo";
import { Store } from "express-session";

let store: Store;

export const initializeStore = (mongoUri: string): Store => {
  store = MongoStore.create({
    mongoUrl: mongoUri,
    ttl: 30 * 24 * 60 * 60, // 30 days in seconds
    collectionName: "sessions",
    dbName: "wow_character_viewer",
  });
  return store;
};

export const getStore = (): Store => {
  if (!store) {
    throw new Error("Store not initialized");
  }
  return store;
};
