import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/*
 * eslint-config-next ships native flat configs from v16, so these are spread
 * directly rather than going through the FlatCompat shim.
 */
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'public/sw.js', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
];

export default config;
