/**
 * Credential storage for the GitHub write path.
 *
 * D4: writes go through the GitHub REST API, because pushing with
 * isomorphic-git from a browser needs your own CORS proxy — a server that sees
 * every request in cleartext relative to your token. The REST API is
 * CORS-enabled and needs nothing.
 *
 * The trade-off that buys: a credential lives in the browser. Use a
 * fine-grained PAT scoped to *this repo only*, contents:write, with an expiry.
 * Any script injection on this origin becomes repo write access, so the studio
 * origin must never serve untrusted preview content — sandbox previews
 * elsewhere. The upgrade path is a GitHub App device flow behind one
 * serverless function; this module is the seam where that swaps in.
 */

const KEY = 'claw.studio.auth.v1';

export interface RepoAuth {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

export const DEFAULT_REPO = { owner: 'Claws02', repo: 'CLAWStudio', branch: 'main' };

const safeStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    // Private browsing, or site data blocked. The studio still reads.
    return null;
  }
};

export const loadAuth = (): RepoAuth | null => {
  try {
    const raw = safeStorage()?.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RepoAuth>;
    if (!parsed.token || !parsed.owner || !parsed.repo) return null;
    return { branch: DEFAULT_REPO.branch, ...parsed } as RepoAuth;
  } catch {
    return null;
  }
};

export const saveAuth = (auth: RepoAuth): void => {
  try {
    safeStorage()?.setItem(KEY, JSON.stringify(auth));
  } catch {
    /* nothing to do — the session still works, it just won't persist */
  }
};

export const clearAuth = (): void => {
  try {
    safeStorage()?.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
