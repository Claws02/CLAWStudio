/**
 * The GitHub REST surface the studio actually uses. Six calls, no SDK.
 *
 * Everything here is CORS-safe from a browser, which is the whole reason the
 * write path looks like this (see auth.ts).
 */
import type { RepoAuth } from './auth';

const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

const call = async <T>(auth: RepoAuth, path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${auth.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const detail = body.slice(0, 300);
    throw new GitHubError(
      res.status === 401
        ? 'Token rejected. Check it has not expired and grants contents:write on this repo.'
        : res.status === 404
          ? 'Not found. Either the path is wrong or the token cannot see this repo.'
          : `GitHub returned ${res.status}. ${detail}`,
      res.status,
    );
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
};

const b64encode = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

const b64decode = (b64: string): string => {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export interface RemoteFile {
  text: string;
  /** Blob SHA. Required to update the file without clobbering someone else. */
  sha: string;
}

export const readFile = async (auth: RepoAuth, path: string): Promise<RemoteFile> => {
  const data = await call<{ content: string; sha: string; encoding: string }>(
    auth,
    `/repos/${auth.owner}/${auth.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(auth.branch)}`,
  );
  return { text: data.encoding === 'base64' ? b64decode(data.content) : data.content, sha: data.sha };
};

/**
 * Single-file save. `sha` must be the blob sha you read, so a concurrent edit
 * from a laptop fails loudly instead of being silently overwritten.
 */
export const writeFile = async (
  auth: RepoAuth,
  path: string,
  text: string,
  message: string,
  sha?: string,
): Promise<{ sha: string }> => {
  const data = await call<{ content: { sha: string } }>(
    auth,
    `/repos/${auth.owner}/${auth.repo}/contents/${encodeURI(path)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ message, content: b64encode(text), branch: auth.branch, ...(sha ? { sha } : {}) }),
    },
  );
  return { sha: data.content.sha };
};

export interface TreeEntry {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

/** The whole file list in one request. Cheap enough to do on load. */
export const listTree = async (auth: RepoAuth): Promise<TreeEntry[]> => {
  const data = await call<{ tree: TreeEntry[]; truncated: boolean }>(
    auth,
    `/repos/${auth.owner}/${auth.repo}/git/trees/${encodeURIComponent(auth.branch)}?recursive=1`,
  );
  return data.tree.filter((e) => e.type === 'blob');
};

/**
 * Multi-file atomic save: blob -> tree -> commit -> ref. Used when one edit
 * touches a model and its generated result together.
 */
export const commitFiles = async (
  auth: RepoAuth,
  files: { path: string; text: string }[],
  message: string,
): Promise<{ sha: string }> => {
  const base = `/repos/${auth.owner}/${auth.repo}`;
  const ref = await call<{ object: { sha: string } }>(auth, `${base}/git/ref/heads/${auth.branch}`);
  const head = ref.object.sha;
  const headCommit = await call<{ tree: { sha: string } }>(auth, `${base}/git/commits/${head}`);

  const blobs = await Promise.all(
    files.map(async (f) => {
      const blob = await call<{ sha: string }>(auth, `${base}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: b64encode(f.text), encoding: 'base64' }),
      });
      return { path: f.path, mode: '100644' as const, type: 'blob' as const, sha: blob.sha };
    }),
  );

  const tree = await call<{ sha: string }>(auth, `${base}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: blobs }),
  });

  const commit = await call<{ sha: string }>(auth, `${base}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [head] }),
  });

  await call(auth, `${base}/git/refs/heads/${auth.branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  });

  return { sha: commit.sha };
};

/** Tier 2: hand a slow job to CI. This is the only way the iPad runs one. */
export const dispatchWorkflow = async (
  auth: RepoAuth,
  workflow: string,
  inputs: Record<string, string>,
): Promise<void> => {
  await call(auth, `/repos/${auth.owner}/${auth.repo}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: auth.branch, inputs }),
  });
};

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
}

export const listRuns = async (auth: RepoAuth, limit = 10): Promise<WorkflowRun[]> => {
  const data = await call<{ workflow_runs: WorkflowRun[] }>(
    auth,
    `/repos/${auth.owner}/${auth.repo}/actions/runs?per_page=${limit}&branch=${encodeURIComponent(auth.branch)}`,
  );
  return data.workflow_runs;
};
