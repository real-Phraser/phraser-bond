/* ============================================================================
   ⛩️ Phraser Neo-Tokyo 3D Scroll-World — Scrub Engine
   ----------------------------------------------------------------------------
   Framework-agnostic. Vanilla ES Module, zero external dependencies.
   Adapted from scroll-world battle-tested architecture for phraser-bond.

   CORE CAPABILITIES:
   1. Continuous 3D camera-flight scrub engine driven by window scroll position.
   2. Video Blob URL fetcher & in-memory object URL caching pipeline:
      - Fetches media into in-memory Blobs and plays from object URLs.
      - Guarantees full seekability (video.seekable.end(0) > 0) on any static host.
      - Eliminates byte-range stalls and prevents freezing at frame 0.
   3. Touch/Mobile seek coalescing & iOS video priming:
      - Coalesces seeks: avoids issuing new currentTime while decoder is seeking.
      - Coarser seek epsilon on coarse pointer / mobile devices (eps = 0.02).
      - Primes muted video playback on first user touch gesture to prevent iOS black frames.
      - Keeps still poster visible until video paints first frame ('seeked' event).
      - Ignores mobile URL-bar collapse height-only resize events.
   4. Generative Cyber-Shrine WebGL / Canvas Motion Backdrop:
      - High-performance 60fps 3D canvas backdrop rendering Neo-Tokyo cyber torii gates,
        converging perspective grid lines, floating Japanese kanji glyphs, and volumetric fog.
      - Acts as graceful fallback when video assets are loading, absent, or when
        prefers-reduced-motion is active.
   5. Waypoint Event System & Station Activation Callbacks:
      - Exposes smooth callbacks (onStationChange, onScrollProgress, onTransition).
      - Dispatches DOM CustomEvents on container ('stationchange', 'scrollprogress', 'stationtransition').
   ============================================================================ */

/**
 * In-Memory Video Blob Cache
 * Ensures single fetch per URL and prevents byte-range seek locking on static hosts.
 */
export class VideoBlobCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Fetch a media URL as an in-memory Blob and convert to Object URL
   * @param {string} url - Target video URL
   * @returns {Promise<string>} Blob Object URL
   */
  async load(url) {
    if (!url) return null;
    if (this.cache.has(url)) {
      const entry = this.cache.get(url);
      if (entry.objectUrl) return entry.objectUrl;
      if (entry.promise) return entry.promise;
    }

    const promise = (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} loading ${url}`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        this.cache.set(url, { objectUrl, promise: null });
        return objectUrl;
      } catch (err) {
        // Video asset might not exist yet; gracefully fallback
        this.cache.delete(url);
        throw err;
      }
    })();

    this.cache.set(url, { objectUrl: null, promise });
    return promise;
  }

  /**
   * Get cached object URL synchronously if available
   */
  get(url) {
    const entry = this.cache.get(url);
    return entry ? entry.objectUrl : null;
  }

  /**
   * Free all object URLs to prevent memory leaks
   */
  revokeAll() {
    for (const [url, entry] of this.cache.entries()) {
      if (entry.objectUrl) {
        try {
          URL.revokeObjectURL(entry.objectUrl);
        } catch (_) {}
      }
    }
    this.cache.clear();
  }
}

// Global shared cache instance
export const globalBlobCache = new VideoBlobCache();

/**
 * Generative Cyber-Shrine 3D Canvas Backdrop
 * Renders Neo-Tokyo perspective wireframe torii gates, cyber grid, and floating kanji motes.
 */
export class CyberShrineBackdrop {
  constructor(hostElement, options = {}) {
    this.host = hostElement;
    this.reduceMotion = options.reduceMotion || false;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sw-canvas-backdrop';
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.host.appendChild(this.canvas);

    this.width = 0;
    this.height = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Camera and flight state
    this.camZ = 0;
    this.targetZ = 0;
    this.scrollProgress = 0;

    // Torii gates configuration in 3D world space
    this.numGates = 7;
    this.gateSpacing = 380;
    this.totalGateSpan = this.numGates * this.gateSpacing;

    // Floating Japanese kanji & data particles
    this.kanjiGlyphs = ['海', '向', '創', '生', '音', '韻', '工', '房', '雅', '⇱', '波', '光'];
    this.particles = [];
    this.initParticles(36);

    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);

    this.resize();
    window.addEventListener('resize', this.resize, { passive: true });
  }

  initParticles(count) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 1200,
        y: (Math.random() - 0.5) * 600 - 40,
        z: Math.random() * this.totalGateSpan,
        glyph: this.kanjiGlyphs[i % this.kanjiGlyphs.length],
        size: 14 + Math.random() * 16,
        alpha: 0.2 + Math.random() * 0.5,
        isRing: Math.random() > 0.6,
        driftSpeed: (Math.random() - 0.5) * 0.4,
      });
    }
  }

  resize() {
    this.width = this.host.clientWidth || window.innerWidth;
    this.height = this.host.clientHeight || window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.dpr, this.dpr);
  }

  updateProgress(progress) {
    this.scrollProgress = progress;
    // Map total scroll progress to forward camera flight in Z
    this.targetZ = progress * this.totalGateSpan * 1.8;
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // Smooth camera Z lerp
    if (this.reduceMotion) {
      this.camZ = this.targetZ * 0.1;
    } else {
      this.camZ += (this.targetZ - this.camZ) * 0.12;
    }

    const vpX = w * 0.5;
    const vpY = h * 0.45;
    const focalLength = 360;

    // 1. Cyber-Grid Floor & Horizon Perspective
    this.drawCyberGrid(ctx, w, h, vpX, vpY, focalLength);

    // 2. Horizon Glow & Atmospheric Orb
    this.drawHorizonGlow(ctx, vpX, vpY);

    // 3. 3D Wireframe Cyber Torii Gates
    this.drawToriiGates(ctx, vpX, vpY, focalLength);

    // 4. Floating Kanji & Cyber Sparks
    this.drawParticles(ctx, vpX, vpY, focalLength);
  }

  drawHorizonGlow(ctx, vpX, vpY) {
    const radGlow = ctx.createRadialGradient(vpX, vpY, 10, vpX, vpY, 280);
    radGlow.addColorStop(0, 'rgba(117, 200, 232, 0.28)');
    radGlow.addColorStop(0.35, 'rgba(22, 78, 120, 0.18)');
    radGlow.addColorStop(0.7, 'rgba(10, 32, 56, 0.08)');
    radGlow.addColorStop(1, 'transparent');

    ctx.fillStyle = radGlow;
    ctx.beginPath();
    ctx.arc(vpX, vpY, 280, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCyberGrid(ctx, w, h, vpX, vpY, focalLength) {
    ctx.save();
    ctx.lineWidth = 1;

    // Perspective floor lines
    const numFloorLines = 14;
    for (let i = 0; i <= numFloorLines; i++) {
      const xOffset = ((i - numFloorLines / 2) / (numFloorLines / 2)) * (w * 0.9);
      const bottomX = vpX + xOffset * 1.8;

      const grad = ctx.createLinearGradient(vpX, vpY, bottomX, h);
      grad.addColorStop(0, 'rgba(117, 200, 232, 0)');
      grad.addColorStop(0.3, 'rgba(22, 78, 120, 0.15)');
      grad.addColorStop(1, 'rgba(117, 200, 232, 0.22)');

      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(vpX, vpY + 4);
      ctx.lineTo(bottomX, h);
      ctx.stroke();
    }

    // Moving horizontal cross-grid rungs (Z motion)
    const rungCount = 10;
    const rungSpacing = 160;
    const zOffset = (this.camZ % rungSpacing);

    for (let i = 1; i <= rungCount; i++) {
      const z = i * rungSpacing - zOffset;
      if (z <= 10) continue;

      const scale = focalLength / (focalLength + z);
      const y = vpY + (h - vpY) * (scale * 1.3);
      if (y > h || y < vpY) continue;

      const spanX = (w * 0.9) * scale * 1.8;
      const alpha = Math.min(1, Math.max(0, (scale - 0.12) * 1.4)) * 0.22;

      ctx.strokeStyle = `rgba(117, 200, 232, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(vpX - spanX, y);
      ctx.lineTo(vpX + spanX, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawToriiGates(ctx, vpX, vpY, focalLength) {
    ctx.save();

    for (let i = 0; i < this.numGates; i++) {
      // Calculate continuous repeating gate positions along flight axis
      let gateZ = (i * this.gateSpacing - (this.camZ % this.totalGateSpan));
      if (gateZ < -100) gateZ += this.totalGateSpan;
      if (gateZ < 15) continue; // Behind or right in front of camera

      const scale = focalLength / (focalLength + gateZ);
      const alpha = Math.min(1, Math.max(0, (1 - gateZ / (this.totalGateSpan * 0.95)))) * 0.85;
      if (alpha <= 0.01) continue;

      const gateWidth = 420 * scale;
      const gateHeight = 310 * scale;
      const gateX = vpX;
      const gateY = vpY + (gateHeight * 0.2);

      // Kasagi (Top curved horizontal lintel)
      const kasagiY = gateY - gateHeight;
      const kasagiOverhang = gateWidth * 0.62;
      const curveLift = 14 * scale;

      ctx.lineWidth = Math.max(1.2, 3 * scale);
      ctx.strokeStyle = `rgba(117, 200, 232, ${alpha.toFixed(3)})`;
      ctx.shadowColor = 'rgba(117, 200, 232, 0.4)';
      ctx.shadowBlur = 10 * scale;

      ctx.beginPath();
      ctx.moveTo(gateX - kasagiOverhang, kasagiY - curveLift);
      ctx.quadraticCurveTo(gateX, kasagiY + curveLift * 0.3, gateX + kasagiOverhang, kasagiY - curveLift);
      ctx.stroke();

      // Shimaki (Second horizontal beam directly beneath Kasagi)
      const shimakiY = kasagiY + (16 * scale);
      ctx.beginPath();
      ctx.moveTo(gateX - kasagiOverhang * 0.9, shimakiY);
      ctx.lineTo(gateX + kasagiOverhang * 0.9, shimakiY);
      ctx.stroke();

      // Nuki (Lower crossbar)
      const nukiY = kasagiY + (60 * scale);
      const nukiOverhang = gateWidth * 0.52;
      ctx.strokeStyle = `rgba(22, 78, 120, ${(alpha * 0.9).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(gateX - nukiOverhang, nukiY);
      ctx.lineTo(gateX + nukiOverhang, nukiY);
      ctx.stroke();

      // Gakuzuka (Center tablet bracket / emblem holder)
      const tabletWidth = 24 * scale;
      const tabletHeight = (nukiY - shimakiY);
      ctx.strokeRect(gateX - tabletWidth / 2, shimakiY, tabletWidth, tabletHeight);

      // Central ⇱ Kanji/Seal emblem inside tablet
      if (scale > 0.4) {
        ctx.fillStyle = `rgba(117, 200, 232, ${(alpha * 0.9).toFixed(3)})`;
        ctx.font = `${Math.floor(14 * scale)}px 'Rubik', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⇱', gateX, shimakiY + tabletHeight / 2);
      }

      // Left and Right Cylindrical Pillars
      const pillarDist = gateWidth * 0.38;
      const groundY = gateY + (80 * scale);

      ctx.strokeStyle = `rgba(117, 200, 232, ${(alpha * 0.75).toFixed(3)})`;
      ctx.beginPath();
      // Left pillar
      ctx.moveTo(gateX - pillarDist, kasagiY);
      ctx.lineTo(gateX - pillarDist * 1.05, groundY);
      // Right pillar
      ctx.moveTo(gateX + pillarDist, kasagiY);
      ctx.lineTo(gateX + pillarDist * 1.05, groundY);
      ctx.stroke();

      // Pedestal foundation blocks (Kamebara)
      const baseW = 28 * scale;
      const baseH = 10 * scale;
      ctx.fillStyle = `rgba(10, 32, 56, ${(alpha * 0.6).toFixed(3)})`;
      ctx.fillRect(gateX - pillarDist * 1.05 - baseW / 2, groundY, baseW, baseH);
      ctx.fillRect(gateX + pillarDist * 1.05 - baseW / 2, groundY, baseW, baseH);
    }

    ctx.restore();
  }

  drawParticles(ctx, vpX, vpY, focalLength) {
    ctx.save();

    for (const p of this.particles) {
      let pz = (p.z - (this.camZ * 0.8) % this.totalGateSpan);
      if (pz < 10) pz += this.totalGateSpan;

      const scale = focalLength / (focalLength + pz);
      const alpha = Math.min(1, Math.max(0, (1 - pz / this.totalGateSpan))) * p.alpha;
      if (alpha <= 0.02) continue;

      const sx = vpX + p.x * scale;
      const sy = vpY + p.y * scale;

      if (p.isRing) {
        // Glowing cyan energy ring
        ctx.strokeStyle = `rgba(117, 200, 232, ${alpha.toFixed(3)})`;
        ctx.lineWidth = Math.max(1, 2 * scale);
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * scale * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Floating Japanese Kanji Glyphs
        ctx.fillStyle = `rgba(220, 229, 236, ${alpha.toFixed(3)})`;
        ctx.font = `${Math.floor(p.size * scale)}px 'Rubik', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.glyph, sx, sy);
      }
    }

    ctx.restore();
  }

  destroy() {
    window.removeEventListener('resize', this.resize);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

/**
 * Mount the Phraser 3D Scroll-World Engine
 * @param {HTMLElement|string} containerElementOrSelector - DOM mount container (#world)
 * @param {Object} config - Engine configuration
 * @returns {Object} Engine controller API
 */
export function mountScrollWorld(containerElementOrSelector, config = {}) {
  const container = typeof containerElementOrSelector === 'string'
    ? document.querySelector(containerElementOrSelector) || document.getElementById(containerElementOrSelector)
    : containerElementOrSelector;

  if (!container) {
    console.warn('[scroll-world] Mount container not found:', containerElementOrSelector);
    return null;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const smallScreenMQ = window.matchMedia('(max-width: 860px)');
  const isMobile = () => coarsePointer || smallScreenMQ.matches;

  const SECTIONS = config.sections || [];
  const CONNECTORS = config.connectors || [];
  const CONNECTORS_M = config.connectorsMobile || [];
  const DIVE_W = config.diveScroll || 1.5;
  const CONN_W = config.connScroll || 0.9;
  const CROSSFADE = (config.crossfade != null) ? config.crossfade : 0.12;
  const N = SECTIONS.length;

  if (!N) {
    console.warn('[scroll-world] No stations/sections provided in config.');
    return null;
  }

  // Inject Namespaced CSS
  injectCSS();
  container.classList.add('sw-root');

  // Interleaved segments chain: dive0, conn0, dive1, conn1, ... diveN-1
  const SEGMENTS = [];
  SECTIONS.forEach((s, i) => {
    const dive = {
      kind: 'dive',
      si: i,
      section: s,
      clip: s.clip,
      clipM: s.clipMobile,
      still: s.still,
      stillM: s.stillMobile,
      accent: s.accent || '#75c8e8',
      w: s.scroll || DIVE_W,
      linger: s.linger || 0,
    };
    SEGMENTS.push(dive);
    s._seg = dive;

    if (i < N - 1 && CONNECTORS[i]) {
      SEGMENTS.push({
        kind: 'conn',
        si: i,
        section: s,
        clip: CONNECTORS[i],
        clipM: CONNECTORS_M[i],
        still: SECTIONS[i + 1].still,
        stillM: SECTIONS[i + 1].stillMobile,
        accent: SECTIONS[i + 1].accent || '#75c8e8',
        w: CONN_W,
        linger: 0,
      });
    }
  });

  const NSEG = SEGMENTS.length;

  // ---- DOM Structure ----
  const sky = el('div', 'sw-sky');
  if (config.atmosphere !== false) {
    sky.appendChild(el('div', 'sw-sky__grad'));
    sky.appendChild(el('div', 'sw-sky__glow'));
  }
  const particles = el('div', 'sw-particles');
  sky.appendChild(particles);

  const scrollbar = el('div', 'sw-scrollbar');
  const scrollbarFill = el('span');
  scrollbar.appendChild(scrollbarFill);

  const topbar = el('div', 'sw-topbar');
  if (config.brand) {
    const brand = el('a', 'sw-brand');
    brand.href = config.brand.href || '#';
    brand.appendChild(el('span', 'sw-brand__mark'));
    const nm = el('span', 'sw-brand__name');
    nm.textContent = config.brand.name || '';
    brand.appendChild(nm);
    topbar.appendChild(brand);
  }

  const nav = el('nav', 'sw-nav');
  if (config.nav !== false) topbar.appendChild(nav);

  if (config.cta && config.cta.label) {
    const c = el('a', 'sw-topcta');
    c.href = config.cta.href || '#';
    c.textContent = config.cta.label;
    topbar.appendChild(c);
  }

  const stage = el('div', 'sw-stage');
  const copylayer = el('div', 'sw-copylayer');
  const route = el('div', 'sw-route');
  const hint = el('div', 'sw-hint');
  const hintText = el('span');
  hintText.textContent = config.hint || 'スクロールして探索 // SCROLL TO FLY';
  hint.appendChild(hintText);
  hint.appendChild(el('i'));

  const track = el('div', 'sw-track');

  // Mount elements to container
  [sky, scrollbar, topbar, stage, copylayer, route, hint, track].forEach(node => container.appendChild(node));

  // Initialize Generative Cyber-Shrine Backdrop inside stage
  const backdrop = new CyberShrineBackdrop(stage, { reduceMotion });

  // Initialize Segment Scenes (Video & Poster layers)
  SEGMENTS.forEach((s) => {
    const scene = el('div', 'sw-scene');
    scene.style.setProperty('--sw-accent', s.accent || '');

    const img = el('img', 'sw-scene__still');
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';

    const poster = (isMobile() && s.stillM) ? s.stillM : s.still;
    if (poster) {
      img.src = poster;
    } else {
      // Dynamic inline SVG placeholder if no poster image file exists
      img.src = createPosterDataUri(s.si, s.kind, s.accent);
    }

    scene.appendChild(img);
    stage.appendChild(scene);

    s.el = scene;
    s.img = img;
    s.video = null;
    s.hasClip = false;
    s.loading = false;
    s.ready = false;
    s.failed = false;
    s.cur = 0;
    s.target = 0;
    s.visible = false;
  });

  // Per-section Copy / Route dots / Nav buttons
  const copies = [];
  const dots = [];

  SECTIONS.forEach((s, i) => {
    const c = el('article', 'sw-copy');
    c.style.setProperty('--sw-accent', s.accent || '');
    c.innerHTML =
      `<span class="sw-copy__num">${pad(i + 1)} / ${pad(N)}</span>` +
      (s.kanji ? `<span class="sw-copy__kanji">${esc(s.kanji)}</span>` : '') +
      (s.eyebrow ? `<span class="sw-copy__eyebrow">${esc(s.eyebrow)}</span>` : '') +
      (s.title ? `<h2 class="sw-copy__title">${esc(s.title)}</h2>` : '') +
      (s.body ? `<p class="sw-copy__body">${esc(s.body)}</p>` : '') +
      (s.tags && s.tags.length ? `<ul class="sw-copy__tags">${s.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '') +
      (s.cta ? `<div class="sw-copy__cta">${ctaBtns(s.cta)}</div>` : '');

    // Allow user to suppress default copy layer if they render custom HTML stations
    if (config.showDefaultCopy !== false) {
      copylayer.appendChild(c);
    }
    copies.push(c);

    // Route waypoint dot
    const dot = el('button', 'sw-route__dot');
    dot.setAttribute('type', 'button');
    dot.setAttribute('aria-label', `Jump to station ${i + 1}: ${s.label || ''}`);
    dot.style.setProperty('--sw-accent', s.accent || '');
    dot.innerHTML = `<span class="sw-route__label">${esc(s.label || '')}</span><i></i>`;
    dot.addEventListener('click', () => jumpTo(i));
    route.appendChild(dot);
    dots.push(dot);

    // Header nav link
    if (config.nav !== false) {
      const b = el('button', 'sw-nav__item');
      b.setAttribute('type', 'button');
      b.textContent = s.label || '';
      b.addEventListener('click', () => jumpTo(i));
      nav.appendChild(b);
    }
  });

  // ---- Math & Physics Helpers ----
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const lingerEase = (x, L) => {
    L = clamp(L);
    const c = x - 0.5;
    return (1 - L) * x + L * (4 * c * c * c + 0.5);
  };

  let vh = window.innerHeight;
  let totalW = 0;
  let activeIndex = -1;
  let ticking = false;
  let isRunning = true;
  let laidOutW = window.innerWidth;
  let userReady = false;

  function layout() {
    vh = window.innerHeight;
    laidOutW = window.innerWidth;
    let off = 0;
    SEGMENTS.forEach(s => {
      s.start = off * vh;
      off += s.w;
      s.end = off * vh;
    });
    totalW = off;
    // Set track height to drive page scrolling
    track.style.height = `${totalW * vh + vh}px`;
    read();
  }

  function jumpTo(i) {
    const s = SECTIONS[i];
    if (!s || !s._seg) return;
    const seg = s._seg;
    const targetY = seg.start + (seg.end - seg.start) * 0.45;
    window.scrollTo({
      top: targetY,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }

  /**
   * Video Blob Loader with in-memory caching and error tolerance
   */
  async function loadClip(s) {
    if (reduceMotion || s.loading || s.hasClip || s.failed) return;
    const clipUrl = (isMobile() && s.clipM) ? s.clipM : s.clip;
    if (!clipUrl) return;

    s.loading = true;

    try {
      const objectUrl = await globalBlobCache.load(clipUrl);
      if (!objectUrl) throw new Error('Blob URL creation returned null');

      const v = document.createElement('video');
      v.className = 'sw-scene__video';
      v.muted = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.src = objectUrl;

      v.addEventListener('loadedmetadata', () => {
        s.ready = true;
        read();
      });

      // Reveal the video and hide the still poster only once the first frame paints
      // On iOS Safari, a seeked-but-never-played video stays blank, so this prevents flashes
      v.addEventListener('seeked', () => {
        s.el.classList.add('has-clip');
      }, { once: true });

      v.addEventListener('loadeddata', () => {
        try { v.pause(); } catch (_) {}
        if (userReady) primeVideo(v);
      });

      v.addEventListener('error', () => {
        s.failed = true;
        s.loading = false;
      });

      s.el.appendChild(v);
      s.video = v;
      s.hasClip = true;
    } catch (err) {
      s.failed = true;
      s.loading = false;
      // Fallback remains active via backdrop and poster
    }
  }

  /**
   * iOS Video Priming: play & immediately pause on first user touch gesture
   */
  function primeVideo(v) {
    if (!v) return;
    try {
      const p = v.play();
      if (p && p.then) {
        p.then(() => {
          try { v.pause(); } catch (_) {}
        }).catch(() => {});
      }
    } catch (_) {}
  }

  function onFirstGesture() {
    if (userReady) return;
    userReady = true;
    SEGMENTS.forEach(s => {
      if (s.video) primeVideo(s.video);
    });
  }

  window.addEventListener('pointerdown', onFirstGesture, { once: true, passive: true });
  window.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });
  window.addEventListener('wheel', onFirstGesture, { once: true, passive: true });
  window.addEventListener('keydown', onFirstGesture, { once: true, passive: true });

  /**
   * Main Read Function - Maps scroll to segment targets & active station states
   */
  function read() {
    const y = window.scrollY || window.pageYOffset || 0;
    const fade = CROSSFADE * vh;
    const totalHeight = totalW * vh;
    const progress = clamp(y / (totalHeight || 1));

    // Update backdrop progress
    if (backdrop) {
      backdrop.updateProgress(progress);
    }

    let ci = 0;
    for (let i = 0; i < NSEG; i++) {
      if (y >= SEGMENTS[i].start) ci = i;
    }

    // Prefetch and scrub segments
    for (let i = 0; i < NSEG; i++) {
      const s = SEGMENTS[i];
      // Prefetch clips within scroll vicinity
      if (y > s.start - 1.8 * vh && y < s.end + 1.8 * vh) {
        loadClip(s);
      }

      const local = clamp((y - s.start) / ((s.end - s.start) || 1), 0, 1);
      s.target = s.linger ? lingerEase(local, s.linger) : local;

      let outside = 0;
      if (y < s.start) outside = s.start - y;
      else if (y > s.end) outside = y - s.end;

      const op = smooth(1 - outside / fade);
      s.el.style.opacity = op;
      s.visible = op > 0.001;
      s.el.style.zIndex = (i === ci) ? '120' : String(100 + Math.round(op * 10));

      if (!s.hasClip || !s.ready) {
        const sc = reduceMotion ? 1 : 1.02 + local * 0.12;
        s.img.style.transform = `scale(${sc.toFixed(3)})`;
      }
    }

    // Section copy & station overlay animations
    for (let i = 0; i < N; i++) {
      const seg = SECTIONS[i]._seg;
      const pr = clamp((y - seg.start) / ((seg.end - seg.start) || 1), 0, 1);
      const before = y < seg.start;
      const after = y > seg.end;

      let cop;
      if (i === 0) cop = after ? 0 : smooth(1 - pr / 0.65);
      else if (i === N - 1) cop = before ? 0 : smooth(pr / 0.45);
      else cop = (before || after) ? 0 : smooth(1 - Math.abs(pr - 0.5) / 0.5);

      const c = copies[i];
      if (c) {
        c.style.opacity = cop;
        c.style.transform = reduceMotion ? 'none' : `translateY(${(0.5 - pr) * 3.5}vh)`;
        c.style.pointerEvents = cop > 0.5 ? 'auto' : 'none';
      }
    }

    // Active Station determination
    const cur = SEGMENTS[ci];
    let near = cur.si;
    if (cur.kind === 'conn') {
      const connProgress = (y - cur.start) / ((cur.end - cur.start) || 1);
      near = connProgress > 0.5 ? Math.min(cur.si + 1, N - 1) : cur.si;

      // Dispatch transition event
      if (typeof config.onTransition === 'function') {
        config.onTransition(cur.si, Math.min(cur.si + 1, N - 1), connProgress);
      }
      if (typeof CustomEvent === 'function' && container && typeof container.dispatchEvent === 'function') {
        container.dispatchEvent(new CustomEvent('stationtransition', {
          detail: {
            fromIndex: cur.si,
            toIndex: Math.min(cur.si + 1, N - 1),
            progress: connProgress,
          },
        }));
      }
    }

    // Waypoint activation change
    if (near !== activeIndex) {
      const prev = activeIndex;
      activeIndex = near;

      dots.forEach((d, k) => d.classList && d.classList.toggle('is-active', k === near));
      if (nav && typeof nav.querySelectorAll === 'function') {
        nav.querySelectorAll('.sw-nav__item').forEach((n, k) => n.classList && n.classList.toggle('is-active', k === near));
      }

      if (container && container.style && container.style.setProperty) {
        container.style.setProperty('--sw-accent', SECTIONS[near].accent || '#75c8e8');
      }

      // Dispatch Station Change Callback & CustomEvent
      if (typeof config.onStationChange === 'function') {
        config.onStationChange(near, SECTIONS[near], prev);
      }
      if (typeof CustomEvent === 'function' && container && typeof container.dispatchEvent === 'function') {
        container.dispatchEvent(new CustomEvent('stationchange', {
          detail: {
            index: near,
            station: SECTIONS[near],
            previousIndex: prev,
          },
        }));
      }
    }

    // Dispatch continuous scroll progress event
    const activeSeg = SECTIONS[near]._seg;
    const stationProgress = clamp((y - activeSeg.start) / ((activeSeg.end - activeSeg.start) || 1));

    if (typeof config.onScrollProgress === 'function') {
      config.onScrollProgress(progress, near, stationProgress);
    }
    if (typeof CustomEvent === 'function' && container && typeof container.dispatchEvent === 'function') {
      container.dispatchEvent(new CustomEvent('scrollprogress', {
        detail: {
          progress,
          currentStationIndex: near,
          stationProgress,
          scrollY: y,
        },
      }));
    }

    scrollbarFill.style.transform = `scaleX(${progress})`;
    hint.style.opacity = clamp(1 - y / (0.45 * vh));
    if (particles) {
      particles.style.transform = `translate3d(0, ${-y * 0.04}px, 0)`;
    }

    ticking = false;
  }

  const rAF = (cb) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      return window.requestAnimationFrame(cb);
    }
    if (typeof requestAnimationFrame === 'function') {
      return requestAnimationFrame(cb);
    }
    return setTimeout(cb, 16);
  };

  const cancelRAF = (id) => {
    if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(id);
    } else if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(id);
    } else {
      clearTimeout(id);
    }
  };

  let rafId = null;

  /**
   * requestAnimationFrame Loop
   * Executes seek coalescing, rAF lerp, and backdrop renders
   */
  function raf() {
    if (!isRunning) return;

    // Render generative 3D backdrop
    if (backdrop) {
      backdrop.render();
    }

    // Coarser epsilon on touch / phone viewports to prevent decoder stalls
    const eps = isMobile() ? 0.02 : 0.008;

    for (let i = 0; i < NSEG; i++) {
      const s = SEGMENTS[i];
      if (!s.hasClip || !s.ready || !s.video) continue;

      // CRITICAL TOUCH FIX: Never queue a seek while the mobile hardware decoder is seeking
      if (s.video.seeking) continue;
      if (!s.visible && Math.abs(s.cur - s.target) < 0.002) continue;

      s.cur += (s.target - s.cur) * (reduceMotion ? 1 : 0.18);
      const dur = s.video.duration || 1;
      const t = clamp(s.cur, 0, 0.999) * dur;

      if (Math.abs(s.video.currentTime - t) > eps) {
        try {
          s.video.currentTime = t;
        } catch (_) {}
      }
    }

    rafId = rAF(raf);
  }

  // Seed particles
  seedParticles(particles, reduceMotion || coarsePointer);

  // Scroll listener
  function onScroll() {
    if (!ticking) {
      ticking = true;
      rAF(read);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile-aware Resize Listener: Ignore height-only collapses caused by URL bar
  function onResize() {
    if (coarsePointer && window.innerWidth === laidOutW) return;
    layout();
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', layout);
  window.addEventListener('load', layout);

  // Initial setup
  layout();
  rafId = rAF(raf);

  // Public API Handle
  return {
    jumpTo,
    getStation: (i) => SECTIONS[i],
    getCurrentStation: () => ({ index: activeIndex, station: SECTIONS[activeIndex] }),
    getProgress: () => {
      const y = window.scrollY || 0;
      return clamp(y / (totalW * vh || 1));
    },
    destroy: () => {
      isRunning = false;
      if (rafId) cancelRAF(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', layout);
      window.removeEventListener('load', layout);
      if (backdrop) backdrop.destroy();
      globalBlobCache.revokeAll();
    },
    container,
  };
}

/**
 * ScrubEngine Class Wrapper
 */
export class ScrubEngine {
  constructor(options = {}) {
    this.options = options;
    this.controller = null;
    if (options.container || options.target) {
      this.mount(options.container || options.target, options);
    }
  }

  mount(target, config = {}) {
    const mergedConfig = { ...this.options, ...config };
    this.controller = mountScrollWorld(target, mergedConfig);
    return this;
  }

  jumpTo(index) {
    if (this.controller) this.controller.jumpTo(index);
    return this;
  }

  getCurrentStation() {
    return this.controller ? this.controller.getCurrentStation() : null;
  }

  destroy() {
    if (this.controller) {
      this.controller.destroy();
      this.controller = null;
    }
  }
}

/**
 * Procedural SVG Data URI for Poster Fallback
 */
function createPosterDataUri(stationIndex, kind, accentColor) {
  const titles = ['創生 The Genesis', '音韻 Sound Sanctuary', '工房 Project Forge', '海向 Umimukō Music', '終章 Terminal Finale'];
  const kanji = ['創生', '音韻', '工房', '海向', '終章'];
  const t = titles[stationIndex] || `Station ${stationIndex + 1}`;
  const k = kanji[stationIndex] || '雅';
  const color = accentColor || '#75c8e8';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    <rect width="100%" height="100%" fill="#05080d"/>
    <radialGradient id="g" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#164e78" stop-opacity="0.45"/>
      <stop offset="40%" stop-color="#0a2038" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#05080d" stop-opacity="0.95"/>
    </radialGradient>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <path d="M 0 540 L 960 480 L 1920 540" stroke="${color}" stroke-width="1.5" stroke-opacity="0.3" fill="none"/>
    <circle cx="960" cy="480" r="140" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.4"/>
    <text x="960" y="470" font-family="'Rubik', sans-serif" font-size="96" font-weight="800" fill="#dce5ec" text-anchor="middle" letter-spacing="4">${k}</text>
    <text x="960" y="550" font-family="'Rubik', sans-serif" font-size="28" font-weight="600" fill="${color}" text-anchor="middle" letter-spacing="8">${t.toUpperCase()}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Ambient Drifting Japanese Petals / Spark Particles
 */
function seedParticles(host, reduce) {
  if (!host || reduce) return;
  const kinds = ['dot', 'dot', 'ring'];
  const seeds = [7, 23, 41, 58, 71, 88, 12, 34, 52, 66, 83, 95, 18, 29, 47, 63, 77, 91, 5, 38, 55, 69, 82, 97];
  for (let k = 0; k < 22; k++) {
    const s = document.createElement('span');
    s.className = `sw-pt sw-pt--${kinds[k % kinds.length]}`;
    s.style.left = `${seeds[k % seeds.length]}vw`;
    s.style.top = `${((seeds[(k * 3) % seeds.length] * 1.3) % 100)}vh`;
    s.style.setProperty('--sw-sc', (0.5 + ((seeds[(k * 5) % seeds.length] % 60) / 60) * 1.1).toFixed(2));
    const dur = 14 + (seeds[(k * 7) % seeds.length] % 22);
    s.style.animationDuration = `${dur}s`;
    s.style.animationDelay = `${(-(seeds[(k * 2) % seeds.length] % dur))}s`;
    host.appendChild(s);
  }
}

/**
 * Injects Namespaced CSS wrapped in a Cascade Layer
 */
function injectCSS() {
  if (document.getElementById('sw-css')) return;
  const css = `
  .sw-root {
    --sw-bg: #05080d;
    --sw-ink: #dce5ec;
    --sw-ink-soft: #8297aa;
    --sw-accent: #75c8e8;
    --sw-font-display: 'Rubik', system-ui, sans-serif;
    --sw-font-body: 'Rubik', system-ui, sans-serif;
    color: var(--sw-ink);
    font-family: var(--sw-font-body);
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }
  .sw-sky {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    background: transparent;
  }
  .sw-sky__grad {
    position: absolute;
    inset: -10%;
    background: radial-gradient(circle at 50% 45%, rgba(22, 78, 120, 0.22) 0%, transparent 68%);
  }
  .sw-sky__glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(55% 42% at 75% 20%, rgba(117, 200, 232, 0.15), transparent 70%);
  }
  .sw-particles {
    position: absolute;
    inset: -6% -2%;
    will-change: transform;
    pointer-events: none;
  }
  .sw-pt {
    position: absolute;
    width: 12px;
    height: 12px;
    transform: scale(var(--sw-sc, 1));
    opacity: 0;
    animation: sw-drift linear infinite;
  }
  .sw-pt::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
  }
  .sw-pt--dot::before {
    background: radial-gradient(circle at 35% 30%, var(--sw-accent), rgba(22, 78, 120, 0.4) 80%);
    box-shadow: 0 0 10px var(--sw-accent);
  }
  .sw-pt--ring::before {
    background: transparent;
    border: 1.5px solid var(--sw-accent);
    box-shadow: 0 0 8px rgba(117, 200, 232, 0.4);
  }
  @keyframes sw-drift {
    0% { opacity: 0; transform: scale(var(--sw-sc)) translate(0, 10vh) rotate(0); }
    15% { opacity: 0.6; }
    85% { opacity: 0.5; }
    100% { opacity: 0; transform: scale(var(--sw-sc)) translate(5vw, -20vh) rotate(220deg); }
  }
  .sw-scrollbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    z-index: 90;
    background: rgba(32, 54, 74, 0.4);
    pointer-events: none;
  }
  .sw-scrollbar span {
    display: block;
    height: 100%;
    width: 100%;
    transform-origin: 0 50%;
    transform: scaleX(0);
    background: linear-gradient(90deg, #164e78, #75c8e8);
    box-shadow: 0 0 10px #75c8e8;
  }
  .sw-topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: clamp(14px, 2vw, 24px) clamp(20px, 4vw, 56px);
    pointer-events: none;
  }
  .sw-nav {
    display: none; /* Managed by persistent header-dock */
  }
  .sw-stage {
    position: fixed;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    overflow: hidden;
  }
  .sw-canvas-backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
    will-change: transform;
  }
  .sw-scene {
    position: absolute;
    inset: 0;
    opacity: 0;
    overflow: hidden;
    will-change: opacity;
    z-index: 2;
  }
  .sw-scene__video,
  .sw-scene__still {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 45%;
  }
  .sw-scene__still {
    will-change: transform;
    transition: opacity 0.4s ease;
  }
  .sw-scene.has-clip .sw-scene__still {
    opacity: 0;
  }
  .sw-scene__video {
    z-index: 2;
  }
  .sw-copylayer {
    position: fixed;
    inset: 0;
    z-index: 20;
    pointer-events: none;
    display: none; /* Liquid glass UI overlay is provided by index.html */
  }
  .sw-route {
    position: fixed;
    right: clamp(16px, 2.5vw, 36px);
    top: 50%;
    z-index: 80;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 18px 10px;
    pointer-events: auto;
  }
  .sw-route::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 20px;
    bottom: 20px;
    width: 1.5px;
    transform: translateX(-50%);
    background: linear-gradient(180deg, transparent, rgba(117, 200, 232, 0.4), transparent);
  }
  .sw-route__dot {
    position: relative;
    border: 0;
    background: transparent;
    cursor: pointer;
    width: 16px;
    height: 16px;
    display: grid;
    place-items: center;
    padding: 0;
  }
  .sw-route__dot i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(130, 151, 170, 0.5);
    border: 1px solid rgba(117, 200, 232, 0.3);
    transition: transform 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
  }
  .sw-route__dot:hover i {
    transform: scale(1.3);
    background: #75c8e8;
    box-shadow: 0 0 10px #75c8e8;
  }
  .sw-route__dot.is-active i {
    background: #75c8e8;
    transform: scale(1.5);
    box-shadow: 0 0 12px #75c8e8, 0 0 0 4px rgba(117, 200, 232, 0.2);
  }
  .sw-route__label {
    position: absolute;
    right: 28px;
    top: 50%;
    transform: translateY(-50%) translateX(8px);
    white-space: nowrap;
    font-size: 0.76rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: #dce5ec;
    background: rgba(8, 14, 23, 0.88);
    backdrop-filter: blur(14px);
    padding: 5px 12px;
    border-radius: 20px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    border: 1px solid rgba(117, 200, 232, 0.25);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
  }
  .sw-route__dot:hover .sw-route__label,
  .sw-route__dot.is-active .sw-route__label {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
  .sw-hint {
    position: fixed;
    left: 50%;
    bottom: 24px;
    z-index: 30;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(130, 151, 170, 0.8);
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  .sw-hint i {
    width: 20px;
    height: 32px;
    border-radius: 12px;
    border: 1.5px solid rgba(117, 200, 232, 0.35);
    position: relative;
  }
  .sw-hint i::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 6px;
    width: 3px;
    height: 6px;
    border-radius: 2px;
    background: #75c8e8;
    transform: translateX(-50%);
    animation: sw-wheel 1.8s ease-in-out infinite;
  }
  @keyframes sw-wheel {
    0% { opacity: 0; top: 6px; }
    40% { opacity: 1; }
    100% { opacity: 0; top: 16px; }
  }
  .sw-track {
    position: relative;
    z-index: 1;
    width: 100%;
    pointer-events: none;
  }

  @media (max-width: 860px) {
    .sw-route {
      right: 10px;
      gap: 16px;
    }
    .sw-route__label {
      display: none;
    }
    .sw-hint {
      bottom: calc(18px + env(safe-area-inset-bottom));
      font-size: 0.68rem;
    }
  }

  @media (hover: none) and (pointer: coarse) {
    .sw-route {
      padding: 12px 6px;
    }
    .sw-route__dot {
      width: 28px;
      height: 28px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sw-hint i::after { animation: none; }
    .sw-pt { display: none; }
  }
  `;

  const style = document.createElement('style');
  style.id = 'sw-css';
  style.textContent = `@layer sw {\n${css}\n}`;
  document.head.appendChild(style);
}

// Helpers
function el(tag, cls) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}
function pad(n) {
  return String(n).padStart(2, '0');
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function ctaBtns(cta) {
  let h = '';
  if (cta.primary) {
    h += `<a class="sw-btn sw-btn--primary" href="${esc(cta.primary.href || '#')}">${esc(cta.primary.label)}</a>`;
  }
  if (cta.secondary) {
    h += `<a class="sw-btn sw-btn--ghost" href="${esc(cta.secondary.href || '#')}">${esc(cta.secondary.label)}</a>`;
  }
  return h;
}

// Expose globally for script tag users
if (typeof window !== 'undefined') {
  window.mountScrollWorld = mountScrollWorld;
}

export default mountScrollWorld;
