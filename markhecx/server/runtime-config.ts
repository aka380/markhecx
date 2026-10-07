export function configuredWebOrigins(env: Record<string, string | undefined>) {
  return env.WEB_ORIGINS?.trim() || (env.NODE_ENV === 'production' ? 'https://markhecx.vercel.app' : 'http://127.0.0.1:3001');
}

/** Readiness without importing database clients or exposing credential values. */
export function productionConfiguration(env: Record<string, string | undefined>) {
  const missing: string[] = [];
  if (env.NODE_ENV === 'production') {
    if (!env.MONGODB_URI || /(?:localhost|127\.0\.0\.1|\[::1\])/.test(env.MONGODB_URI)) missing.push('MONGODB_URI');
    {
      try { if (configuredWebOrigins(env).split(',').some(v => new URL(v.trim()).protocol !== 'https:')) missing.push('WEB_ORIGINS'); }
      catch { missing.push('WEB_ORIGINS'); }
    }
  }
  return { ready: missing.length === 0, missing };
}
