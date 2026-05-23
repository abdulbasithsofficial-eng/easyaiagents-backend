import { MongoClient } from 'mongodb';

let cached = global.mongo;
if (!cached) cached = global.mongo = { conn: null, promise: null };

export async function getDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = MongoClient.connect(process.env.MONGODB_URI).then(c => c);
  }
  cached.conn = await cached.promise;
  return cached.conn.db('easyaiagents');
}