import session from "express-session";
import MongoDBStore from "connect-mongodb-session";

const MongoDBStoreSession = MongoDBStore(session);

const store = new MongoDBStoreSession({
  uri: process.env.MONGODB_URI!,
  collection: "sessions",
  expires: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  databaseName: "wow_character_viewer",
});

store.on("error", function (error: Error) {
  console.error("Session store error:", error);
});

export default store;
