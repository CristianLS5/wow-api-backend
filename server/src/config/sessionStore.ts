import MongoStore from "connect-mongo";
import { Store } from "express-session";

let store: Store | null = null;

export const initializeStore = (mongoUri: string): Store => {
  if (!store) {
    store = MongoStore.create({
      mongoUrl: mongoUri,
      ttl: 30 * 24 * 60 * 60, // 30 days
      touchAfter: 24 * 3600, // 24 hours
      collectionName: 'sessions',
      autoRemove: 'native',
      stringify: false
    });

    console.log('Session store initialized with configuration:', {
      ttl: '30 days',
      touchAfter: '24 hours',
      collection: 'sessions'
    });
  }
  return store;
};

export const getStore = (): Store => {
  if (!store) {
    throw new Error("Store not initialized");
  }
  return store;
};
