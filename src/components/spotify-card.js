/**
 * ⛩️ Umimukō Cyber-Cassette Player & Audio Shrine Pill
 * Author: @stylist
 * Conforms strictly to plan.md Section 5 and coming-soon-genesis-rubik.html
 */

import { initJapaneseAtmosphere } from './japanese-atmosphere.js';

export const SPOTIFY_PLAYLIST_URL =
  'https://open.spotify.com/user/314myr3uatmxbfq3y6vo5gljp3fu?si=0c4d1f5aba0941c8';

/**
 * Creates the Cyber-Cassette Walkman Player card element
 * @returns {HTMLAnchorElement}
 */
export function createSpotifyCard(options = {}) {
  const url = options.url || SPOTIFY_PLAYLIST_URL;
  const kanjiHeader = options.kanjiHeader || '雅 音楽 — Phraser Selection';
  const trackTitle = options.trackTitle || 'Umimukō Cyber Sanctuary';
  const trackArtist = options.trackArtist || 'Curated by Phraser • 海向こう';

  const card = document.createElement('a');
  card.href = url;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  card.className = 'spotify-card';
  card.setAttribute('aria-label', 'Listen to Phraser Selection on Spotify');

  card.innerHTML = `
    <!-- Cassette Deck Status Bar -->
    <div class="cassette-deck-header">
      <div class="cassette-badge">
        <span class="tape-led"></span>
        <span>REC / STEREO • 90 MIN</span>
      </div>
      <div class="cassette-kanji-title">${kanjiHeader}</div>
    </div>

    <!-- Cassette Reel Inspection Window -->
    <div class="cassette-window">
      <div class="tape-spool left-spool" aria-hidden="true">
        <div class="spool-inner"></div>
      </div>
      <div class="tape-bridge" aria-hidden="true"></div>
      <div class="tape-spool right-spool" aria-hidden="true">
        <div class="spool-inner"></div>
      </div>
    </div>

    <!-- Animated Glowing Cyan Equalizer -->
    <div class="equalizer-container" aria-label="Audio Visualizer">
      <span class="eq-bar"></span>
      <span class="eq-bar"></span>
      <span class="eq-bar"></span>
      <span class="eq-bar"></span>
      <span class="eq-bar"></span>
      <span class="eq-bar"></span>
      <span class="eq-bar"></span>
    </div>

    <!-- Track Metadata & Creator Line -->
    <div class="cassette-metadata">
      <div class="cassette-track-title">${trackTitle}</div>
      <div class="cassette-track-sub">${trackArtist}</div>
    </div>

    <!-- Spotify Launch Action Button -->
    <div class="spotify-launch-bar">
      <svg class="spotify-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.495 17.307c-.215.353-.674.464-1.026.248-2.812-1.718-6.352-2.107-10.52-1.155-.403.092-.806-.16-.898-.564-.092-.402.16-.806.564-.898 4.562-1.042 8.47-.6 11.632 1.343.353.216.464.674.248 1.026zm1.467-3.262c-.27.44-.848.58-1.288.31-3.218-1.978-8.125-2.55-11.932-1.393-.497.15-1.023-.133-1.173-.63-.15-.497.133-1.023.63-1.173 4.356-1.323 9.775-.683 13.453 1.58.44.27.58.848.31 1.288zm.126-3.41c-3.86-2.292-10.228-2.503-13.896-1.39-.59.18-1.218-.16-1.398-.75-.18-.59.16-1.218.75-1.398 4.22-1.282 11.253-1.037 15.684 1.593.53.315.703 1.002.388 1.533-.315.53-1.002.703-1.533.388z"/>
      </svg>
      <span>OPEN PLAYLIST IN SPOTIFY ↗</span>
    </div>
  `;

  return card;
}

/**
 * Creates the persistent top-right Audio Shrine Pill
 * @returns {HTMLAnchorElement}
 */
export function createAudioShrinePill(options = {}) {
  const url = options.url || SPOTIFY_PLAYLIST_URL;
  const pill = document.createElement('a');
  pill.href = url;
  pill.target = '_blank';
  pill.rel = 'noopener noreferrer';
  pill.className = 'audio-shrine-pill';
  pill.id = 'audioShrinePill';
  pill.setAttribute('aria-label', 'Open Spotify Audio Shrine');

  pill.innerHTML = `
    <div class="mini-eq" aria-hidden="true">
      <span class="mini-bar"></span>
      <span class="mini-bar"></span>
      <span class="mini-bar"></span>
    </div>
    <span class="shrine-label">音韻 ⇱ SPOTIFY</span>
  `;

  return pill;
}

/**
 * Mounts the Cyber-Cassette Player into a target container
 * @param {HTMLElement|string} target
 */
export function initSpotifyWidget(target) {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) return null;
  const card = createSpotifyCard();
  container.appendChild(card);
  return card;
}

/**
 * Mounts the persistent Audio Shrine Pill into the document body or header dock
 * @param {HTMLElement|string} [target]
 */
export function initAudioShrine(target = document.body) {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) return null;

  // Prevent duplicate mounts
  const existing = document.getElementById('audioShrinePill');
  if (existing) return existing;

  const pill = createAudioShrinePill();
  container.appendChild(pill);
  return pill;
}

// Auto-bootstrap Japanese atmosphere (drifting clouds, petals, collage) when module loads in browser
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initJapaneseAtmosphere());
  } else {
    setTimeout(initJapaneseAtmosphere, 0);
  }
}

export default createSpotifyCard;
