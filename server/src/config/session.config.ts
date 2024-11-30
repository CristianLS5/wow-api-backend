import session, { SessionOptions } from 'express-session';
import MongoStore from 'connect-mongo';
import { Application } from 'express';
import { config } from './config';

export const sessionConfig: SessionOptions = {
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'wcv.sid',
  store: MongoStore.create({
    mongoUrl: config.mongoUri,
    ttl: 30 * 24 * 60 * 60, // 30 days
    touchAfter: 24 * 3600 // 24 hours
  }),
  cookie: {
    secure: config.isProduction,
    httpOnly: true,
    sameSite: config.isProduction ? 'strict' : 'lax' as const,
    domain: config.cookieDomain,
    path: '/',
    maxAge: undefined // Will be set based on persistence choice
  }
};

export const initializeSession = (app: Application): void => {
  app.use(session(sessionConfig));
};
