// Must run before anything calls staticFile(), so audio resolves correctly when
// the preview is served from a subpath (e.g. GitHub Pages /<repo>/).
// `remotion_staticBase` is declared on Window by Remotion itself.
window.remotion_staticBase = import.meta.env.BASE_URL.replace(/\/$/, '');

import { createRoot } from 'react-dom/client';
import { App } from './App';
// Registers the video kind with the cross-surface ref resolver. Each new room
// adds one of these; the spine never imports a surface itself.
import '../../studio/spine/videoResolver';

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
