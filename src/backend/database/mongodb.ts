import { Db, MongoClient } from 'mongodb';

declare global {
  var __boardingHouseMongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoConfig() {
  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DB;

  if (!uri) throw new Error('MONGODB_URI chưa được cấu hình.');
  if (!databaseName) throw new Error('MONGODB_DB chưa được cấu hình.');

  return { uri, databaseName };
}

export function getMongoClient() {
  if (!globalThis.__boardingHouseMongoClientPromise) {
    const { uri } = getMongoConfig();
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    globalThis.__boardingHouseMongoClientPromise = client.connect();
  }

  return globalThis.__boardingHouseMongoClientPromise;
}

export async function getDatabase(): Promise<Db> {
  const { databaseName } = getMongoConfig();
  const client = await getMongoClient();
  return client.db(databaseName);
}
