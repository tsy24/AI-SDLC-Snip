# Copilot instructions

<!-- Keep in sync with /CLAUDE.md (same rules, Claude Code's location). -->

Rules for working in this repo. It's **Snip** — a tiny URL shortener demoing a
git-submodule architecture. This `main` branch is the **docs-only starter** (the
tutorial in `docs/` plus these instructions); the **`solution` branch** holds the
finished superproject, where each app layer is a submodule pinned to a branch of
`kenken64/worktree-demo` (not this repo — historical quirk). Everything below
describes that finished architecture.

## Layout & tech stack

| Path | Branch (worktree-demo) | Stack | Notes |
|------|------------------------|-------|-------|
| `backend/` | `backend` | Bun 1.x, single `server.js` | Zero npm deps; in-memory `Map`, no DB **by design** |
| `frontend/` | `frontend` | Angular 19 standalone, signals, HttpClient | Project `snip-frontend`; build lands in `dist/snip-frontend/browser` |
| `cli/` | `cli` | Node ≥18, CommonJS, global `fetch` | Zero npm deps |
| `bundle/` | `bundle` | **Generated** release: Bun server + built UI + CLI | Docker `oven/bun:1-alpine`, Railway-ready |
| `scripts/build-bundle.mjs` | — (on `main`) | Node ESM, zero deps | Regenerates `bundle/` from the source submodules |
| `.github/workflows/` | — (on `main`) | Actions, Node 24, ghcr.io | `bundle.yml` hourly rebuild; `docker.yml` image on bundle pointer bump |

## API contract — keep in sync everywhere

Served on `:3000`; consumed by the Angular app, the CLI, and documented in READMEs.
Change it in all places at once or not at all.

| Method | Path | Response |
|--------|------|----------|
| `POST` | `/api/links` `{ "url": "https://…" }` | `201` `{ code, url, shortUrl, hits, createdAt }` · `400` |
| `GET`  | `/api/links` | `200` array of links |
| `GET`  | `/:code` | `302` to original (+1 hit) · `404` |

## Commands

```bash
git submodule update --init --recursive   # after any plain clone — folders are empty
cd backend  && bun start                  # API on :3000 (dev: bun run dev)
cd frontend && npm install && npx ng serve   # UI on :4200 (build: npx ng build)
cd cli      && node cli.js add|ls|open …  # SNIP_API overrides backend URL
cd bundle   && bun start                  # whole app, one process, :3000
node scripts/build-bundle.mjs [--push]    # regenerate bundle (+ publish with --push)
```

## The workflow (submodules)

1. Edit **inside** the submodule folder; commit + push there (updates its branch on
   `worktree-demo`).
2. Bump the pointer on `main`: `git submodule update --remote <path>`, `git add
   <path>`, commit, push. Without this, `main` still pins the old commit.
3. Release: `node scripts/build-bundle.mjs --push` — the bundle pointer bump is what
   triggers the Docker image workflow.

## Do

- Keep `backend/` and `cli/` at **zero npm dependencies** — that's the demo's point.
- Keep `build-bundle.mjs` idempotent (guard every commit on a non-empty staged diff —
  hourly CI reruns it) and cross-platform (npm must go through a shell for Windows).
- Update `docs/prompt-tutorial.md` when the architecture or contract changes.
- Keep this file in sync with `/CLAUDE.md`.

## Don't

- **Don't hand-edit generated files in `bundle/`** (`server.js`, `cli.js`, `public/`,
  `.env`, `package.json`, `Dockerfile`, `.dockerignore`, `railway.json`) — the build
  script overwrites them. `bundle/README.md` is the only hand-maintained file there.
- **Don't add `"type": "module"`** to `cli/package.json` or the generated bundle
  `package.json` — `cli.js` is CommonJS and must run under plain `node`.
- **Don't rename the Angular project or its `outputPath`** — the build script asserts
  `frontend/dist/snip-frontend/browser/index.html`.
- **Don't add a database or persistence** — in-memory storage that resets on restart
  is intentional.
- **Don't add `push:` triggers to `bundle.yml`** expecting them to fire for
  backend/frontend/cli pushes — the workflow file only exists on `main`, so they never
  will. Schedule + dispatch is deliberate.
- **Don't "fix" `docker.yml`'s `paths: [bundle]` to `bundle/**`** — it watches the
  submodule *gitlink* (pointer bump), not files; `bundle/**` would never match.
- **Don't commit secrets** — CI authenticates with the built-in `GITHUB_TOKEN` only.