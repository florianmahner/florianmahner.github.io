/* ==========================================================================
   Motion — the breathing dot grid and the name intro.

   Background (<html data-bg>): "breathe" | "none"
     Slow, irregular patches drift across the dot grid (smooth 3D value noise);
     dots inside a patch brighten and swell a little. Drawn on one fixed canvas behind the page, colours read
     from the CSS tokens so light and dark mode just work.

   Intro (<html data-intro>): "hop" | "none"
     The name is there from the start; the dot after "P" pops in, crouches,
     hops, lands with squash-and-stretch and sends out one soft ring.

   Both are skipped for prefers-reduced-motion; the grid pauses in background
   tabs and stays static (CSS dots) on touch devices. ?bg= and ?intro=
   override the defaults for testing.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var dark = window.matchMedia('(prefers-color-scheme: dark)');
  var coarse = window.matchMedia('(pointer: coarse)');
  var params = new URLSearchParams(location.search);

  // ---- breathing dot grid ---------------------------------------------------
  var canvas = document.createElement('canvas');
  canvas.className = 'bg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, GAP = 16, BUCKETS = 8, FPS = 24;
  var dot = { r: 17, g: 17, b: 17, a: 0.08 };
  var on = false, raf = 0, last = 0, t0 = performance.now();

  function readColor() {
    ctx.fillStyle = '#000';
    ctx.fillStyle = getComputedStyle(root).getPropertyValue('--dots').trim() || 'rgba(17,17,17,.08)';
    var v = ctx.fillStyle, m;
    if (v[0] === '#') dot = { r: parseInt(v.slice(1, 3), 16), g: parseInt(v.slice(3, 5), 16), b: parseInt(v.slice(5, 7), 16), a: 1 };
    else { m = v.match(/[\d.]+/g); dot = { r: +m[0], g: +m[1], b: +m[2], a: m[3] == null ? 1 : +m[3] }; }
  }
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // Smooth 3D value noise (x, y, time) — irregular, slowly evolving patches
  // instead of a regular wave.
  function hash(x, y, z) {
    var h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    return ((h ^ (h >>> 16)) & 0xffff) / 65535;
  }
  function noise(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var xf = x - xi, yf = y - yi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    var a = hash(xi, yi, zi), b = hash(xi + 1, yi, zi), c = hash(xi, yi + 1, zi), d = hash(xi + 1, yi + 1, zi);
    var e = hash(xi, yi, zi + 1), f = hash(xi + 1, yi, zi + 1), g = hash(xi, yi + 1, zi + 1), h = hash(xi + 1, yi + 1, zi + 1);
    var x00 = a + (b - a) * u, x10 = c + (d - c) * u, x01 = e + (f - e) * u, x11 = g + (h - g) * u;
    var y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  }

  // The field is smooth, so it is evaluated on a coarse lattice (every
  // second dot) and interpolated in between — 4x fewer noise samples.
  var field = new Float32Array(0), fcols = 0;
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var sec = t / 1000, sy = window.scrollY, oy = -(sy % GAP);   // dots scroll with the page
    var z1 = sec * 0.045, z2 = sec * 0.07 + 11.3;                  // slow evolution
    var dx = sec * 3.5, dy = sec * 1.8;                            // and a gentle drift
    var x0 = GAP / 2, y0 = GAP / 2 + oy, STEP = GAP * 2;
    var cols = Math.ceil((W + GAP) / STEP) + 2, rows = Math.ceil((H + GAP) / STEP) + 2;
    if (field.length < cols * rows) field = new Float32Array(cols * rows);
    fcols = cols;
    for (var ry = 0; ry < rows; ry++) {
      for (var rx = 0; rx < cols; rx++) {
        var px = x0 + rx * STEP + dx, py = y0 + ry * STEP + sy + dy;   // page coordinates
        var n = 0.65 * noise(px * 0.0042, py * 0.0042, z1) + 0.35 * noise(px * 0.011, py * 0.011, z2);
        var w = (n - 0.56) / 0.4;                                    // only the highest patches light up
        field[ry * cols + rx] = w <= 0 ? 0 : w >= 1 ? 1 : w * w;
      }
    }
    // Dots are bucketed by brightness, so a frame is eight fills, not thousands.
    var paths = [];
    for (var i = 0; i < BUCKETS; i++) paths.push(new Path2D());
    var yi = 0;
    for (var y = y0; y < H + GAP; y += GAP, yi++) {
      var fy = yi / 2, ry0 = fy | 0, ty = fy - ry0;
      var xi = 0;
      for (var x = x0; x < W + GAP; x += GAP, xi++) {
        var fx = xi / 2, rx0 = fx | 0, tx = fx - rx0, k = ry0 * fcols + rx0;
        var top = field[k] + (field[k + 1] - field[k]) * tx;
        var bot = field[k + fcols] + (field[k + fcols + 1] - field[k + fcols]) * tx;
        var wv = top + (bot - top) * ty;
        var b = Math.round(wv * (BUCKETS - 1)), r = 1 + wv * 0.8;
        paths[b].moveTo(x + r, y);
        paths[b].arc(x, y, r, 0, 6.2832);
      }
    }
    for (var j = 0; j < BUCKETS; j++) {
      var a = Math.min(1, dot.a * (1 + 2.6 * j / (BUCKETS - 1)));
      ctx.fillStyle = 'rgba(' + dot.r + ',' + dot.g + ',' + dot.b + ',' + a + ')';
      ctx.fill(paths[j]);
    }
  }
  function loop(now) {
    raf = 0;
    if (!on || document.hidden) return;
    if (now - last >= 1000 / FPS - 2) { last = now; draw(now - t0); }
    raf = requestAnimationFrame(loop);
  }
  function setBackground(name) {
    // Touch devices keep the static CSS dots: a full-screen canvas redrawing
    // while you scroll costs smoothness on phones.
    on = name === 'breathe' && !calm.matches && !coarse.matches;
    root.classList.toggle('bg-live', on);
    canvas.style.display = on ? '' : 'none';
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (!on) return;
    readColor(); resize(); draw(performance.now() - t0);
    raf = requestAnimationFrame(loop);
  }

  // ---- name intro: dot pops in, hops, squashes, rings -----------------------
  var playing = null;
  function playIntro(name) {
    var h1 = document.querySelector('.hero-name');
    var el = h1 && h1.querySelector('.accent-dot');
    playing = null;
    root.classList.remove('intro-hop');
    if (el) { el.style.transform = ''; el.classList.remove('ring'); }
    if (!el || name !== 'hop' || calm.matches || document.hidden) return;
    void h1.offsetWidth;                                  // restart the CSS pop-in
    root.classList.add('intro-hop');
    var token = playing = {};
    setTimeout(function () { if (playing === token) hop(el, token); }, 950);
  }

  // Heights and speeds are in em of the name's size, so the motion scales with
  // the type. The dot crouches (anticipation), flies stretched along its
  // velocity, squashes on each landing in proportion to the impact, rings on
  // the first landing and settles.
  function hop(el, token) {
    var fs = parseFloat(getComputedStyle(el).fontSize);
    if (!fs) return;
    var g = 42 * fs, apex = 1.35 * fs, e = 0.5;
    var y = 0, vy = 0, squash = 0, landed = 0, phase = 'crouch', tp = 0, prev = null;
    el.style.transformOrigin = '50% 82%';
    function set(ty, sx, sy) {
      el.style.transform = 'translateY(' + (-ty).toFixed(2) + 'px) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';
    }
    function step(now) {
      if (playing !== token) return;
      if (prev === null) prev = now;
      var dt = Math.min(0.032, (now - prev) / 1000); prev = now; tp += dt;
      if (phase === 'crouch') {
        var c = Math.min(1, tp / 0.16);
        set(0, 1 + 0.28 * c, 1 - 0.32 * c);
        if (tp >= 0.16) { phase = 'fly'; vy = Math.sqrt(2 * g * apex); squash = 0.32; }
        return requestAnimationFrame(step);
      }
      if (phase === 'fly') {
        vy -= g * dt; y += vy * dt;
        if (y <= 0) {
          y = 0;
          var impact = -vy;
          squash = Math.min(0.42, impact / (fs * 30));
          if (++landed === 1) { el.classList.remove('ring'); void el.offsetWidth; el.classList.add('ring'); }
          if (impact < 3 * fs) { vy = 0; phase = 'settle'; }
          else vy = impact * e;
        }
        squash *= Math.exp(-dt * 20);
        var stretch = y > 0 ? Math.min(0.22, Math.abs(vy) / (fs * 60)) : 0;
        set(y, 1 - stretch * 0.55 + squash * 0.85, 1 + stretch - squash);
        return requestAnimationFrame(step);
      }
      squash *= Math.exp(-dt * 16);                       // settle
      set(0, 1 + squash * 0.85, 1 - squash);
      if (squash > 0.004) return requestAnimationFrame(step);
      el.style.transform = '';
    }
    requestAnimationFrame(step);
  }

  // ---- boot -----------------------------------------------------------------
  function boot() {
    var bg = params.get('bg') || root.getAttribute('data-bg') || 'none';
    var intro = params.get('intro') || root.getAttribute('data-intro') || 'none';
    document.body.prepend(canvas);
    setBackground(bg);
    playIntro(intro);

    window.addEventListener('resize', function () { if (on) { resize(); draw(performance.now() - t0); } });
    window.addEventListener('scroll', function () { if (on && !raf) draw(performance.now() - t0); }, { passive: true });
    document.addEventListener('visibilitychange', function () { if (on && !document.hidden && !raf) raf = requestAnimationFrame(loop); });
    dark.addEventListener('change', function () { if (on) { readColor(); draw(performance.now() - t0); } });
    calm.addEventListener('change', function () { setBackground(bg); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
