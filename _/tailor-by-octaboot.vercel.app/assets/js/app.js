/* ===================================================================
   OCTABOOT — scroll-driven suit sequence
   Canvas image-sequence scrubbing + editorial panel choreography
   =================================================================== */
gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 535;
const framePath = (i) => `assets/frames/frame_${String(i).padStart(5, "0")}.webp`;

const canvas = document.getElementById("frames");
const ctx = canvas.getContext("2d", { alpha: false });

const images = new Array(FRAME_COUNT);
const state  = { frame: 0 };
let dpr = Math.min(window.devicePixelRatio || 1, 2);

/* ---------- Canvas sizing + cover-fit draw ------------------------ */
function sizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width  = Math.floor(window.innerWidth  * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  render();
}

function render() {
  const img = images[state.frame | 0];
  if (!img || !img.complete || !img.naturalWidth) return;

  const cw = canvas.width, ch = canvas.height;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih);   // cover
  const dw = iw * scale, dh = ih * scale;
  const dx = (cw - dw) * 0.5;
  const dy = (ch - dh) * 0.5;

  ctx.fillStyle = "#0a0a0b";
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

/* ---------- Preload ---------------------------------------------- */
const loaderEl  = document.getElementById("loader");
const fillEl    = document.getElementById("loaderFill");
const pctEl     = document.getElementById("loaderPct");

function preload(onEnough) {
  let loaded = 0;
  let started = false;

  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => {
      loaded++;
      const p = loaded / FRAME_COUNT;
      const pct = Math.round(p * 100);
      fillEl.style.width = pct + "%";
      pctEl.textContent = pct;

      // First frame ready → paint immediately so there's no black flash
      if (i === 0) render();

      // Start the experience once we have a comfortable buffer
      if (!started && (loaded >= 60 || p === 1)) {
        started = true;
        onEnough();
      }
      if (p === 1) loaderEl.classList.add("is-done");
    };
    img.src = framePath(i + 1);
    images[i] = img;
  }
}

/* ---------- Build the scroll experience --------------------------- */
function build() {
  sizeCanvas();

  const progressFill = document.getElementById("progressFill");
  const movementNo   = document.getElementById("movementNo");
  const heroPanel    = document.querySelector('[data-panel="hero"]');
  const panels       = gsap.utils.toArray(".panel:not(.panel--hero)");

  /* Each editorial panel: [fadeIn start, fadeOut start] as scroll
     fractions (0 → 1), tuned to the milestone map:
       01 Foundation  shirt        ~0.11–0.22
       02 Waistcoat   vest+tie     ~0.22–0.37
       03 Canvas      jacket       ~0.37–0.55
       04 Cut         full suit    ~0.55–0.64
       05 Man         worn / cuff  ~0.64–0.78
       06 Procession  colour walk  ~0.78–0.92
       07 Detail      macro cuff   ~0.92–1.00                        */
  const cues = [
    [0.115, 0.205],
    [0.235, 0.355],
    [0.385, 0.535],
    [0.560, 0.635],
    [0.660, 0.765],
    [0.790, 0.905],
    [0.925, 0.995]
  ];
  const FADE = 0.035;

  /* Master timeline — total duration normalised to 1.0.
     Positions below are scroll fractions (0 → 1) mapped to the
     visual milestones of the 535-frame sequence.                    */
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: "#scene",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      pin: "#sticky",
      pinSpacing: true,
      onUpdate: (self) => {
        const p = self.progress;
        progressFill.style.width = (p * 100).toFixed(2) + "%";
        // derive the current movement number from scroll position
        let no = 0;
        for (let i = 0; i < cues.length; i++) {
          if (p >= cues[i][0] - FADE) no = i + 1;
        }
        movementNo.textContent = String(no).padStart(2, "0");
      }
    }
  });

  // 1 — the frame scrubber (drives the canvas across the whole scroll)
  tl.to(state, {
    frame: FRAME_COUNT - 1,
    duration: 1,
    ease: "none",
    onUpdate: render
  }, 0);

  /* Hero title — visible over the particle form, dissolves as the
     shirt takes shape.                                              */
  gsap.set(heroPanel, { autoAlpha: 1 });
  // dissolve the hero title the instant scrolling begins
  tl.to(heroPanel, { autoAlpha: 0, y: -30, duration: 0.03, ease: "power2.in" }, 0.004);

  // Editorial panels fade in / out across their milestone ranges.
  panels.forEach((panel, i) => {
    const [inAt, outAt] = cues[i];
    const fromX = panel.classList.contains("panel--right") ? 44 : -44;

    gsap.set(panel, { autoAlpha: 0, x: fromX, y: "-50%" });
    tl.to(panel, { autoAlpha: 1, x: 0, duration: FADE, ease: "power2.out" }, inAt);
    tl.to(panel, { autoAlpha: 0, x: -fromX * 0.5, duration: FADE, ease: "power2.in" }, outAt);
  });

  ScrollTrigger.refresh();
}

/* ---------- Resize (debounced via ScrollTrigger) ------------------ */
let resizeRAF;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeRAF);
  resizeRAF = requestAnimationFrame(sizeCanvas);
});

/* ---------- Header hide on scroll-down ---------------------------- */
const header = document.getElementById("header");
let lastY = 0;
ScrollTrigger.create({
  start: 0, end: "max",
  onUpdate: (self) => {
    const y = self.scroll();
    if (y > 120 && y > lastY) header.style.transform = "translateY(-140%)";
    else header.style.transform = "translateY(0)";
    lastY = y;
  }
});

/* ---------- Kickoff ---------------------------------------------- */
document.getElementById("year").textContent = new Date().getFullYear();
preload(build);
