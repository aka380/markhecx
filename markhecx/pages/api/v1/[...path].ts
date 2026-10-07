import type { NextApiRequest, NextApiResponse } from 'next';
import { productionConfiguration } from '@/server/runtime-config';

// Use native Node request/response objects so the existing Express middleware,
// cookie handling, validation and authorization run unchanged on Vercel.
export const config = { api: { bodyParser: false, externalResolver: true, responseLimit: '8mb' }, maxDuration: 60 };
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const readiness = productionConfiguration(process.env);
  if (!readiness.ready) {
    res.status(503).json({
      error: { code: 'service_configuration', message: 'Account services are not configured yet. Please try again later.' },
      ...(req.url?.split('?')[0] === '/api/v1/health' ? { status: 'unavailable', configuration: { missingOrInvalid: readiness.missing } } : {}),
    });
    return;
  }
  try {
    const { getServer } = await import('@/server/runtime');
    const app = await getServer();
    await new Promise<void>((resolve, reject) => {
      res.once('finish', resolve);
      res.once('close', resolve);
      res.once('error', reject);
      app(req, res);
    });
  } catch (error) {
    const category = error && typeof error === 'object' && 'name' in error
      && ['MongoServerSelectionError', 'MongoServerError', 'MongoParseError', 'ZodError'].includes(String(error.name))
      ? String(error.name) : 'InitializationError';
    console.error(JSON.stringify({ event: 'api_initialization_failed', category }));
    // No credentials, connection strings, or raw database errors in responses/logs.
    if (!res.headersSent) res.status(503).json({ error: { code: 'service_unavailable', message: 'Account services are temporarily unavailable. Please try again shortly.' } });
    else res.end();
  }
}
