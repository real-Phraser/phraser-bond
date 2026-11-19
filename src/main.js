// src/main.js - Phraser Neo-Tokyo 3D Scroll Portfolio Entry Point
import './styles/theme.css';
import './styles/japanese-art.css';
import './styles/glass.css';

import { initWorld } from './engine/world-setup.js';
import { initSpotifyWidget } from './components/spotify-card.js';
import { initProjectGallery } from './components/project-gallery.js';

/**
 * Bootstrap Application
 */
function bootstrap() {
  console.log('⛩️ Bootstrapping Phraser Neo-Tokyo 3D Scroll Portfolio');

  // 1. Setup Header Waypoint Navigation & Active Sync
  setupHeaderNav();

  // 2. Setup 3D mouse tilt & dynamic spotlight on liquid glass cards
  setupTiltEffect();

  // 3. Initialize 3D Spatial Scroll Engine in #world container
  try {
    initWorld('world');
  } catch (err) {
    console.warn('[Spatial Engine] Initialization fallback:', err);
  }

  // 4. Mount Project Forge Gallery into Station 2 (#projectsGalleryMount)
  try {
    initProjectGallery('#projectsGalleryMount');
  } catch (err) {
    console.warn('[Project Gallery] Mount fallback:', err);
  }

  // 5. Mount Spotify Cyber-Cassette Player into Station 4 (#spotifyCardMount)
  try {
    initSpotifyWidget('#spotifyCardMount');
  } catch (err) {
    console.warn('[Spotify Widget] Mount fallback:', err);
  }
}

/**
 * Setup Header Waypoint Navigation & Active State Tracking
 */
function setupHeaderNav() {
  const navLinks = document.querySelectorAll('.header-nav .nav-link');
  if (!navLinks.length) return;

  // Smooth scroll click handler for header links
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-target') || link.getAttribute('href')?.replace('#', '');
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        navLinks.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  });

  // Explore button smooth scroll
  const exploreBtn = document.querySelector('.explore-btn');
  if (exploreBtn) {
    exploreBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const projectsSection = document.getElementById('station-projects');
      if (projectsSection) {
        projectsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  // IntersectionObserver to sync active nav link during scroll/flight
  const stations = document.querySelectorAll('section.station');
  if (stations.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const stationId = entry.target.id;
            navLinks.forEach((link) => {
              const target = link.getAttribute('data-target') || link.getAttribute('href')?.replace('#', '');
              if (target === stationId) {
                link.classList.add('active');
              } else {
                link.classList.remove('active');
              }
            });
          }
        });
      },
      {
        threshold: 0.35,
      }
    );

    stations.forEach((st) => observer.observe(st));
  }
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
