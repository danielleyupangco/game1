/**
 * Asking Claude from inside the published page.
 *
 * Only exists when the dashboard is being viewed as a published artifact on
 * claude.ai; in local development, and in any other frame, there is no runtime
 * to ask and every call resolves to nothing. So this module is written around
 * absence: callers get `null` and hide the feature rather than erroring.
 *
 * Worth being clear about what this is not. Claude here cannot browse the web,
 * so it cannot read a live Airbnb rate. What it can do is reason over the data
 * this page hands it — which is the property's own history — against what it
 * knows about the market. Anything that needs a real price still has to be
 * observed by a person.
 */

type SampleOptions = {
  onText?: (event: { text: string; delta: string }) => void
  signal?: AbortSignal
  modelTier?: 'quick' | 'default' | 'complex'
  cache?: boolean
}

type SampleFn = ((input: string, options?: SampleOptions) => Promise<{ text: string; truncated: boolean }>) & {
  json: <T>(input: string, options?: SampleOptions) => Promise<T>
}

type ClaudeGlobal = { use: (name: string) => Promise<unknown> }

function runtime(): ClaudeGlobal | null {
  const candidate = (globalThis as { claude?: ClaudeGlobal }).claude
  return candidate && typeof candidate.use === 'function' ? candidate : null
}

let cached: Promise<SampleFn | null> | null = null

/**
 * Resolves the sampling function once per page load. Memoised because the
 * runtime answers slowly the first time and may never answer at all — a second
 * caller should wait on the same promise rather than starting another wait.
 */
export function getSample(): Promise<SampleFn | null> {
  if (cached) return cached
  const claude = runtime()
  if (!claude) {
    cached = Promise.resolve(null)
    return cached
  }
  cached = claude
    .use('sample')
    .then((value) => (typeof value === 'function' ? (value as SampleFn) : null))
    .catch(() => null)
  return cached
}

export type AskError = { code: string; message: string }

/** Normalises the runtime's rejection shape into something renderable. */
export function describeError(error: unknown): AskError {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code, message } = error as { code?: unknown; message?: unknown }
    return {
      code: typeof code === 'string' ? code : 'unknown',
      message: typeof message === 'string' ? message : 'Something went wrong.',
    }
  }
  return { code: 'unknown', message: error instanceof Error ? error.message : 'Something went wrong.' }
}

/** Plain-language versions of the codes a viewer can actually do something about. */
export function explainError(error: AskError): string {
  switch (error.code) {
    case 'not_granted':
      return 'You declined to let this page ask Claude, so the read is off for this visit. Reload the page to be asked again.'
    case 'rate_limited':
      return 'Claude is busy. Wait a minute and press refresh again.'
    case 'cancelled':
      return 'Stopped.'
    default:
      return error.message
  }
}
