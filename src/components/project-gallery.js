/**
 * ⛩️ Project Forge Gallery Component
 * Dynamically fetches and renders public projects from dist/data/projects.json
 * Styled with .forge-grid and .project-glass-card in glass.css
 */

export const FALLBACK_PROJECTS = [
  {
    name: 'Umimuko-Music',
    title: '海向こう Umimukō Music',
    description: '🌊 A clean, offline-first music player for Windows, Linux and MacOS — no streaming, no accounts, just your music.',
    stars: 2,
    language: 'Kotlin',
    topics: ['music-player', 'compose-multiplatform', 'offline-first', 'desktop'],
    hasCustomDocs: false,
    route: '/Umimuko-Music/',
    githubUrl: 'https://github.com/real-Phraser/Umimuko-Music',
    updatedAt: '2026-11-18T04:31:58Z'
  },
  {
    name: 'phraser-bond',
    title: '創生 Phraser Bond',
    description: 'Avant-garde Neo-Tokyo 3D camera-flight scroll portfolio and Japanese cyberpunk universe.',
    stars: 0,
    language: 'JavaScript',
    topics: ['3d-scroll', 'camera-flight', 'neo-tokyo', 'portfolio'],
    hasCustomDocs: false,
    route: '/phraser-bond/',
    githubUrl: 'https://github.com/real-Phraser/phraser-bond',
    updatedAt: '2026-11-19T12:26:25Z'
  }
];

/**
 * Fetches the projects list with fallback
 * @returns {Promise<Array>}
 */
export async function fetchProjects() {
  try {
    const res = await fetch('./data/projects.json');
    if (!res.ok) {
      const resRoot = await fetch('/data/projects.json');
      if (!resRoot.ok) throw new Error(`HTTP ${res.status}`);
      return await resRoot.json();
    }
    return await res.json();
  } catch (err) {
    console.warn('[Project Gallery] Using fallback projects manifest:', err);
    return FALLBACK_PROJECTS;
  }
}

/**
 * Creates a project card element
 * @param {Object} project
 * @returns {HTMLElement}
 */
export function createProjectCard(project) {
  const card = document.createElement('div');
  card.className = 'project-glass-card';

  // Format date safely
  let dateStr = '';
  try {
    dateStr = project.updatedAt ? new Date(project.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '';
  } catch (e) {
    dateStr = '';
  }

  // Determine child path documentation link
  // Use relative link: './[project-name]/' to work seamlessly under /phraser-bond/ or domain root
  const docLink = `./${project.name}/`;

  card.innerHTML = `
    <div>
      <div class="project-header">
        <h3 class="project-title">${project.title || project.name}</h3>
        <span class="project-tag">${project.language || 'Code'}</span>
      </div>
      <p class="project-desc">${project.description || 'Public repository by Phraser.'}</p>
    </div>

    <div>
      <div class="project-meta" style="margin-bottom: 16px;">
        <span>★ ${project.stars ?? 0}</span>
        ${dateStr ? `<span>•</span><span>${dateStr}</span>` : ''}
      </div>

      <div class="project-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
        <a href="${docLink}" class="glass-btn" style="padding: 8px 16px; font-size: 12px; flex: 1; text-align: center;">
          Documentation ↗
        </a>
        <a href="${project.githubUrl}" target="_blank" rel="noopener noreferrer" class="glass-btn" style="padding: 8px 16px; font-size: 12px; background: rgba(8, 14, 23, 0.8); flex: 1; text-align: center;">
          GitHub ↗
        </a>
      </div>
    </div>
  `;

  return card;
}

/**
 * Mounts the project gallery into the target container
 * @param {HTMLElement|string} target
 */
export async function initProjectGallery(target = '#projectsGalleryMount') {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) return null;

  // Clear existing content
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'glass-card station-wide-card';
  wrapper.style.margin = '0 auto';
  wrapper.style.textAlign = 'center';

  wrapper.innerHTML = `
    <div class="jp-badge">工房計画 — Project Forge</div>
    <h2 class="section-title">創生・制作物 Projects Archive</h2>
    <p class="section-desc">Dynamic project showcase synchronized automatically every 24 hours from @real-Phraser.</p>
    <div class="forge-grid" id="forgeGrid"></div>
  `;

  container.appendChild(wrapper);

  const grid = wrapper.querySelector('#forgeGrid');
  const projects = await fetchProjects();

  projects.forEach((proj) => {
    const card = createProjectCard(proj);
    grid.appendChild(card);
  });

  return wrapper;
}

// Auto-bootstrap when loaded in browser if container is present
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const mount = document.getElementById('projectsGalleryMount');
      if (mount && !mount.hasChildNodes()) {
        initProjectGallery(mount);
      }
    });
  } else {
    setTimeout(() => {
      const mount = document.getElementById('projectsGalleryMount');
      if (mount && !mount.hasChildNodes()) {
        initProjectGallery(mount);
      }
    }, 0);
  }
}

export default initProjectGallery;
