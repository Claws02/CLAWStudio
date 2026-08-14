import { loadFont } from '@remotion/fonts';
import { staticFile, continueRender, delayRender } from 'remotion';

/**
 * IBM Plex, self-hosted from public/fonts.
 *
 * Deliberately NOT @remotion/google-fonts: that fetches from fonts.gstatic.com
 * at render time, which makes every render depend on the network (and fires
 * ~200 requests per render). Vendored woff2 keeps renders hermetic and
 * reproducible — the same commit always produces the same frames.
 *
 * To add a weight: copy the woff2 into public/fonts and add it below.
 */
const FACES = [
  { family: 'IBM Plex Sans', file: 'fonts/ibm-plex-sans-latin-400-normal.woff2', weight: '400' },
  { family: 'IBM Plex Sans', file: 'fonts/ibm-plex-sans-latin-600-normal.woff2', weight: '600' },
  { family: 'IBM Plex Sans', file: 'fonts/ibm-plex-sans-latin-700-normal.woff2', weight: '700' },
  { family: 'IBM Plex Mono', file: 'fonts/ibm-plex-mono-latin-400-normal.woff2', weight: '400' },
  { family: 'IBM Plex Mono', file: 'fonts/ibm-plex-mono-latin-500-normal.woff2', weight: '500' },
];

// delayRender holds the first frame until the faces are actually usable —
// without it the opening frames can render in a fallback face.
const handle = delayRender('Loading IBM Plex');

Promise.all(
  FACES.map((f) =>
    loadFont({
      family: f.family,
      url: staticFile(f.file),
      weight: f.weight,
      style: 'normal',
      format: 'woff2',
    }),
  ),
)
  .then(() => continueRender(handle))
  .catch((err) => {
    // Never hang a render on a missing font — fall back and keep going.
    console.warn('Font load failed, falling back to system fonts:', err);
    continueRender(handle);
  });

export const font = {
  sans: '"IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
};
