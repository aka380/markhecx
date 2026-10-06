import { memoryIndexes } from "./models/memory";
import { notificationIndexes } from "./models/notifications";
import { marketIndexes } from "./models/marketplace";
import { creatorIndexes } from "./models/creators";
import { authIndexes } from "./models/auth";
import { createApp } from "./app";
import { connectDatabase, client } from "./models/database";
import { config } from "./config/env";
await connectDatabase();
await authIndexes();
await memoryIndexes();
await creatorIndexes();
await marketIndexes();
await notificationIndexes();
const server = createApp().listen(config.API_PORT, config.API_HOST, () =>
  console.log(
    `MarkHECX API listening on ${config.API_HOST}:${config.API_PORT}`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () =>
    server.close(() => {
      void client.close().finally(() => process.exit(0));
    }),
  );
}
