import { attachDatabasePool } from "@vercel/functions";
import mongoose from "mongoose";

let hasAttachedDatabasePool = false;

export function attachMongooseDatabasePool() {
  if (hasAttachedDatabasePool || mongoose.connection.readyState !== 1) {
    return;
  }

  attachDatabasePool(mongoose.connection.getClient());
  hasAttachedDatabasePool = true;
}

export function resetMongooseDatabasePoolAttachment() {
  hasAttachedDatabasePool = false;
}
