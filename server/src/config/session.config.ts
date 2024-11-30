import session, { SessionOptions } from 'express-session';
import MongoStore from 'connect-mongo';
import { Application } from 'express';
import { config } from './config';

export const sessionConfig: SessionOptions = {
  secret: config.sessionSecret,
  resave: true,
  saveUninitialized: true,
  name: 'wcv.sid',
  store: MongoStore.create({
    mongoUrl: config.mongoUri,
    ttl: 30 * 24 * 60 * 60, // 30 days
    touchAfter: 24 * 3600 // 24 hours
  }),
  proxy: true,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
    domain: '.wowcharacterviewer.com',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000
  }
};

export const initializeSession = (app: Application): void => {
  app.use(session(sessionConfig));
};
