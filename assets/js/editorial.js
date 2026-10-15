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
      var BASE = baseColour(), PAL = fxPal;
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
      mctx.shadowBlur = 0;
      requestAnimationFrame(meteorTick);
    }

    var meteorRt;
    window.addEventListener("resize", function () { clearTimeout(meteorRt); meteorRt = setTimeout(meteorSize, 150); });
    meteorSize();
    requestAnimationFrame(meteorTick);
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
     5c. PUBLICATION FIGURE PREVIEW (desktop hover)
     Rows with data-preview float their teaser figure next to the
     cursor, eased like the meteor head.
     -------------------------------------------------------- */
  var preview = document.getElementById("pubPreview");
  if (preview && finePointer) {
    var card = preview.querySelector(".pub-preview__card");
    var layers = card.querySelectorAll("img");
    var front = 0, PW = 520, side = 1;
    var tx = 0, ty = 0, cx = 0, cy = 0;
    var visible = false, running = false, hideTimer = 0, hiddenAt = 0, wantSrc = "";

    var bringForward = function (img) {
      if (img.getAttribute("src") !== wantSrc) return;        // a newer hover won
      card.style.height = Math.round(PW * img.naturalHeight / img.naturalWidth) + "px";
      if (img === layers[front]) return;
      layers[front].classList.remove("is-front");
      img.classList.add("is-front");
      front = front ? 0 : 1;
    };
    var setFigure = function (src) {
      wantSrc = src;
      var cur = layers[front], next = layers[front ? 0 : 1];
      if (cur.getAttribute("src") === src) { bringForward(cur); return; }
      next.onload = function () { bringForward(next); };
      if (next.getAttribute("src") !== src) next.setAttribute("src", src);
      else if (next.complete && next.naturalWidth) bringForward(next);
    };

    // eased follow: the card rides beside the cursor, vertically centred on
    // it and clamped to the viewport. Its side (right or left of the cursor)
    // is chosen once per hover, so it never flips across the pointer.
    var follow = function () {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      var ph = card.offsetHeight || 200;
      var x = side > 0 ? cx + 36 : cx - 36 - PW;
      x = Math.max(14, Math.min(window.innerWidth - PW - 14, x));
      var y = Math.max(80, Math.min(window.innerHeight - ph - 14, cy - ph / 2));
      preview.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      if (visible || Date.now() - hiddenAt < 400) requestAnimationFrame(follow);
      else running = false;
    };

    document.querySelectorAll(".pub[data-preview]").forEach(function (row) {
      row.addEventListener("pointerenter", function (e) {
        clearTimeout(hideTimer);
        tx = e.clientX; ty = e.clientY;
        // only jump to the cursor if the card has fully faded out
        if (!visible && Date.now() - hiddenAt > 300) {
          cx = tx; cy = ty;
          side = (tx + 36 + PW <= window.innerWidth - 14) ? 1 : -1;
        }
        setFigure(row.getAttribute("data-preview"));
        visible = true; preview.classList.add("is-on");
        if (!running) { running = true; requestAnimationFrame(follow); }
      });
      // short grace period so gliding to the next paper keeps the card up
      row.addEventListener("pointerleave", function () {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function () {
          visible = false; hiddenAt = Date.now(); preview.classList.remove("is-on");
        }, 140);
      });
    });
    window.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
  }

  /* --------------------------------------------------------
     6. FOOTER YEAR
     -------------------------------------------------------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
