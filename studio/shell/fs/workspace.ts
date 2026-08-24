/**
 * One file API for the whole studio, over two very different backings:
 *
 *   dev    — a tiny vite middleware reading the real repo, so `npm run web`
 *            needs no token and edits hit disk
 *   remote — the GitHub REST API, which is how the iPad works
 *
 * Both sit behind the OPFS draft layer, so an unsynced edit always wins on
 * read. Rooms only ever see this module.
 */
import { loadAuth, type RepoAuth } from './auth';
import * as gh from './github';
import * as opfs from './opfs';

export type Backing = 'dev' | 'remote' | 'none';

export interface FileEntry {
  path: string;
  size?: number;
}

export interface OpenFile {
  path: string;
  text: string;
  /** Blob sha of the remote version this was based on. Absent in dev. */
  sha?: string;
  /** True when the text came from an unsynced draft rather than the backing. */
  draft: boolean;
}

const DEV = import.meta.env.DEV;

/** Present only under `npm run web`; the deployed studio never has it. */
const devFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`/__fs${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`.trim());
  return (await res.json()) as T;
};

export const backing = (): Backing => (DEV ? 'dev' : loadAuth() ? 'remote' : 'none');

/**
 * Draft changes are broadcast, so the status bar's unsynced count is always the
 * truth. That number is the studio's crash-safety indicator — if it lies about
 * what's saved, it's worse than not being there.
 */
const draftListeners = new Set<() => void>();

export const onDraftsChanged = (fn: () => void): (() => void) => {
  draftListeners.add(fn);
  return () => draftListeners.delete(fn);
};

const announce = (): void => {
  for (const fn of draftListeners) fn();
};

const requireAuth = (): RepoAuth => {
  const auth = loadAuth();
  if (!auth) throw new Error('Connect a GitHub token in Settings to read and write files.');
  return auth;
};

/** Files worth listing. Skips the things nobody edits by hand. */
const EDITABLE = /\.(ya?ml|tsx?|jsx?|mjs|md|json|css|html|txt)$/;
const IGNORED = /^(node_modules|dist|out|\.git)\//;

export const listFiles = async (): Promise<FileEntry[]> => {
  const keep = (p: string) => EDITABLE.test(p) && !IGNORED.test(p);
  if (DEV) {
    const { files } = await devFetch<{ files: FileEntry[] }>('/list');
    return files.filter((f) => keep(f.path));
  }
  const tree = await gh.listTree(requireAuth());
  return tree.filter((e) => keep(e.path)).map((e) => ({ path: e.path, size: e.size }));
};

export const readFile = async (path: string): Promise<OpenFile> => {
  const draft = await opfs.readDraft(path);
  if (DEV) {
    const { text } = await devFetch<{ text: string }>(`/read?path=${encodeURIComponent(path)}`);
    return { path, text: draft ?? text, draft: draft !== null && draft !== text };
  }
  const remote = await gh.readFile(requireAuth(), path);
  return { path, text: draft ?? remote.text, sha: remote.sha, draft: draft !== null && draft !== remote.text };
};

/** Local, instant, durable. Does not touch the network. */
export const saveDraft = async (path: string, text: string): Promise<boolean> => {
  const ok = await opfs.writeDraft(path, text);
  announce();
  return ok;
};

export const discardDraft = async (path: string): Promise<void> => {
  await opfs.dropDraft(path);
  announce();
};

export const draftPaths = async (): Promise<string[]> => opfs.listDrafts();

/**
 * Push a draft to the backing. In dev that's the local file; on the iPad it's
 * a commit. Either way the draft is only dropped once the write succeeded.
 */
export const publish = async (path: string, text: string, message: string, sha?: string): Promise<void> => {
  if (DEV) {
    await devFetch('/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, text }),
    });
  } else {
    await gh.writeFile(requireAuth(), path, text, message, sha);
  }
  await opfs.dropDraft(path);
  announce();
};

/** Multi-file, one commit. Dev writes them one at a time; there's no history to keep. */
export const publishAll = async (files: { path: string; text: string }[], message: string): Promise<void> => {
  if (DEV) {
    for (const f of files) {
      await devFetch('/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
    }
  } else {
    await gh.commitFiles(requireAuth(), files, message);
  }
  for (const f of files) await opfs.dropDraft(f.path);
  announce();
};

export const storageAvailable = opfs.available;
export const storageQuota = opfs.quota;
