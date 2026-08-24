/**
 * The write-ahead cache (D5).
 *
 * Every edit lands here before it goes anywhere near the network. Safari on
 * iPadOS kills tabs under memory pressure, and losing twenty minutes of work
 * once is enough to stop trusting the studio — so a draft is durable the
 * instant you stop typing, and syncing to GitHub is a separate, later act.
 *
 * OPFS is the only File System API part iOS Safari ships, and it is
 * unavailable in Private Browsing. Every call degrades to a no-op rather than
 * throwing, so the studio still runs (just without crash-safety) where it
 * isn't available.
 */

const DIR = 'drafts';

/** Paths are flattened rather than nested, so there's no directory tree to keep in sync. */
const encodeName = (path: string): string => encodeURIComponent(path).replace(/\*/g, '%2A');
const decodeName = (name: string): string => decodeURIComponent(name);

const root = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    if (!navigator.storage?.getDirectory) return null;
    const dir = await navigator.storage.getDirectory();
    return await dir.getDirectoryHandle(DIR, { create: true });
  } catch {
    return null;
  }
};

export const available = (): boolean => Boolean(navigator.storage?.getDirectory);

export const readDraft = async (path: string): Promise<string | null> => {
  try {
    const dir = await root();
    if (!dir) return null;
    const handle = await dir.getFileHandle(encodeName(path));
    const file = await handle.getFile();
    return await file.text();
  } catch {
    return null;
  }
};

export const writeDraft = async (path: string, text: string): Promise<boolean> => {
  try {
    const dir = await root();
    if (!dir) return false;
    const handle = await dir.getFileHandle(encodeName(path), { create: true });
    const w = await handle.createWritable();
    await w.write(text);
    await w.close();
    return true;
  } catch {
    return false;
  }
};

export const dropDraft = async (path: string): Promise<void> => {
  try {
    const dir = await root();
    await dir?.removeEntry(encodeName(path));
  } catch {
    /* already gone */
  }
};

/** Every path with an unsynced draft. This is what the status bar counts. */
export const listDrafts = async (): Promise<string[]> => {
  try {
    const dir = await root();
    if (!dir) return [];
    const out: string[] = [];
    // @ts-expect-error — `keys()` is on the handle at runtime, ahead of the DOM types
    for await (const name of dir.keys()) out.push(decodeName(name as string));
    return out.sort();
  } catch {
    return [];
  }
};

/** How much room is left. Shown when it gets tight, not before. */
export const quota = async (): Promise<{ usage: number; quota: number } | null> => {
  try {
    const est = await navigator.storage?.estimate?.();
    if (!est?.quota) return null;
    return { usage: est.usage ?? 0, quota: est.quota };
  } catch {
    return null;
  }
};
