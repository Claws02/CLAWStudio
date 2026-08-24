import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_REPO, clearAuth, loadAuth, saveAuth, type RepoAuth } from './fs/auth';

export const Empty: React.FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div className="empty">
    <h2>{title}</h2>
    <p>{children}</p>
  </div>
);

/**
 * The token sheet.
 *
 * Says plainly what the credential can do and what it costs, because the honest
 * answer to "is a PAT in localStorage fine?" is "it's the fastest path, and
 * here is exactly what you're accepting."
 */
export const Settings: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const existing = loadAuth();
  const [owner, setOwner] = useState(existing?.owner ?? DEFAULT_REPO.owner);
  const [repo, setRepo] = useState(existing?.repo ?? DEFAULT_REPO.repo);
  const [branch, setBranch] = useState(existing?.branch ?? DEFAULT_REPO.branch);
  const [token, setToken] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    const next: RepoAuth = { owner, repo, branch, token: token || existing?.token || '' };
    if (!next.token) return;
    saveAuth(next);
    onSaved();
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="GitHub connection">
        <h2>Connect to GitHub</h2>
        <p className="note">
          The studio reads and writes through the GitHub REST API — no server, no proxy. Use a{' '}
          <strong>fine-grained token</strong> scoped to this repository only, with{' '}
          <strong>Contents: read and write</strong>, and give it an expiry.
        </p>
        <div className="row">
          <div className="field grow">
            <label htmlFor="owner">Owner</label>
            <input id="owner" value={owner} onChange={(e) => setOwner(e.target.value)} autoCapitalize="off" />
          </div>
          <div className="field grow">
            <label htmlFor="repo">Repo</label>
            <input id="repo" value={repo} onChange={(e) => setRepo(e.target.value)} autoCapitalize="off" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="branch">Branch</label>
          <input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} autoCapitalize="off" />
        </div>
        <div className="field">
          <label htmlFor="token">Token {existing ? '(leave blank to keep the current one)' : ''}</label>
          <input
            id="token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_…"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
        <p className="note">
          It's stored in this browser's local storage and never sent anywhere but api.github.com. Anything
          that can run script on this origin can read it — so don't open untrusted previews here, and revoke
          the token from GitHub if a device goes missing.
        </p>
        <div className="row">
          <button className="btn primary" onClick={save} disabled={!token && !existing}>
            {existing ? 'Update' : 'Connect'}
          </button>
          <button className="btn quiet" onClick={onClose}>
            Cancel
          </button>
          <span className="grow" />
          {existing ? (
            <button
              className="btn quiet"
              onClick={() => {
                clearAuth();
                onSaved();
                onClose();
              }}
            >
              Disconnect
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
