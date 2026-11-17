const CANONICAL_HOST = "florianmahner.com";
const INDEX_HTML = "/index.html";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Sent with every response. The site is static: its own files only, styles
// inline in the page, no third-party requests, never framed.
const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    // inline scripts are allowed because Cloudflare injects one of its own
    // (bot detection) into every page; the site itself has no inline script
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'"
  ].join("; "),
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

// Browsers may keep the fonts for a year without asking again. Without this,
// Cloudflare's default (max-age=0) makes every visit re-check the font
// (~300 ms) before it can be drawn. If a font file's contents ever change,
// give it a new name, or visitors keep the old one.
const FONT_CACHE = "public, max-age=31536000, immutable";

function withHeaders(response, pathname) {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) secured.headers.set(name, value);
  // also on 304: a browser that still holds the font under the old max-age=0
  // re-checks it once, and the 304's headers replace what it has stored
  const found = response.ok || response.status === 304;
  if (pathname.startsWith("/fonts/") && found) secured.headers.set("Cache-Control", FONT_CACHE);
  return secured;
}

function isLocalHost(hostname) {
  return LOCAL_HOSTS.has(hostname);
}

function redirectUrl(requestUrl) {
  const url = new URL(requestUrl);
  let changed = false;

  if (!isLocalHost(url.hostname)) {
    if (url.protocol !== "https:") {
      url.protocol = "https:";
      changed = true;
    }

    if (url.hostname !== CANONICAL_HOST) {
      url.hostname = CANONICAL_HOST;
      changed = true;
    }
  }

  if (url.pathname === INDEX_HTML) {
    url.pathname = "/";
    changed = true;
  } else if (url.pathname.endsWith(INDEX_HTML)) {
    url.pathname = url.pathname.slice(0, -INDEX_HTML.length + 1);
    changed = true;
  }

  return changed ? url.toString() : null;
}

function canTryDirectoryRedirect(pathname) {
  if (pathname === "/" || pathname.endsWith("/")) return false;
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  return !lastSegment.includes(".");
}

export default {
  async fetch(request, env) {
    const canonicalUrl = redirectUrl(request.url);
    if (canonicalUrl) {
      return Response.redirect(canonicalUrl, 301);
    }

    const url = new URL(request.url);
    if (canTryDirectoryRedirect(url.pathname)) {
      const slashUrl = new URL(url);
      slashUrl.pathname = `${slashUrl.pathname}/`;
      const slashRequest = new Request(slashUrl.toString(), request);
      const slashResponse = await env.ASSETS.fetch(slashRequest);

      if (slashResponse.status !== 404) {
        return Response.redirect(slashUrl.toString(), 301);
      }
    }

    return withHeaders(await env.ASSETS.fetch(request), url.pathname);
  }
};
