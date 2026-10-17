/* ============================================================
   Linqiang Guo — Editorial homepage interactions
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("fx-ok"); // tells the <head> fallback that this script loaded
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --------------------------------------------------------
     THEME TOGGLE (dark default / light day mode, persisted)
     -------------------------------------------------------- */
  var themeBtn = document.getElementById("themeToggle");
  // If the visitor has chosen before, honour it; otherwise pick by local
  // time of day — light during the day (7:00–19:00), dark at night.
  var storedTheme = localStorage.getItem("theme");
  var theme;
  if (storedTheme === "light" || storedTheme === "dark") {
    theme = storedTheme;
  } else {
    var hr = new Date().getHours();
    theme = (hr >= 7 && hr < 19) ? "light" : "dark";
  }
  // canvas effects take their colours from the active theme's --c1..--c4
  var fxPal = [];
  function readPalette() {
    var cs = getComputedStyle(root), out = [];
    for (var i = 1; i <= 4; i++) {
      var h = cs.getPropertyValue("--c" + i).trim().replace("#", "");
      if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
      out.push([parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
    }
    return out;
  }
  function applyTheme(t) {
    theme = t;
    if (t === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    fxPal = readPalette();
    try { root.dispatchEvent(new Event("themechange")); } catch (e) {}
  }
  applyTheme(theme);
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      applyTheme(theme === "dark" ? "light" : "dark");
      localStorage.setItem("theme", theme);
    });
  }

  /* --------------------------------------------------------
     0a. INTRO LOADER
     Dismiss once the page has loaded (with a short minimum so
     the animation reads), plus a safety timeout.
     -------------------------------------------------------- */
  var loader = document.getElementById("loader");
  if (loader) {
    var done = false;
    function hideLoader() { if (!done) { done = true; loader.classList.add("is-done"); root.classList.add("is-ready"); } }
    if (reduceMotion) {
      hideLoader();
    } else {
      var started = Date.now();
      window.addEventListener("load", function () {
        setTimeout(hideLoader, Math.max(0, 1050 - (Date.now() - started)));
      });
      setTimeout(hideLoader, 2600); // safety net if 'load' already fired
    }
  } else {
    root.classList.add("is-ready");
  }

  /* --------------------------------------------------------
     0b. CUSTOM CURSOR (fine-pointer devices only)
     A small dot tracks the pointer exactly; a larger ring
     trails with easing and grows over interactive elements.
     -------------------------------------------------------- */
  var cRing = document.getElementById("cursorRing");
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  if (cRing && finePointer && !reduceMotion) {
    root.classList.add("has-custom-cursor");
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    var rx = cx, ry = cy;
    window.addEventListener("pointermove", function (e) {
      cx = e.clientX; cy = e.clientY;
    }, { passive: true });
    (function ringLoop() {
      rx += (cx - rx) * 0.18; ry += (cy - ry) * 0.18;
      cRing.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
      requestAnimationFrame(ringLoop);
    })();
    document.querySelectorAll("a, button, .portrait").forEach(function (el) {
      el.addEventListener("mouseenter", function () { cRing.classList.add("is-hover"); });
      el.addEventListener("mouseleave", function () { cRing.classList.remove("is-hover"); });
    });
  }

  /* --------------------------------------------------------
     1a. CURSOR-FOLLOWING COLOUR FILL ON THE BIG NAME (炫彩)
     --mx/--my drive the radial colour fill of the giant name
     and the contact title.
     -------------------------------------------------------- */
  var pending = false;
  var lastX = window.innerWidth / 2, lastY = window.innerHeight * 0.4;
  function paint() {
    pending = false;
    root.style.setProperty("--mx", lastX + "px");
    root.style.setProperty("--my", lastY + "px");
  }
  window.addEventListener("pointermove", function (e) {
    lastX = e.clientX; lastY = e.clientY;
    if (!pending) { pending = true; requestAnimationFrame(paint); }
  }, { passive: true });
  paint();

  /* --------------------------------------------------------
     1b. INTERACTIVE DOT GRID (Claude-style pixels)
     A faint grid of dots fills the hero. Dots near the cursor
     are pushed outward, scaled up, and tinted with the
     iridescent palette — so the pointer carves a glowing,
     colourful trail through the pixels.
     -------------------------------------------------------- */
  var fxCanvas = document.getElementById("fxCanvas");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Gestures that drive the canvas effects.
     - Touch screens: the finger also scrolls, so nothing follows it. A real
       tap (no drag, released quickly) fires "fx:tap": a small burst plus a
       ripple through the dots.
     - Holding still (a finger, or the mouse button on desktop) for 380ms
       starts "fx:holdstart" and then an "fx:pulse" every 420ms until release
       ("fx:holdend"). Each pulse is a wave that reflects off the screen
       edges, so pulses interfere like ripples in a pool. While a finger is
       down the page suppresses text selection / the link callout, so a long
       press plays the ripples instead.
     Both canvases only animate on touch screens while an effect is playing. */
  var touchMode = !finePointer;
  var press = null, swallowClick = 0;
  var fire = function (name, x, y) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: { x: x, y: y } })); } catch (err) {}
  };
  var endPress = function (released) {
    if (!press) return;
    clearTimeout(press.timer); clearTimeout(press.cap); clearInterval(press.pulse);
    if (press.hold) { fire("fx:holdend", press.x, press.y); if (released) swallowClick = performance.now(); }
    root.classList.remove("is-pressing");
    press = null;
  };
  window.addEventListener("pointerdown", function (e) {
    if (reduceMotion || (e.pointerType === "mouse" && e.button !== 0)) return;
    endPress(false);
    var p = press = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(),
                      id: e.pointerId, touch: e.pointerType === "touch", hold: false };
    if (p.touch) root.classList.add("is-pressing");
    p.timer = setTimeout(function () {
      p.hold = true;
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) {} }
      fire("fx:holdstart", p.x, p.y);
      fire("fx:pulse", p.x, p.y);
      p.pulse = setInterval(function () { fire("fx:pulse", p.x, p.y); }, 420);
      p.cap = setTimeout(function () { endPress(false); }, 15000);
    }, 380);
  }, { passive: true });
  window.addEventListener("pointermove", function (e) {
    if (!press || e.pointerId !== press.id) return;
    if (press.hold) { press.x = e.clientX; press.y = e.clientY; fire("fx:holdmove", press.x, press.y); return; }
    var dx = e.clientX - press.x0, dy = e.clientY - press.y0, lim = press.touch ? 12 : 6;
    if (dx * dx + dy * dy > lim * lim) endPress(false);          // a scroll or a drag, not a press
  }, { passive: true });
  window.addEventListener("pointerup", function (e) {
    if (!press || e.pointerId !== press.id) return;
    if (press.hold) { endPress(true); return; }
    if (press.touch && performance.now() - press.t < 450) fire("fx:tap", e.clientX, e.clientY);
    endPress(false);
  }, { passive: true });
  window.addEventListener("pointercancel", function () { endPress(false); }, { passive: true }); // scroll took over
  window.addEventListener("contextmenu", function (e) { if (press && press.hold) e.preventDefault(); });
  // releasing a long press over a link shouldn't also follow the link
  window.addEventListener("click", function (e) {
    if (performance.now() - swallowClick < 500) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  if (fxCanvas && !reduce) {
    var ctx = fxCanvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var SPACING = 26;       // gap between dots (smaller = denser)
    var RADIUS = 170;       // cursor influence radius
    var dots = [];
    var W = 0, H = 0;
    // resting dot colour differs by theme so dots stay visible on light bg
    function baseColour() { return theme === "light" ? [120, 120, 138] : [150, 150, 165]; }

    // smoothed pointer in viewport coords; start off-screen
    var mx = -9999, my = -9999, sx = -9999, sy = -9999;

    var waves = [], running = false;
    // [mirror x, mirror y, strength]: the wave itself, its reflections off
    // the four edges, and the second reflections in the four corners
    var MIRRORS = [[0, 0, 1], [-1, 0, 0.6], [1, 0, 0.6], [0, -1, 0.6], [0, 1, 0.6],
                   [-1, -1, 0.36], [1, -1, 0.36], [-1, 1, 0.36], [1, 1, 0.36]];
    function build() {
      // on phones the address bar resizes the viewport while scrolling:
      // keep the tallest height seen so that never forces a rebuild
      W = window.innerWidth; H = touchMode ? Math.max(H, window.innerHeight) : window.innerHeight;
      if (touchMode) fxCanvas.style.height = H + "px";
      fxCanvas.width = Math.round(W * dpr);
      fxCanvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      var cols = Math.ceil(W / SPACING) + 1, rows = Math.ceil(H / SPACING) + 1;
      var ox = (W - (cols - 1) * SPACING) / 2;
      var oy = (H - (rows - 1) * SPACING) / 2;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          dots.push({ bx: ox + c * SPACING, by: oy + r * SPACING, ci: (r + c) % 4 });
        }
      }
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function tick() {
      sx += (mx - sx) * 0.16; sy += (my - sy) * 0.16;
      ctx.clearRect(0, 0, W, H);
      var BASE = baseColour(), PAL = fxPal, now = performance.now();
      // ripples: each wave travels outward and reflects off the screen
      // edges — modelled as mirror-image sources beyond each edge/corner —
      // so overlapping wavefronts add up and interfere
      var src = [], VW = window.innerWidth, VH = window.innerHeight;
      for (var w = waves.length - 1; w >= 0; w--) {
        var wv = waves[w], age = now - wv.born;
        if (age > wv.life) { waves.splice(w, 1); continue; }
        var wr = age * 0.55, wf = Math.pow(1 - age / wv.life, 1.2) * wv.amp;
        for (var m = 0; m < MIRRORS.length; m++) {
          var mi = MIRRORS[m];
          src.push({ x: mi[0] < 0 ? -wv.x : mi[0] > 0 ? 2 * VW - wv.x : wv.x,
                     y: mi[1] < 0 ? -wv.y : mi[1] > 0 ? 2 * VH - wv.y : wv.y,
                     r: wr, f: wf * mi[2] });
        }
      }
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var dx = d.bx - sx, dy = d.by - sy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var t = dist < RADIUS ? (1 - dist / RADIUS) : 0;
        t = t * t; // ease
        var ang = Math.atan2(dy, dx);
        var vx = 0, vy = 0, inten = 0;
        for (var k = 0; k < src.length; k++) {
          var s = src[k], wx = d.bx - s.x, wy = d.by - s.y, dd = wx * wx + wy * wy;
          var lo = s.r - 64, hi = s.r + 64;
          if (dd > hi * hi || (lo > 0 && dd < lo * lo)) continue;
          var wd = Math.sqrt(dd) || 1, del = wd - s.r, env = 1 - Math.abs(del) / 64;
          env = env * env * s.f;
          var pv = env * Math.cos(del * 0.11);
          vx += wx / wd * pv; vy += wy / wd * pv; inten += env;
        }
        var push = t * 18;
        var x = d.bx + Math.cos(ang) * push + vx * 13;
        var y = d.by + Math.sin(ang) * push + vy * 13;
        if (inten > t) t = Math.min(1, inten);
        var size = 1.7 + t * 2.8;          // bigger dots overall
        var a = 0.16 + t * 0.84;           // a touch more visible at rest
        var col = PAL[d.ci];
        var rr = Math.round(lerp(BASE[0], col[0], t));
        var gg = Math.round(lerp(BASE[1], col[1], t));
        var bb = Math.round(lerp(BASE[2], col[2], t));
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + rr + "," + gg + "," + bb + "," + a + ")";
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // desktop animates continuously (it follows the mouse); touch only
      // while a ripple is playing, then rests on a static frame
      if (!touchMode || waves.length) requestAnimationFrame(tick);
      else running = false;
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }

    // canvas is fixed at viewport 0,0, so pointer coords map directly
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      mx = e.clientX; my = e.clientY;
    }, { passive: true });
    window.addEventListener("pointerout", function () { mx = -9999; my = -9999; });
    window.addEventListener("fx:tap", function (e) {
      waves.push({ x: e.detail.x, y: e.detail.y, born: performance.now(), life: 1200, amp: 1 });
      kick();
    });
    window.addEventListener("fx:pulse", function (e) {
      waves.push({ x: e.detail.x, y: e.detail.y, born: performance.now(), life: 2800, amp: 0.9 });
      if (waves.length > 10) waves.shift();
      kick();
    });
    root.addEventListener("themechange", kick);

    var rt, lastW = window.innerWidth;
    window.addEventListener("resize", function () {
      if (touchMode && window.innerWidth === lastW && window.innerHeight <= H) return;
      lastW = window.innerWidth;
      clearTimeout(rt); rt = setTimeout(function () { build(); kick(); }, 150);
    });

    build();
    kick();
  }

  /* --------------------------------------------------------
     2. METEOR CURSOR (bright head + tapering mosaic tail)
     Drawn on an overlay canvas above all content so the
     meteor reads as one object anywhere on the page.
     -------------------------------------------------------- */
  var meteor = document.getElementById("meteorCanvas");
  if (meteor && !reduceMotion) {                 // runs on touch devices too
    var mctx = meteor.getContext("2d");
    var mdpr = Math.min(window.devicePixelRatio || 1, 2);
    var mW = 0, mH = 0, maxTiles = 72;
    var MTILE = 16, MLIFE = 520;
    var tiles = [];
    var ptrX = window.innerWidth / 2, ptrY = window.innerHeight / 2; // raw pointer
    var hx = ptrX, hy = ptrY;                                         // smoothed head
    var palIdx = 0, mActive = false;
    var lpx = ptrX, lpy = ptrY;                  // last point a tile was dropped at
    var glow = 1;

    var bursts = [], mRunning = false, rings = [], holding = null;
    var startMeteor = function () { if (!mRunning) { mRunning = true; requestAnimationFrame(meteorTick); } };
    // add only the on-screen parts of a circle to the current path: the
    // mirrored rings are mostly off-screen, and rasterising whole huge
    // circles is what costs frames
    var TAU = Math.PI * 2;
    var visibleArc = function (cx, cy, r, VW, VH) {
      var angs = [0, TAU];
      var cut = function (v, isX) {
        var q = (isX ? v - cx : v - cy) / r;
        if (q <= -1 || q >= 1) return;
        if (isX) { var a = Math.acos(q); angs.push(a, TAU - a); }
        else { var b = Math.asin(q); angs.push((b + TAU) % TAU, (Math.PI - b + TAU) % TAU); }
      };
      cut(0, true); cut(VW, true); cut(0, false); cut(VH, false);
      angs.sort(function (m, n) { return m - n; });
      for (var i = 0; i < angs.length - 1; i++) {
        var a0 = angs[i], a1 = angs[i + 1];
        if (a1 - a0 < 1e-4) continue;
        var mid = (a0 + a1) / 2, px = cx + r * Math.cos(mid), py = cy + r * Math.sin(mid);
        if (px < 0 || px > VW || py < 0 || py > VH) continue;
        mctx.moveTo(cx + r * Math.cos(a0), cy + r * Math.sin(a0));
        mctx.arc(cx, cy, r, a0, a1);
      }
    };
    function meteorSize() {
      mW = window.innerWidth; mH = touchMode ? Math.max(mH, window.innerHeight) : window.innerHeight;
      if (touchMode) meteor.style.height = mH + "px";
      maxTiles = mW < 640 ? 56 : 80;
      meteor.width = Math.round(mW * mdpr); meteor.height = Math.round(mH * mdpr);
      mctx.setTransform(mdpr, 0, 0, mdpr, 0, 0);
    }

    function addTile(x, y) {
      var tx = Math.round(x / MTILE) * MTILE, ty = Math.round(y / MTILE) * MTILE;
      var last = tiles[tiles.length - 1];
      if (!last || last.tx !== tx || last.ty !== ty) {
        tiles.push({ tx: tx, ty: ty, born: performance.now(), ci: (palIdx++) % 4 });
        if (tiles.length > maxTiles) tiles.shift();
      }
    }
    // drop tiles along the path so fast swipes leave a continuous, smooth trail
    function trailTo(x, y) {
      var dx = x - lpx, dy = y - lpy, dist = Math.sqrt(dx * dx + dy * dy);
      var step = MTILE * 0.55;
      if (dist <= step) { addTile(x, y); lpx = x; lpy = y; return; }
      var n = Math.min(48, Math.ceil(dist / step));
      for (var i = 1; i <= n; i++) addTile(lpx + dx * i / n, lpy + dy * i / n);
      lpx = x; lpy = y;
    }
    // the trail follows a mouse or pen only — never a finger, which is scrolling
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      ptrX = e.clientX; ptrY = e.clientY; mActive = true; trailTo(ptrX, ptrY);
    }, { passive: true });
    window.addEventListener("pointerout", function () { mActive = false; });
    // touch: a tap pops a small burst — a ring plus a few mosaic tiles
    window.addEventListener("fx:tap", function (e) {
      var parts = [];
      for (var q = 0; q < 8; q++) parts.push({ a: q / 8 * Math.PI * 2 + Math.random() * 0.5, d: 26 + Math.random() * 18, ci: q % 4 });
      bursts.push({ x: e.detail.x, y: e.detail.y, born: performance.now(), parts: parts });
      startMeteor();
    });
    // long press: a breathing orb under the finger, and a thin wavefront
    // ring per pulse that reflects off the screen edges with the dots
    window.addEventListener("fx:holdstart", function (e) { holding = { x: e.detail.x, y: e.detail.y, born: performance.now() }; startMeteor(); });
    window.addEventListener("fx:holdmove", function (e) { if (holding) { holding.x = e.detail.x; holding.y = e.detail.y; } });
    window.addEventListener("fx:holdend", function () { holding = null; });
    window.addEventListener("fx:pulse", function (e) {
      rings.push({ x: e.detail.x, y: e.detail.y, born: performance.now() });
      if (rings.length > 10) rings.shift();
      startMeteor();
    });

    function meteorTick() {
      hx += (ptrX - hx) * 0.32; hy += (ptrY - hy) * 0.32;
      mctx.clearRect(0, 0, mW, mH);
      var now = performance.now();
      var pal = fxPal, c1 = pal[0], c2 = pal[1];

      // tapering, glowing mosaic tail (newer tiles are larger & brighter)
      for (var i = tiles.length - 1; i >= 0; i--) {
        var p = tiles[i], col = pal[p.ci];
        var k = 1 - (now - p.born) / MLIFE;
        if (k <= 0) { tiles.splice(i, 1); continue; }
        var s = 3 + (MTILE - 2) * k;
        mctx.shadowBlur = 12 * k * glow;
        mctx.shadowColor = "rgba(" + col[0] + "," + col[1] + "," + col[2] + ",0.9)";
        mctx.fillStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + (k * 0.85) + ")";
        mctx.fillRect(p.tx - s / 2, p.ty - s / 2, s, s);
      }

      // bright meteor head at the smoothed cursor position
      if (mActive) {
        var mid = "rgba(" + c1[0] + "," + c1[1] + "," + c1[2] + ",0.95)";
        mctx.shadowBlur = 22 * glow; mctx.shadowColor = mid;
        var g = mctx.createRadialGradient(hx, hy, 0, hx, hy, 10);
        g.addColorStop(0, "rgba(255,255,255,0.98)");
        g.addColorStop(0.45, mid);
        g.addColorStop(1, "rgba(" + c2[0] + "," + c2[1] + "," + c2[2] + ",0)");
        mctx.fillStyle = g;
        mctx.beginPath(); mctx.arc(hx, hy, 10, 0, Math.PI * 2); mctx.fill();
      }
      // everything below is drawn without the head's glow: a shadow blur
      // on the big wavefront rings would cost a full-screen blur per frame
      mctx.shadowBlur = 0;
      // tap bursts (touch screens)
      for (var b = bursts.length - 1; b >= 0; b--) {
        var bu = bursts[b], u = (now - bu.born) / 650;
        if (u >= 1) { bursts.splice(b, 1); continue; }
        var e2 = 1 - Math.pow(1 - u, 3), fade = 1 - u;
        var ring = mctx.createLinearGradient(bu.x - 30, bu.y - 30, bu.x + 30, bu.y + 30);
        ring.addColorStop(0, "rgba(" + c1[0] + "," + c1[1] + "," + c1[2] + "," + fade + ")");
        ring.addColorStop(1, "rgba(" + pal[2][0] + "," + pal[2][1] + "," + pal[2][2] + "," + fade + ")");
        mctx.strokeStyle = ring; mctx.lineWidth = 2.2 * fade + 0.4;
        mctx.beginPath(); mctx.arc(bu.x, bu.y, 6 + e2 * 30, 0, Math.PI * 2); mctx.stroke();
        for (var q = 0; q < bu.parts.length; q++) {
          var pt = bu.parts[q], pc = pal[pt.ci], ss = 7 * fade + 1.5;
          var px = bu.x + Math.cos(pt.a) * pt.d * e2, py = bu.y + Math.sin(pt.a) * pt.d * e2;
          mctx.fillStyle = "rgba(" + pc[0] + "," + pc[1] + "," + pc[2] + "," + (fade * 0.9) + ")";
          mctx.fillRect(px - ss / 2, py - ss / 2, ss, ss);
        }
      }
      // wavefront rings + their mirror images (the visible reflections)
      if (rings.length) {
        var VW = window.innerWidth, VH = window.innerHeight;
        var rg = mctx.createLinearGradient(0, 0, VW, VH);
        rg.addColorStop(0, "rgb(" + c1[0] + "," + c1[1] + "," + c1[2] + ")");
        rg.addColorStop(0.5, "rgb(" + c2[0] + "," + c2[1] + "," + c2[2] + ")");
        rg.addColorStop(1, "rgb(" + pal[2][0] + "," + pal[2][1] + "," + pal[2][2] + ")");
        mctx.strokeStyle = rg; mctx.lineWidth = 1.4;
        for (var ri = rings.length - 1; ri >= 0; ri--) {
          var rn = rings[ri], ru = (now - rn.born) / 2800;
          if (ru >= 1) { rings.splice(ri, 1); continue; }
          var rr2 = (now - rn.born) * 0.55, ra = 0.5 * Math.pow(1 - ru, 1.4);
          var mxs = [rn.x, -rn.x, 2 * VW - rn.x], mys = [rn.y, -rn.y, 2 * VH - rn.y];
          for (var ix = 0; ix < 3; ix++) for (var iy = 0; iy < 3; iy++) {
            var cxm = mxs[ix], cym = mys[iy];
            // skip images whose circle can't reach the screen yet
            var ddx = Math.max(0, -cxm, cxm - VW), ddy = Math.max(0, -cym, cym - VH);
            if (ddx * ddx + ddy * ddy > rr2 * rr2) continue;
            mctx.globalAlpha = ra * (ix === 0 && iy === 0 ? 1 : (ix === 0 || iy === 0 ? 0.6 : 0.36));
            mctx.beginPath(); visibleArc(cxm, cym, rr2, VW, VH); mctx.stroke();
          }
        }
        mctx.globalAlpha = 1;
      }
      // breathing orb under a held finger / mouse
      if (holding) {
        var br = 15 + Math.sin((now - holding.born) / 140) * 3.5;
        var og = mctx.createRadialGradient(holding.x, holding.y, 0, holding.x, holding.y, br);
        og.addColorStop(0, "rgba(255,255,255,0.95)");
        og.addColorStop(0.35, "rgba(" + c1[0] + "," + c1[1] + "," + c1[2] + ",0.75)");
        og.addColorStop(1, "rgba(" + c2[0] + "," + c2[1] + "," + c2[2] + ",0)");
        mctx.fillStyle = og;
        mctx.beginPath(); mctx.arc(holding.x, holding.y, br, 0, Math.PI * 2); mctx.fill();
      }
      mctx.shadowBlur = 0;
      if (!touchMode || bursts.length || tiles.length || rings.length || holding) requestAnimationFrame(meteorTick);
      else { mRunning = false; mctx.clearRect(0, 0, mW, mH); }
    }

    var meteorRt, mLastW = window.innerWidth;
    window.addEventListener("resize", function () {
      if (touchMode && window.innerWidth === mLastW && window.innerHeight <= mH) return;
      mLastW = window.innerWidth;
      clearTimeout(meteorRt); meteorRt = setTimeout(meteorSize, 150);
    });
    meteorSize();
    if (!touchMode) { mRunning = true; requestAnimationFrame(meteorTick); }
  }

  /* --------------------------------------------------------
     3. DYNAMIC-ISLAND NAV
     Compact: live dot + current section + scroll-progress ring.
     Expanded (desktop, top of page or on hover): the nav links with
     a pill that springs between them. Mobile: tapping the capsule
     morphs it into a tall panel of links. JS measures the content
     and the CSS springs the capsule to that size.
     -------------------------------------------------------- */
  var island = document.getElementById("island");
  if (island) {
    var shell = island.querySelector(".island__shell");
    var compact = document.getElementById("islandToggle");
    var label = document.getElementById("islandLabel");
    var linksBox = document.getElementById("navLinks");
    var linkEls = Array.prototype.slice.call(linksBox.querySelectorAll("a"));
    var navInner = island.parentNode;
    var mqMobile = window.matchMedia("(max-width: 880px)");
    var NAMES = { news: "News", about: "About", publications: "Papers", experience: "Experience",
                  skills: "Skills", awards: "Awards", life: "Life", contact: "Contact" };
    var tracked = Array.prototype.slice.call(document.querySelectorAll("main section[id]"))
      .filter(function (s) { return NAMES[s.id]; });
    var state = "", current = null, hovering = false, overLinks = false, hoverTimer = 0, swapTimer = 0;
    linkEls.forEach(function (a, i) { a.style.setProperty("--i", i); });

    var sizeIsland = function () {
      var H = navInner.offsetHeight, w, h;
      if (state === "open") {
        w = linksBox.offsetWidth; h = linksBox.offsetHeight;
        shell.style.setProperty("--it", Math.round((H - compact.offsetHeight) / 2) + "px");
        shell.style.setProperty("--ir", "26px");
      } else {
        var el = state === "expanded" ? linksBox : compact;
        w = el.offsetWidth; h = el.offsetHeight;
        shell.style.setProperty("--it", Math.round((H - h) / 2) + "px");
        shell.style.setProperty("--ir", "999px");
      }
      shell.style.setProperty("--iw", w + "px");
      shell.style.setProperty("--ih", h + "px");
    };
    var activeLink = function () {
      if (!current) return null;
      for (var i = 0; i < linkEls.length; i++) if (linkEls[i].getAttribute("data-section") === current) return linkEls[i];
      return null;
    };
    var movePill = function (a) {
      if (!a || state !== "expanded") { linksBox.classList.remove("has-pill"); return; }
      linksBox.style.setProperty("--px", a.offsetLeft + "px");
      linksBox.style.setProperty("--pw", a.offsetWidth + "px");
      linksBox.classList.add("has-pill");
    };
    var setState = function (s) {
      if (s === state) return;
      state = s;
      island.classList.toggle("is-expanded", s !== "compact");
      island.classList.toggle("is-open", s === "open");
      compact.setAttribute("aria-expanded", s === "compact" ? "false" : "true");
      sizeIsland();
      movePill(activeLink());
    };
    var desired = function () {
      if (mqMobile.matches) return state === "open" ? "open" : "compact";
      return (window.scrollY < 140 || hovering) ? "expanded" : "compact";
    };
    var setLabel = function (text) {
      if (label.textContent === text) return;
      clearTimeout(swapTimer);
      label.classList.add("is-swapping");
      swapTimer = setTimeout(function () {
        label.textContent = text;
        label.classList.remove("is-swapping");
        if (state === "compact") sizeIsland();
      }, 180);
    };

    var islandTick = false;
    var onIslandScroll = function () {
      islandTick = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      compact.style.setProperty("--progress", max > 0 ? Math.min(1, window.scrollY / max).toFixed(3) : "0");
      if (tracked.length) {
        var cur = null, line = window.innerHeight * 0.4;
        for (var i = 0; i < tracked.length; i++) if (tracked[i].getBoundingClientRect().top <= line) cur = tracked[i].id;
        if (cur !== current) {
          current = cur;
          setLabel(cur ? NAMES[cur] : "Home");
          linkEls.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("data-section") === cur); });
          if (!overLinks) movePill(activeLink());
        }
      }
      setState(desired());
    };
    window.addEventListener("scroll", function () {
      if (!islandTick) { islandTick = true; requestAnimationFrame(onIslandScroll); }
    }, { passive: true });

    // desktop: hover / keyboard focus expands the capsule
    island.addEventListener("mouseenter", function () {
      if (mqMobile.matches) return;
      clearTimeout(hoverTimer); hovering = true; setState(desired());
    });
    island.addEventListener("mouseleave", function () {
      if (mqMobile.matches) return;
      hoverTimer = setTimeout(function () { hovering = false; setState(desired()); }, 240);
    });
    island.addEventListener("focusin", function () { if (!mqMobile.matches) { hovering = true; setState(desired()); } });
    island.addEventListener("focusout", function (e) {
      if (!island.contains(e.relatedTarget) && !mqMobile.matches) { hovering = false; setState(desired()); }
    });
    linkEls.forEach(function (a) {
      a.addEventListener("mouseenter", function () { overLinks = true; movePill(a); });
      a.addEventListener("click", function () { if (state === "open") setState("compact"); });
    });
    linksBox.addEventListener("mouseleave", function () { overLinks = false; movePill(activeLink()); });

    // tap the capsule: mobile opens the panel, desktop expands
    compact.addEventListener("click", function (e) {
      e.stopPropagation();
      if (mqMobile.matches) setState(state === "open" ? "compact" : "open");
      else { hovering = true; setState("expanded"); }
    });
    document.addEventListener("click", function (e) {
      if (state === "open" && !island.contains(e.target)) setState("compact");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state === "open") { setState("compact"); compact.focus(); }
    });
    window.addEventListener("resize", function () {
      if (!mqMobile.matches && state === "open") state = "";
      setState(desired()); sizeIsland(); movePill(activeLink());
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { sizeIsland(); movePill(activeLink()); });
    onIslandScroll();
    sizeIsland();
  }

  /* --------------------------------------------------------
     4. NAV BORDER ON SCROLL
     -------------------------------------------------------- */
  var nav = document.getElementById("nav");
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* --------------------------------------------------------
     5. SCROLL REVEAL
     -------------------------------------------------------- */
  var reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      // items entering together resolve in a short cascade
      var n = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.style.setProperty("--rd", (n++ * 0.08).toFixed(2) + "s");
        el.classList.add("is-visible");
        io.unobserve(el);
        setTimeout(function () { el.style.removeProperty("--rd"); }, 1800);
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* --------------------------------------------------------
     5b. NEWS — show the latest five, fold the rest behind a toggle
     -------------------------------------------------------- */
  var newsList = document.querySelector("#news .news");
  if (newsList) {
    var newsItems = newsList.querySelectorAll(".news__item");
    var KEEP = 5;
    if (newsItems.length > KEEP) {
      for (var n = KEEP; n < newsItems.length; n++) newsItems[n].classList.add("is-folded");
      var moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "news__more";
      moreBtn.setAttribute("aria-expanded", "false");
      var moreLabel = function (open) { return open ? "Show less" : "Show all news (" + (newsItems.length - KEEP) + " more)"; };
      moreBtn.innerHTML = "<span>" + moreLabel(false) + "</span>";
      moreBtn.addEventListener("click", function () {
        var open = newsList.classList.toggle("is-open");
        moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
        moreBtn.querySelector("span").textContent = moreLabel(open);
        if (!open) moreBtn.scrollIntoView({ block: "nearest" });
      });
      newsList.parentNode.insertBefore(moreBtn, newsList.nextSibling);
    }
  }

  /* --------------------------------------------------------
     5c. PUBLICATION DETAILS
     Resting on a paper (or tapping it) unfolds its figure and a
     short summary under the row. Only one is open at a time. When a
     row above folds up, the page scroll is compensated each frame so
     the paper under the cursor stays put — no chain of rows opening
     and closing as content shifts.
     -------------------------------------------------------- */
  var pubList = document.querySelector(".pubs");
  if (pubList) {
    var moreRows = Array.prototype.slice.call(pubList.querySelectorAll(".pub.has-more"));
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var openRow = null, dwellTimer = 0, closeTimer = 0;
    var holdStill = function (row) {
      var top0 = row.getBoundingClientRect().top, t0 = performance.now();
      (function step() {
        var dy = row.getBoundingClientRect().top - top0;
        if (Math.abs(dy) > 0.5) window.scrollBy({ top: dy, left: 0, behavior: "instant" });
        if (performance.now() - t0 < 750) requestAnimationFrame(step);
      })();
    };
    var setOpen = function (row) {
      if (row === openRow) return;
      var prev = openRow;
      openRow = row;
      if (prev && row && (prev.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING)) holdStill(row);
      if (prev) { prev.classList.remove("is-open"); prev.setAttribute("aria-expanded", "false"); }
      if (row) { row.classList.add("is-open"); row.setAttribute("aria-expanded", "true"); }
    };
    moreRows.forEach(function (row) {
      if (canHover) {
        row.addEventListener("pointerenter", function () {
          clearTimeout(closeTimer); clearTimeout(dwellTimer);
          dwellTimer = setTimeout(function () { setOpen(row); }, 260);
        });
        row.addEventListener("pointerleave", function () { clearTimeout(dwellTimer); });
      }
      row.addEventListener("click", function (e) {
        if (e.target.closest("a")) return;
        setOpen(openRow === row ? null : row);
      });
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(openRow === row ? null : row); }
      });
    });
    if (canHover) {
      pubList.addEventListener("pointerenter", function () { clearTimeout(closeTimer); });
      pubList.addEventListener("pointerleave", function () {
        clearTimeout(dwellTimer);
        closeTimer = setTimeout(function () { setOpen(null); }, 600);
      });
    }
  }

  /* --------------------------------------------------------
     6. FOOTER YEAR
     -------------------------------------------------------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
