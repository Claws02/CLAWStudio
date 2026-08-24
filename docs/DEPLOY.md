# Deploying the studio

The studio is a static site. It reads and writes your repository through the
GitHub REST API from the browser, so there is no server to run and nothing to
keep alive.

## Hosting: Cloudflare Pages (D6)

GitHub Pages **cannot serve a private repository without a paid plan**, and that
paywall would sit in front of the whole studio rather than just a video preview.
Cloudflare Pages is free with private repos and gives you a Worker later, when
the token in the browser should become a proper GitHub App device flow.

Connect the repo in the Cloudflare dashboard with:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm ci && npm run build:web` |
| Build output directory | `dist` |
| Node version | `22` (set `NODE_VERSION=22` if the default is older) |
| Production branch | whichever branch you want live |

Nothing else is needed — no environment variables, no secrets. `PREVIEW_BASE`
only matters when serving from a subpath, which Cloudflare doesn't do.

### Why not just make the repo public?

It would work: Pages is free on public repos, and Actions minutes become
unlimited, which genuinely helps Tier-2 renders. It's still the wrong trade.
This repo is going to hold cost models, BOMs, spec sheets and unreleased video
takes with your editorial ratings in them. Staying private costs the 2,000 free
Actions minutes per month (roughly 30–60 renders); if that ever binds, buying
minutes is far cheaper than publishing the work.

## Connecting the studio to GitHub

Once deployed, open the studio and use **Settings → Connect**.

1. GitHub → Settings → Developer settings → **Fine-grained tokens**.
2. Repository access: **Only select repositories** → this one.
3. Permissions: **Contents: Read and write**. Add **Actions: Read and write**
   only when you want to dispatch renders from the iPad.
4. Set an expiry. Ninety days is a reasonable default.
5. Paste it into the studio. It's stored in that browser's local storage and is
   sent nowhere but `api.github.com`.

**What you're accepting:** anything that can run script on the studio's origin
can read that token. So don't open untrusted previews on this origin, and revoke
the token from GitHub if a device goes missing. The upgrade path — a GitHub App
with device flow behind one Cloudflare Worker — removes the long-lived token
entirely; `studio/shell/fs/auth.ts` is the seam where it swaps in.

## Installing on the iPad

Open the deployed URL in Safari → Share → **Add to Home Screen**. It launches
standalone, with the instrument-panel icon and no browser chrome.

## Local development

```bash
npm run web
```

No token needed. A dev-only Vite middleware serves the real checkout to the Code
room, so edits hit disk directly. It is `apply: 'serve'` only and never exists in
a production build — the deployed studio is static files with no server to
exploit.
