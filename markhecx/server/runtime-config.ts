/** Readiness without importing database clients or exposing credential values. */
export function productionConfiguration(env: Record<string, string | undefined>) {
  const missing: string[] = [];
  if (env.NODE_ENV === 'production') {
    if (!env.MONGODB_URI || /(?:localhost|127\.0\.0\.1|\[::1\])/.test(env.MONGODB_URI)) missing.push('MONGODB_URI');
    if (!env.WEB_ORIGINS) missing.push('WEB_ORIGINS');
    else {
      try { if (env.WEB_ORIGINS.split(',').some(v => new URL(v.trim()).protocol !== 'https:')) missing.push('WEB_ORIGINS'); }
      catch { missing.push('WEB_ORIGINS'); }
    }
  }
  return { ready: missing.length === 0, missing };
}
