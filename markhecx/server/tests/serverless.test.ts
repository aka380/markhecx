import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../pages/api/v1/[...path]';
import { productionConfiguration } from '../runtime-config';
import { client, db } from '../models/database';
import { users, sessions } from '../models/auth';
import { creatorDocuments } from '../models/creators';
import { MongoRateStore, rateLimitIndexes } from '../middleware/rate-store';

test('production requires remote storage and uses only HTTPS origins', () => {
  assert.equal(productionConfiguration({ NODE_ENV: 'production', MONGODB_URI: 'mongodb+srv://cluster.example/db' }).ready, true);
  for (const MONGODB_URI of ['', 'mongodb://127.0.0.1:27017', 'mongodb://localhost:27017'])
    assert.equal(productionConfiguration({ NODE_ENV: 'production', MONGODB_URI, WEB_ORIGINS: 'https://example.com' }).ready, false);
  assert.equal(productionConfiguration({ NODE_ENV: 'production', MONGODB_URI: 'mongodb+srv://cluster.example/db', WEB_ORIGINS: 'https://example.com' }).ready, true);
  assert.equal(productionConfiguration({ NODE_ENV: 'production', MONGODB_URI: 'mongodb+srv://cluster.example/db', WEB_ORIGINS: 'http://example.com' }).ready, false);
});

test('serverless entry supports persistent sessions, CSRF and shared rate counters', async () => {
  const server = createServer((req, res) => {
    const out = res as unknown as NextApiResponse;
    out.status = code => { res.statusCode = code; return out; };
    out.json = body => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(body)); };
    void handler(req as NextApiRequest, out);
  }).listen(0, '127.0.0.1');
  await new Promise<void>(r => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as {port:number}).port}/api/v1`;
  let id = '';
  const prefix = `test-${crypto.randomUUID()}`;
  try {
    const headers = { origin: 'http://127.0.0.1:3001', 'content-type': 'application/json' };
    assert.equal((await fetch(base+'/health')).status, 200);
    const response = await fetch(base+'/auth/register', {method:'POST', headers, body:JSON.stringify({name:'Serverless Test',email:`${crypto.randomUUID()}@example.test`,password:'Testing-password-1234',role:'Brand'})});
    assert.equal(response.status,201);
    const body = await response.json(); id = body.user.id;
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    assert.match(response.headers.get('set-cookie')!, /HttpOnly/);
    const signed = {...headers, cookie};
    assert.equal((await fetch(base+'/auth/me',{headers:signed})).status,200);
    assert.equal((await fetch(base+'/workspace',{headers:signed})).status,200);
    assert.equal((await fetch(base+'/auth/logout',{method:'POST',headers:signed})).status,403);
    assert.equal((await fetch(base+'/auth/logout',{method:'POST',headers:{...signed,'x-csrf-token':body.csrfToken}})).status,204);
    assert.equal((await fetch(base+'/auth/me',{headers:signed})).status,401);
    await rateLimitIndexes();
    const a = new MongoRateStore(prefix), b = new MongoRateStore(prefix);
    const counts = await Promise.all(Array.from({length:10},(_,i)=>(i%2?a:b).increment('client')));
    assert.equal(Math.max(...counts.map(c=>c.totalHits)),10);
    assert.equal(new Set(counts.map(c=>c.totalHits)).size,10);
    await a.resetKey('client');
    assert.equal((await b.increment('client')).totalHits,1);
  } finally {
    await users.deleteOne({_id:id}); await sessions.deleteMany({userId:id}); await creatorDocuments.deleteOne({_id:id});
    await db.collection<{ _id: string }>('rate_limits').deleteMany({_id:{$regex:`^${prefix}:`}});
    await new Promise<void>(r=>server.close(()=>r())); await client.close();
  }
});
