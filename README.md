# Snip CLI

A zero-dependency Node.js CLI for the Snip URL shortener API. Node 18 or newer is required for global `fetch`.

Set `SNIP_API` to use another backend; it defaults to `http://localhost:3000`.

```text
snip add <url>    Shorten a URL
snip ls            List shortened links
snip open <code>   Open a short link in the browser
```

Use `node cli.js ...`, or the included `snip`, `snip.cmd`, and `snip.ps1` wrappers. Errors are written to stderr and return exit code 1.
