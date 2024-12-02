import MongoStore from "connect-mongo";
import { Store } from "express-session";
import { MongoClientOptions } from 'mongodb';

interface SessionData {
  cookie: any;
  [key: string]: any;
}

export interface StoredSession extends SessionData {
  oauthState?: string;
  frontendCallback?: string;
  accessToken?: string;
  refreshToken?: string;
  isPersistent?: boolean;
  consent?: boolean;
  storageType?: string;
}

// Define a custom store interface that includes the 'all' method
export interface CustomStore extends Store {
  all: (callback: (err: any, sessions: any[]) => void) => void;
}

let store: CustomStore | null = null;

export const initializeStore = (mongoUri: string): CustomStore => {
  if (!store) {
    const mongoOptions: MongoClientOptions = {
      retryWrites: true,
      w: 'majority',
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: true
    };

    store = MongoStore.create({
      mongoUrl: mongoUri,
      ttl: 30 * 24 * 60 * 60, // 30 days
      touchAfter: 24 * 60 * 60, // 24 hours
      collectionName: 'sessions',
      autoRemove: 'native',
      crypto: {
        secret: false
      },
      stringify: false,
      mongoOptions,
      dbName: "wow_character_viewer",
      serialize: (session: SessionData) => {
        return {
          ...session,
          _id: session.id || session._id
        };
      }
    }) as CustomStore;

    store.on('error', (error) => {
      console.error('Session store error:', error);
    });

    store.on('create', (sessionId) => {
      console.log('Session created:', sessionId);
    });

    store.on('touch', (sessionId) => {
      console.log('Session touched:', sessionId);
    });

    store.on('destroy', (sessionId) => {
      console.log('Session destroyed:', sessionId);
    });
  }
  return store;
};

export const getStore = (): CustomStore => {
  if (!store) {
    throw new Error("Store not initialized");
  }
  return store;
};
