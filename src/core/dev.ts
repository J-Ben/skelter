/**
 * Development-only diagnostics.
 *
 * React Native exposes a global `__DEV__` (false in release bundles). On the
 * web, bundlers inline `process.env.NODE_ENV`. Warnings are never emitted in
 * production builds.
 */
export function isDev(): boolean {
  const g = globalThis as { __DEV__?: boolean };
  if (typeof g.__DEV__ === 'boolean') return g.__DEV__;
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}

const warned = new Set<string>();

/**
 * Logs a `[skelter]` warning once per key, in development only. Keyed so a
 * misconfigured card rendered 50 times in a list warns once, not 50 times.
 */
export function warnOnce(key: string, message: string): void {
  if (!isDev() || warned.has(key)) return;
  warned.add(key);
  console.warn(`[skelter] ${message}`);
}
