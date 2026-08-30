/**
 * Saving a file to the viewer's device.
 *
 * Two environments, two mechanisms. Run locally, the page creates an object
 * URL and clicks an anchor. Published as an Artifact, the viewer sandbox blocks
 * that entirely and the host mediates saves instead, through a capability that
 * prompts the viewer and accepts a narrower set of file types — xlsx is not
 * among them, csv is.
 *
 * So the format follows the environment rather than the other way round, and
 * the UI says which one you'll get instead of silently handing over something
 * different from what the button promised.
 */

type DownloadsNamespace = {
  save: (request: { filename: string; data: string | Blob | ArrayBuffer }) => Promise<{ status: 'saved' }>
}

type ClaudeHost = { use?: (name: string) => Promise<unknown> }

export type SaveMode = 'workbook' | 'hosted'

let modePromise: Promise<SaveMode> | null = null
let downloads: DownloadsNamespace | null = null

/**
 * Which mechanism this view has. Resolved once — the host answers late, and
 * never during the first synchronous run, so callers await it.
 */
export function saveMode(): Promise<SaveMode> {
  if (!modePromise) {
    modePromise = (async () => {
      const host = (globalThis as { claude?: ClaudeHost }).claude
      if (!host?.use) return 'workbook'
      try {
        const namespace = (await host.use('downloads')) as DownloadsNamespace | null
        if (!namespace) return 'workbook'
        downloads = namespace
        return 'hosted'
      } catch {
        return 'workbook'
      }
    })()
  }
  return modePromise
}

export class SaveDeclined extends Error {}

/** Human-readable reason a save didn't happen, or null if it did. */
export async function saveFile(filename: string, data: string | Blob): Promise<void> {
  const mode = await saveMode()

  if (mode === 'hosted' && downloads) {
    try {
      await downloads.save({ filename, data })
      return
    } catch (caught) {
      const code = (caught as { code?: string })?.code
      if (code === 'declined') throw new SaveDeclined('Save cancelled.')
      if (code === 'too_large') throw new Error('That file is over the 16 MB limit for saving from a published page.')
      if (code === 'rate_limited') throw new Error('A save prompt is already open. Finish it, then try again.')
      if (code === 'rejected_extension' || code === 'extension_not_enabled') {
        throw new Error(`This page can't save ${filename.split('.').pop()} files.`)
      }
      throw new Error('The save could not be completed.')
    }
  }

  const blob = typeof data === 'string' ? new Blob([data], { type: 'text/plain' }) : data
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** RFC-4180 quoting: wrap anything containing a comma, quote or newline. */
export function toCsv(rows: (string | number | null)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return ''
          const text = String(cell)
          return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
        })
        .join(','),
    )
    .join('\r\n')
}
