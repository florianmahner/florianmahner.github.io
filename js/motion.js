/* ==========================================================================
   Motion — the breathing dot grid and the name intro.

   Background (<html data-bg>): "breathe" | "none"
     A slow wave rolls across the dot grid; dots under the crests brighten and
     swell a little. Drawn on one fixed canvas behind the page, colours read
     from the CSS tokens so light and dark mode just work.

   Intro (<html data-intro>): "type-hop" | "none"
     The name types in, the dot after "P" blinks once like a cursor, crouches,
     hops, lands with squash-and-stretch and sends out one soft ring.

   Both are skipped for prefers-reduced-motion; the grid pauses in background
   tabs. On localhost a small panel (bottom left) toggles the grid and replays
   the intro. ?bg= and ?intro= override the defaults for testing.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var dark = window.matchMedia('(prefers-color-scheme: dark)');
  var params = new URLSearchParams(location.search);

  // ---- breathing dot grid ---------------------------------------------------
  var canvas = document.createElement('canvas');
  canvas.className = 'bg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, GAP = 16, BUCKETS = 8, FPS = 30;
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
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var s = t * 0.00045, oy = -(window.scrollY % GAP);   // dots scroll with the page
    // Dots are bucketed by brightness, so a frame is eight fills, not thousands.
    var paths = [];
    for (var i = 0; i < BUCKETS; i++) paths.push(new Path2D());
    for (var y = GAP / 2 + oy; y < H + GAP; y += GAP) {
      for (var x = GAP / 2; x < W + GAP; x += GAP) {
        var w = Math.sin(x * 0.0065 + y * 0.004 - s * 2.2) * 0.6 + Math.sin(x * 0.002 - y * 0.007 + s * 1.3) * 0.4;
        w = w > 0 ? w * w * w : 0;                          // only the crests light up
        var b = Math.round(w * (BUCKETS - 1)), r = 1 + w * 0.8;
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
    on = name === 'breathe' && !calm.matches;
    root.classList.toggle('bg-live', on);
    canvas.style.display = on ? '' : 'none';
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (panel) panel.update();
    if (!on) return;
    readColor(); resize(); draw(performance.now() - t0);
    raf = requestAnimationFrame(loop);
  }

  // ---- name intro: type, blink, hop, squash, ring ---------------------------
  var playing = null;
  function playIntro(name) {
    var h1 = document.querySelector('.hero-name');
    var el = h1 && h1.querySelector('.accent-dot');
    playing = null;
    root.classList.remove('intro-type-hop');
    if (el) { el.style.transform = ''; el.classList.remove('ring'); }
    if (!el || name !== 'type-hop' || calm.matches || document.hidden) return;
    void h1.offsetWidth;                                  // restart the CSS typing
    root.classList.add('intro-type-hop');
    var token = playing = {};
    setTimeout(function () { if (playing === token) hop(el, token); }, 1500);
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

  // ---- localhost test panel -----------------------------------------------
  var panel = null;
  function buildPanel(bg) {
    var box = document.createElement('div');
    box.className = 'motion-panel';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Motion preview (localhost only)');
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.addEventListener('click', function () { bg = on ? 'none' : 'breathe'; setBackground(bg); });
    var replay = document.createElement('button');
    replay.type = 'button';
    replay.textContent = 'replay intro';
    replay.addEventListener('click', function () { window.scrollTo({ top: 0 }); playIntro('type-hop'); });
    box.appendChild(toggle); box.appendChild(replay);
    document.body.appendChild(box);
    return { update: function () { toggle.textContent = on ? 'grid: breathe' : 'grid: static'; toggle.setAttribute('aria-pressed', on ? 'true' : 'false'); } };
  }

  // ---- boot -----------------------------------------------------------------
  function boot() {
    var bg = params.get('bg') || root.getAttribute('data-bg') || 'none';
    var intro = params.get('intro') || root.getAttribute('data-intro') || 'none';
    document.body.prepend(canvas);
    if (isLocal) panel = buildPanel(bg);
    setBackground(bg);
    if (panel) panel.update();
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
