import session, { SessionOptions } from 'express-session';
import { Application } from 'express';
import { initializeStore } from './sessionStore';
import { SECRETS } from './config';

export const initializeSession = (app: Application): void => {
  // Initialize store first
  const store = initializeStore(SECRETS.MONGODB.URI);

  // Then use it in session configuration
  const sessionConfig: SessionOptions = {
    secret: SECRETS.SESSION.SECRET,
    resave: true,
    saveUninitialized: true,
    name: 'wcv.sid',
    store,
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

  app.use(session(sessionConfig));
  console.log('Session middleware initialized');
};
