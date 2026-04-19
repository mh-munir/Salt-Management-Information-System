import mongoose from "mongoose";

const isProduction = process.env.NODE_ENV === "production";
const LOCAL_MONGO_URI = "mongodb://127.0.0.1:27017/salt-mill-system";
const MONGO_URI_ENV_KEYS = ["MONGODB_URI", "MONGO_URI", "MONGO_URL", "DATABASE_URL"] as const;
const PLACEHOLDER_URI_VALUES = new Set(["your_mongo_url", "mongodb_uri_here"]);

export const MONGO_ERROR_MESSAGE =
  "Unable to connect to MongoDB. Set a valid MongoDB connection string in environment variables and allow deployment access.";

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

function readEnv(name: string) {
  return process.env[name]?.trim();
}

function getMongoUriFromEnv() {
  for (const key of MONGO_URI_ENV_KEYS) {
    const value = readEnv(key);
    if (!value) {
      continue;
    }

    if (PLACEHOLDER_URI_VALUES.has(value.toLowerCase())) {
      continue;
    }

    return value;
  }

  return null;
}

function getMongoUriFromParts() {
  const username = readEnv("MONGODB_USERNAME");
  const password = readEnv("MONGODB_PASSWORD");
  const cluster = readEnv("MONGODB_CLUSTER");

  if (!username || !password || !cluster) {
    return null;
  }

  const protocol = readEnv("MONGODB_PROTOCOL") || "mongodb+srv";
  const databaseName = readEnv("MONGODB_DB_NAME") || "salt-mill-system";
  const options = readEnv("MONGODB_OPTIONS") || "retryWrites=true&w=majority";

  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);

  return `${protocol}://${encodedUsername}:${encodedPassword}@${cluster}/${databaseName}?${options}`;
}

function getMongoUri(): string {
  const mongoUriFromEnv = getMongoUriFromEnv();
  if (mongoUriFromEnv) {
    return mongoUriFromEnv;
  }

  const mongoUriFromParts = getMongoUriFromParts();
  if (mongoUriFromParts) {
    return mongoUriFromParts;
  }

  if (isProduction) {
    throw new Error(
      "MongoDB URI is missing in production. Set MONGODB_URI (or MONGO_URI, MONGO_URL, DATABASE_URL) in Netlify Environment Variables.",
    );
  }

  return LOCAL_MONGO_URI;
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
  const mongoUri = getMongoUri();

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
      .connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
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
