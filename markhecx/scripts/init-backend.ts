import { connectDatabase, client } from "../server/models/database";
import { authIndexes } from "../server/models/auth";
import { creatorIndexes } from "../server/models/creators";
import { marketIndexes } from "../server/models/marketplace";
import { notificationIndexes } from "../server/models/notifications";
import { memoryIndexes } from "../server/models/memory";
try {
  await connectDatabase();
  await authIndexes();
  await creatorIndexes();
  await marketIndexes();
  await notificationIndexes();
  await memoryIndexes();
  console.log(
    "MarkHECX database and indexes ready. No sample records inserted.",
  );
} finally {
  await client.close();
}
