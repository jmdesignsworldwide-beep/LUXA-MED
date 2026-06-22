/**
 * Rate-limiting best-effort, en memoria.
 *
 * ⚠️ Limitación honesta: en serverless cada instancia tiene su propia memoria,
 * así que esto NO es un límite distribuido perfecto. Sirve como primera barrera
 * y se complementa con el rate-limiting propio de Supabase Auth. Para algo
 * robusto en producción conviene un store compartido (Upstash/Redis o una
 * tabla en Supabase). Anotado como pendiente.
 */
type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  max = 5,
  windowMs = 15 * 60 * 1000,
): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= max) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { ok: true };
}
