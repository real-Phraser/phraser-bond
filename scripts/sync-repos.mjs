#!/usr/bin/env node

/**
 * Phraser Neo-Tokyo 3D Scroll Portfolio — Repository Ingestion Engine
 *
 * Responsibilities:
 * 1. Fetches public repositories for GitHub user `real-Phraser` (or TARGET_USER).
 * 2. For each repo:
 *    - Checks if `docs/index.html` exists.
 *    - If docs/ exists: recursively downloads docs files into dist/[repo-name]/,
 *      injecting `<base href="/[repo-name]/">` if needed.
 *    - If docs/ does not exist: generates a sleek, dark-navy Japanese-aesthetic
 *      project landing page matching the site theme at dist/[repo-name]/index.html.
 *    - Also copies/downloads screenshots if available in docs/ into dist/[repo-name]/.
 * 3. Outputs dist/data/projects.json (and public/data/projects.json) manifest.
 * 4. Supports offline / local fallback mode so builds never fail.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public');

const TARGET_USER = process.env.TARGET_USER || 'real-Phraser';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// Known metadata overrides for aesthetic presentation
const KNOWN_PROJECTS = {
  'Umimuko-Music': {
    title: '海向こう Umimukō Music',
    tagline: 'Cross-platform desktop music player built with Kotlin & Compose Multiplatform.',
    kanjiBadge: '海向こう • 音韻',
    accentColor: '#75c8e8',
    spotifyUrl: 'https://open.spotify.com/user/314myr3uatmxbfq3y6vo5gljp3fu?si=0c4d1f5aba0941c8',
  },
  'phraser-bond': {
    title: '創生 Phraser Bond',
    tagline: 'Avant-garde Neo-Tokyo 3D camera-flight scroll portfolio and Japanese cyberpunk universe.',
    kanjiBadge: '創生 • 3D空間',
    accentColor: '#75c8e8',
    spotifyUrl: 'https://open.spotify.com/user/314myr3uatmxbfq3y6vo5gljp3fu?si=0c4d1f5aba0941c8',
  },
};

// Known local discovery paths for offline mode
const LOCAL_REPO_PATHS = [
  '/home/genie/Desktop/Umimuko/Umimuko-Music',
  path.resolve(ROOT_DIR, '../Umimuko-Music'),
  path.resolve(ROOT_DIR),
];

/**
 * Ensure directory exists
 */
function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Fetch GitHub API with authentication and rate limit handling
 */
async function fetchGitHubApi(endpoint, isRaw = false) {
  const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
  const headers = {
    'User-Agent': 'phraser-bond-sync/1.0',
    'Accept': isRaw ? 'application/vnd.github.v3.raw' : 'application/vnd.github.v3+json',
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        console.warn(`[sync-repos] Rate limited on GitHub API: ${url} (status: ${res.status})`);
      } else if (res.status === 404) {
        // Not found, normal for optional paths
        return null;
      } else {
        console.warn(`[sync-repos] GitHub API returned ${res.status} for ${url}`);
      }
      return null;
    }
    return isRaw ? await res.text() : await res.json();
  } catch (err) {
    console.warn(`[sync-repos] Network error fetching ${url}: ${err.message}`);
    return null;
  }
}

/**
 * Download a binary file from a URL to a local destination
 */
async function downloadBinary(url, destPath) {
  try {
    const headers = { 'User-Agent': 'phraser-bond-sync/1.0' };
    if (GITHUB_TOKEN && url.includes('api.github.com')) {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    ensureDirSync(path.dirname(destPath));
    fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
    return true;
  } catch (err) {
    console.warn(`[sync-repos] Failed to download binary from ${url}: ${err.message}`);
    return false;
  }
}

/**
 * Recursively copy local directory
 */
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDirSync(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      ensureDirSync(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Fetch repositories for TARGET_USER
 */
async function getRepositories() {
  console.log(`[sync-repos] Fetching public repos for user: ${TARGET_USER}...`);
  const endpoint = `/users/${TARGET_USER}/repos?sort=updated&per_page=100`;
  const remoteRepos = await fetchGitHubApi(endpoint);

  if (Array.isArray(remoteRepos) && remoteRepos.length > 0) {
    console.log(`[sync-repos] Successfully fetched ${remoteRepos.length} repos from GitHub API.`);
    return remoteRepos.filter((r) => !r.fork);
  }

  console.log(`[sync-repos] Remote API unavailable or empty. Activating offline / local mock discovery.`);
  return getLocalOrMockRepositories();
}

/**
 * Local discovery / mock repositories fallback
 */
function getLocalOrMockRepositories() {
  const repos = [];

  // Check Umimuko-Music
  for (const localPath of LOCAL_REPO_PATHS) {
    if (fs.existsSync(localPath) && localPath.includes('Umimuko-Music')) {
      let desc = 'Cross-platform desktop music player built with Kotlin & Compose Multiplatform.';
      const readmePath = path.join(localPath, 'README.md');
      if (fs.existsSync(readmePath)) {
        const readmeContent = fs.readFileSync(readmePath, 'utf8');
        const match = readmeContent.match(/^>\s*(.+)$/m);
        if (match) desc = match[1].trim();
      }
      repos.push({
        id: 1001,
        name: 'Umimuko-Music',
        full_name: `${TARGET_USER}/Umimuko-Music`,
        description: desc,
        stargazers_count: 2,
        watchers_count: 2,
        language: 'Kotlin',
        html_url: `https://github.com/${TARGET_USER}/Umimuko-Music`,
        homepage: 'https://www.phraser.bond',
        updated_at: '2026-11-19T12:40:21Z',
        topics: [
          'music',
          'music-player',
          'compose-multiplatform',
          'vlc',
          'desktop',
          'kotlin',
          'windows',
          'linux',
          'macos',
        ],
        _localPath: localPath,
      });
      break;
    }
  }

  // If Umimuko-Music not found locally, add fallback mock
  if (!repos.some((r) => r.name === 'Umimuko-Music')) {
    repos.push({
      id: 1001,
      name: 'Umimuko-Music',
      full_name: `${TARGET_USER}/Umimuko-Music`,
      description: 'Cross-platform desktop music player built with Kotlin & Compose Multiplatform.',
      stargazers_count: 2,
      watchers_count: 2,
      language: 'Kotlin',
      html_url: `https://github.com/${TARGET_USER}/Umimuko-Music`,
      homepage: 'https://www.phraser.bond',
      updated_at: '2026-11-19T12:40:21Z',
      topics: ['music', 'music-player', 'compose-multiplatform', 'vlc', 'desktop', 'kotlin'],
    });
  }

  // Check phraser-bond
  repos.push({
    id: 1002,
    name: 'phraser-bond',
    full_name: `${TARGET_USER}/phraser-bond`,
    description: 'Avant-garde Neo-Tokyo 3D camera-flight scroll portfolio and Japanese cyberpunk universe.',
    stargazers_count: 1,
    watchers_count: 1,
    language: 'JavaScript',
    html_url: `https://github.com/${TARGET_USER}/phraser-bond`,
    homepage: 'https://phraser.bond',
    updated_at: new Date().toISOString(),
    topics: ['portfolio', 'scroll-world', '3d-camera', 'ukiyo-e', 'neo-tokyo', 'liquid-glass'],
    _localPath: ROOT_DIR,
  });

  return repos;
}

/**
 * Recursively fetch remote docs directory from GitHub contents API
 */
async function fetchRemoteDocsDir(repoName, remotePath, targetDistDir, targetPublicDir) {
  const contents = await fetchGitHubApi(`/repos/${TARGET_USER}/${repoName}/contents/${remotePath}`);
  const downloadedFiles = [];
  let foundIndexHtml = false;

  if (Array.isArray(contents)) {
    for (const item of contents) {
      if (item.type === 'file' && item.download_url) {
        downloadedFiles.push(item.name);
        const outDist = path.join(targetDistDir, item.name);
        const outPublic = path.join(targetPublicDir, item.name);
        await downloadBinary(item.download_url, outDist);
        if (fs.existsSync(outDist)) {
          fs.copyFileSync(outDist, outPublic);
        }
        if (item.name.toLowerCase() === 'index.html' && (remotePath === 'docs' || remotePath === 'docs/')) {
          foundIndexHtml = true;
        }
      } else if (item.type === 'dir') {
        const subDist = path.join(targetDistDir, item.name);
        const subPublic = path.join(targetPublicDir, item.name);
        ensureDirSync(subDist);
        ensureDirSync(subPublic);
        const subRes = await fetchRemoteDocsDir(repoName, item.path, subDist, subPublic);
        downloadedFiles.push(...subRes.files.map((f) => `${item.name}/${f}`));
        if (subRes.hasIndex && item.name === '.') {
          foundIndexHtml = true;
        }
      }
    }
  }
  return { files: downloadedFiles, hasIndex: foundIndexHtml };
}

/**
 * Check if docs/index.html exists and download/copy docs contents
 */
async function processRepoDocs(repo) {
  const repoName = repo.name;
  const targetDistDir = path.resolve(DIST_DIR, repoName);
  const targetPublicDir = path.resolve(PUBLIC_DIR, repoName);
  ensureDirSync(targetDistDir);
  ensureDirSync(targetPublicDir);

  let hasCustomDocs = false;
  let docsFiles = [];

  // Check local repo path first if available
  if (repo._localPath && fs.existsSync(path.join(repo._localPath, 'docs'))) {
    const localDocs = path.join(repo._localPath, 'docs');
    console.log(`[sync-repos] Found local docs/ in ${localDocs}`);
    copyDirSync(localDocs, targetDistDir);
    copyDirSync(localDocs, targetPublicDir);

    if (fs.existsSync(path.join(localDocs, 'index.html'))) {
      hasCustomDocs = true;
    }
    docsFiles = fs.readdirSync(localDocs);
  } else {
    // Attempt to query remote GitHub repository contents recursively
    console.log(`[sync-repos] Querying remote docs for ${repoName}...`);
    const remoteResult = await fetchRemoteDocsDir(repoName, 'docs', targetDistDir, targetPublicDir);
    if (remoteResult.files.length > 0) {
      console.log(`[sync-repos] Remote repo ${repoName} has docs/ folder with ${remoteResult.files.length} items.`);
      docsFiles = remoteResult.files;
      if (remoteResult.hasIndex) {
        hasCustomDocs = true;
      }
    }
  }

  // Double check if local Desktop fallback has Umimuko docs if nothing downloaded
  if (repoName === 'Umimuko-Music' && docsFiles.length === 0) {
    const fallbackDocs = '/home/genie/Desktop/Umimuko/Umimuko-Music/docs';
    if (fs.existsSync(fallbackDocs)) {
      console.log(`[sync-repos] Copying fallback docs from ${fallbackDocs} for Umimuko-Music...`);
      copyDirSync(fallbackDocs, targetDistDir);
      copyDirSync(fallbackDocs, targetPublicDir);
      docsFiles = fs.readdirSync(fallbackDocs);
      if (fs.existsSync(path.join(fallbackDocs, 'index.html'))) {
        hasCustomDocs = true;
      }
    }
  }

  // Handle docs/index.html vs generating Japanese themed landing page
  const indexDistPath = path.join(targetDistDir, 'index.html');
  const indexPublicPath = path.join(targetPublicDir, 'index.html');

  if (hasCustomDocs && fs.existsSync(indexDistPath)) {
    console.log(`[sync-repos] Repository ${repoName} contains custom docs/index.html. Injecting base href.`);
    let html = fs.readFileSync(indexDistPath, 'utf8');
    if (!html.includes('<base ')) {
      const baseTag = `\n  <base href="/${repoName}/">\n`;
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
      } else {
        html = `${baseTag}${html}`;
      }
      fs.writeFileSync(indexDistPath, html, 'utf8');
      fs.writeFileSync(indexPublicPath, html, 'utf8');
    }
  } else {
    console.log(`[sync-repos] Repository ${repoName} does NOT have docs/index.html. Generating Japanese dark-navy landing page...`);
    const generatedHtml = generateJapaneseProjectLandingHtml(repo, docsFiles);
    fs.writeFileSync(indexDistPath, generatedHtml, 'utf8');
    fs.writeFileSync(indexPublicPath, generatedHtml, 'utf8');
  }

  return { hasCustomDocs, docsFiles };
}

/**
 * Generate a sleek, dark-navy Japanese-aesthetic project card landing page
 */
function generateJapaneseProjectLandingHtml(repo, docsFiles = []) {
  const known = KNOWN_PROJECTS[repo.name] || {};
  const title = known.title || repo.name;
  const description = repo.description || known.tagline || 'Project documentation and technical showcase.';
  const kanjiBadge = known.kanjiBadge || '工房 • PROJECT FORGE';
  const stars = repo.stargazers_count ?? 0;
  const language = repo.language || 'Code';
  const topics = repo.topics && repo.topics.length > 0 ? repo.topics : ['phraser', 'creative-engineering'];
  const githubUrl = repo.html_url || `https://github.com/${TARGET_USER}/${repo.name}`;
  const updatedAt = repo.updated_at ? new Date(repo.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';

  // Discover image screenshots among docsFiles
  const imageFiles = docsFiles.filter((f) => /\.(png|jpe?g|svg|webp|gif)$/i.test(f) && !f.includes('logo'));
  const logoFile = docsFiles.find((f) => /logo\.(png|jpe?g|svg|webp)$/i.test(f));

  const screenshotHtml = imageFiles.length > 0
    ? `
      <section class="gallery-section">
        <div class="gallery-header">
          <span class="gallery-kanji">写 真</span>
          <span class="gallery-title">Application Showcase & Visuals</span>
        </div>
        <div class="gallery-grid">
          ${imageFiles
            .map(
              (img) => `
            <div class="gallery-item">
              <img src="./${img}" alt="${img}" loading="lazy" />
              <span class="gallery-label">${img.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')}</span>
            </div>`
            )
            .join('')}
        </div>
      </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — Phraser Universe</title>
  <meta name="description" content="${description.replace(/"/g, '&quot;')}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap" rel="stylesheet" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #05080d;
      --panel: #080e17;
      --panel2: #0a2038;
      --line: #20364a;
      --text: #dce5ec;
      --muted: #8297aa;
      --blue: #164e78;
      --cyan: #75c8e8;
      --radius: 24px;
      font-family: 'Rubik', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      overflow-x: hidden;
      padding: clamp(20px, 4vw, 60px) 16px;
    }

    /* Scanlines and Papergrain Overlay */
    .scanlines {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      background: repeating-linear-gradient(
        to bottom,
        transparent 0px,
        transparent 2px,
        rgba(5, 8, 13, 0.45) 2px,
        rgba(5, 8, 13, 0.45) 4px
      );
      opacity: 0.7;
    }

    /* Ambient Glowing Orbs */
    .orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
      z-index: 0;
      opacity: 0.22;
      animation: floatOrb 14s ease-in-out infinite alternate;
    }
    .orb-1 { width: 500px; height: 500px; background: var(--blue); top: -150px; left: -100px; }
    .orb-2 { width: 600px; height: 600px; background: var(--panel2); bottom: -180px; right: -120px; animation-delay: -6s; }

    @keyframes floatOrb {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(40px, 50px) scale(1.15); }
    }

    /* Header Nav Dock */
    .top-dock {
      width: min(840px, 94vw);
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      z-index: 5;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 30px;
      background: rgba(8, 14, 23, 0.85);
      border: 1px solid var(--line);
      color: var(--text);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      backdrop-filter: blur(16px);
      transition: all 0.25s ease;
    }
    .back-btn:hover {
      border-color: var(--cyan);
      color: var(--cyan);
      box-shadow: 0 0 20px rgba(117, 200, 232, 0.25);
      transform: translateX(-3px);
    }

    .spotify-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 18px;
      border-radius: 30px;
      background: rgba(8, 14, 23, 0.85);
      border: 1px solid var(--line);
      color: #1ed760;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      backdrop-filter: blur(16px);
      transition: all 0.25s ease;
    }
    .spotify-pill:hover {
      border-color: #1ed760;
      box-shadow: 0 0 22px rgba(30, 215, 96, 0.3);
      transform: translateY(-2px);
    }
    .equalizer-bars {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 12px;
    }
    .eq-bar {
      width: 2px;
      background: #1ed760;
      border-radius: 1px;
      animation: eqBounce 1s ease-in-out infinite alternate;
    }
    .eq-bar:nth-child(1) { height: 6px; animation-delay: 0.1s; }
    .eq-bar:nth-child(2) { height: 12px; animation-delay: 0.3s; }
    .eq-bar:nth-child(3) { height: 8px; animation-delay: 0.2s; }
    .eq-bar:nth-child(4) { height: 10px; animation-delay: 0.4s; }

    @keyframes eqBounce {
      0% { height: 3px; }
      100% { height: 12px; }
    }

    /* Main Liquid Glass Container */
    .container {
      position: relative;
      z-index: 4;
      width: min(840px, 94vw);
      background: linear-gradient(155deg, rgba(8, 14, 23, 0.94), rgba(5, 8, 13, 0.9));
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid rgba(117, 200, 232, 0.22);
      border-radius: var(--radius);
      box-shadow: 0 40px 110px rgba(0, 0, 0, 0.85),
                  inset 0 1px 0 rgba(184, 200, 212, 0.12),
                  inset 0 -1px 0 rgba(22, 78, 120, 0.25),
                  0 0 60px rgba(10, 32, 56, 0.25);
      padding: clamp(32px, 5vw, 56px);
      overflow: hidden;
      transform-style: preserve-3d;
      transition: transform 0.1s ease-out;
    }

    /* Kanji Vertical Accent Watermark */
    .jp-vertical-accent {
      position: absolute;
      right: 28px;
      top: 50%;
      transform: translateY(-50%);
      writing-mode: vertical-rl;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 8px;
      color: rgba(184, 200, 212, 0.08);
      pointer-events: none;
      user-select: none;
    }

    /* Kanji Badge */
    .kanji-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 7px 18px;
      border-radius: 30px;
      background: rgba(10, 32, 56, 0.6);
      border: 1px solid rgba(117, 200, 232, 0.3);
      color: var(--cyan);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 20px;
      box-shadow: 0 0 25px rgba(117, 200, 232, 0.15);
    }

    /* Header & Titles */
    .project-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 12px;
    }
    .project-logo {
      width: 58px;
      height: 58px;
      border-radius: 16px;
      border: 1px solid var(--line);
      object-fit: cover;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }
    .project-title {
      font-size: clamp(28px, 4.5vw, 40px);
      font-weight: 900;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff 10%, #dce5ec 50%, #75c8e8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .project-desc {
      font-size: clamp(15px, 2vw, 17px);
      line-height: 1.65;
      color: var(--text);
      max-width: 680px;
      margin-bottom: 24px;
    }

    /* Metrics Bar */
    .metrics-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-bottom: 28px;
    }
    .metric-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 12px;
      background: rgba(8, 14, 23, 0.65);
      border: 1px solid var(--line);
      font-size: 12px;
      color: var(--muted);
      font-weight: 500;
    }
    .metric-chip strong {
      color: var(--text);
    }
    .metric-chip.stars strong {
      color: #ffd700;
    }
    .metric-chip.lang strong {
      color: var(--cyan);
    }

    /* Topic Tags */
    .topics-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 32px;
    }
    .topic-tag {
      padding: 4px 12px;
      border-radius: 20px;
      background: rgba(22, 78, 120, 0.2);
      border: 1px solid rgba(117, 200, 232, 0.25);
      color: var(--cyan);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    /* Action Buttons */
    .actions-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      padding-top: 12px;
      margin-bottom: 36px;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 13px 28px;
      border-radius: 30px;
      background: linear-gradient(135deg, var(--blue), #0d3859);
      border: 1px solid var(--cyan);
      color: #ffffff;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.5px;
      box-shadow: 0 8px 30px rgba(117, 200, 232, 0.25);
      transition: all 0.25s ease;
    }
    .btn-primary:hover {
      box-shadow: 0 12px 35px rgba(117, 200, 232, 0.45);
      transform: translateY(-2px);
      color: #ffffff;
    }
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 13px 24px;
      border-radius: 30px;
      background: rgba(8, 14, 23, 0.7);
      border: 1px solid var(--line);
      color: var(--muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.25s ease;
    }
    .btn-secondary:hover {
      border-color: var(--muted);
      color: var(--text);
    }

    /* Gallery Section */
    .gallery-section {
      border-top: 1px solid var(--line);
      padding-top: 32px;
      margin-top: 12px;
    }
    .gallery-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .gallery-kanji {
      font-weight: 900;
      font-size: 18px;
      color: var(--cyan);
    }
    .gallery-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--muted);
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .gallery-item {
      background: rgba(5, 8, 13, 0.7);
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
    }
    .gallery-item:hover {
      border-color: var(--cyan);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
      transform: translateY(-4px);
    }
    .gallery-item img {
      width: 100%;
      height: 180px;
      object-fit: cover;
      display: block;
      background: #000;
    }
    .gallery-label {
      padding: 10px 14px;
      font-size: 12px;
      color: var(--muted);
      font-weight: 500;
      text-transform: capitalize;
    }

    /* Hanko Signature Seal */
    .hanko-stamp {
      position: absolute;
      bottom: 24px;
      right: 28px;
      width: 44px;
      height: 44px;
      border: 2px solid rgba(117, 200, 232, 0.4);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 900;
      color: var(--cyan);
      transform: rotate(4deg);
      box-shadow: inset 0 0 12px rgba(117, 200, 232, 0.2), 0 0 15px rgba(22, 78, 120, 0.3);
      pointer-events: none;
      user-select: none;
    }

    /* Footer */
    footer {
      margin-top: 36px;
      text-align: center;
      font-size: 12px;
      color: var(--muted);
      z-index: 4;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="scanlines"></div>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>

  <!-- Top Navigation Dock -->
  <header class="top-dock">
    <a href="../" class="back-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      Phraser 3D Flight
    </a>
    <a href="https://open.spotify.com/user/314myr3uatmxbfq3y6vo5gljp3fu?si=0c4d1f5aba0941c8" target="_blank" rel="noopener noreferrer" class="spotify-pill" title="Listen to Phraser Selection">
      <div class="equalizer-bars">
        <div class="eq-bar"></div>
        <div class="eq-bar"></div>
        <div class="eq-bar"></div>
        <div class="eq-bar"></div>
      </div>
      <span>雅 音楽 — Spotify</span>
    </a>
  </header>

  <!-- Liquid Glass Project Card -->
  <main class="container" id="projectCard">
    <div class="jp-vertical-accent">海 向 こ う 創 造</div>

    <div class="kanji-badge">${kanjiBadge}</div>

    <div class="project-header">
      ${logoFile ? `<img src="./${logoFile}" class="project-logo" alt="${repo.name} Logo" />` : ''}
      <div>
        <h1 class="project-title">${title}</h1>
      </div>
    </div>

    <p class="project-desc">${description}</p>

    <!-- Metrics Bar -->
    <div class="metrics-bar">
      <div class="metric-chip stars">
        <span>★</span>
        <span>Stars: <strong>${stars}</strong></span>
      </div>
      <div class="metric-chip lang">
        <span>⬡</span>
        <span>Language: <strong>${language}</strong></span>
      </div>
      <div class="metric-chip">
        <span>⏱</span>
        <span>Updated: <strong>${updatedAt}</strong></span>
      </div>
      <div class="metric-chip">
        <span>⛩</span>
        <span>Author: <strong>${TARGET_USER}</strong></span>
      </div>
    </div>

    <!-- Topics Pills -->
    <div class="topics-wrap">
      ${topics.map((t) => `<span class="topic-tag">#${t}</span>`).join('')}
    </div>

    <!-- Actions -->
    <div class="actions-bar">
      <a href="${githubUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary">
        <span>View on GitHub</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="7" y1="17" x2="17" y2="7"></line>
          <polyline points="7 7 17 7 17 17"></polyline>
        </svg>
      </a>
      <a href="../" class="btn-secondary">
        <span>← Back to Portfolio</span>
      </a>
    </div>

    ${screenshotHtml}

    <div class="hanko-stamp">海</div>
  </main>

  <footer>
    <p>PHRASER BOND (海向こう) • NEO-TOKYO 3D SCROLL ARCHITECTURE</p>
  </footer>

  <script>
    // 3D Tilt perspective effect
    const card = document.getElementById('projectCard');
    if (card && window.matchMedia('(hover: hover)').matches) {
      document.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const cardX = rect.left + rect.width / 2;
        const cardY = rect.top + rect.height / 2;
        const angleX = ((e.clientY - cardY) / 35).toFixed(2);
        const angleY = (-(e.clientX - cardX) / 35).toFixed(2);
        card.style.transform = \`perspective(1000px) rotateX(\${angleX}deg) rotateY(\${angleY}deg)\`;
      });
      document.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Main ingestion controller
 */
async function main() {
  console.log('='.repeat(65));
  console.log('⛩️  PHRASER BOND REPO INGESTION & DEVOPS PIPELINE');
  console.log(`Target User: ${TARGET_USER}`);
  console.log(`GitHub Token: ${GITHUB_TOKEN ? 'Supplied (Authenticated)' : 'Unset (Unauthenticated)'}`);
  console.log('='.repeat(65));

  ensureDirSync(DIST_DIR);
  ensureDirSync(PUBLIC_DIR);
  ensureDirSync(path.join(DIST_DIR, 'data'));
  ensureDirSync(path.join(PUBLIC_DIR, 'data'));

  const rawRepos = await getRepositories();
  console.log(`[sync-repos] Processing ${rawRepos.length} candidate repositories...`);

  const manifest = [];

  for (const repo of rawRepos) {
    console.log(`\n-----------------------------------------------------------`);
    console.log(`[sync-repos] Processing Repository: ${repo.name}`);
    const { hasCustomDocs } = await processRepoDocs(repo);

    const known = KNOWN_PROJECTS[repo.name] || {};
    const title = known.title || repo.name;
    const description = repo.description || known.tagline || '';
    const stars = repo.stargazers_count ?? 0;
    const language = repo.language || 'Code';
    const topics = repo.topics || [];
    const githubUrl = repo.html_url || `https://github.com/${TARGET_USER}/${repo.name}`;
    const updatedAt = repo.updated_at || new Date().toISOString();

    const entry = {
      name: repo.name,
      title,
      description,
      stars,
      language,
      topics,
      hasCustomDocs,
      route: `/${repo.name}/`,
      githubUrl,
      homepage: repo.homepage || null,
      updatedAt,
    };

    manifest.push(entry);
    console.log(`[sync-repos] Successfully processed ${repo.name} (hasCustomDocs: ${hasCustomDocs})`);
  }

  // Write manifests
  const manifestJson = JSON.stringify(manifest, null, 2);
  const distManifestPath = path.join(DIST_DIR, 'data', 'projects.json');
  const publicManifestPath = path.join(PUBLIC_DIR, 'data', 'projects.json');

  fs.writeFileSync(distManifestPath, manifestJson, 'utf8');
  fs.writeFileSync(publicManifestPath, manifestJson, 'utf8');
  console.log(`\n[sync-repos] Manifest written to:`);
  console.log(` - ${distManifestPath}`);
  console.log(` - ${publicManifestPath}`);
  console.log(`[sync-repos] Successfully synchronized ${manifest.length} projects.`);
  console.log('='.repeat(65));
}

main().catch((err) => {
  console.error('[sync-repos] Fatal Error:', err);
  process.exit(1);
});
