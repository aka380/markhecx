import { db } from "./database";
export interface Memory {
  _id: string;
  userId: string;
  key: "goal" | "preferredPlatform" | "communicationStyle";
  value: string;
  source: "user";
  createdAt: Date;
  updatedAt: Date;
}
export const memories = db.collection<Memory>("hecx_memory");
export async function memoryIndexes() {
  await memories.createIndex({ userId: 1, key: 1 }, { unique: true });
}
