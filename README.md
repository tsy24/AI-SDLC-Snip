# Snip

A tiny URL shortener backend, built as a single-file [Bun](https://bun.sh) server
with **zero npm dependencies**.

## Run

```bash
bun install # nothing to install, but keeps tooling happy
bun run start
```

The server listens on `PORT` (default `3000`).

## API

### `POST /api/links`

Create a short link.

```json
{ "url": "https://example.com" }
```

- `201` with the created link: `{ code, url, shortUrl, hits, createdAt }`
- `400` if the JSON body is invalid or `url` is not a valid `http(s)` URL

### `GET /api/links`

Returns `200` with an array of all links (same shape as above).

### `GET /:code`

Redirects (`302`) to the original URL and increments its hit counter.
Returns `404` if the code is unknown.

## Configuration

| Env var       | Default                                   | Description                                                      |
| ------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| `PORT`        | `3000`                                     | Port the server listens on                                        |
| `BASE_URL`    | `https://$RAILWAY_PUBLIC_DOMAIN` or `http://localhost:$PORT` | Origin used when building `shortUrl` values |
| `PUBLIC_DIR`  | _(unset)_                                  | If set, also serves static files from this folder (`/` → `index.html`). An existing static file wins over a same-named short code. |

## CORS

All responses include permissive CORS headers and `OPTIONS` preflight requests
are handled, so a browser app hosted on another origin can call this API
directly.
