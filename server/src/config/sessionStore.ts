import MongoStore from "connect-mongo";
import { Store } from "express-session";
import { MongoClientOptions } from 'mongodb';

interface SessionData {
  cookie: any;
  [key: string]: any;
}

let store: Store | null = null;

export const initializeStore = (mongoUri: string): Store => {
  if (!store) {
    const mongoOptions: MongoClientOptions = {
      retryWrites: true,
      w: 'majority'
    };

    store = MongoStore.create({
      mongoUrl: mongoUri,
      ttl: 30 * 24 * 60 * 60, // 30 days
      touchAfter: 24 * 3600, // 24 hours
      collectionName: 'sessions',
      autoRemove: 'native',
      stringify: false,
      mongoOptions,
      serialize: (session: SessionData) => {
        if (typeof session === 'string') {
          return session;
        }
        return JSON.stringify(session);
      },
      unserialize: (session: string) => {
        try {
          return JSON.parse(session);
        } catch (e) {
          console.error('Session parse error:', e);
          return { cookie: {} };
        }
      }
    });

    console.log('Session store initialized with configuration:', {
      ttl: '30 days',
      touchAfter: '24 hours',
      collection: 'sessions',
      stringify: false
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
