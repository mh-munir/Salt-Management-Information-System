import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, type MongoClientOptions } from "mongodb";
import mongoose from "mongoose";

const LOCAL_MONGO_URI = "mongodb://127.0.0.1:27017/salt-mill-system";
const mongoUri = process.env.MONGODB_URI?.trim() || LOCAL_MONGO_URI;

const options: MongoClientOptions = {
  appName: "devrel.vercel.integration",
  maxIdleTimeMS: 5000,
};

const client = new MongoClient(mongoUri, options);

// Attach the client to ensure proper cleanup on function suspension.
attachDatabasePool(client);

let hasAttachedMongooseDatabasePool = false;

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

// Export a module-scoped MongoClient to ensure the client can be shared across functions.
export default client;
