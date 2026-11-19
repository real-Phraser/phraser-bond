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
  }
];

/**
 * Fetches the projects list with fallback (excluding phraser-bond)
 * @returns {Promise<Array>}
 */
export async function fetchProjects() {
  try {
    let data;
    const res = await fetch('./data/projects.json');
    if (!res.ok) {
      const resRoot = await fetch('/data/projects.json');
      if (!resRoot.ok) throw new Error(`HTTP ${res.status}`);
      data = await resRoot.json();
    } else {
      data = await res.json();
    }
    // Filter out phraser-bond itself
    return Array.isArray(data) ? data.filter(p => p.name.toLowerCase() !== 'phraser-bond') : FALLBACK_PROJECTS;
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
  // Relative link: './[project-name]/' works seamlessly on GitHub Pages subpaths and custom domains
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

export default initProjectGallery;
