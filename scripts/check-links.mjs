#!/usr/bin/env node
// Link checker for the built site. Run `npm run check-links` (builds first).
//
// Scans every HTML file in _site/ for href/src attributes, then:
//   - internal links (/path, #anchor) must exist in _site/ (anchors on the page)
//   - external links are requested (HEAD, falling back to GET) and must answer 2xx/3xx
// Sites that refuse automated requests (401/403/429/999) are listed separately
// as "check by hand" rather than failing the run. Exit code 1 if anything is broken.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const SITE = "_site";
const TIMEOUT_MS = 20000;
const CONCURRENCY = 8;
const SKIP = [/^mailto:/, /^tel:/, /^javascript:/, /^data:/];
const BLOCKED = new Set([401, 403, 405, 406, 429, 999]);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 site-link-check";

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? htmlFiles(p) : p.endsWith(".html") ? [p] : [];
  });
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const links = new Map(); // url -> Set(pages)
const anchors = new Map(); // page -> Set(ids)

for (const file of htmlFiles(SITE)) {
  const html = readFileSync(file, "utf8");
  const page = "/" + relative(SITE, file).replace(/index\.html$/, "");
  anchors.set(page, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  // Skip JSON-LD and inline scripts; only real attributes count.
  const body = html.replace(/<script[\s\S]*?<\/script>/g, "");
  for (const m of body.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = decode(m[1]);
    if (SKIP.some((re) => re.test(url))) continue;
    if (!links.has(url)) links.set(url, new Set());
    links.get(url).add(page);
  }
}

async function request(url, method) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method, redirect: "follow", signal: ctrl.signal, headers: { "user-agent": UA, accept: "text/html,application/pdf,*/*" } });
    return { status: res.status, final: res.url };
  } catch (e) {
    return { status: 0, error: e.name === "AbortError" ? "timeout" : e.cause?.code || e.message };
  } finally {
    clearTimeout(timer);
  }
}

async function checkExternal(url) {
  let r = await request(url, "HEAD");
  if (r.status === 0 || r.status >= 400) r = await request(url, "GET"); // many servers mishandle HEAD
  return r;
}

function checkInternal(url, pages) {
  const [path, hash] = url.split("#");
  if (!path) {
    // same-page anchor: must exist on every page that links to it
    const missing = [...pages].filter((p) => !anchors.get(p)?.has(hash));
    return missing.length ? `missing #${hash} on ${missing.join(", ")}` : null;
  }
  const clean = decodeURIComponent(path.split("?")[0]);
  const target = join(SITE, clean.endsWith("/") ? clean + "index.html" : clean);
  if (!existsSync(target) && !existsSync(target + ".html") && !existsSync(join(target, "index.html"))) return "file not found";
  if (hash && !anchors.get(clean.endsWith("/") ? clean : clean + "/")?.has(hash)) return `missing #${hash}`;
  return null;
}

const broken = [], manual = [], ok = [];
const external = [];
for (const [url, pages] of links) {
  if (/^https?:\/\//.test(url)) external.push([url, pages]);
  else {
    const err = checkInternal(url, pages);
    (err ? broken : ok).push({ url, note: err || "internal", pages });
  }
}

let i = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (i < external.length) {
    const [url, pages] = external[i++];
    const r = await checkExternal(url);
    const entry = { url, pages, note: r.status ? `${r.status}${r.final && r.final !== url ? ` → ${r.final}` : ""}` : r.error };
    if (r.status >= 200 && r.status < 400) ok.push(entry);
    else if (BLOCKED.has(r.status)) manual.push(entry);
    else broken.push(entry);
  }
}));

const show = (e) => `  ${e.url}\n      ${e.note}  (on ${[...e.pages].join(", ")})`;
console.log(`Checked ${links.size} links on ${anchors.size} page(s): ${ok.length} ok, ${manual.length} to check by hand, ${broken.length} broken.\n`);
if (manual.length) console.log("Check by hand (site refuses automated requests):\n" + manual.map(show).join("\n") + "\n");
if (broken.length) console.log("BROKEN:\n" + broken.map(show).join("\n") + "\n");
// Ignore redirects that only add a query string (e.g. Nature's cookie check).
const samePath = (a, b) => { try { const x = new URL(a), y = new URL(b); return x.host === y.host && x.pathname === y.pathname; } catch { return false; } };
const redirected = ok.filter((e) => { const m = e.note.match(/→ (.+)$/); return m && !samePath(e.url, m[1]); });
if (redirected.length) console.log("Redirects (work, but the link could point at the final address):\n" + redirected.map(show).join("\n") + "\n");
process.exit(broken.length ? 1 : 0);
