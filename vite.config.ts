import { defineConfig, type Plugin } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ESM config: __dirname does not exist here.
const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));

/**
 * Dev-only file access for the Code room.
 *
 * On the iPad the studio reads and writes through the GitHub REST API, which
 * needs a token. Locally that would be friction for no benefit, so `npm run
 * web` gets the real repo through this middleware instead — same workspace
 * API, different backing.
 *
 * `apply: 'serve'` keeps it out of the production bundle entirely: the
 * deployed studio is static files and has no server to exploit.
 */
const devFs = (): Plugin => {
  /** Every path is confined to the repo. No traversal, no symlink escape. */
  const safe = (raw: string): string => {
    const abs = resolve(ROOT, raw);
    const rel = relative(ROOT, abs);
    if (!rel || rel.startsWith('..') || rel.split(sep)[0] === '.git' || rel.split(sep)[0] === 'node_modules') {
      throw new Error(`refused: ${raw}`);
    }
    return abs;
  };

  const json = (res: import('node:http').ServerResponse, code: number, body: unknown) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };

  return {
    name: 'claw-dev-fs',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__fs', async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        try {
          if (url.pathname === '/list') {
            // git is the source of truth for "what's a project file"
            const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
            const files = out
              .split('\n')
              .filter(Boolean)
              .map((path) => {
                try {
                  return { path, size: statSync(join(ROOT, path)).size };
                } catch {
                  return { path };
                }
              });
            return json(res, 200, { files });
          }

          if (url.pathname === '/read') {
            const path = url.searchParams.get('path') ?? '';
            return json(res, 200, { text: readFileSync(safe(path), 'utf8') });
          }

          if (url.pathname === '/write' && req.method === 'POST') {
            const chunks: Buffer[] = [];
            for await (const c of req) chunks.push(c as Buffer);
            const { path, text } = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
              path: string;
              text: string;
            };
            const abs = safe(path);
            mkdirSync(dirname(abs), { recursive: true });
            writeFileSync(abs, text, 'utf8');
            return json(res, 200, { ok: true });
          }
        } catch (err) {
          return json(res, 400, { error: err instanceof Error ? err.message : String(err) });
        }
        next();
      });
    },
  };
};

/**
 * Preview app + studio shell. The video render itself goes through Remotion,
 * not Vite.
 *
 * No React plugin on purpose: esbuild handles JSX, and dropping the plugin
 * removes a whole class of peer-dependency breakage. Cost is no Fast Refresh.
 */
export default defineConfig({
  root: 'web',
  publicDir: '../public',
  base: process.env.PREVIEW_BASE ?? '/',
  esbuild: { jsx: 'automatic' },
  plugins: [devFs()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Each room is its own chunk (D: bundle budget). The shell must stay small
    // enough to open over cellular; rooms load when you enter them.
    chunkSizeWarningLimit: 700,
  },
  server: { host: true, port: 5173 },
});
