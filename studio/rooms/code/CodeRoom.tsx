import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createEditor, type EditorHandle } from './editor';
import { Empty } from '../../shell/ui';
import { KINDS, kindOf } from '../../spine/kinds';
import {
  backing,
  discardDraft,
  draftPaths,
  listFiles,
  publish,
  readFile,
  saveDraft,
  type FileEntry,
  type OpenFile,
} from '../../shell/fs/workspace';

/** Long enough not to thrash storage while typing, short enough to survive a tab kill. */
const DRAFT_DEBOUNCE_MS = 400;

const dotColor = (path: string): string => {
  const kind = kindOf(path);
  return kind ? KINDS[kind].color : '#1E2B38';
};

const shortMessage = (path: string): string => `Edit ${path.split('/').pop()} from the studio`;

/** Split so the filename can be kept whole while the directory truncates. */
const splitPath = (path: string): [dir: string, base: string] => {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? ['', path] : [path.slice(0, cut + 1), path.slice(cut + 1)];
};

export const CodeRoom: React.FC = () => {
  const [files, setFiles] = useState<FileEntry[] | null>(null);
  const [drafts, setDrafts] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<OpenFile | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTree, setShowTree] = useState(true);

  const host = useRef<HTMLDivElement | null>(null);
  const editor = useRef<EditorHandle | null>(null);
  const latest = useRef('');
  const timer = useRef<number | null>(null);

  const mode = backing();

  const refreshDrafts = useCallback(() => {
    void draftPaths().then((p) => setDrafts(new Set(p)));
  }, []);

  useEffect(() => {
    let live = true;
    setError(null);
    listFiles()
      .then((f) => live && setFiles(f))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    refreshDrafts();
    return () => {
      live = false;
    };
  }, [mode, refreshDrafts]);

  // The editor is rebuilt per file rather than reconfigured: language, history
  // and undo stack should all belong to the document you're actually editing.
  useEffect(() => {
    editor.current?.destroy();
    editor.current = null;
    if (!open || !host.current) return;
    latest.current = open.text;

    // The language pack is a separate chunk, so this is async — and the file
    // can change while it loads. `stale` makes the late arrival a no-op instead
    // of mounting a second editor over the current one.
    let stale = false;
    void createEditor({
      parent: host.current,
      path: open.path,
      doc: open.text,
      onChange: (text) => {
        latest.current = text;
        setDirty(true);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          void saveDraft(open.path, text).then(refreshDrafts);
        }, DRAFT_DEBOUNCE_MS);
      },
    }).then((handle) => {
      if (stale) handle.destroy();
      else editor.current = handle;
    });

    return () => {
      stale = true;
      if (timer.current) window.clearTimeout(timer.current);
      editor.current?.destroy();
      editor.current = null;
    };
  }, [open, refreshDrafts]);

  const openPath = async (path: string) => {
    setBusy('opening');
    setError(null);
    try {
      const file = await readFile(path);
      setOpen(file);
      setDirty(file.draft);
      if (window.innerWidth < 720) setShowTree(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!open) return;
    setBusy('saving');
    setError(null);
    try {
      await publish(open.path, latest.current, shortMessage(open.path), open.sha);
      const fresh = await readFile(open.path);
      setOpen(fresh);
      setDirty(false);
      refreshDrafts();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const revert = async () => {
    if (!open) return;
    await discardDraft(open.path);
    refreshDrafts();
    await openPath(open.path);
  };

  const shown = useMemo(() => {
    if (!files) return [];
    const q = query.trim().toLowerCase();
    const matched = q ? files.filter((f) => f.path.toLowerCase().includes(q)) : files;
    // Models first — they're what you came to edit; source after.
    return [...matched]
      .sort((a, b) => {
        const ka = kindOf(a.path) ? 0 : 1;
        const kb = kindOf(b.path) ? 0 : 1;
        return ka - kb || a.path.localeCompare(b.path);
      })
      .slice(0, 400);
  }, [files, query]);

  if (mode === 'none') {
    return (
      <Empty title="Not connected">
        The Code room reads and writes this repository through the GitHub API. Add a fine-grained token in{' '}
        <b>Settings</b> to start editing — or run <code>npm run web</code> on a computer, where it uses the
        local checkout and needs no token.
      </Empty>
    );
  }

  return (
    <>
      <div className="head">
        <h1>{open ? open.path : 'Code'}</h1>
        {open && dirty ? <span className="sub" style={{ color: 'var(--accent)' }}>unsaved</span> : null}
        <span className="grow" />
        <button className="btn quiet" onClick={() => setShowTree((v) => !v)}>
          {showTree ? 'Hide files' : 'Files'}
        </button>
        {open ? (
          <>
            <button className="btn quiet" onClick={() => void revert()} disabled={!dirty || busy !== null}>
              Revert
            </button>
            <button className="btn primary" onClick={() => void save()} disabled={!dirty || busy !== null}>
              {busy === 'saving' ? 'Saving…' : mode === 'dev' ? 'Save to disk' : 'Commit'}
            </button>
          </>
        ) : null}
      </div>

      {error ? (
        <div style={{ padding: '12px 16px' }}>
          <div className="err">{error}</div>
        </div>
      ) : null}

      <div className={`code-room${showTree ? '' : ' solo'}`}>
        {showTree ? (
          <div className="tree">
            <div className="filter">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="filter files"
                aria-label="Filter files"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <ul>
              {shown.map((f) => (
                <li key={f.path}>
                  <button
                    onClick={() => void openPath(f.path)}
                    aria-current={open?.path === f.path ? 'true' : undefined}
                    title={f.path}
                  >
                    <span className="kind" style={{ background: dotColor(f.path) }} />
                    <span className="name">
                      <span className="dir">{splitPath(f.path)[0]}</span>
                      <span className="base">{splitPath(f.path)[1]}</span>
                    </span>
                    {drafts.has(f.path) ? <span className="dirty">●</span> : null}
                  </button>
                </li>
              ))}
            </ul>
            <div className="count">
              {files === null ? 'loading…' : `${shown.length} of ${files.length} files`}
            </div>
          </div>
        ) : null}

        <div className="editor">
          {open ? (
            <div className="host" ref={host} />
          ) : (
            <Empty title="Pick a file">
              Everything in the studio is editable as text here — that's the point of this room. Models are
              listed first, coloured by kind.
            </Empty>
          )}
        </div>
      </div>
    </>
  );
};
