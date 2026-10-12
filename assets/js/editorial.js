/* ============================================================
   Linqiang Guo — Editorial homepage interactions
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
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
  function applyTheme(t) {
    theme = t;
    if (t === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
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
    function hideLoader() { if (!done) { done = true; loader.classList.add("is-done"); } }
    if (reduceMotion) {
      hideLoader();
    } else {
      var started = Date.now();
      window.addEventListener("load", function () {
        setTimeout(hideLoader, Math.max(0, 1050 - (Date.now() - started)));
      });
      setTimeout(hideLoader, 2600); // safety net if 'load' already fired
    }
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

  if (fxCanvas && !reduce) {
    var ctx = fxCanvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var SPACING = 26;       // gap between dots (smaller = denser)
    var RADIUS = 170;       // cursor influence radius
    var dots = [];
    var W = 0, H = 0;
    // palettes match the CSS --c1..--c4: iridescent at night, espresso/gold by day
    var PAL_DARK = [[255, 46, 154], [124, 77, 255], [24, 199, 255], [255, 210, 63]];
    var PAL_LIGHT = [[164, 71, 31], [176, 125, 44], [122, 74, 34], [212, 162, 76]];
    function palette() { return theme === "light" ? PAL_LIGHT : PAL_DARK; }
    // resting dot colour differs by theme so dots stay visible on light bg
    function baseColour() { return theme === "light" ? [120, 120, 138] : [150, 150, 165]; }

    // smoothed pointer in viewport coords; start off-screen
    var mx = -9999, my = -9999, sx = -9999, sy = -9999;

    function build() {
      W = window.innerWidth; H = window.innerHeight;
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
      var BASE = baseColour(), PAL = palette();
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var dx = d.bx - sx, dy = d.by - sy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var t = dist < RADIUS ? (1 - dist / RADIUS) : 0;
        t = t * t; // ease
        var ang = Math.atan2(dy, dx);
        var push = t * 18;
        var x = d.bx + Math.cos(ang) * push;
        var y = d.by + Math.sin(ang) * push;
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
      requestAnimationFrame(tick);
    }

    // canvas is fixed at viewport 0,0, so pointer coords map directly
    window.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
    }, { passive: true });
    window.addEventListener("pointerout", function () { mx = -9999; my = -9999; });

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt); rt = setTimeout(build, 150);
    });

    build();
    requestAnimationFrame(tick);
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
    var MPAL_DARK = [[255, 46, 154], [124, 77, 255], [24, 199, 255], [255, 210, 63]];
    var MPAL_LIGHT = [[164, 71, 31], [176, 125, 44], [122, 74, 34], [212, 162, 76]];
    var MTILE = 16, MLIFE = 520;
    var tiles = [];
    var ptrX = window.innerWidth / 2, ptrY = window.innerHeight / 2; // raw pointer
    var hx = ptrX, hy = ptrY;                                         // smoothed head
    var palIdx = 0, mActive = false;
    var lpx = ptrX, lpy = ptrY;                  // last point a tile was dropped at
    var glow = finePointer ? 1 : 0.5;            // lighter glow on touch -> smoother

    function meteorSize() {
      mW = window.innerWidth; mH = window.innerHeight;
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
    window.addEventListener("pointermove", function (e) {
      ptrX = e.clientX; ptrY = e.clientY; mActive = true; trailTo(ptrX, ptrY);
    }, { passive: true });
    // touch: show the meteor while a finger is down, hide it on release
    window.addEventListener("pointerdown", function (e) {
      ptrX = e.clientX; ptrY = e.clientY; hx = ptrX; hy = ptrY; lpx = ptrX; lpy = ptrY;
      mActive = true; addTile(ptrX, ptrY);
    }, { passive: true });
    window.addEventListener("pointerup", function () { mActive = false; }, { passive: true });
    window.addEventListener("pointercancel", function () { mActive = false; }, { passive: true });
    window.addEventListener("pointerout", function () { mActive = false; });

    function meteorTick() {
      hx += (ptrX - hx) * 0.32; hy += (ptrY - hy) * 0.32;
      mctx.clearRect(0, 0, mW, mH);
      var now = performance.now();
      var day = theme === "light", pal = day ? MPAL_LIGHT : MPAL_DARK;

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
        var mid = day ? "rgba(196,140,60,0.95)" : "rgba(255,90,170,0.95)";
        mctx.shadowBlur = 22 * glow; mctx.shadowColor = mid;
        var g = mctx.createRadialGradient(hx, hy, 0, hx, hy, 10);
        g.addColorStop(0, day ? "rgba(255,246,228,0.98)" : "rgba(255,255,255,0.98)");
        g.addColorStop(0.45, mid);
        g.addColorStop(1, day ? "rgba(122,74,34,0)" : "rgba(124,77,255,0)");
        mctx.fillStyle = g;
        mctx.beginPath(); mctx.arc(hx, hy, 10, 0, Math.PI * 2); mctx.fill();
      }
      mctx.shadowBlur = 0;
      requestAnimationFrame(meteorTick);
    }

    var meteorRt;
    window.addEventListener("resize", function () { clearTimeout(meteorRt); meteorRt = setTimeout(meteorSize, 150); });
    meteorSize();
    requestAnimationFrame(meteorTick);
  }

  /* --------------------------------------------------------
     3. MOBILE NAV
     -------------------------------------------------------- */
  var burger = document.getElementById("navBurger");
  var links = document.getElementById("navLinks");
  if (burger && links) {
    burger.addEventListener("click", function () { links.classList.toggle("open"); });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); });
    });
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
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
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
      moreBtn.innerHTML = "<span>" + moreLabel(false) + "</span><i aria-hidden=\"true\">↓</i>";
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
     5c. PUBLICATION FIGURE PREVIEW (desktop hover)
     Rows with data-preview float their teaser figure next to the
     cursor, eased like the meteor head.
     -------------------------------------------------------- */
  var preview = document.getElementById("pubPreview");
  if (preview && finePointer) {
    var pImg = preview.querySelector("img");
    var PW = 400, GAP = 28;
    var tx = 0, ty = 0, cx = 0, cy = 0, pOn = false, pLoop = false;
    function placePreview() {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      var ph = preview.offsetHeight || 180;
      // sit above-right of the cursor so the hovered row stays readable
      var x = cx + GAP; if (x + PW > window.innerWidth - 12) x = cx - GAP - PW;
      var y = cy - ph - GAP; if (y < 80) y = cy + GAP;
      y = Math.max(12, Math.min(window.innerHeight - ph - 12, y));
      preview.style.transform = "translate3d(" + x + "px," + y + "px,0)";
      if (pOn || Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5) requestAnimationFrame(placePreview);
      else pLoop = false;
    }
    document.querySelectorAll(".pub[data-preview]").forEach(function (row) {
      row.addEventListener("pointerenter", function (e) {
        var src = row.getAttribute("data-preview");
        if (pImg.getAttribute("src") !== src) pImg.setAttribute("src", src);
        tx = cx = e.clientX; ty = cy = e.clientY;
        pOn = true; preview.classList.add("is-on");
        if (!pLoop) { pLoop = true; requestAnimationFrame(placePreview); }
      });
      row.addEventListener("pointerleave", function () { pOn = false; preview.classList.remove("is-on"); });
    });
    window.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
  }

  /* --------------------------------------------------------
     6. FOOTER YEAR
     -------------------------------------------------------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
