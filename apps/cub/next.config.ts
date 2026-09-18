import withSerwistInit from '@serwist/next';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  // The service worker is only useful in a real deployment; skip it in dev so
  // stale caches never mask a code change.
  disable: process.env.NODE_ENV === 'development',
});

export default withSerwist({
  reactStrictMode: true,
  typedRoutes: true,
  /*
   * There is a lockfile both here and at the repo root (the root holds an
   * unrelated app), so Next's automatic root detection picks the wrong one.
   * Pinning it keeps file tracing scoped to this app.
   */
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
});
