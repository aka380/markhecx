import { rateLimitIndexes } from "./middleware/rate-store";
import { createApp } from './app';
import { connectDatabase } from './models/database';
import { authIndexes } from './models/auth';
import { creatorIndexes } from './models/creators';
import { marketIndexes } from './models/marketplace';
import { memoryIndexes } from './models/memory';
import { notificationIndexes } from './models/notifications';

let initialization: Promise<ReturnType<typeof createApp>> | undefined;
/** One pool and one index initialization per warm serverless instance. */
export function getServer() {
  return initialization ??= (async () => {
    await connectDatabase();
    await Promise.all([rateLimitIndexes(), authIndexes(), creatorIndexes(), marketIndexes(), memoryIndexes(), notificationIndexes()]);
    const app = createApp();
    app.set("trust proxy", 1);
    return app;
  })().catch(error => { initialization = undefined; throw error; });
}
