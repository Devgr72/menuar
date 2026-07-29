import mongoose from 'mongoose';
import type { Db, MongoClient } from 'mongodb';

const IS_DEV = process.env.NODE_ENV !== 'production';

function log(step: string, data?: unknown) {
  if (IS_DEV) console.log(`\x1b[36m[db]\x1b[0m ${step}`, data !== undefined ? data : '');
}

let connected = false;

/** Connects Mongoose to MongoDB Atlas. Safe to call multiple times — connects once. */
export async function connectDB(): Promise<void> {
  if (connected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set — cannot connect to MongoDB Atlas');
  }

  mongoose.connection.on('connected', () => log('Connected', mongoose.connection.name));
  mongoose.connection.on('error', (err) => console.error('\x1b[31m[db]\x1b[0m ✗ Connection error', err));
  mongoose.connection.on('disconnected', () => log('Disconnected'));

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || 'menuar',
  });

  connected = true;
}

/**
 * Returns the native MongoDB driver's Db + MongoClient handles from the
 * existing Mongoose connection, so better-auth's mongodbAdapter can share
 * the same connection instead of opening a second one to Atlas.
 */
export function getNativeDb(): { db: Db; client: MongoClient } {
  const client = mongoose.connection.getClient() as unknown as MongoClient;
  const db = client.db(process.env.MONGODB_DB_NAME || 'menuar');
  return { db, client };
}

export async function disconnectDB(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}
