import { db } from "./database";
import type {
  Brand,
  Campaign,
  Application,
  Invitation,
  Conversation,
} from "../../lib/mark/marketplace/models";
export type RecordDoc<T> = { _id: string; data: T };
export const brands = db.collection<RecordDoc<Brand>>("brands"),
  campaigns = db.collection<RecordDoc<Campaign>>("campaigns"),
  applications = db.collection<RecordDoc<Application>>("applications"),
  invitations = db.collection<RecordDoc<Invitation>>("invitations"),
  conversations = db.collection<RecordDoc<Conversation>>("conversations");
export const preferences = db.collection<{
  _id: string;
  savedCreators: string[];
  savedCampaigns: string[];
  savedGroups: Record<string, string>;
}>("preferences");
export const activity = db.collection<{
  _id: string;
  brandId: string;
  text: string;
  time: string;
}>("activity");
export async function marketIndexes() {
  await brands.createIndex(
    { "data.username": 1 },
    { unique: true, partialFilterExpression: { "data.username": { $gt: "" } } },
  );
  await campaigns.createIndex({ "data.brandId": 1, "data.status": 1 });
  await campaigns.createIndex({ "data.status": 1, "data.createdAt": -1 });
  await applications.createIndex(
    { "data.campaignId": 1, "data.creatorId": 1 },
    {
      unique: true,
      partialFilterExpression: {
        "data.status": {
          $in: ["Pending", "Shortlisted", "Accepted", "Rejected"],
        },
      },
    },
  );
  await applications.createIndex({ "data.creatorId": 1 });
  await invitations.createIndex(
    { "data.campaignId": 1, "data.creatorId": 1 },
    {
      unique: true,
      partialFilterExpression: {
        "data.status": { $in: ["Pending", "Accepted"] },
      },
    },
  );
  await conversations.createIndex(
    { "data.brandId": 1, "data.creatorId": 1, "data.campaignId": 1 },
    { unique: true },
  );
}
