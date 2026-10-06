import { db } from "./database";
export interface Notification {
  _id: string;
  userId: string;
  type: "application" | "invitation" | "message";
  message: string;
  href: string;
  createdAt: string;
  readAt: string | null;
}
export const notifications = db.collection<Notification>("notifications");
export async function notificationIndexes() {
  await notifications.createIndex({ userId: 1, createdAt: -1 });
}
