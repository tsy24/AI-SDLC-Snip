#!/usr/bin/env node

const { spawn } = require('node:child_process');

const baseUrl = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/$/, '');

function usage() {
  console.log(`Usage:
  snip add <url>    Shorten a URL
  snip ls            List shortened links
  snip open <code>   Open a short link in the browser`);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}

async function request(path, options = {}) {
  try {
    const response = await fetch(`${baseUrl}${path}`, options);
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      throw new Error(body?.error || `Request failed (${response.status})`);
    }
    return { response, body };
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Unable to reach ${baseUrl}`);
    }
    throw error;
  }
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
}

async function add(url) {
  if (!/^https?:\/\/.+/i.test(url || '')) {
    throw new Error('URL must start with http:// or https://');
  }
  const { body } = await request('/api/links', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url })
  });
  console.log(body.shortUrl);
}

async function list() {
  const { body: links } = await request('/api/links');
  if (links.length === 0) {
    console.log('No links yet.');
    return;
  }

  const codeWidth = Math.max(4, ...links.map((link) => link.code.length));
  const hitsWidth = Math.max(4, ...links.map((link) => String(link.hits).length));
  console.log(`${'CODE'.padEnd(codeWidth)}  ${'HITS'.padStart(hitsWidth)}  URL`);
  for (const link of links) {
    console.log(`${link.code.padEnd(codeWidth)}  ${String(link.hits).padStart(hitsWidth)}  ${link.url}`);
  }
}

async function open(code) {
  if (!code) {
    throw new Error('A short code is required');
  }
  const { response } = await request(`/${encodeURIComponent(code)}`, { redirect: 'manual' });
  const location = response.headers.get('location');
  if (!location) {
    throw new Error(`No redirect location returned for ${code}`);
  }
  openBrowser(location);
  console.log(location);
}

async function main() {
  const [command, value] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    usage();
    return;
  }

  if (command === 'add') {
    await add(value);
  } else if (command === 'ls') {
    await list();
  } else if (command === 'open') {
    await open(value);
  } else {
    usage();
    throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => fail(error.message));
