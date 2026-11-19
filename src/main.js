// src/main.js - Phraser Neo-Tokyo 3D Scroll Portfolio Entry Point
import './styles/theme.css';
import './styles/japanese-art.css';
import './styles/glass.css';

import { initWorld } from './engine/world-setup.js';
import { initSpotifyWidget, initAudioShrine } from './components/spotify-card.js';
import { initProjectGallery } from './components/project-gallery.js';

/**
 * Bootstrap Application
 */
function bootstrap() {
  console.log('⛩️ Bootstrapping Phraser Neo-Tokyo 3D Scroll Portfolio');

  // 1. Initialize dots animation on hero card
  initDotsAnimation();

  // 2. Setup 3D mouse tilt & dynamic spotlight on liquid glass cards
  setupTiltEffect();

  // 3. Initialize 3D Spatial Scroll Engine in #world container
  try {
    initWorld('world');
  } catch (err) {
    console.warn('[Spatial Engine] Initialization fallback:', err);
  }

  // 4. Mount Spotify Cyber-Cassette Player into Station 2 (#spotifyCardMount)
  try {
    initSpotifyWidget('#spotifyCardMount');
  } catch (err) {
    console.warn('[Spotify Widget] Mount fallback:', err);
  }

  // 5. Mount Project Forge Gallery into Station 3 (#projectsGalleryMount)
  try {
    initProjectGallery('#projectsGalleryMount');
  } catch (err) {
    console.warn('[Project Gallery] Mount fallback:', err);
  }

  // 5. Mount persistent Audio Shrine Pill if needed
  try {
    const dockRight = document.querySelector('.dock-right');
    if (!document.getElementById('audioShrinePill') && !document.getElementById('spotifyDockPill')) {
      initAudioShrine(dockRight || document.body);
    }
  } catch (err) {
    console.warn('[Audio Shrine] Mount fallback:', err);
  }
}

/**
 * Animated ellipsis for "coming soon" badge
 */
function initDotsAnimation() {
  const dotsEl = document.getElementById('dots');
  if (!dotsEl) return;
  let step = 0;
  setInterval(() => {
    step = (step + 1) % 4;
    dotsEl.textContent = '.'.repeat(step);
  }, 500);
}

/**
 * 3D Tilt and Dynamic Cursor Spotlight for Liquid Glass Containers
 */
function setupTiltEffect() {
  const cards = document.querySelectorAll('.glass-card, .container, .liquid-card');
  if (!cards.length) return;

  window.addEventListener('mousemove', (e) => {
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);

      // Only tilt if element is visible in the viewport
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = -((y - centerY) / centerY) * 5;
        const rotateY = ((x - centerX) / centerX) * 5;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
      }
    });
  });

  window.addEventListener('mouseleave', () => {
    cards.forEach((card) => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
