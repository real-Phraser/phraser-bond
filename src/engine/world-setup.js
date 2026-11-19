/**
 * ============================================================================
 * ⛩️ Phraser Neo-Tokyo 3D Scroll-World — Station Rigging & Setup
 * ----------------------------------------------------------------------------
 * Configures the 5 spatial flight stations and 4 seamless connectors.
 * Connects the 3D scrub-engine to the #world container and DOM stations.
 *
 * REORDERED FLIGHT MANIFEST (Projects above Music):
 * 1. 創生 The Genesis      (#station-genesis  — Hero Torii Gate & Shimmering ⇱ Emblem)
 * 2. 工房 Project Forge    (#station-projects — Dynamic 3D Repository Gallery & 24h Cron)
 * 3. 海向 Umimukō Music    (#station-flagship — Flagship Desktop Audio Application)
 * 4. 音韻 Sound Sanctuary  (#station-sound    — Umimukō Spotify Cyber-Cassette Player)
 * 5. 終章 Terminal Finale  (#station-terminal — Hanko Wax Seal, Bio, Social Altar)
 * ============================================================================
 */

import { mountScrollWorld, ScrubEngine } from './scrub-engine.js';

/**
 * The 5 Reordered Flight Stations Specification
 */
export const STATIONS = [
  {
    id: 'genesis',
    stationNumber: 1,
    kanji: '創生',
    label: '1: 創生 The Genesis',
    eyebrow: '01 // 始動 — Neo-Tokyo',
    title: '創生 The Genesis',
    body: 'Enter the spatial realm of Phraser. A synthesis of ancient Japanese minimalism, drifting Ukiyo-e vector clouds, and futuristic cyberpunk liquid glass.',
    accent: '#75c8e8',
    scroll: 1.0,
    linger: 0.35,
    still: 'assets/posters/genesis.webp',
    stillMobile: 'assets/posters/genesis-m.webp',
    clip: 'assets/vid/genesis.mp4',
    clipMobile: 'assets/vid/genesis-m.mp4',
    domSelector: '#station-genesis',
    tags: ['Neo-Tokyo', 'Torii Gate', '⇱ Emblem', 'Liquid Glass'],
  },
  {
    id: 'forge',
    stationNumber: 2,
    kanji: '工房',
    label: '2: 工房 Project Forge',
    eyebrow: '02 // 工房 — Project Forge',
    title: '工房 Project Forge',
    body: 'Dynamic 3D gallery of open-source engineering. Repositories automatically ingested every 24 hours directly from real-Phraser GitHub sanctum.',
    accent: '#75c8e8',
    scroll: 1.4,
    linger: 0.5,
    still: 'assets/posters/forge.webp',
    stillMobile: 'assets/posters/forge-m.webp',
    clip: 'assets/vid/forge.mp4',
    clipMobile: 'assets/vid/forge-m.mp4',
    domSelector: '#station-projects',
    tags: ['GitHub Actions', '24h Cron Sync', 'Dynamic Docs', 'Open Source'],
    cta: {
      primary: { label: 'Explore Repositories', href: '#station-projects' },
      secondary: { label: 'GitHub Sanctum', href: 'https://github.com/real-Phraser' },
    },
  },
  {
    id: 'umimuko',
    stationNumber: 3,
    kanji: '海向',
    label: '3: 海向 Umimukō Music',
    eyebrow: '03 // 旗艦 — Flagship Project',
    title: '海向 Umimukō Music',
    body: 'Cross-platform desktop music player crafted with Kotlin & Compose Multiplatform. High-performance native audio architecture with VLC engine.',
    accent: '#75c8e8',
    scroll: 1.2,
    linger: 0.45,
    still: 'assets/posters/umimuko.webp',
    stillMobile: 'assets/posters/umimuko-m.webp',
    clip: 'assets/vid/umimuko.mp4',
    clipMobile: 'assets/vid/umimuko-m.mp4',
    domSelector: '#station-flagship',
    tags: ['Kotlin', 'Compose Multiplatform', 'VLC Engine', 'Desktop Audio'],
    cta: {
      primary: { label: 'Explore Documentation', href: './Umimuko-Music/' },
      secondary: { label: 'Source Repository', href: 'https://github.com/real-Phraser/Umimuko-Music' },
    },
  },
  {
    id: 'sanctuary',
    stationNumber: 4,
    kanji: '音韻',
    label: '4: 音韻 Sound Sanctuary',
    eyebrow: '04 // 雅 音楽 — Audio Altar',
    title: '音韻 Sound Sanctuary',
    body: 'The Umimukō Cyber-Cassette Player dock. Sonic frequencies curated by Phraser, streaming live from the Spotify sanctuary with glowing neon equalizer bars.',
    accent: '#164e78',
    scroll: 1.2,
    linger: 0.45,
    still: 'assets/posters/sanctuary.webp',
    stillMobile: 'assets/posters/sanctuary-m.webp',
    clip: 'assets/vid/sanctuary.mp4',
    clipMobile: 'assets/vid/sanctuary-m.mp4',
    domSelector: '#station-sound',
    tags: ['Spotify', 'Cassette Altar', 'Equalizer', 'Lo-Fi Cyberpunk'],
    cta: {
      primary: {
        label: 'Open Spotify Altar',
        href: 'https://open.spotify.com/user/314myr3uatmxbfq3y6vo5gljp3fu?si=0c4d1f5aba0941c8',
      },
    },
  },
  {
    id: 'terminal',
    stationNumber: 5,
    kanji: '終章',
    label: '5: 終章 Terminal Finale',
    eyebrow: '05 // 結び — Beyond the Horizon',
    title: '終章 Terminal Finale',
    body: 'Creation across the digital sea. Hanko wax seal verified, source code open. Connect with Phraser across GitHub and cyberspace.',
    accent: '#dce5ec',
    scroll: 1.0,
    linger: 0.35,
    still: 'assets/posters/terminal.webp',
    stillMobile: 'assets/posters/terminal-m.webp',
    clip: 'assets/vid/terminal.mp4',
    clipMobile: 'assets/vid/terminal-m.mp4',
    domSelector: '#station-terminal',
    tags: ['海 Hanko Seal', 'real-Phraser', 'phraser.bond', 'Terminal'],
    cta: {
      primary: { label: 'GitHub Profile', href: 'https://github.com/real-Phraser' },
      secondary: { label: 'Spotify Profile', href: 'https://open.spotify.com/user/314myr3uatmxbfq3y6vo5gljp3fu?si=0c4d1f5aba0941c8' },
    },
  },
];

/**
 * 4 Seamless Connectors (Joining consecutive stations in new order)
 */
export const CONNECTORS = [
  'assets/vid/conn0-genesis-to-forge.mp4',
  'assets/vid/conn1-forge-to-umimuko.mp4',
  'assets/vid/conn2-umimuko-to-sanctuary.mp4',
  'assets/vid/conn3-sanctuary-to-terminal.mp4',
];

/**
 * 4 Mobile Portrait Connectors (9:16 optimized for phones)
 */
export const CONNECTORS_MOBILE = [
  'assets/vid/conn0-genesis-to-forge-m.mp4',
  'assets/vid/conn1-forge-to-umimuko-m.mp4',
  'assets/vid/conn2-umimuko-to-sanctuary-m.mp4',
  'assets/vid/conn3-sanctuary-to-terminal-m.mp4',
];

/**
 * Master World Configuration
 */
export const WORLD_CONFIG = {
  brand: {
    name: '海向こう Umimukō',
    href: '#station-genesis',
  },
  diveScroll: 1.0,
  connScroll: 0.6,
  crossfade: 0.12,
  hint: 'スクロールして探索 // SCROLL TO FLY',
  nav: false,
  showDefaultCopy: false,
  atmosphere: true,
  sections: STATIONS,
  connectors: CONNECTORS,
  connectorsMobile: CONNECTORS_MOBILE,
};

/**
 * Initialize 3D Scroll World and Wire Station Waypoints
 * @param {string|HTMLElement} containerIdOrEl - Target container (#world or 'world')
 * @param {Object} options - Custom overrides
 * @returns {Object} Engine controller instance
 */
export function initWorld(containerIdOrEl = 'world', options = {}) {
  const container = typeof containerIdOrEl === 'string'
    ? document.getElementById(containerIdOrEl.replace(/^#/, ''))
    : containerIdOrEl;

  if (!container) {
    console.warn('[world-setup] Mount point not found:', containerIdOrEl);
    return null;
  }

  // Cache DOM station sections for smooth sync
  const domStations = STATIONS.map(s => document.querySelector(s.domSelector)).filter(Boolean);

  // Merge options with default world config
  const config = {
    ...WORLD_CONFIG,
    ...options,
    onStationChange: (index, station, prevIndex) => {
      // Update DOM station active states
      domStations.forEach((el, idx) => {
        if (!el) return;
        const isActive = idx === index;
        el.classList.toggle('is-active', isActive);
        el.setAttribute('data-active', isActive ? 'true' : 'false');
      });

      // Call external handler if provided
      if (typeof options.onStationChange === 'function') {
        options.onStationChange(index, station, prevIndex);
      }
    },
    onScrollProgress: (progress, currentStationIndex, stationProgress) => {
      // Dispatches custom event on container
      if (typeof options.onScrollProgress === 'function') {
        options.onScrollProgress(progress, currentStationIndex, stationProgress);
      }
    },
  };

  // Mount the engine
  const controller = mountScrollWorld(container, config);

  // Wire clicking station waypoint dots to scroll to the corresponding DOM section
  if (controller && domStations.length) {
    const originalJumpTo = controller.jumpTo;
    controller.jumpTo = (stationIndex) => {
      const targetEl = domStations[stationIndex];
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        originalJumpTo(stationIndex);
      }
    };
  }

  // Set initial active state on first station
  if (domStations[0]) {
    domStations[0].classList.add('is-active');
  }

  console.log('⛩️ 3D Scroll-World initialized across 5 stations with elevated cyber-shrine backdrop & flight radar minimap');
  return controller;
}

export { ScrubEngine, mountScrollWorld };
export default initWorld;
