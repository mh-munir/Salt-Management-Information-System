import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, type MongoClientOptions } from "mongodb";
import mongoose from "mongoose";

const LOCAL_MONGO_URI = "mongodb://127.0.0.1:27017/salt-mill-system";
const mongoUri = process.env.MONGODB_URI?.trim() || LOCAL_MONGO_URI;

const options: MongoClientOptions = {
  appName: "devrel.vercel.integration",
  maxIdleTimeMS: 5000,
};

let hasAttachedMongooseDatabasePool = false;
let mongoClient: MongoClient | null = null;

export function getMongoClient() {
  if (!mongoClient) {
    mongoClient = new MongoClient(mongoUri, options);
    attachDatabasePool(mongoClient);
  }

  return mongoClient;
}

export function attachMongooseDatabasePool() {
  if (hasAttachedMongooseDatabasePool || mongoose.connection.readyState !== 1) {
    return;
  }

  attachDatabasePool(mongoose.connection.getClient());
  hasAttachedMongooseDatabasePool = true;
}

export function resetMongooseDatabasePoolAttachment() {
  hasAttachedMongooseDatabasePool = false;
}
