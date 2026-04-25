import mongoose from "mongoose";
import { attachMongooseDatabasePool, resetMongooseDatabasePoolAttachment } from "@/lib/mongodb";

const isProduction = process.env.NODE_ENV === "production";
const envMongoUri = process.env.MONGODB_URI?.trim();
const hasConfiguredMongoUri = Boolean(envMongoUri && envMongoUri !== "your_mongo_url");
const LOCAL_MONGO_URI = "mongodb://127.0.0.1:27017/salt-mill-system";
const parsedMaxPoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE ?? 25);
const parsedMinPoolSize = Number(process.env.MONGODB_MIN_POOL_SIZE ?? 0);
const parsedConnectTimeoutMs = Number(process.env.MONGODB_CONNECT_TIMEOUT_MS ?? 10000);
const parsedServerSelectionTimeoutMs = Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 10000);
const parsedSocketTimeoutMs = Number(process.env.MONGODB_SOCKET_TIMEOUT_MS ?? 45000);
const parsedHeartbeatFrequencyMs = Number(process.env.MONGODB_HEARTBEAT_FREQUENCY_MS ?? 10000);
const MONGODB_MAX_POOL_SIZE = Number.isFinite(parsedMaxPoolSize)
  ? Math.min(100, Math.max(5, Math.floor(parsedMaxPoolSize)))
  : 25;
const MONGODB_MIN_POOL_SIZE = Number.isFinite(parsedMinPoolSize)
  ? Math.min(MONGODB_MAX_POOL_SIZE, Math.max(0, Math.floor(parsedMinPoolSize)))
  : 0;
const MONGODB_CONNECT_TIMEOUT_MS = Number.isFinite(parsedConnectTimeoutMs)
  ? Math.min(30000, Math.max(5000, Math.floor(parsedConnectTimeoutMs)))
  : 10000;
const MONGODB_SERVER_SELECTION_TIMEOUT_MS = Number.isFinite(parsedServerSelectionTimeoutMs)
  ? Math.min(30000, Math.max(5000, Math.floor(parsedServerSelectionTimeoutMs)))
  : 10000;
const MONGODB_SOCKET_TIMEOUT_MS = Number.isFinite(parsedSocketTimeoutMs)
  ? Math.min(120000, Math.max(10000, Math.floor(parsedSocketTimeoutMs)))
  : 45000;
const MONGODB_HEARTBEAT_FREQUENCY_MS = Number.isFinite(parsedHeartbeatFrequencyMs)
  ? Math.min(30000, Math.max(5000, Math.floor(parsedHeartbeatFrequencyMs)))
  : 10000;
export const MONGO_ERROR_MESSAGE =
  "Unable to connect to MongoDB. Set a valid MONGODB_URI and allow your deployment to reach MongoDB Atlas.";

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

function getMongoUri(): string {
  if (isProduction && !hasConfiguredMongoUri) {
    throw new Error(
      "MONGODB_URI is missing in production. Add it in your Vercel project's Settings -> Environment Variables.",
    );
  }

  return envMongoUri ?? LOCAL_MONGO_URI;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openMongoConnection(mongoUri: string) {
  const MAX_CONNECT_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt += 1) {
    try {
      return await mongoose.connect(mongoUri, {
        maxPoolSize: MONGODB_MAX_POOL_SIZE,
        minPoolSize: MONGODB_MIN_POOL_SIZE,
        maxIdleTimeMS: 45_000,
        connectTimeoutMS: MONGODB_CONNECT_TIMEOUT_MS,
        serverSelectionTimeoutMS: MONGODB_SERVER_SELECTION_TIMEOUT_MS,
        socketTimeoutMS: MONGODB_SOCKET_TIMEOUT_MS,
        heartbeatFrequencyMS: MONGODB_HEARTBEAT_FREQUENCY_MS,
      });
    } catch (error) {
      await mongoose.disconnect().catch(() => undefined);

      if (attempt === MAX_CONNECT_ATTEMPTS || !isMongoConnectionError(error)) {
        throw error;
      }

      logMongoConnectionFailure(error);
      await sleep(750);
    }
  }

  throw new Error(MONGO_ERROR_MESSAGE);
}

export async function connectDB() {
  const FAILURE_COOLDOWN_MS = 2_000;
  const mongoUri = getMongoUri();

  if (mongoose.connection.readyState === 1) {
    attachMongooseDatabasePool();
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
    mongooseCache.promise = openMongoConnection(mongoUri)
      .then((instance) => {
        attachMongooseDatabasePool();
        mongooseCache.conn = instance;
        mongooseCache.lastFailureAt = 0;
        return instance;
      })
      .catch(async (error) => {
        mongooseCache.promise = null;
        mongooseCache.conn = null;
        mongooseCache.lastFailureAt = Date.now();
        resetMongooseDatabasePoolAttachment();
        logMongoConnectionFailure(error);
        await mongoose.disconnect().catch(() => undefined);
        throw new Error(MONGO_ERROR_MESSAGE);
      });
  }

  return mongooseCache.promise;
}
