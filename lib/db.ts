import mongoose from "mongoose";

const envMongoUri = process.env.MONGODB_URI?.trim();
const MONGO_URI =
  envMongoUri && envMongoUri !== "your_mongo_url"
    ? envMongoUri
    : "mongodb://127.0.0.1:27017/salt-mill-system";
export const MONGO_ERROR_MESSAGE =
  "Unable to connect to MongoDB. Start MongoDB locally or set MONGODB_URI to a valid database.";

const MONGO_CONNECTION_ERROR_PATTERN =
  /(unable to connect to mongodb|mongodb|mongo|server selection|ssl|tls|certificate|socket|econnreset|enotfound|etimedout|alert number 80)/i;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  lastLoggedErrorAt: number;
  lastFailureAt: number;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const mongooseCache = globalForMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
  lastLoggedErrorAt: 0,
  lastFailureAt: 0,
};

globalForMongoose.mongooseCache = mongooseCache;

mongoose.set("bufferCommands", false);

export function isMongoConnectionError(error: unknown) {
  if (error instanceof Error) {
    const details = [
      error.name,
      error.message,
      error.stack,
      typeof error.cause === "object" && error.cause instanceof Error
        ? `${error.cause.name} ${error.cause.message} ${error.cause.stack ?? ""}`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    return error.message === MONGO_ERROR_MESSAGE || MONGO_CONNECTION_ERROR_PATTERN.test(details);
  }

  if (typeof error === "string") {
    return MONGO_CONNECTION_ERROR_PATTERN.test(error);
  }

  return false;
}

export function isValidMongoObjectId(value: string | undefined | null) {
  return Boolean(value) && mongoose.isValidObjectId(value);
}

function logMongoConnectionFailure(error: unknown) {
  const now = Date.now();
  const LOG_COOLDOWN_MS = 30_000;

  if (now - mongooseCache.lastLoggedErrorAt < LOG_COOLDOWN_MS) {
    return;
  }

  mongooseCache.lastLoggedErrorAt = now;

  const reason =
    error instanceof Error && error.message
      ? error.message.split("\n")[0]
      : "Unknown MongoDB connection error";

  console.warn(`MongoDB connection failed: ${reason}`);
}

export async function connectDB() {
  const FAILURE_COOLDOWN_MS = 15_000;

  if (mongoose.connection.readyState === 1) {
    mongooseCache.conn = mongoose;
    mongooseCache.lastFailureAt = 0;
    return mongoose;
  }

  if (
    mongoose.connection.readyState !== 2 &&
    mongooseCache.lastFailureAt &&
    Date.now() - mongooseCache.lastFailureAt < FAILURE_COOLDOWN_MS
  ) {
    throw new Error(MONGO_ERROR_MESSAGE);
  }

  if (!mongooseCache.promise) {
    mongooseCache.promise = mongoose
      .connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      })
      .then((instance) => {
        mongooseCache.conn = instance;
        mongooseCache.lastFailureAt = 0;
        return instance;
      })
      .catch(async (error) => {
        mongooseCache.promise = null;
        mongooseCache.conn = null;
        mongooseCache.lastFailureAt = Date.now();
        logMongoConnectionFailure(error);
        await mongoose.disconnect().catch(() => undefined);
        throw new Error(MONGO_ERROR_MESSAGE);
      });
  }

  return mongooseCache.promise;
}
