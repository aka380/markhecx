import { MongoClient } from "mongodb";
import { config } from "../config/env";
export const client = new MongoClient(config.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 20,
});
export const db = client.db(config.MONGODB_DATABASE);
export async function connectDatabase() {
  await client.connect();
  await db.command({ ping: 1 });
  const topology = await db.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== "isdbgrid")
    throw Error(
      "MarkHECX requires a MongoDB replica set for transactional collaboration records.",
    );
}
