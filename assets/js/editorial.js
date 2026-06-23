/* ============================================================
   Linqiang Guo — Editorial homepage interactions
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;

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
  var canvas = document.getElementById("heroCanvas");
  var hero = canvas ? canvas.closest(".hero") : null;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (canvas && hero && !reduce) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var SPACING = 34;       // gap between dots
    var RADIUS = 150;       // cursor influence radius
    var dots = [];
    var W = 0, H = 0;
    // iridescent palette (matches the CSS --c1..--c4)
    var palette = [[255, 46, 154], [124, 77, 255], [24, 199, 255], [255, 210, 63]];
    var BASE = [150, 150, 165]; // dim resting colour

    // smoothed pointer, in canvas-local coords; start off-screen
    var mx = -9999, my = -9999, sx = -9999, sy = -9999;

    function build() {
      var rect = hero.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      var cols = Math.ceil(W / SPACING), rows = Math.ceil(H / SPACING);
      var ox = (W - (cols - 1) * SPACING) / 2;
      var oy = (H - (rows - 1) * SPACING) / 2;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var col = palette[(r + c) % palette.length];
          dots.push({ bx: ox + c * SPACING, by: oy + r * SPACING, col: col });
        }
      }
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function frame() {
      sx += (mx - sx) * 0.14; sy += (my - sy) * 0.14;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var dx = d.bx - sx, dy = d.by - sy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var t = dist < RADIUS ? (1 - dist / RADIUS) : 0;
        t = t * t; // ease
        var ang = Math.atan2(dy, dx);
        var push = t * 16;
        var x = d.bx + Math.cos(ang) * push;
        var y = d.by + Math.sin(ang) * push;
        var size = 1 + t * 2.6;
        var a = 0.10 + t * 0.9;
        var rr = Math.round(lerp(BASE[0], d.col[0], t));
        var gg = Math.round(lerp(BASE[1], d.col[1], t));
        var bb = Math.round(lerp(BASE[2], d.col[2], t));
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + rr + "," + gg + "," + bb + "," + a + ")";
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    window.addEventListener("pointermove", function (e) {
      var rect = hero.getBoundingClientRect();
      mx = e.clientX - rect.left; my = e.clientY - rect.top;
    }, { passive: true });
    window.addEventListener("pointerout", function () { mx = -9999; my = -9999; });

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt); rt = setTimeout(build, 150);
    });

    build();
    requestAnimationFrame(frame);
  }

  /* --------------------------------------------------------
     2. PORTRAIT BRUSH REVEAL (grayscale -> colour)
     -------------------------------------------------------- */
  var frame = document.getElementById("revealFrame");
  var colorLayer = document.getElementById("revealColor");
  if (frame && colorLayer) {
    var R = 130;
    function maskAt(x, y) {
      var g = "radial-gradient(circle " + R + "px at " + x + "px " + y + "px," +
              " rgba(0,0,0,1) 18%, rgba(0,0,0,0.8) 42%, rgba(0,0,0,0.4) 62%, rgba(0,0,0,0) 80%)";
      colorLayer.style.webkitMaskImage = g; colorLayer.style.maskImage = g;
    }
    function hide() {
      var g = "radial-gradient(circle 0px at 50% 50%, #000 0%, transparent 100%)";
      colorLayer.style.webkitMaskImage = g; colorLayer.style.maskImage = g;
    }
    function move(e) {
      var rect = frame.getBoundingClientRect();
      var p = e.touches ? e.touches[0] : e;
      maskAt(p.clientX - rect.left, p.clientY - rect.top);
    }
    frame.addEventListener("mousemove", move);
    frame.addEventListener("mouseleave", hide);
    frame.addEventListener("touchmove", function (e) { move(e); }, { passive: true });
    frame.addEventListener("touchend", hide);
    hide();
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
     6. FOOTER YEAR
     -------------------------------------------------------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
