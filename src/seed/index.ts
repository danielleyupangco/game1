import type { Backup } from '@/lib/db'

/**
 * An optional pre-loaded dataset, baked into the build.
 *
 * This exists so a build can be handed to someone with their data already in
 * it — the app is otherwise browser-local, so a freshly opened copy would be
 * empty. It is loaded once, only when the database has never been written to,
 * and everything in it keeps the provenance of the file it came from, so a
 * seeded number is as traceable as an imported one.
 *
 * The seed file is personal data and is deliberately not committed; a build
 * without it produces the ordinary empty app. Generate one with
 * `npm run seed -- <backup.json>`.
 */
const modules = import.meta.glob<{ default: Backup }>('./data.json', { eager: true })

export const SEED: Backup | null = (Object.values(modules)[0]?.default as Backup | undefined) ?? null

export const SEED_LABEL = SEED
  ? `${SEED.holdings?.length ?? 0} holdings across ${SEED.snapshots?.length ?? 0} snapshots`
  : null
