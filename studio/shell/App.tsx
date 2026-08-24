import { Suspense, useCallback, useEffect, useState } from 'react';
import { mountTheme } from './theme';
import { ROOMS, roomById } from './rooms';
import { Empty, Settings } from './ui';
import { backing, draftPaths, onDraftsChanged, storageAvailable } from './fs/workspace';
import { brand } from '../../src/content/generated';
import { workspace } from '../generated/index';

mountTheme();

const ROOM_KEY = 'claw.studio.room';

const readRoom = (): string => {
  const fromHash = window.location.hash.replace(/^#\/?/, '');
  if (roomById(fromHash)) return fromHash;
  try {
    const saved = window.localStorage.getItem(ROOM_KEY);
    if (saved && roomById(saved)) return saved;
  } catch {
    /* storage blocked — the default is fine */
  }
  return 'code';
};

/** Rooms that aren't built yet say what they'll be, rather than 404ing. */
const Unbuilt: React.FC<{ id: string }> = ({ id }) => {
  const room = roomById(id);
  return (
    <Empty title={`${room?.label} room — ${room?.phase ?? 'not built yet'}`}>
      {room?.blurb} The plan lives in <code>docs/STUDIO-ARCHITECTURE.md</code>.
    </Empty>
  );
};

export const App: React.FC = () => {
  const [roomId, setRoomId] = useState(readRoom);
  const [showSettings, setShowSettings] = useState(false);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [mode, setMode] = useState(backing());

  const refreshDrafts = useCallback(() => {
    void draftPaths().then(setDrafts);
  }, []);

  useEffect(() => {
    refreshDrafts();
    const stop = onDraftsChanged(refreshDrafts);
    const onHash = () => setRoomId(readRoom());
    window.addEventListener('hashchange', onHash);
    return () => {
      stop();
      window.removeEventListener('hashchange', onHash);
    };
  }, [refreshDrafts]);

  const go = (id: string) => {
    setRoomId(id);
    window.location.hash = `/${id}`;
    try {
      window.localStorage.setItem(ROOM_KEY, id);
    } catch {
      /* not worth failing over */
    }
  };

  const room = roomById(roomId);
  const Room = room?.component;

  return (
    <div className="shell">
      <nav className="rail" aria-label="Studio rooms">
        <span className="mark">CLAW</span>
        {ROOMS.map((r) => (
          <button
            key={r.id}
            className="rail-btn"
            aria-current={r.id === roomId ? 'page' : undefined}
            onClick={() => go(r.id)}
            title={r.live ? r.label : `${r.label} — ${r.phase}`}
          >
            <span className="glyph" aria-hidden="true">
              {r.glyph}
            </span>
            <span className="name">{r.label}</span>
          </button>
        ))}
        <span className="rail-spacer" />
        <button className="rail-btn" onClick={() => setShowSettings(true)} title="GitHub connection">
          <span className="glyph" aria-hidden="true">
            ⚙
          </span>
          <span className="name">Set</span>
        </button>
      </nav>

      <div className="room">
        <Suspense fallback={<div className="empty">loading room…</div>}>
          {room?.live && Room ? <Room key={room.id} /> : <Unbuilt id={roomId} />}
        </Suspense>
      </div>

      <div className="status">
        <span>
          <b>{brand.name}</b> studio
        </span>
        <span className="sep">·</span>
        <span>
          {mode === 'dev' ? (
            <>
              backing <b className="good">local repo</b>
            </>
          ) : mode === 'remote' ? (
            <>
              backing <b className="good">github</b>
            </>
          ) : (
            <>
              <span className="warn">not connected</span>
            </>
          )}
        </span>
        <span className="sep">·</span>
        <span>
          {drafts.length > 0 ? (
            <span className="warn">
              {drafts.length} unsynced draft{drafts.length === 1 ? '' : 's'}
            </span>
          ) : (
            'no unsynced drafts'
          )}
        </span>
        <span className="sep">·</span>
        <span>
          {workspace.diagnostics.length > 0 ? (
            <span className="warn" title={workspace.diagnostics.map((d) => `${d.path}: ${d.message}`).join('\n')}>
              {workspace.diagnostics.length} build warning{workspace.diagnostics.length === 1 ? '' : 's'}
            </span>
          ) : (
            <>
              <b className="good">{workspace.models.length}</b> model
              {workspace.models.length === 1 ? '' : 's'} clean
            </>
          )}
        </span>
        {!storageAvailable() ? (
          <>
            <span className="sep">·</span>
            <span className="bad">no local backup — drafts are lost if this tab closes</span>
          </>
        ) : null}
        <span style={{ flex: 1 }} />
        <button onClick={() => setShowSettings(true)}>{mode === 'remote' ? 'github' : 'connect'}</button>
      </div>

      {showSettings ? (
        <Settings
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setMode(backing());
            refreshDrafts();
          }}
        />
      ) : null}
    </div>
  );
};
