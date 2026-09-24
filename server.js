// Snip - a tiny URL shortener backend (Bun, zero npm dependencies)

const PORT = Number(process.env.PORT) || 3000;

const BASE_URL = (
  process.env.BASE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`)
).replace(/\/+$/, "");

const PUBLIC_DIR = process.env.PUBLIC_DIR || null;

const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** @type {Map<string, {code: string, url: string, shortUrl: string, hits: number, createdAt: string}>} */
const links = new Map();

function randomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += BASE62[Math.floor(Math.random() * BASE62.length)];
  }
  return code;
}

function generateUniqueCode() {
  let code = randomCode();
  while (links.has(code)) {
    code = randomCode();
  }
  return code;
}

function isValidHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function serveStatic(pathname) {
  if (!PUBLIC_DIR) return null;

  let relativePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = `${PUBLIC_DIR}${relativePath}`;
  const file = Bun.file(filePath);

  if (await file.exists()) {
    return new Response(file, { headers: { ...CORS_HEADERS } });
  }
  return null;
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    const method = req.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (pathname === "/api/links" && method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      if (!body || !isValidHttpUrl(body.url)) {
        return json({ error: "Invalid or missing http(s) URL" }, 400);
      }

      const code = generateUniqueCode();
      const link = {
        code,
        url: body.url,
        shortUrl: `${BASE_URL}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      links.set(code, link);

      return json(link, 201);
    }

    if (pathname === "/api/links" && method === "GET") {
      return json(Array.from(links.values()));
    }

    if (method === "GET" && /^\/[^/]+$/.test(pathname)) {
      const code = pathname.slice(1);

      // An existing static file wins over a same-named short code.
      const staticResponse = await serveStatic(pathname);
      if (staticResponse) return staticResponse;

      const link = links.get(code);
      if (!link) {
        return json({ error: "Not found" }, 404);
      }

      link.hits += 1;
      return new Response(null, {
        status: 302,
        headers: { Location: link.url, ...CORS_HEADERS },
      });
    }

    if (method === "GET") {
      const staticResponse = await serveStatic(pathname);
      if (staticResponse) return staticResponse;
    }

    return json({ error: "Not found" }, 404);
  },
});

console.log(`Snip backend listening on port ${PORT} (base URL: ${BASE_URL})`);
