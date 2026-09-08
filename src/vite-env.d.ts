/// <reference types="vite/client" />

/**
 * True in a demo build (`DEMO=1`): figures start masked and cannot be unmasked.
 * Substituted at build time by Vite's `define`, so the ordinary build compiles
 * the unmasking path away to nothing.
 */
declare const __DEMO__: boolean
