import MongoStore from "connect-mongo";
import { Store } from "express-session";
import { SECRETS } from './config';

let store: Store | null = null;

export const initializeStore = (mongoUri: string): Store => {
  if (!store) {
    store = MongoStore.create({
      mongoUrl: mongoUri,
      ttl: 30 * 24 * 60 * 60, // 30 days
      touchAfter: 24 * 3600, // 24 hours
      crypto: {
        secret: SECRETS.SESSION.SECRET
      }
    });

    console.log('Session store initialized');
  }
  return store;
};

export const getStore = (): Store => {
  if (!store) {
    throw new Error("Store not initialized");
  }
  return store;
};
