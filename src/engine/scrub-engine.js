/* ============================================================================
   ⛩️ Phraser Neo-Tokyo 3D Scroll-World — Scrub Engine
   ----------------------------------------------------------------------------
   Framework-agnostic. Vanilla ES Module, zero external dependencies.
   Adapted from scroll-world battle-tested architecture for phraser-bond.

   CORE CAPABILITIES:
   1. Continuous 3D camera-flight scrub engine tightly calibrated to document height:
      - Tightly matches the 5 flight stations with ZERO dead empty scroll space at the bottom.
   2. Elevated Vibrant Generative 3D Cyber-Shrine WebGL / Canvas Motion Backdrop:
      - 3D Torii gates colonnade receding into deep perspective.
      - Glowing neon cyber-grid floor and ceiling tunnel.
      - 3D floating illuminated Japanese kanji motes (創, 生, 工, 房, 海, 向, 音, 韻, 終, 章, ⇱, 雅).
      - Smooth interactive mouse parallax (pitch & yaw camera tilting).
      - Velocity-responsive warp streaks when scrolling rapidly.
   3. 3D Spatial Minimap & Flight Waypoint HUD:
      - Interactive cyberpunk flight radar showing the 5 flight stations:
        [01 創生] -> [02 工房] -> [03 海向] -> [04 音韻] -> [05 終章].
      - Dynamic traveling drone cursor and real-time altitude & sector telemetry.
   4. Video Blob URL fetcher & in-memory object URL caching pipeline:
      - Fetches media into in-memory Blobs and plays from object URLs.
      - Eliminates byte-range stalls and prevents freezing at frame 0.
   5. Touch/Mobile seek coalescing & iOS video priming:
      - Coalesces seeks: avoids issuing new currentTime while decoder is seeking.
      - Coarser seek epsilon on coarse pointer / mobile devices (eps = 0.02).
      - Primes muted video playback on first user touch gesture to prevent iOS black frames.
      - Keeps still poster visible until video paints first frame ('seeked' event).
   6. Waypoint Event System & Station Activation Callbacks:
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
 * Renders an elevated, vibrant Neo-Tokyo flight with Torii gates, perspective grids,
 * floating kanji motes, mouse parallax, and warp streaks.
 */
export class CyberShrineBackdrop {
  constructor(hostElement, options = {}) {
    this.host = hostElement;
    this.reduceMotion = options.reduceMotion || false;
    this.isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sw-canvas-backdrop';
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.host.appendChild(this.canvas);

    this.width = 0;
    this.height = 0;
    this.dpr = this.isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    // Camera and flight state
    this.camZ = 0;
    this.targetZ = 0;
    this.lastCamZ = 0;
    this.scrollVelocity = 0;
    this.scrollProgress = 0;
    this.idleFrames = 0;

    // Mouse parallax tracking (desktop only)
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;

    // Torii gates configuration in 3D world space (lightweight on mobile)
    this.numGates = this.isMobile ? 4 : 8;
    this.gateSpacing = this.isMobile ? 420 : 360;
    this.totalGateSpan = this.numGates * this.gateSpacing;

    // Floating Japanese kanji & data particles (optimized counts)
    this.kanjiGlyphs = ['海', '向', '創', '生', '工', '房', '音', '韻', '終', '章', '⇱', '雅', '波', '光'];
    this.particles = [];
    this.initParticles(this.isMobile ? 8 : 24);

    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);

    this.resize();
    window.addEventListener('resize', this.resize, { passive: true });
    if (!this.isMobile) {
      window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    }
  }

  onMouseMove(e) {
    if (this.isMobile) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    this.targetMouseX = (e.clientX - cx) / cx;
    this.targetMouseY = (e.clientY - cy) / cy;
    this.idleFrames = 0; // Wake up immediately on mouse interaction
  }

  initParticles(count) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 1400,
        y: (Math.random() - 0.5) * 800 - 30,
        z: Math.random() * this.totalGateSpan,
        glyph: this.kanjiGlyphs[i % this.kanjiGlyphs.length],
        size: 16 + Math.random() * 16,
        alpha: 0.25 + Math.random() * 0.65,
        isRing: Math.random() > 0.65,
        isBeam: Math.random() > 0.85,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
      });
    }
  }

  resize() {
    this.isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    this.width = this.host.clientWidth || window.innerWidth;
    this.height = this.host.clientHeight || window.innerHeight;
    this.dpr = this.isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
    this.idleFrames = 0;
  }

  updateProgress(progress) {
    this.scrollProgress = progress;
    this.targetZ = progress * this.totalGateSpan * 2.2;
    this.idleFrames = 0; // Wake up immediately on scroll progress
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Smart Adaptive Power Saver (Both PC and Mobile):
    // Renders full 60fps during scroll or camera motion, then rests when idle to save GPU & CPU
    const isMovingZ = Math.abs(this.targetZ - this.camZ) > 0.05;
    const isMovingMouse = Math.abs(this.targetMouseX - this.mouseX) > 0.005 || Math.abs(this.targetMouseY - this.mouseY) > 0.005;
    const hasVelocity = this.scrollVelocity > 0.02;

    if (!isMovingZ && !isMovingMouse && !hasVelocity) {
      this.idleFrames = (this.idleFrames || 0) + 1;
      if (this.idleFrames > (this.isMobile ? 2 : 8)) {
        return; // Fully sleep when stationary
      }
    } else {
      this.idleFrames = 0;
    }

    ctx.clearRect(0, 0, w, h);

    // Smooth camera Z lerp
    if (this.reduceMotion) {
      this.camZ = this.targetZ * 0.1;
    } else {
      this.camZ += (this.targetZ - this.camZ) * 0.14;
    }

    // Calculate scroll velocity for warp streaks
    const dZ = Math.abs(this.camZ - this.lastCamZ);
    this.scrollVelocity += (dZ - this.scrollVelocity) * 0.2;
    this.lastCamZ = this.camZ;
    const warpFactor = Math.min(this.scrollVelocity / 18, 1);

    // Damped mouse parallax
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.08;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.08;

    // Vanishing Point with interactive 3D perspective tilt
    const vpX = w * (0.5 + this.mouseX * 0.05);
    const vpY = h * (0.44 + this.mouseY * 0.04);
    const focalLength = 380;

    // 1. Cyber-Grid Floor & Ceiling Tunnel Perspective
    this.drawCyberGrid(ctx, w, h, vpX, vpY, focalLength, warpFactor);

    // 2. Horizon Glow & Atmospheric Void Nebula
    this.drawHorizonGlow(ctx, vpX, vpY);

    // 3. 3D Wireframe Cyber Torii Gates Colonnade
    this.drawToriiGates(ctx, vpX, vpY, focalLength);

    // 4. Floating Kanji, Data Motes & Warp Streaks
    this.drawParticles(ctx, vpX, vpY, focalLength, warpFactor);
  }

  drawHorizonGlow(ctx, vpX, vpY) {
    const radGlow = ctx.createRadialGradient(vpX, vpY, 15, vpX, vpY, 320);
    radGlow.addColorStop(0, 'rgba(117, 200, 232, 0.38)');
    radGlow.addColorStop(0.3, 'rgba(22, 78, 120, 0.25)');
    radGlow.addColorStop(0.65, 'rgba(10, 32, 56, 0.12)');
    radGlow.addColorStop(1, 'transparent');

    ctx.fillStyle = radGlow;
    ctx.beginPath();
    ctx.arc(vpX, vpY, 320, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCyberGrid(ctx, w, h, vpX, vpY, focalLength, warpFactor) {
    ctx.save();
    ctx.lineWidth = 1;

    // A. Perspective floor lines (fewer on mobile)
    const numFloorLines = this.isMobile ? 8 : 18;
    for (let i = 0; i <= numFloorLines; i++) {
      const xOffset = ((i - numFloorLines / 2) / (numFloorLines / 2)) * (w * 1.1);
      const bottomX = vpX + xOffset * 2.0;

      const grad = ctx.createLinearGradient(vpX, vpY, bottomX, h);
      grad.addColorStop(0, 'rgba(117, 200, 232, 0)');
      grad.addColorStop(0.3, 'rgba(22, 78, 120, 0.25)');
      grad.addColorStop(1, 'rgba(117, 200, 232, 0.35)');

      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(vpX, vpY + 4);
      ctx.lineTo(bottomX, h);
      ctx.stroke();
    }

    // B. Subtle ceiling grid lines (desktop only for performance)
    if (!this.isMobile) {
      const numCeilLines = 12;
      for (let i = 0; i <= numCeilLines; i++) {
        const xOffset = ((i - numCeilLines / 2) / (numCeilLines / 2)) * (w * 1.0);
        const topX = vpX + xOffset * 1.6;

        const grad = ctx.createLinearGradient(vpX, vpY, topX, 0);
        grad.addColorStop(0, 'rgba(117, 200, 232, 0)');
        grad.addColorStop(0.4, 'rgba(22, 78, 120, 0.15)');
        grad.addColorStop(1, 'rgba(117, 200, 232, 0.2)');

        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(vpX, vpY - 4);
        ctx.lineTo(topX, 0);
        ctx.stroke();
      }
    }

    // C. Moving horizontal cross-grid rungs (Z forward flight motion)
    const rungCount = this.isMobile ? 6 : 12;
    const rungSpacing = this.isMobile ? 220 : 140;
    const zOffset = (this.camZ % rungSpacing);

    for (let i = 1; i <= rungCount; i++) {
      const z = i * rungSpacing - zOffset;
      if (z <= 10) continue;

      const scale = focalLength / (focalLength + z);
      const y = vpY + (h - vpY) * (scale * 1.35);
      if (y > h || y < vpY) continue;

      const spanX = (w * 1.1) * scale * 2.0;
      const alpha = Math.min(1, Math.max(0, (scale - 0.1) * 1.5)) * 0.32;

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
      if (gateZ < -120) gateZ += this.totalGateSpan;
      if (gateZ < 15) continue; // Behind or right in front of camera

      const scale = focalLength / (focalLength + gateZ);
      const alpha = Math.min(1, Math.max(0, (1 - gateZ / (this.totalGateSpan * 0.94)))) * 0.92;
      if (alpha <= 0.01) continue;

      const gateWidth = 460 * scale;
      const gateHeight = 330 * scale;
      const gateX = vpX;
      const gateY = vpY + (gateHeight * 0.22);

      // Kasagi (Top curved horizontal lintel)
      const kasagiY = gateY - gateHeight;
      const kasagiOverhang = gateWidth * 0.65;
      const curveLift = 18 * scale;

      ctx.lineWidth = Math.max(1.5, 3.5 * scale);
      ctx.strokeStyle = `rgba(117, 200, 232, ${alpha.toFixed(3)})`;
      if (!this.isMobile) {
        ctx.shadowColor = 'rgba(117, 200, 232, 0.55)';
        ctx.shadowBlur = 12 * scale;
      }

      ctx.beginPath();
      ctx.moveTo(gateX - kasagiOverhang, kasagiY - curveLift);
      ctx.quadraticCurveTo(gateX, kasagiY + curveLift * 0.35, gateX + kasagiOverhang, kasagiY - curveLift);
      ctx.stroke();

      // Shimaki (Second horizontal beam directly beneath Kasagi)
      const shimakiY = kasagiY + (18 * scale);
      ctx.beginPath();
      ctx.moveTo(gateX - kasagiOverhang * 0.88, shimakiY);
      ctx.lineTo(gateX + kasagiOverhang * 0.88, shimakiY);
      ctx.stroke();

      // Nuki (Lower crossbar)
      const nukiY = kasagiY + (68 * scale);
      const nukiOverhang = gateWidth * 0.54;
      ctx.strokeStyle = `rgba(22, 78, 120, ${(alpha * 0.95).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(gateX - nukiOverhang, nukiY);
      ctx.lineTo(gateX + nukiOverhang, nukiY);
      ctx.stroke();

      // Gakuzuka (Center tablet bracket / emblem plaque)
      const tabletWidth = 28 * scale;
      const tabletHeight = (nukiY - shimakiY);
      ctx.strokeRect(gateX - tabletWidth / 2, shimakiY, tabletWidth, tabletHeight);

      // Central ⇱ Kanji/Seal emblem inside tablet
      if (scale > 0.35) {
        ctx.fillStyle = `rgba(117, 200, 232, ${(alpha * 0.95).toFixed(3)})`;
        ctx.font = `${Math.floor(16 * scale)}px 'Rubik', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⇱', gateX, shimakiY + tabletHeight / 2);
      }

      // Left and Right Cylindrical Pillars
      const pillarDist = gateWidth * 0.4;
      const groundY = gateY + (85 * scale);

      ctx.strokeStyle = `rgba(117, 200, 232, ${(alpha * 0.82).toFixed(3)})`;
      ctx.beginPath();
      // Left pillar
      ctx.moveTo(gateX - pillarDist, kasagiY);
      ctx.lineTo(gateX - pillarDist * 1.05, groundY);
      // Right pillar
      ctx.moveTo(gateX + pillarDist, kasagiY);
      ctx.lineTo(gateX + pillarDist * 1.05, groundY);
      ctx.stroke();

      // Pedestal foundation blocks (Kamebara)
      const baseW = 32 * scale;
      const baseH = 12 * scale;
      ctx.fillStyle = `rgba(10, 32, 56, ${(alpha * 0.7).toFixed(3)})`;
      ctx.fillRect(gateX - pillarDist * 1.05 - baseW / 2, groundY, baseW, baseH);
      ctx.fillRect(gateX + pillarDist * 1.05 - baseW / 2, groundY, baseW, baseH);
    }

    ctx.restore();
  }

  drawParticles(ctx, vpX, vpY, focalLength, warpFactor) {
    ctx.save();
    ctx.font = "24px 'Rubik', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const p of this.particles) {
      p.rot += p.rotSpeed;

      let pz = (p.z - (this.camZ * 0.85) % this.totalGateSpan);
      if (pz < 10) pz += this.totalGateSpan;

      const scale = focalLength / (focalLength + pz);
      const alpha = Math.min(1, Math.max(0, (1 - pz / this.totalGateSpan))) * p.alpha;
      if (alpha <= 0.02) continue;

      const sx = vpX + p.x * scale;
      const sy = vpY + p.y * scale;

      // Warp speed stretch when scrolling fast
      const streakLength = warpFactor * 32 * scale;

      if (streakLength > 3) {
        // High-velocity light streak
        ctx.strokeStyle = `rgba(117, 200, 232, ${(alpha * 0.9).toFixed(3)})`;
        ctx.lineWidth = Math.max(1.2, 2.5 * scale);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (sx - vpX) * 0.15 * warpFactor, sy + (sy - vpY) * 0.15 * warpFactor);
        ctx.stroke();
      }

      if (p.isRing) {
        // Glowing cyan energy ring
        ctx.strokeStyle = `rgba(117, 200, 232, ${alpha.toFixed(3)})`;
        ctx.lineWidth = Math.max(1, 2 * scale);
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * scale * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.isBeam) {
        // Vertical cyber pillar energy spark
        ctx.fillStyle = `rgba(117, 200, 232, ${(alpha * 0.8).toFixed(3)})`;
        ctx.fillRect(sx - 1, sy - 15 * scale, 2, 30 * scale);
      } else {
        // Floating Japanese Kanji Glyphs (Hardware-accelerated scale transform)
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.rot);
        const fontScale = scale * (p.size / 24);
        ctx.scale(fontScale, fontScale);
        ctx.fillStyle = `rgba(220, 229, 236, ${alpha.toFixed(3)})`;
        if (!this.isMobile) {
          ctx.shadowColor = 'rgba(117, 200, 232, 0.55)';
          ctx.shadowBlur = 6;
        }
        ctx.fillText(p.glyph, 0, 0);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  destroy() {
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('mousemove', this.onMouseMove);
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
  const DIVE_W = config.diveScroll || 1.0;
  const CONN_W = config.connScroll || 0.6;
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

  const stage = el('div', 'sw-stage');
  const copylayer = el('div', 'sw-copylayer');

  // 3D Spatial Minimap / Flight Waypoint HUD
  const minimap = el('div', 'sw-minimap');
  minimap.id = 'swMinimap';
  minimap.innerHTML = `
    <div class="sw-minimap__header">
      <span class="sw-minimap__radar-pulse"></span>
      <span class="sw-minimap__title">空間航路 // FLIGHT RADAR</span>
    </div>
    <div class="sw-minimap__track">
      <div class="sw-minimap__line"></div>
      <div class="sw-minimap__drone" id="swMinimapDrone"></div>
      <div class="sw-minimap__nodes" id="swMinimapNodes"></div>
    </div>
    <div class="sw-minimap__telemetry">
      <span class="sw-telemetry-item">ALT: <b id="swAlt">120m</b></span>
      <span class="sw-telemetry-item">NAV: <b id="swNav">01 // 創生</b></span>
    </div>
  `;

  const hint = el('div', 'sw-hint');
  const hintText = el('span');
  hintText.textContent = config.hint || 'スクロールして探索 // SCROLL TO FLY';
  hint.appendChild(hintText);
  hint.appendChild(el('i'));

  const track = el('div', 'sw-track');

  // Mount elements to container
  [sky, scrollbar, stage, copylayer, minimap, hint, track].forEach(node => container.appendChild(node));

  // Populate Minimap Nodes
  const minimapNodesContainer = minimap.querySelector('#swMinimapNodes');
  const minimapDrone = minimap.querySelector('#swMinimapDrone');
  const navTelemetry = minimap.querySelector('#swNav');
  const altTelemetry = minimap.querySelector('#swAlt');

  const minimapNodeButtons = [];
  SECTIONS.forEach((s, idx) => {
    const btn = el('button', 'sw-minimap__node');
    btn.setAttribute('type', 'button');
    btn.setAttribute('data-index', String(idx));
    btn.setAttribute('aria-label', `Navigate to Station ${idx + 1}: ${s.label || ''}`);
    btn.innerHTML = `
      <span class="node-badge">0${idx + 1}</span>
      <span class="node-kanji">${esc(s.kanji || '')}</span>
      <span class="node-name">${esc(s.title ? s.title.replace(/^[0-9:\s]+/, '') : '')}</span>
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      jumpTo(idx);
    });
    minimapNodesContainer.appendChild(btn);
    minimapNodeButtons.push(btn);
  });

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

  // ---- Math & Physics Helpers ----
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const lingerEase = (x, L) => {
    L = clamp(L);
    const c = x - 0.5;
    return (1 - L) * x + L * (4 * c * c * c + 0.5);
  };

  let vh = window.innerHeight;
  let activeIndex = -1;
  let ticking = false;
  let isRunning = true;
  let laidOutW = window.innerWidth;
  let userReady = false;

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
   * Layout & Track Calibration
   * If .scroll-container exists in DOM, track height is zeroed so document scroll
   * is tightly bounded to the content with ZERO dead empty space.
   */
  function layout() {
    vh = window.innerHeight;
    laidOutW = window.innerWidth;

    const scrollContainer = document.getElementById('scrollContainer') || document.querySelector('.scroll-container');

    if (scrollContainer) {
      // When page content drives scroll, track adds ZERO extra height
      track.style.height = '0px';
      track.style.display = 'none';

      // Compute max scroll from actual DOM document
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

      // Distribute segments proportionally across the real scroll height
      let totalWeights = 0;
      SEGMENTS.forEach(s => { totalWeights += s.w; });

      let currentPixel = 0;
      SEGMENTS.forEach(s => {
        s.start = currentPixel;
        const segmentHeight = (s.w / totalWeights) * maxScroll;
        currentPixel += segmentHeight;
        s.end = currentPixel;
      });
    } else {
      // Standalone mode: tightly bound track height
      let off = 0;
      SEGMENTS.forEach(s => {
        s.start = off * vh;
        off += s.w;
        s.end = off * vh;
      });
      track.style.height = `${off * vh}px`;
    }

    read();
  }

  function jumpTo(i) {
    // Check if DOM station exists first
    const s = SECTIONS[i];
    if (s && s.domSelector) {
      const el = document.querySelector(s.domSelector);
      if (el) {
        el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        return;
      }
    }

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
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = clamp(y / maxScroll);

    // Update 3D canvas backdrop progress
    if (backdrop) {
      backdrop.updateProgress(progress);
    }

    let ci = 0;
    for (let i = 0; i < NSEG; i++) {
      if (y >= SEGMENTS[i].start) ci = i;
    }

    const fade = CROSSFADE * vh;

    // Prefetch and scrub segments
    for (let i = 0; i < NSEG; i++) {
      const s = SEGMENTS[i];
      // Prefetch clips within scroll vicinity
      if (y > s.start - 1.5 * vh && y < s.end + 1.5 * vh) {
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

    // Update Minimap Drone Position and Active States
    if (minimapDrone) {
      minimapDrone.style.top = `${progress * 100}%`;
    }

    // Waypoint activation change
    if (near !== activeIndex) {
      const prev = activeIndex;
      activeIndex = near;

      // Update minimap node active classes
      minimapNodeButtons.forEach((btn, k) => {
        btn.classList.toggle('is-active', k === near);
      });

      // Update telemetry readouts
      if (navTelemetry && SECTIONS[near]) {
        navTelemetry.textContent = `0${near + 1} // ${SECTIONS[near].kanji || ''}`;
      }
      if (altTelemetry) {
        altTelemetry.textContent = `${Math.round(120 + near * 45)}m`;
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
    hint.style.opacity = clamp(1 - y / (0.35 * vh));
    if (particles) {
      particles.style.transform = `translate3d(0, ${-y * 0.04}px, 0)`;
    }

    ticking = false;
  }

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
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      return clamp(y / maxScroll);
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
  const titles = ['創生 The Genesis', '工房 Project Forge', '海向 Umimukō Music', '音韻 Sound Sanctuary', '終章 Terminal Finale'];
  const kanji = ['創生', '工房', '海向', '音韻', '終章'];
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
    display: none;
  }

  /* 3D Spatial Minimap & Flight Waypoint HUD */
  .sw-minimap {
    position: fixed;
    right: clamp(14px, 2.5vw, 36px);
    top: 50%;
    transform: translateY(-50%);
    z-index: 85;
    background: rgba(8, 14, 23, 0.88);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(117, 200, 232, 0.3);
    border-radius: 18px;
    padding: 16px 14px;
    box-shadow: 0 16px 45px rgba(0, 0, 0, 0.75), 0 0 25px rgba(22, 78, 120, 0.25);
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 170px;
    pointer-events: auto;
    user-select: none;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }
  .sw-minimap:hover {
    border-color: rgba(117, 200, 232, 0.5);
    box-shadow: 0 20px 55px rgba(0, 0, 0, 0.85), 0 0 35px rgba(117, 200, 232, 0.2);
  }
  .sw-minimap__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(32, 54, 74, 0.7);
  }
  .sw-minimap__radar-pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #75c8e8;
    box-shadow: 0 0 10px #75c8e8;
    animation: radarPulse 1.6s ease-in-out infinite;
  }
  @keyframes radarPulse {
    0% { transform: scale(0.9); opacity: 0.6; }
    50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 14px #75c8e8; }
    100% { transform: scale(0.9); opacity: 0.6; }
  }
  .sw-minimap__title {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #75c8e8;
    white-space: nowrap;
  }
  .sw-minimap__track {
    position: relative;
    padding: 4px 0;
  }
  .sw-minimap__line {
    position: absolute;
    left: 17px;
    top: 14px;
    bottom: 14px;
    width: 2px;
    background: linear-gradient(180deg, #75c8e8, rgba(22, 78, 120, 0.4), #75c8e8);
    opacity: 0.4;
  }
  .sw-minimap__drone {
    position: absolute;
    left: 14px;
    top: 0%;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #75c8e8;
    box-shadow: 0 0 12px #75c8e8, 0 0 0 3px rgba(117, 200, 232, 0.3);
    transform: translate(-50%, -50%);
    transition: top 0.15s ease-out;
    pointer-events: none;
    z-index: 3;
  }
  .sw-minimap__nodes {
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
    z-index: 2;
  }
  .sw-minimap__node {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: 0;
    padding: 4px 6px;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s ease, transform 0.2s ease;
  }
  .sw-minimap__node:hover {
    background: rgba(117, 200, 232, 0.1);
    transform: translateX(2px);
  }
  .sw-minimap__node.is-active {
    background: rgba(22, 78, 120, 0.3);
  }
  .sw-minimap__node .node-badge {
    font-size: 0.64rem;
    font-weight: 800;
    font-family: monospace;
    color: #8297aa;
    width: 18px;
  }
  .sw-minimap__node.is-active .node-badge {
    color: #75c8e8;
  }
  .sw-minimap__node .node-kanji {
    font-size: 0.72rem;
    font-weight: 700;
    color: #dce5ec;
    background: rgba(10, 32, 56, 0.6);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid rgba(117, 200, 232, 0.2);
  }
  .sw-minimap__node.is-active .node-kanji {
    color: #ffffff;
    background: rgba(22, 78, 120, 0.7);
    border-color: #75c8e8;
    box-shadow: 0 0 8px rgba(117, 200, 232, 0.4);
  }
  .sw-minimap__node .node-name {
    font-size: 0.7rem;
    font-weight: 600;
    color: #8297aa;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sw-minimap__node.is-active .node-name {
    color: #ffffff;
    font-weight: 700;
  }
  .sw-minimap__telemetry {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 8px;
    border-top: 1px solid rgba(32, 54, 74, 0.7);
    font-size: 0.64rem;
    font-family: monospace;
    color: #8297aa;
  }
  .sw-telemetry-item b {
    color: #75c8e8;
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
    .sw-minimap {
      right: 10px;
      width: auto;
      padding: 10px 8px;
      gap: 8px;
      border-radius: 14px;
    }
    .sw-minimap__header,
    .sw-minimap__telemetry,
    .sw-minimap__node .node-name {
      display: none;
    }
    .sw-minimap__node {
      padding: 4px 2px;
    }
    .sw-hint {
      bottom: calc(18px + env(safe-area-inset-bottom));
      font-size: 0.68rem;
    }
  }

  @media (hover: none) and (pointer: coarse) {
    .sw-minimap__node {
      min-height: 32px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sw-hint i::after { animation: none; }
    .sw-pt { display: none; }
    .sw-minimap__radar-pulse { animation: none; }
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

// Expose globally for script tag users
if (typeof window !== 'undefined') {
  window.mountScrollWorld = mountScrollWorld;
}

export default mountScrollWorld;
