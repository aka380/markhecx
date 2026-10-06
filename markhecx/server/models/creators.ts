import { db } from "./database";
import type { AppState } from "../../lib/mark/store";
export interface CreatorDocument {
  _id: string;
  revision: number;
  state: AppState;
  updatedAt: Date;
}
export const creatorDocuments = db.collection<CreatorDocument>("creators");
export async function creatorIndexes() {
  await creatorDocuments.createIndex(
    { "state.profile.username": 1 },
    {
      unique: true,
      partialFilterExpression: { "state.profile.username": { $gt: "" } },
    },
  );
  await creatorDocuments.createIndex(
    { "state.publication.profile.username": 1 },
    {
      unique: true,
      partialFilterExpression: {
        "state.publication.profile.username": { $type: "string" },
      },
    },
  );
  await creatorDocuments.createIndex({
    "state.publication.portfolio.visibility": 1,
  });
}
