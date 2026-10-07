import type { Store, Options } from 'express-rate-limit';
import { db } from '../models/database';
import { config } from '../config/env';
import { createHash } from 'node:crypto';

const counters = db.collection<{ _id: string; hits: number; expiresAt: Date }>('rate_limits');
export async function rateLimitIndexes() {
  await counters.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
/** Atomic fixed-window counters shared by all Vercel instances. */
export class MongoRateStore implements Store {
  localKeys = false;
  private windowMs = 60000;
  constructor(public prefix: string) {}
  init(options: Options) { this.windowMs = options.windowMs; }
  private bucket(key: string) {
    const window = Math.floor(Date.now() / this.windowMs);
    return { id: `${this.prefix}:${window}:${createHash('sha256').update(key).digest('hex')}`, resetTime: new Date((window + 1) * this.windowMs) };
  }
  async increment(key: string) {
    const { id, resetTime } = this.bucket(key);
    const row = await counters.findOneAndUpdate({ _id: id }, {
      $inc: { hits: 1 }, $setOnInsert: { expiresAt: resetTime },
    }, { upsert: true, returnDocument: 'after' });
    return { totalHits: row!.hits, resetTime };
  }
  async decrement(key: string) {
    await counters.updateOne({ _id: this.bucket(key).id, hits: { $gt: 0 } }, { $inc: { hits: -1 } });
  }
  async resetKey(key: string) { await counters.deleteOne({ _id: this.bucket(key).id }); }
}
export const productionRateStore = (prefix: string) => config.NODE_ENV === 'production' ? new MongoRateStore(prefix) : undefined;
