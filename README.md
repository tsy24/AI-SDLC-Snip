# Snip

Snip is a tiny URL shortener demonstrating a one-backend, two-client Git submodule architecture:

- `backend/` is a zero-dependency Bun API server.
- `frontend/` is an Angular 19 web client.
- `cli/` is a zero-dependency Node.js command-line client.

Each layer lives on its own orphan branch in this repository and is mounted here as a submodule. The `main` branch pins the exact commit used by each layer.

## API

The backend listens on port `3000` and stores links in memory, so data resets when it restarts.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `POST` | `/api/links` | `{ "url": "https://..." }` | `201` with `{ code, url, shortUrl, hits, createdAt }`, or `400` |
| `GET` | `/api/links` | None | `200` array of link objects |
| `GET` | `/:code` | None | `302` to the original URL and increments hits, or `404` |

## Clone

Use recursive clone so Git checks out the submodule contents. A plain clone leaves the submodule folders empty.

```bash
git clone --recurse-submodules https://github.com/tsy24/AI-SDLC-Snip.git
cd AI-SDLC-Snip
```

For an existing plain clone:

```bash
git submodule update --init --recursive
```

## Run

Start the backend first, then either or both clients:

```bash
cd backend && bun start
cd frontend && npm install && npx ng serve
cd cli && node cli.js ls
```

The web UI runs at `http://localhost:4200`. The CLI uses `http://localhost:3000` by default; set `SNIP_API` to use another backend URL.

## Updating

Make and commit changes inside the relevant submodule, then push its branch:

```bash
cd backend
git add -A && git commit -m "Update backend" && git push
```

Return to the superproject and move its pinned pointer to the branch tip:

```bash
cd ..
git submodule update --remote backend
git add backend
git commit -m "Bump backend submodule"
git push
```

Use the same workflow for `frontend` and `cli`. The superproject commit and the submodule commit are separate records.

## Generated bundle

The `bundle/` submodule is generated release output containing the Bun server, built Angular UI, and CLI. Do not edit it by hand. Regenerate it from the source submodules with:

```bash
node scripts/build-bundle.mjs
node scripts/build-bundle.mjs --push
```
