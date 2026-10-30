/* Tom's App Hub — no build tools, external scripts or backend required. */
(() => {
  'use strict';
  const STORAGE_KEY = 'toms-app-hub:v1';
  const DEFAULT_CONFIG = () => ({
    version: 1, name: "Tom's App Hub", accent: '#b62a3b', theme: 'light', layout: 'grid',
    sort: 'custom', pagesRoot: '', sources: [], discovered: {}, manualApps: [], overrides: {},
    sync: { repo: '', file: 'app-hub.json' }, updatedAt: '',
  });
  const PALETTE = ['#e9eafe', '#fae8e9', '#e7f3ed', '#fff0dd', '#e8f0f8', '#f4e8fa', '#e7f4f3', '#f3edf0'];
  const ACCENTS = [
    { name: 'Crimson', color: '#b62a3b' }, { name: 'Ocean', color: '#2459aa' },
    { name: 'Violet', color: '#7041a5' }, { name: 'Forest', color: '#15725c' },
  ];
  const STAGES = ['Ready', 'In progress', 'Testing', 'Archived'];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
  const clampStr = (value, limit = 300) => String(value ?? '').slice(0, limit);
  const nowIso = () => new Date().toISOString();
  const shortDate = iso => iso ? new Date(iso).toLocaleDateString(undefined, {month:'short',day:'numeric',year:'numeric'}) : 'Never';
  const isValidHex = value => /^#[0-9a-f]{6}$/i.test(value || '');
  const safeUrl = value => { try { const u = new URL(String(value || '')); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
  // A URL pointing to the *published directory*, not a GitHub blob or file URL.
  const safeBaseUrl = value => {
    try {
      const u = new URL(String(value || '').trim());
      if (!/^https?:$/.test(u.protocol) || u.username || u.password || u.search || u.hash || /\.html?$/i.test(u.pathname)) return '';
      if (!u.pathname.endsWith('/')) u.pathname += '/';
      return u.href;
    } catch { return ''; }
  };
  const slugKey = (owner, repo) => `${owner.toLowerCase()}/${repo.toLowerCase()}`;
  const filename = path => path.split('/').pop() || path;
  const pretty = str => String(str || '').replace(/\.(html?|md)$/i,'').replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase()) || 'Untitled';
  const getRepoSlug = raw => {
    const text = String(raw || '').trim();
    let parts;
    if (/^https?:\/\//i.test(text)) {
      const u = new URL(text);
      if (!['github.com', 'www.github.com'].includes(u.hostname.toLowerCase())) throw new Error('Use a github.com repository URL, such as https://github.com/owner/repo.');
      parts = u.pathname.replace(/^\/+|\/+$/g,'').split('/');
    } else { parts = text.replace(/^\/+|\/+$/g,'').split('/'); }
    if (parts.length !== 2) throw new Error('Enter a repository as owner/repository (not a file or organization page).');
    let [owner, repo] = parts;
    repo = repo.replace(/\.git$/i,'');
    if (!/^[a-z\d-]{1,39}$/i.test(owner) || !/^[a-z\d._-]{1,100}$/i.test(repo)) throw new Error('That does not look like a valid GitHub repository name.');
    return {owner, repo, id:slugKey(owner,repo)};
  };
  const encodePath = path => path.split('/').map(encodeURIComponent).join('/');
  const makeId = () => 'manual:' + (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const startedEmpty = (() => { try { return !localStorage.getItem(STORAGE_KEY); } catch { return true; } })();

  function normalizeConfig(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Configuration must contain a JSON object.');
    if (input.version !== 1) throw new Error('Unsupported configuration version. Expected version 1.');
    const base = DEFAULT_CONFIG();
    base.name = clampStr(input.name || base.name, 70);
    base.accent = isValidHex(input.accent) ? input.accent : base.accent;
    base.theme = input.theme === 'dark' ? 'dark' : 'light';
    base.layout = input.layout === 'list' ? 'list' : 'grid';
    base.sort = ['custom','az','recent'].includes(input.sort) ? input.sort : 'custom';
    base.pagesRoot = safeBaseUrl(input.pagesRoot);
    base.updatedAt = typeof input.updatedAt === 'string' ? clampStr(input.updatedAt, 50) : '';
    base.sync = {
      repo: typeof input.sync?.repo === 'string' ? clampStr(input.sync.repo, 150) : '',
      file: typeof input.sync?.file === 'string' && /^[a-zA-Z0-9._/-]+\.json$/.test(input.sync.file) && !input.sync.file.includes('..') ? clampStr(input.sync.file, 180) : 'app-hub.json'
    };
    base.sources = Array.isArray(input.sources) ? input.sources.slice(0,200).map(s => {
      try {
        const parsed = getRepoSlug(`${s.owner}/${s.repo}`);
        return { id:parsed.id, owner:parsed.owner, repo:parsed.repo, branch:clampStr(s.branch,160),
          scanMode:['apps','all','index'].includes(s.scanMode) ? s.scanMode : 'apps', pagesUrl:safeUrl(s.pagesUrl), customBaseUrl:safeBaseUrl(s.customBaseUrl),
          pagesPath:s.pagesPath === '/docs' ? '/docs' : '/', pagesType:clampStr(s.pagesType,30),
          homepage:safeUrl(s.homepage), repoUrl:safeUrl(s.repoUrl) || `https://github.com/${parsed.owner}/${parsed.repo}`,
          lastScanned:clampStr(s.lastScanned,60), truncated:!!s.truncated, error:clampStr(s.error,350),
          htmlCount:Number.isFinite(s.htmlCount) ? s.htmlCount : 0, excludedCount:Number.isFinite(s.excludedCount) ? s.excludedCount : 0, limited:!!s.limited,
        };
      } catch { return null; }
    }).filter(Boolean) : [];
    base.manualApps = Array.isArray(input.manualApps) ? input.manualApps.slice(0,1000).map((a,i) => ({
      id: /^manual:[\w.-]+$/.test(a.id || '') ? a.id : makeId(), title:clampStr(a.title || 'Untitled',100),
      description:clampStr(a.description,300), category:clampStr(a.category || 'Other',60),
      emoji:clampStr(a.emoji || '🚀',8), url:safeUrl(a.url), tags:clampStr(a.tags,220),
      status:STAGES.includes(a.status) ? a.status:'Ready', favorite:!!a.favorite, hidden:!!a.hidden,
      order:Number.isFinite(a.order) ? a.order:i+1, lastOpened:clampStr(a.lastOpened,50),
    })) : [];
    base.overrides = {};
    if (input.overrides && typeof input.overrides === 'object' && !Array.isArray(input.overrides)) {
      for (const [id,o] of Object.entries(input.overrides).slice(0,3000)) {
        if (!id.startsWith('github:') || !o || typeof o !== 'object') continue;
        // Preserve absent fields. Otherwise an override containing only a
        // favorite flag can erase the original description on JSON import.
        const clean = {
          favorite:!!o.favorite, hidden:!!o.hidden,
          order:Number.isFinite(o.order) ? o.order:null,
          lastOpened:clampStr(o.lastOpened,50),
        };
        for (const field of ['title','description','category','emoji','tags']) {
          if (Object.prototype.hasOwnProperty.call(o,field)) {
            const max={title:100,description:300,category:60,emoji:8,tags:220}[field];
            clean[field]=clampStr(o[field],max);
          }
        }
        if (Object.prototype.hasOwnProperty.call(o,'customUrl')) clean.customUrl=safeUrl(o.customUrl);
        if (STAGES.includes(o.status)) clean.status=o.status;
        base.overrides[id]=clean;
      }
    }
    base.discovered = {};
    if (input.discovered && typeof input.discovered === 'object' && !Array.isArray(input.discovered)) {
      for (const s of base.sources) {
        const apps = input.discovered[s.id];
        if (!Array.isArray(apps)) continue;
        base.discovered[s.id] = apps.slice(0,500).map(d => {
          if (!d || typeof d.path !== 'string') return null;
          const path = clampStr(d.path,500);
          return {id:`github:${s.id}:${path}`, sourceId:s.id, path,
            title:clampStr(d.title,100), category:clampStr(d.category,60), emoji:clampStr(d.emoji,8),
            autoUrl:safeUrl(d.autoUrl), sourceUrl:safeUrl(d.sourceUrl), description:clampStr(d.description,300)};
        }).filter(Boolean);
      }
    }
    return base;
  }

  function readLocalConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeConfig(JSON.parse(raw)) : DEFAULT_CONFIG();
    } catch (e) { console.warn('App Hub could not load the saved workspace:', e); return DEFAULT_CONFIG(); }
  }
  let state = readLocalConfig();
  let view = 'overview';
  let category = 'All';
  let search = '';
  let githubToken = ''; // Never written to localStorage, backups, or GitHub config.
  let refreshBusy = false;
  let reorderMode = false;
  let catalogLimit = 60;
  const scanning = new Set();
  const scanPromises = new Map();

  function persist(userChange = true, rerender = true) {
    if (userChange) state.updatedAt = nowIso();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Local save failed',e); notify('Local storage is unavailable. Export a JSON backup to keep these changes.', 'error'); }
    if (rerender) render();
  }
  function setAppearance() {
    document.body.classList.toggle('dark',state.theme === 'dark');
    const r = document.documentElement;
    r.style.setProperty('--accent',state.accent);
    const value = state.accent.slice(1);
    const [red,green,blue] = [0,2,4].map(i => parseInt(value.slice(i,i+2),16)/255).map(v=> v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
    const luminance = red*.2126 + green*.7152 + blue*.0722;
    r.style.setProperty('--accent-text', (1.05/(luminance+.05))>=4.5 ? '#fff' : '#101827');
    $('#brandTitle').textContent = state.name;
    $('#footerName').textContent = state.name;
    document.title = state.name;
  }
  function notify(message, kind='success') {
    const target = $('#toastStack');
    const item = document.createElement('div');
    item.className = `toast ${kind}`;
    const ico = document.createElement('span'); ico.innerHTML = icon(kind==='error'?'info':'check');
    const msg = document.createElement('span'); msg.textContent = message;
    item.append(ico,msg); target.append(item);
    setTimeout(() => item.remove(), 6500);
  }
  function formatCount(n,singular,plural=singular+'s') { return `${n} ${n===1?singular:plural}`; }
  function pickEmoji(name, path='') {
    const t = `${name} ${path}`.toLowerCase();
    if (/photo|image|camera|editor/.test(t)) return '📸';
    if (/slide|powerpoint|presentation/.test(t)) return '🖼️';
    if (/excel|spreadsheet|finance|analytics|data|report/.test(t)) return '📊';
    if (/3d|stl|print|gear|maker/.test(t)) return '🧊';
    if (/lab|teach|learn|interview|econom/.test(t)) return '🧪';
    if (/robot|arm/.test(t)) return '🤖';
    if (/git|upload|code|dev/.test(t)) return '💻';
    if (/calendar|time|worklog/.test(t)) return '📅';
    if (/game|simulat/.test(t)) return '🎮';
    if (/accessib|screen.reader/.test(t)) return '♿';
    return '🚀';
  }
  function guessCategory(text) {
    const t = text.toLowerCase();
    if (/stl|3d|gear|print/.test(t)) return '3D printing';
    if (/lab|learn|teach|econom|simulator|interview/.test(t)) return 'Learning labs';
    if (/photo|slide|editor|design/.test(t)) return 'Design & media';
    if (/data|analytics|spreadsheet|finance/.test(t)) return 'Data & analytics';
    if (/github|upload|dev|code/.test(t)) return 'Development';
    return 'Productivity';
  }

  function repoBaseInfo(source) {
    if (source.customBaseUrl) return { base:safeBaseUrl(source.customBaseUrl), type:'custom' };
    // The user's shared base is an explicit preference for this hub, not merely
    // a fallback. The detected Pages URL is preferred only if no base was set.
    if (!state.pagesRoot && source.pagesUrl) return { base:safeBaseUrl(source.pagesUrl), type:'detected' };
    // GitHub Pages' conventional hostname is a useful suggestion even when the
    // Pages API is inaccessible or the repository hasn't been published yet.
    const root = safeBaseUrl(state.pagesRoot) || `https://${source.owner.toLowerCase()}.github.io/`;
    const isAccountSite = source.repo.toLowerCase() === `${source.owner.toLowerCase()}.github.io`;
    const lastFolder = new URL(root).pathname.split('/').filter(Boolean).pop()?.toLowerCase();
    const base = isAccountSite || lastFolder === source.repo.toLowerCase()
      ? root : new URL(`${encodeURIComponent(source.repo)}/`, root).href;
    return {base, type:state.pagesRoot?'shared':'suggested'};
  }
  function autoLaunchUrl(source, path) {
    if (path === '__repo__') return source.repoUrl;
    const info = repoBaseInfo(source);
    if (!info.base) return '';
    // Preserve the repository's official homepage for root HTML when Pages
    // metadata is unavailable and the user hasn't provided a base.
    if (info.type === 'suggested' && source.homepage && path.toLowerCase() === 'index.html')
      return safeUrl(source.homepage);
    // An Actions workflow may publish files from outside the repo tree.
    // An explicit repository base tells us that the user wants path mapping.
    if (source.pagesType === 'workflow' && info.type === 'detected')
      return path.toLowerCase() === 'index.html' ? info.base : '';
    const sourceFolder = source.pagesPath === '/docs' ? 'docs/' : '';
    if (sourceFolder && !path.startsWith(sourceFolder)) return '';
    const rel = sourceFolder ? path.slice(sourceFolder.length) : path;
    if (!rel || rel.split('/').some(part => part === '.' || part === '..')) return '';
    // Keep the HTML filename explicit, so the output is simply base + file path.
    return safeUrl(new URL(encodePath(rel), info.base).href);
  }

  function getAllApps() {
    const apps = [];
    for (const a of state.manualApps) apps.push({ ...a, kind:'manual', sourceId:'', sourceLabel:'Custom app', sourceUrl:'', autoUrl:'', launchUrl:safeUrl(a.url), sortOrder:a.order ?? 10000 });
    for (let i=0;i<state.sources.length;i++) {
      const source = state.sources[i];
      const list = state.discovered[source.id] || [];
      for (let j=0;j<list.length;j++) {
        const d = list[j], o = state.overrides[d.id] || {};
        const autoUrl = autoLaunchUrl(source,d.path);
        const baseType = repoBaseInfo(source).type;
        apps.push({
          id:d.id, kind:'github', sourceId:source.id, sourceLabel:`${source.owner}/${source.repo}`,
          sourceUrl:d.sourceUrl, path:d.path, autoUrl, baseType,
          title:o.title || d.title, category:o.category || d.category || 'Productivity',
          emoji:o.emoji || d.emoji || '🚀', description:o.description ?? d.description,
          tags:o.tags ?? '', status:o.status || (autoUrl && baseType !== 'suggested' ? 'Ready':'In progress'),
          launchUrl:o.customUrl || autoUrl, url:o.customUrl || autoUrl,
          favorite:!!o.favorite, hidden:!!o.hidden, lastOpened:o.lastOpened || '',
          sortOrder:Number.isFinite(o.order) ? o.order : 1000+(i*500)+j,
        });
      }
    }
    return apps;
  }
  function visibleApps() { return getAllApps().filter(a => !a.hidden); }
  function filteredApps(mode = view) {
    let arr = visibleApps();
    if (mode === 'favorites') arr = arr.filter(a => a.favorite);
    if (category !== 'All') arr = arr.filter(a => a.category.toLowerCase() === category.toLowerCase());
    const term = search.trim().toLowerCase();
    if (term) arr = arr.filter(a=> [a.title,a.description,a.category,a.tags,a.sourceLabel,a.path].some(x=>String(x||'').toLowerCase().includes(term)));
    return sortApps(arr);
  }
  function sortApps(arr) {
    const sorted = [...arr];
    sorted.sort((a,b) => {
      if (state.sort==='az') return a.title.localeCompare(b.title);
      if (state.sort==='recent') return (Date.parse(b.lastOpened)||0) - (Date.parse(a.lastOpened)||0) || a.title.localeCompare(b.title);
      return (a.sortOrder-b.sortOrder) || a.title.localeCompare(b.title);
    });
    return sorted;
  }
  function getAppById(id) { return getAllApps().find(a=>a.id===id); }
  function changeApp(id, changes) {
    const app = getAppById(id); if (!app) return;
    if (app.kind==='manual') Object.assign(state.manualApps.find(a=>a.id===id),changes);
    else state.overrides[id] = {...(state.overrides[id]||{}),...changes};
    persist();
  }
  function markOpened(id) {
    const app = getAppById(id);
    if (!app) return;
    const time = nowIso();
    if (app.kind==='manual') state.manualApps.find(a=>a.id===id).lastOpened = time;
    else state.overrides[id] = { ...(state.overrides[id]||{}), lastOpened:time };
    persist(false,false);
  }

  const SUPPORT_PATH = /(^|\/)(node_modules|vendor|\.github|\.git|\.next|\.venv|coverage|__tests__|storybook-static|bower_components)(\/|$)/i;
  const NON_APP_PATH = /(^|\/)(tests?|testing|testdata|fixtures?|examples?|samples?|docs|documentation|storybook|archives?|backups?)(\/|$)/i;
  const NON_APP_FILE = /^(404|500|test|example|sample|demo|preview|template|readme|license)\.html?$/i;
  const SCAN_LIMIT = 250;

  function htmlPagesFromTree(tree, source, repoMeta) {
    const files = (tree.tree || []).filter(f => f?.type === 'blob' && typeof f.path === 'string' &&
      /\.html?$/i.test(f.path) && !SUPPORT_PATH.test(f.path));
    const pathPrefix = source.pagesPath === '/docs' && source.pagesUrl ? 'docs/' : '';
    const candidates = files.filter(f => {
      if (source.scanMode === 'all') return true;
      const path = f.path;
      // Branch Pages from /docs cannot serve HTML elsewhere in the repository.
      if (pathPrefix && !path.startsWith(pathPrefix)) return false;
      const relative = pathPrefix ? path.slice(pathPrefix.length) : path;
      if (source.scanMode === 'index') return /(^|\/)index\.html?$/i.test(relative);
      return !NON_APP_PATH.test(relative) && !NON_APP_FILE.test(filename(relative));
    });
    // Stable ordering favors entry points over deep support files when a repo is large.
    candidates.sort((a,b) => {
      const aDepth = a.path.split('/').length, bDepth = b.path.split('/').length;
      return aDepth-bDepth || a.path.localeCompare(b.path);
    });
    const chosen = candidates.slice(0, SCAN_LIMIT);
    const list = chosen.map(f => {
      const path = f.path;
      const isRootIndex = path.toLowerCase() === 'index.html' || (pathPrefix && path.toLowerCase() === `${pathPrefix}index.html`);
      const parent = path.split('/').slice(0,-1).pop();
      const title = isRootIndex ? pretty(source.repo) : /index\.html?$/i.test(filename(path)) ? pretty(parent || source.repo) : pretty(filename(path));
      const sourceUrl = `https://github.com/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/blob/${encodePath(source.branch)}/${encodePath(path)}`;
      return { id:`github:${source.id}:${path}`, sourceId:source.id, path, title,
        category:guessCategory(`${title} ${path}`), emoji:pickEmoji(title,path),
        autoUrl:autoLaunchUrl(source,path), sourceUrl,
        description: path,
      };
    });
    // Keep repositories with no matching app pages accessible as shortcuts.
    if (!list.length) list.push({id:`github:${source.id}:__repo__`,sourceId:source.id,path:'__repo__',title:pretty(source.repo),
      category:'Development',emoji:'💻',autoUrl:safeUrl(repoMeta.html_url),sourceUrl:safeUrl(repoMeta.html_url),
      description:'GitHub repository'});
    return {list,htmlCount:files.length,excludedCount:files.length-candidates.length,
      limited:candidates.length>SCAN_LIMIT};
  }

  async function githubJSON(path, options={}) {
    const headers = {Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(options.headers||{})};
    if (githubToken) headers.Authorization = `Bearer ${githubToken}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(`https://api.github.com${path}`,{...options,headers,signal:controller.signal});
      let data;
      try { data = await response.json(); } catch { data = {}; }
      if (!response.ok) {
        let message = clampStr(data.message || `GitHub returned HTTP ${response.status}`, 220);
        if (response.status===404) message += '. Check the repository URL and permissions for private repositories.';
        else if (response.status===403 && response.headers.get('x-ratelimit-remaining') === '0') message = 'GitHub API rate limit reached. Add a session token or try again later.';
        else if (response.status===401) message = 'GitHub rejected the token. Check that it is valid and has access to this repository.';
        else if (response.status===409) message = 'GitHub could not read the file tree. The repository may be empty.';
        throw new Error(message);
      }
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('GitHub did not respond within 18 seconds. Try scanning again.');
      if (e instanceof TypeError) throw new Error('Could not reach GitHub. Check your connection and browser settings.');
      throw e;
    } finally { clearTimeout(timer); }
  }

  function scanRepository(owner, repo, mode='apps', options={}) {
    const id = slugKey(owner,repo);
    if (scanPromises.has(id)) return scanPromises.get(id);
    const task = (async () => {
      scanning.add(id);
      render();
      try {
        const metadata = await githubJSON(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
        const branch = metadata.default_branch;
        if (!branch || typeof branch !== 'string') throw new Error('GitHub did not identify a default branch.');
        let pages = null;
        try { pages = await githubJSON(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pages`); }
        catch { /* Pages may be disabled, private, or inaccessible. */ }
        const tree = await githubJSON(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
        if (!Array.isArray(tree.tree)) throw new Error('GitHub did not return a file list for this repository.');
        const existingSource = state.sources.find(s=>s.id===id);
        const source = {id, owner:metadata.owner?.login || owner, repo:metadata.name || repo,
          branch, scanMode:mode, pagesUrl:safeUrl(pages?.html_url),
          customBaseUrl: options.customBaseUrl ?? existingSource?.customBaseUrl ?? '',
          pagesPath:pages?.source?.path === '/docs' ? '/docs' : '/', pagesType:pages?.build_type || '',
          homepage:safeUrl(metadata.homepage), repoUrl:safeUrl(metadata.html_url) || `https://github.com/${owner}/${repo}`,
          lastScanned:nowIso(), truncated:!!tree.truncated, error:''};
        const {list,htmlCount,excludedCount,limited} = htmlPagesFromTree(tree, source, metadata);
        source.htmlCount=htmlCount;
        source.excludedCount=excludedCount;
        source.limited=limited;
        // GitHub may return only part of a very large file tree. Do not delete
        // previously discovered app cards merely because this response is incomplete.
        const oldList = state.discovered[id] || [];
        const resultList = tree.truncated ? [...new Map([...oldList,...list].map(a=>[a.id,a])).values()] : list;
        const index = state.sources.findIndex(s=>s.id===id);
        if (index < 0) state.sources.push(source); else state.sources[index] = source;
        state.discovered[id] = resultList.slice(0,500);
        persist(true, false);
        return {count:state.discovered[id].length,htmlCount,excludedCount,limited,truncated:!!tree.truncated};
      } catch (e) {
        const old = state.sources.find(s => s.id===id);
        if (old) { old.error = clampStr(e.message,350); persist(false,false); }
        throw e;
      } finally { scanning.delete(id); render(); }
    })();
    const settled = task.finally(() => scanPromises.delete(id));
    scanPromises.set(id,settled);
    return settled;
  }

  async function refreshSources() {
    if (refreshBusy) return;
    if (!state.sources.length) { openDialog('repoDialog'); return; }
    refreshBusy = true; render();
    const queue = state.sources.map(s=>({owner:s.owner,repo:s.repo,mode:s.scanMode}));
    let good = 0, bad = 0;
    const worker = async () => {
      while (queue.length) {
        const s = queue.shift();
        try { await scanRepository(s.owner,s.repo,s.mode); good++; }
        catch(e) { bad++; console.warn('Scan failed',s.repo,e); }
      }
    };
    try { await Promise.all(Array.from({length:Math.min(2,queue.length)},worker)); }
    finally { refreshBusy = false; render(); }
    notify(`${formatCount(good,'repository')} refreshed${bad ? `; ${formatCount(bad,'repository')} failed. Check Sources for details` : ''}.`,bad?'error':'success');
  }

  function jsonExport() {
    // Explicit serialization prevents accidental inclusion of session credentials.
    return JSON.stringify({ ...state, version:1 },null,2)+'\n';
  }
  function triggerDownload(content, filename, mime) {
    const blob = new Blob([content],{type:mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.append(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function replaceConfig(config, label) {
    const clean = normalizeConfig(config);
    if (!confirm(`Replace your current local dashboard with the ${label} configuration? Export a backup first if you want to keep your local changes.`)) return false;
    state = clean; category = 'All'; search = '';
    persist(false);
    notify(`${label} configuration loaded. GitHub sources can now be refreshed.`);
    return true;
  }
  const fileToBase64 = str => { const bytes = new TextEncoder().encode(str); let binary=''; for (let i=0;i<bytes.length;i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192)); return btoa(binary); };
  const base64ToFile = str => { const binary=atob(str.replace(/\s/g,'')); const bytes=new Uint8Array(binary.length); for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i); return new TextDecoder().decode(bytes); };

  function syncDetails() {
    const value = $('#syncRepo')?.value?.trim() || state.sync.repo;
    const file = ($('#syncFile')?.value || state.sync.file).trim();
    const info = getRepoSlug(value);
    if (!/^[a-zA-Z0-9._/-]+\.json$/.test(file) || file.includes('..') || file.startsWith('/')) throw new Error('Use a JSON filename such as app-hub.json or config/app-hub.json.');
    return {...info, file, api:`/repos/${encodeURIComponent(info.owner)}/${encodeURIComponent(info.repo)}/contents/${encodePath(file)}`};
  }
  async function readCloudFile(info) {
    try { return await githubJSON(info.api); }
    catch(e) { if (/^Not Found/i.test(e.message)) return null; throw e; }
  }
  function saveSyncSettings(info) { state.sync = {repo:`${info.owner}/${info.repo}`,file:info.file}; persist(true,false); }

  async function publishConfig() {
    if (!githubToken) { notify('A GitHub token with Contents read/write access is required to publish your configuration.', 'error'); return; }
    let info;
    try { info=syncDetails(); } catch(e) { notify(e.message,'error'); return; }
    const button=$('[data-action="publish-cloud"]'); if(button)button.disabled=true;
    try {
      const existing = await readCloudFile(info);
      if (existing?.content) {
        try {
          const remote = JSON.parse(base64ToFile(existing.content));
          if (Date.parse(remote.updatedAt) > Date.parse(state.updatedAt)) {
            if (!confirm('GitHub has a newer configuration than this browser. Overwrite those newer changes?')) return;
          }
        } catch { if (!confirm('The existing GitHub file is not a recognizable App Hub configuration. Replace it?')) return; }
      }
      // Save chosen sync destination in the same file for computers that load it later.
      saveSyncSettings(info);
      const payload={message:'Update App Hub dashboard configuration',content:fileToBase64(jsonExport()),...(existing?.sha?{sha:existing.sha}:{})};
      await githubJSON(info.api,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      render(); notify(`Published ${info.file} to ${info.owner}/${info.repo}. Your GitHub Pages site can use it on other computers.`);
    } catch(e) { notify(`Could not publish: ${e.message}`,'error'); }
    finally { if(button)button.disabled=false; }
  }
  async function loadCloud() {
    let info;
    try { info=syncDetails(); } catch(e) { notify(e.message,'error'); return; }
    try {
      const remote = await readCloudFile(info);
      if (!remote?.content) { notify(`No ${info.file} found in ${info.owner}/${info.repo}.`, 'error'); return; }
      const data=JSON.parse(base64ToFile(remote.content));
      if (replaceConfig(data,'GitHub')) { state.sync={repo:`${info.owner}/${info.repo}`,file:info.file}; persist(false,false); }
    } catch(e) { notify(`Could not load configuration: ${e.message}`,'error'); }
  }
  async function loadPublishedConfig({auto=false}={}) {
    if (location.protocol==='file:') { if(!auto)notify('Published configuration is only available when running this app on a website.','error');return; }
    try {
      const r=await fetch(new URL('app-hub.json', location.href).href,{cache:'no-store'});
      if (!r.ok) { if(!auto)notify('No published app-hub.json found alongside this page.','error');return; }
      const config=normalizeConfig(await r.json());
      if (auto && startedEmpty) {
        state=config; persist(false); notify('Loaded the published dashboard configuration.');
      } else if (auto && Date.parse(config.updatedAt)>Date.parse(state.updatedAt)) {
        notify('A newer published dashboard is available. Load it from Settings & sync.');
      } else if (!auto) replaceConfig(config,'published');
    } catch(e) { if(!auto)notify(`Could not read published configuration: ${e.message}`,'error'); }
  }
  function inferHostingRepo() {
    if (state.sync.repo || !location.hostname.endsWith('.github.io')) return;
    const owner=location.hostname.split('.')[0];
    const path=location.pathname.split('/').filter(Boolean);
    if (!owner) return;
    const repo=path[0] && !path[0].endsWith('.html') ? path[0] : `${owner}.github.io`;
    state.sync.repo = `${owner}/${repo}`;
    persist(false,false);
  }

  function appCard(app, index=0, allowReorder=false) {
    const shade=PALETTE[Math.abs(hashCode(app.id))%PALETTE.length];
    const label=app.launchUrl ? (app.path==='__repo__' && app.launchUrl===app.sourceUrl ? 'View repository':'Open app') : 'Set launch URL';
    const isSuggested = app.kind==='github' && app.baseType==='suggested' && app.path!=='__repo__' && app.launchUrl===app.autoUrl;
    const link=app.launchUrl
      ? `<a class="card-open" data-action="open-app" data-id="${esc(app.id)}" href="${esc(app.launchUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}: ${esc(app.title)}">${esc(label)} ${icon('external')}</a>`
      : `<button type="button" class="card-open card-icon-button" data-action="edit-app" data-id="${esc(app.id)}" aria-label="Add launch URL for ${esc(app.title)}">Add link ${icon('arrow')}</button>`;
    const stageCls=app.status==='Ready'?'pill-stage':app.status==='Testing'?'pill-testing':app.status==='Archived'?'pill-archived':'pill-progress';
    return `<article class="app-card" style="--tile-bg:${shade}">
      <div class="card-top"><span class="app-icon" aria-hidden="true">${esc(app.emoji||'🚀')}</span>
        <div class="card-top-actions">
          <button class="card-icon-button ${app.favorite?'is-favorite':''}" type="button" data-action="toggle-favorite" data-id="${esc(app.id)}" aria-label="${app.favorite?'Remove':'Add'} ${esc(app.title)} ${app.favorite?'from':'to'} favorites" aria-pressed="${app.favorite?'true':'false'}" title="${app.favorite?'Remove from favorites':'Add to favorites'}">${icon('star')}</button>
          <button class="card-icon-button" type="button" data-action="edit-app" data-id="${esc(app.id)}" aria-label="Edit ${esc(app.title)}" title="Edit app">${icon('edit')}</button>
        </div>
      </div>
      <h3>${esc(app.title)}</h3>
      <p class="card-description">${esc(app.description || app.path || '')}</p>
      <div class="card-labels"><span class="pill">${esc(app.category || 'Other')}</span><span class="pill ${stageCls}">${esc(app.status)}</span>${isSuggested?'<span class="pill pill-suggested" title="Suggested from GitHub naming conventions; publishing has not been verified.">Suggested link</span>':''}${app.launchUrl?'':'<span class="pill pill-no-link">Needs launch URL</span>'}</div>
      <div class="card-footer"><span class="card-source" title="${esc(app.sourceLabel)}">${app.kind==='github'?'◈ ': '✳ '}${esc(app.sourceLabel)}</span>${link}</div>
      ${allowReorder?`<div class="card-order"><button class="btn btn-small" type="button" data-action="move-up" data-id="${esc(app.id)}" aria-label="Move ${esc(app.title)} earlier">${icon('up')} Earlier</button><button class="btn btn-small" type="button" data-action="move-down" data-id="${esc(app.id)}" aria-label="Move ${esc(app.title)} later">${icon('down')} Later</button></div>`:''}
    </article>`;
  }
  function hashCode(str) { let h=0; for(const ch of str)h=(h*31+ch.codePointAt(0))|0; return h; }
  function cardsHTML(items, reorder=false) {
    return `<div class="app-grid ${state.layout==='list'?'list-view':''}" aria-label="App catalog">${items.map((a,i)=>appCard(a,i,reorder)).join('')}</div>`;
  }
  function emptyHTML(kind) {
    const config={
      new:{title:'No apps added',text:'Add a GitHub repository or enter an app URL manually.',icon:'apps'},
      favorites:{title:'No favorites',text:'Use the star on an app card to add it here.',icon:'star'},
      search:{title:'No matches',text:'Change the search or category.',icon:'search'},
      sources:{title:'No repositories',text:'Add a repository to scan for HTML files.',icon:'git'},
    }[kind];
    return `<div class="empty-state"><div class="empty-graphic">${icon(config.icon)}</div><h2>${config.title}</h2><p>${config.text}</p>${['new','sources'].includes(kind)?'<div class="empty-actions"><button class="btn btn-primary" data-action="add-repo">'+icon('git')+' Connect GitHub</button><button class="btn" data-action="add-app">'+icon('plus')+' Add manually</button></div>':''}</div>`;
  }
  function statsHTML() {
    const apps=visibleApps(), fav=apps.filter(a=>a.favorite).length;
    return `<div class="stats-grid" aria-label="Dashboard statistics">
      <div class="stat-card"><div><div class="stat-value">${apps.length}</div><div class="stat-label">Apps in your hub</div></div><span class="stat-icon">${icon('apps')}</span></div>
      <div class="stat-card"><div><div class="stat-value">${state.sources.length}</div><div class="stat-label">GitHub repositories</div></div><span class="stat-icon blue">${icon('git')}</span></div>
      <div class="stat-card"><div><div class="stat-value">${fav}</div><div class="stat-label">Favorites</div></div><span class="stat-icon green">${icon('star')}</span></div>
    </div>`;
  }
  function renderOverview() {
    const apps=visibleApps(), favorites=sortApps(apps.filter(a=>a.favorite));
    const recents=sortApps(apps).slice(0,12);
    return `${statsHTML()}
      ${favorites.length?`<section class="section" aria-labelledby="fave-section"><div class="section-heading"><div><h2 id="fave-section">Favorites</h2></div><button type="button" class="btn btn-link" data-action="navigate" data-page="favorites">View all ${icon('arrow')}</button></div>${cardsHTML(favorites.slice(0,4))}</section>`:''}
      <section class="section" aria-labelledby="all-section"><div class="section-heading"><div><h2 id="all-section">${apps.length?'Apps':'Get started'}</h2><p>${apps.length?`${formatCount(apps.length,'app')} available`:'Connect a repository or add a web link.'}</p></div>${apps.length?`<button type="button" class="btn btn-link" data-action="navigate" data-page="apps">All apps ${icon('arrow')}</button>`:''}</div>
      ${apps.length?cardsHTML(recents):emptyHTML('new')}</section>
      ${state.sources.length?`<section class="section"><div class="section-heading"><div><h2>Repositories</h2></div><button class="btn btn-link" data-action="navigate" data-page="sources">Manage ${icon('arrow')}</button></div><div class="source-summary-strip">${state.sources.map(s=>`<span class="source-mini">${icon('git')} ${esc(s.owner+'/'+s.repo)}</span>`).join('')}</div></section>`:''}`;
  }
  function categoriesHTML(mode) {
    const all=visibleApps().filter(a=>mode==='favorites'?a.favorite:true);
    const names=['All',...new Set(all.map(a=>a.category).filter(Boolean).sort((a,b)=>a.localeCompare(b)))];
    if (!names.includes(category)) category='All';
    return `<div class="filter-chips" role="group" aria-label="Filter apps by category">${names.map(c=>`<button type="button" class="chip" data-action="category" data-category="${esc(c)}" aria-pressed="${c===category}">${esc(c)}</button>`).join('')}</div>`;
  }
  function resultsHTML(mode) {
    const list=filteredApps(mode), total=visibleApps().filter(a=>mode==='favorites'?a.favorite:true).length;
    if (!list.length) return total===0 ? emptyHTML(mode==='favorites'?'favorites':'new') : emptyHTML('search');
    const shown=list.slice(0,catalogLimit);
    return cardsHTML(shown,reorderMode&&mode==='apps'&&state.sort==='custom') + (shown.length < list.length ? `<div class="load-more"><p>${formatCount(shown.length,'app')} shown of ${list.length}</p><button class="btn" type="button" data-action="show-more">Show 60 more</button></div>` : '');
  }
  function renderCatalog(mode) {
    const count=filteredApps(mode).length;
    return `<section aria-label="App browser"><div class="apps-toolbar"><label class="search-box">${icon('search')}<span class="sr-only">Search apps</span><input id="appSearch" type="search" value="${esc(search)}" placeholder="Search apps, categories, tags..." autocomplete="off" aria-label="Search apps"></label>
      <div class="toolbar-actions"><label class="sr-only" for="appSort">Sort apps</label><select class="sort-select" id="appSort" aria-label="Sort apps"><option value="custom" ${state.sort==='custom'?'selected':''}>My order</option><option value="az" ${state.sort==='az'?'selected':''}>Name A–Z</option><option value="recent" ${state.sort==='recent'?'selected':''}>Recently opened</option></select>
      <div class="layout-toggle" role="group" aria-label="Display layout"><button type="button" data-action="layout" data-layout="grid" aria-label="Grid layout" aria-pressed="${state.layout==='grid'}">${icon('grid')}</button><button type="button" data-action="layout" data-layout="list" aria-label="List layout" aria-pressed="${state.layout==='list'}">${icon('list')}</button></div></div></div>
      ${categoriesHTML(mode)}
      <div class="section-heading"><div><h2>${mode==='favorites'?'Starred apps':'App library'}</h2><p id="resultsCount" aria-live="polite">Showing ${formatCount(count,'app')}</p></div>
      ${mode==='apps'&&visibleApps().length?`<button type="button" class="btn btn-small" data-action="toggle-reorder" aria-pressed="${reorderMode}">${icon('up')} ${reorderMode?'Done arranging':'Rearrange'}</button>`:''}
      </div><div id="catalogResults">${resultsHTML(mode)}</div></section>`;
  }
  function sourceCard(s) {
    const list = state.discovered[s.id] || [];
    const count=list.length;
    const busy=scanning.has(s.id);
    const info=repoBaseInfo(s);
    const status={detected:'Pages detected',custom:'Custom base',shared:'Shared base',suggested:'Unverified base'}[info.type];
    const modeName={apps:'App pages',all:'All HTML',index:'Index pages'}[s.scanMode] || 'App pages';
    const sample=list.find(d=>d.path!=='__repo__' && autoLaunchUrl(s,d.path));
    const sampleUrl=sample ? autoLaunchUrl(s,sample.path) : '';
    return `<article class="source-card"><div class="source-head"><span class="source-logo">${icon('git')}</span><div><h3>${esc(s.owner+'/'+s.repo)}</h3><p>${esc(s.branch||'default branch')} · ${esc(modeName)}</p></div></div>
      <div class="source-meta"><span class="pill">${formatCount(count,'app')}</span><span class="pill ${info.type==='detected'?'pill-stage':'pill-progress'}">${esc(status)}</span>${s.truncated?'<span class="pill pill-no-link">Partial GitHub scan</span>':''}${s.limited?'<span class="pill pill-progress">First 250 files</span>':''}</div>
      <div class="source-details"><p><strong>Last scan:</strong> ${esc(shortDate(s.lastScanned))}${busy?' · Scanning…':''}</p>
      ${s.excludedCount?`<p><strong>Filtered out:</strong> ${s.excludedCount} supporting HTML files</p>`:''}
      <p><strong>URL base:</strong> <span class="source-url">${esc(info.base)}</span></p>
      ${sampleUrl?`<p><strong>Example:</strong> <a class="source-url" href="${esc(sampleUrl)}" target="_blank" rel="noopener noreferrer">${esc(sampleUrl)}</a></p>`:''}
      ${info.type==='suggested'?'<p class="small-note">Suggested URLs are not verified. GitHub Pages must be enabled for these links to work.</p>':''}
      ${s.error?`<p class="source-error" role="alert">${esc(s.error)}</p>`:''}</div>
      <div class="source-base-editor field"><label for="sourceBase-${esc(s.id.replace(/[^a-z0-9-]/gi,'-'))}">Override this repository's base URL</label>
      <input id="sourceBase-${esc(s.id.replace(/[^a-z0-9-]/gi,'-'))}" class="source-base-input" type="url" value="${esc(s.customBaseUrl||'')}" placeholder="${esc(info.base)}" spellcheck="false" aria-describedby="baseHint-${esc(s.id.replace(/[^a-z0-9-]/gi,'-'))}">
      <span class="field-hint" id="baseHint-${esc(s.id.replace(/[^a-z0-9-]/gi,'-'))}">Optional. Enter the published folder URL. Leave blank for automatic links.</span>
      <button class="btn btn-small" type="button" data-action="save-source-base" data-id="${esc(s.id)}">${icon('check')} Save base URL</button></div>
      <div class="source-scan-control field"><label for="scan-${esc(s.id.replace(/[^a-z0-9-]/gi,'-'))}">Files to include</label>
      <select class="source-scan-select" id="scan-${esc(s.id.replace(/[^a-z0-9-]/gi,'-'))}"><option value="apps" ${s.scanMode==='apps'?'selected':''}>App pages (recommended)</option><option value="all" ${s.scanMode==='all'?'selected':''}>All HTML files</option><option value="index" ${s.scanMode==='index'?'selected':''}>Only index.html</option></select></div>
      <div class="source-actions"><button class="btn btn-small" type="button" data-action="refresh-source" data-id="${esc(s.id)}" ${busy?'disabled':''}>${busy?'<span class="loading-spinner" aria-hidden="true"></span>':icon('refresh')} ${busy?'Scanning':'Scan now'}</button>
      <a class="btn btn-small" href="${esc(s.repoUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(s.repo)} on GitHub">${icon('external')} GitHub</a>
      <button class="btn btn-small btn-danger-quiet" type="button" data-action="remove-source" data-id="${esc(s.id)}" aria-label="Remove ${esc(s.owner+'/'+s.repo)}">${icon('trash')}</button></div>
    </article>`;
  }
  function renderSources() {
    return `<section class="base-panel" aria-labelledby="pagesBaseHeading"><div><h2 id="pagesBaseHeading">Base URL for app links</h2>
      <p>Set a shared website root, or let GitHub Pages determine the URL for each repository.</p></div>
      <div class="base-panel-controls field"><label for="pagesRoot">Shared GitHub Pages website root</label>
        <input id="pagesRoot" type="url" value="${esc(state.pagesRoot)}" placeholder="https://YOUR-USERNAME.github.io/" autocomplete="url" spellcheck="false" aria-describedby="pagesRootHint">
        <span class="field-hint" id="pagesRootHint">Optional. Enter the host root, not a file URL. We add the repository and HTML path. Leave blank to infer each owner's GitHub Pages address.</span>
        <button class="btn btn-primary" type="button" data-action="save-pages-root">${icon('check')} Save shared base</button>
      </div><div class="base-example"><strong>Example</strong><div><code>https://username.github.io/</code> + <code>my-apps/tools/diagram.html</code></div><div class="base-example-result">= <code>https://username.github.io/my-apps/tools/diagram.html</code></div></div></section>
      <div class="callout">${icon('info')} <strong>Link priority:</strong> Repository base → shared base → detected Pages URL → inferred URL. Inferred URLs are not verified.</div>
      ${state.sources.length?`<div class="section-heading"><div><h2>Connected repositories</h2><p>${formatCount(state.sources.length,'source')} · Edit a repository's base URL below without rescanning.</p></div><button class="btn btn-small" data-action="refresh-all" ${refreshBusy?'disabled':''}>${icon('refresh')} ${refreshBusy?'Refreshing…':'Refresh all'}</button></div>
      <div class="source-grid">${state.sources.map(sourceCard).join('')}</div>`:emptyHTML('sources')}
      <section class="section" style="margin-top:28px"><div class="info-panel"><h2>Find repositories by GitHub username</h2><p class="muted">Browse your public repositories, even when you don't remember their exact URLs.</p><button class="btn" data-action="discover">${icon('search')} Browse repositories</button></div></section>`;
  }
  function renderSettings() {
    const hidden=getAllApps().filter(a=>a.hidden);
    return `<div class="settings-layout">
      <section class="settings-panel" aria-labelledby="appearanceHeading"><h2 id="appearanceHeading">Appearance</h2><p>Dashboard title, colors, and preferences.</p>
        <div class="settings-stack"><div class="field"><label for="workspaceName">Workspace name</label><input id="workspaceName" maxlength="70" value="${esc(state.name)}" placeholder="Name your workspace"></div>
          <button class="btn btn-primary" data-action="save-name" style="justify-self:start">${icon('check')} Save name</button>
          <div class="field"><span class="field-label">Appearance</span><div class="theme-options" role="group" aria-label="Choose color theme"><button class="theme-swatch" type="button" aria-pressed="${state.theme==='light'}" data-action="theme" data-theme="light">☀ Light</button><button class="theme-swatch" type="button" aria-pressed="${state.theme==='dark'}" data-action="theme" data-theme="dark">☾ Dark</button></div></div>
          <div class="field"><span class="field-label">Accent color</span><div class="theme-options" role="group" aria-label="Choose accent color">${ACCENTS.map(a=>`<button class="theme-swatch" type="button" data-action="accent" data-color="${esc(a.color)}" aria-pressed="${state.accent===a.color}"><span class="color-dot" style="--swatch:${esc(a.color)}"></span>${esc(a.name)}</button>`).join('')}</div></div>
        </div>
        <hr class="settings-divider"><h2>Back up your workspace</h2><p>Save every custom label, link, category, favorite, source, and app as a JSON file—or restore a backup.</p>
        <div class="button-row"><button class="btn" data-action="export">${icon('download')} Export backup</button><button class="btn" data-action="import">${icon('upload')} Import backup</button></div>
        <hr class="settings-divider"><h2>Hidden apps (${hidden.length})</h2><p>These apps remain saved but do not appear in your dashboard.</p>
        <div class="hidden-app-list">${hidden.length?hidden.map(a=>`<div class="hidden-app-row"><strong>${esc(a.emoji)} ${esc(a.title)}</strong><button type="button" class="btn btn-small" data-action="restore-app" data-id="${esc(a.id)}">${icon('eye')} Restore</button></div>`).join(''):'<span class="small-note">No hidden apps.</span>'}</div>
      </section>
      <section class="settings-panel" aria-labelledby="syncHeading"><h2 id="syncHeading">GitHub connection & sync</h2><p>Read public repositories without a token. For private repositories and publishing settings back to GitHub, use a fine-grained personal access token.</p>
        <div class="sync-step">${icon('info')}<span><strong>Privacy:</strong> Tokens are held only in this tab's memory. They are never stored in browser storage, exports, or the app-hub.json file. Use repository-scoped Contents permissions; private Pages lookup may also need Pages (read).</span></div>
        <div class="settings-stack"><div class="field"><label for="tokenInput">GitHub personal access token</label><input id="tokenInput" type="password" autocomplete="off" spellcheck="false" placeholder="${githubToken?'Token active in this tab':'Paste token for this session'}"><span class="field-hint">${githubToken?'● Token is active until this page closes or reloads.':'Optional for public scans; required to publish configuration. Create one at GitHub Settings → Developer settings → Personal access tokens.'}</span></div>
        <div class="button-row"><button class="btn" data-action="set-token">${icon('check')} Use token</button>${githubToken?`<button class="btn btn-danger-quiet" data-action="clear-token">Forget token</button>`:''}</div></div>
        <hr class="settings-divider"><h3>Configuration on GitHub</h3><p>Publish your organization and app metadata as <code>app-hub.json</code>. Host it beside this page on GitHub Pages to load it on a new computer automatically. <strong>Warning:</strong> If the site is public, these app names and links become public too.</p>
        <div class="settings-stack"><div class="field"><label for="syncRepo">Configuration repository</label><input id="syncRepo" value="${esc(state.sync.repo)}" maxlength="150" placeholder="username/app-hub" spellcheck="false"><span class="field-hint">Choose the repository that hosts this dashboard for easiest cross-device setup.</span></div>
        <div class="field"><label for="syncFile">Configuration file path</label><input id="syncFile" value="${esc(state.sync.file)}" maxlength="180" spellcheck="false"><span class="field-hint">Recommended: app-hub.json at the repository root.</span></div></div>
        <div class="sync-buttons"><button class="btn btn-primary" data-action="publish-cloud">${icon('upload')} Publish to GitHub</button><button class="btn" data-action="load-cloud">${icon('download')} Load from GitHub</button><button class="btn" data-action="load-published">${icon('cloud')} Load site config</button></div>
        <p class="small-note">Publishing writes a commit to the selected repository (Contents: read/write). When GitHub Pages is published from the repository root, other browsers can read the file automatically. It may take a little time for GitHub Pages to rebuild.</p>
        <hr class="settings-divider"><h2>Repository scans</h2><p>Scanning is manual to avoid unexpected changes or excessive GitHub API requests. Saved app edits are kept when you rescan.</p>
        <button class="btn" data-action="refresh-all" ${refreshBusy?'disabled':''}>${icon('refresh')} ${refreshBusy?'Scanning…':'Refresh all GitHub apps'}</button>
        <p class="small-note">${state.updatedAt?'Local customization last changed '+esc(shortDate(state.updatedAt))+'.':'No saved changes yet.'} A fresh browser has no access to your private repositories unless you provide a token there.</p>
      </section>
    </div>`;
  }

  function render() {
    setAppearance();
    const apps=visibleApps();
    $('#navAppCount').textContent=String(apps.length);
    $('#sourceSummary').textContent=scanning.size?`Scanning ${formatCount(scanning.size,'source')}…` : `${formatCount(state.sources.length,'source')} connected`;
    const meta={
      overview:{label:'Overview',title:'Overview',desc:'Apps and connected repositories.'},
      apps:{label:'All apps',title:'All apps',desc:'Search and edit app links.'},
      favorites:{label:'Favorites',title:'Favorites',desc:'Starred apps.'},
      sources:{label:'GitHub sources',title:'GitHub repositories',desc:'Scan files and configure link bases.'},
      settings:{label:'Settings & sync',title:'Settings & sync',desc:'Local preferences and GitHub configuration sync.'},
    }[view];
    $('#breadcrumbCurrent').textContent=meta.label;
    $('#pageTitle').textContent=meta.title;
    $('#pageDescription').textContent=meta.desc;
    $$('.nav-link').forEach(el=>{
      const current=el.dataset.nav===view;
      el.classList.toggle('active',current);
      if(current)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
    });
    $('#headingActions').innerHTML= view==='settings'?'':
      `<button class="btn" type="button" data-action="${view==='sources'?'discover':'add-repo'}">${icon(view==='sources'?'search':'git')} ${view==='sources'?'Find repositories':'Connect GitHub'}</button><button class="btn btn-primary" type="button" data-action="add-app">${icon('plus')} Add an app</button>`;
    $('#viewRoot').innerHTML=view==='overview'?renderOverview():view==='apps'||view==='favorites'?renderCatalog(view):view==='sources'?renderSources():renderSettings();
  }
  function navigate(destination) {
    if (!['overview','apps','favorites','sources','settings'].includes(destination))return;
    view=destination; category='All'; search=''; reorderMode=false; catalogLimit=60;
    render();
    $('#main-content').focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'instant'});
    $('#sidebar').classList.remove('open');
    $('#mobileMenu').setAttribute('aria-expanded','false');
  }
  function updateSearch() {
    if (!['apps','favorites'].includes(view)) return;
    const result=$('#catalogResults'); if (!result)return;
    result.innerHTML=resultsHTML(view);
    const note=$('#resultsCount');if(note)note.textContent=`Showing ${formatCount(filteredApps(view).length,'app')}`;
  }
  function openDialog(id) {
    const dlg=$('#'+id);
    if(dlg && !dlg.open)dlg.showModal();
  }
  function closeDialog(id) { const dlg=$('#'+id);if(dlg?.open)dlg.close(); }
  function openRepoDialog() {
    $('#repoForm').reset(); $('#repoMessage').textContent='';
    $('#repoSubmit').disabled=false;
    openDialog('repoDialog');
    $('#repoUrl').focus();
  }
  function openEditApp(id='') {
    $('#appForm').reset();
    $('#appMessage').textContent='';
    const app=id?getAppById(id):null;
    $('#appEditId').value=app?.id||'';
    $('#appModalTitle').textContent=app?'Edit app':'Add an app';
    $('#appModalExplanation').textContent=app?.kind==='github'
      ?'Customize this discovered app. Your changes are preserved when GitHub is scanned again.'
      :'Add a web app, a desktop project repository, or any useful link.';
    $('#appTitle').value=app?.title||'';
    $('#appIcon').value=app?.emoji||'🚀';
    $('#appCategory').value=app?.category||'Productivity';
    $('#appUrl').value=app?.launchUrl||'';
    $('#appUrlHint').textContent=app?.kind==='github'
      ?`Generated from the repository HTML path: ${app.autoUrl || 'Not available for this publishing setup'}. Change the URL only if this link is incorrect.`
      :'Use an http:// or https:// URL. You can also leave it blank for a work in progress.';
    $('#useAutoUrl').hidden=app?.kind!=='github' || !app?.autoUrl;
    $('#appDescription').value=app?.description||'';
    $('#appTags').value=app?.tags||'';
    $('#appStatus').value=app?.status||'Ready';
    $('#appFavorite').checked=!!app?.favorite;
    $('#appHidden').checked=!!app?.hidden;
    $('#deleteAppButton').hidden=!app;
    $('#deleteAppButton').textContent=app?.kind==='github'?'Hide discovered app':'Delete app';
    openDialog('appDialog');
    $('#appTitle').focus();
  }

  async function handleRepoSubmit(event) {
    event.preventDefault();
    const message=$('#repoMessage'), button=$('#repoSubmit');
    let parsed;
    try { parsed=getRepoSlug($('#repoUrl').value); }
    catch(e) { message.textContent=e.message;return; }
    const mode=$('#repoForm').elements.scanMode.value;
    const typedBase=$('#repoBaseUrl').value.trim();
    const customBaseUrl=typedBase?safeBaseUrl(typedBase):'';
    if(typedBase && !customBaseUrl) { message.textContent='Enter a valid published folder URL starting with https:// (not a link to an HTML file).';return; }
    button.disabled=true; message.textContent=`Reading ${parsed.owner}/${parsed.repo} from GitHub…`;
    try {
      const result=await scanRepository(parsed.owner,parsed.repo,mode,{customBaseUrl:customBaseUrl||undefined});
      closeDialog('repoDialog');
      navigate('sources');
      notify(`Connected ${parsed.owner}/${parsed.repo}: ${formatCount(result.count,'app')} found.${result.truncated?' GitHub provided a partial file tree.':''}${result.limited?' Showing the first 250 matching files.':''}`);
    } catch(e) { message.textContent=e.message; }
    finally { button.disabled=false; }
  }
  function handleAppSubmit(event) {
    event.preventDefault();
    const id=$('#appEditId').value;
    const title=$('#appTitle').value.trim(), typedUrl=$('#appUrl').value.trim();
    if (!title) { $('#appMessage').textContent='Enter an app name.';return; }
    const url=typedUrl ? safeUrl(typedUrl) : '';
    if (typedUrl && !url) { $('#appMessage').textContent='Enter a valid http:// or https:// URL.'; return; }
    const values={ title:title.slice(0,100), emoji:$('#appIcon').value.trim().slice(0,8)||'🚀',
      category:$('#appCategory').value.trim().slice(0,60)||'Other', description:$('#appDescription').value.trim().slice(0,300),
      tags:$('#appTags').value.trim().slice(0,220), status:$('#appStatus').value,
      favorite:$('#appFavorite').checked, hidden:$('#appHidden').checked };
    if (id) {
      const app=getAppById(id); if(!app)return;
      if(app.kind==='manual')changeApp(id,{...values,url});
      else changeApp(id,{...values,customUrl:url!==app.autoUrl?url:''});
      notify(`Saved changes to ${title}.`);
    } else {
      const topOrder=Math.max(0,...getAllApps().map(a=>a.sortOrder).filter(Number.isFinite));
      state.manualApps.push({id:makeId(),...values,url,order:topOrder+1,lastOpened:''});
      persist(); notify(`Added ${title} to your hub.`);
    }
    closeDialog('appDialog');
  }
  function removeAppFromDialog() {
    const id=$('#appEditId').value, app=getAppById(id);if(!app)return;
    if(app.kind==='manual') {
      if (!confirm(`Permanently delete ${app.title} from your hub?`))return;
      state.manualApps=state.manualApps.filter(a=>a.id!==id);
      persist(); notify(`${app.title} deleted.`);
    } else {
      changeApp(id,{hidden:true});
      notify(`${app.title} hidden. Restore it in Settings & sync.`);
    }
    closeDialog('appDialog');
  }
  function moveApp(id,delta) {
    if(state.sort!=='custom') {notify('Select "My order" in the sort menu to rearrange apps.','error');return;}
    const filtered=filteredApps('apps'); const start=filtered.findIndex(a=>a.id===id), next=start+delta;
    if(start<0 || next<0 || next>=filtered.length) return;
    const all=sortApps(visibleApps());
    const first=all.findIndex(a=>a.id===id), second=all.findIndex(a=>a.id===filtered[next].id);
    [all[first],all[second]]=[all[second],all[first]];
    all.forEach((app,i) => {
      if(app.kind==='manual') {const m=state.manualApps.find(a=>a.id===app.id);if(m)m.order=i+1;}
      else state.overrides[app.id]={...(state.overrides[app.id]||{}),order:i+1};
    });
    persist();
  }
  async function refreshOne(id) {
    const source=state.sources.find(s=>s.id===id);if(!source)return;
    try {const result=await scanRepository(source.owner,source.repo,source.scanMode);notify(`${source.repo} scanned: ${formatCount(result.count,'app')} found${result.truncated?' (partial file tree)':''}.`);}
    catch(e){notify(`${source.repo}: ${e.message}`,'error');}
  }
  function removeSource(id) {
    const s=state.sources.find(x=>x.id===id);if(!s)return;
    if (!confirm(`Disconnect ${s.owner}/${s.repo}? Discovered apps from it and their customizations will be removed from this dashboard. The GitHub repository itself will not be changed.`))return;
    state.sources=state.sources.filter(x=>x.id!==id);
    delete state.discovered[id];
    Object.keys(state.overrides).forEach(key=>{if(key.startsWith(`github:${id}:`))delete state.overrides[key];});
    persist();notify(`${s.owner}/${s.repo} disconnected from your hub.`);
  }
  async function applyScanMode(id, mode) {
    const s=state.sources.find(x=>x.id===id); if(!s || !['apps','all','index'].includes(mode)) return;
    if (scanning.has(id)) {notify('A scan is already running for this repository.','error');return;}
    try {const result=await scanRepository(s.owner,s.repo,mode);
      notify(`${s.repo}: ${formatCount(result.count,'app')} found${result.truncated?' (partial GitHub tree)':''}${result.limited?' (first 250 files)':''}.`);}
    catch(e){notify(`${s.repo}: ${e.message}`,'error');}
  }
  async function handleDiscover(event) {
    event.preventDefault();
    const username=$('#discoverUsername').value.trim();
    if(!/^[a-z\d-]{1,39}$/i.test(username)){ $('#discoverResults').textContent='Enter a valid GitHub username.';return; }
    const result=$('#discoverResults');
    result.innerHTML='<p class="muted">Searching public GitHub repositories…</p>';
    try {
      const repos=await githubJSON(`/users/${encodeURIComponent(username)}/repos?per_page=100&type=owner&sort=updated`);
      if(!Array.isArray(repos))throw new Error('GitHub did not return a repository list.');
      result.innerHTML=repos.length?`${repos.length>=100?'<p class="small-note">Showing the 100 most recently updated public repositories.</p>':''}
        ${repos.map(r=>{
          const id=slugKey(r.owner?.login||username,r.name), exists=state.sources.some(s=>s.id===id);
          return `<div class="discover-item"><div><strong>${esc(r.name)}</strong><p>${esc(clampStr(r.description||'No description',130))}</p></div>
          <button class="btn btn-small" type="button" data-action="discover-add" data-repo="${esc(r.full_name)}" ${exists?'disabled':''}>${exists?'Connected':icon('plus')+' Add'}</button></div>`;
        }).join('')}`:'<p class="muted">No public repositories found for that username.</p>';
    }catch(e){result.innerHTML=`<p class="source-error" role="alert">${esc(e.message)}</p>`;}
  }
  async function addFromDiscovery(button) {
    let parsed;try{parsed=getRepoSlug(button.dataset.repo);}catch(e){notify(e.message,'error');return;}
    button.disabled=true;button.textContent='Scanning…';
    try {const result=await scanRepository(parsed.owner,parsed.repo,'apps');button.textContent='Connected';notify(`${parsed.repo} added (${formatCount(result.count,'app')}).`);}
    catch(e){button.disabled=false;button.textContent='Try again';notify(`${parsed.repo}: ${e.message}`,'error');}
  }
  function savePagesRoot() {
    const input=$('#pagesRoot');
    const typed=input.value.trim();
    const next=typed?safeBaseUrl(typed):'';
    if (typed && !next) {notify('Enter a valid website directory URL, such as https://username.github.io/.','error');input.focus();return;}
    state.pagesRoot=next;
    persist();
    notify(next?'Shared GitHub Pages base saved; launch links updated immediately.':'Shared base cleared. Default GitHub Pages addresses are inferred.');
  }
  function saveSourceBase(id,button) {
    const source=state.sources.find(s=>s.id===id);
    const input=button.closest('.source-card')?.querySelector('.source-base-input');
    if(!source || !input)return;
    const typed=input.value.trim();
    const next=typed?safeBaseUrl(typed):'';
    if(typed && !next) {notify('Enter a valid published directory URL, such as https://username.github.io/my-apps/.','error');input.focus();return;}
    source.customBaseUrl=next;
    persist();
    notify(next?`Base URL saved for ${source.repo}; its app links are updated.`:`Custom base cleared for ${source.repo}; automatic links restored.`);
  }
  function saveWorkspaceName() {
    const name=$('#workspaceName').value.trim();
    if(!name){notify('Enter a workspace name.','error');return;}
    state.name=name.slice(0,70);persist();notify('Workspace name updated.');
  }
  function setToken() {
    const value=$('#tokenInput').value.trim();
    if(!value){notify('Paste a GitHub token first.','error');return;}
    githubToken=value;
    $('#tokenInput').value='';
    render();notify('GitHub token enabled for this browser tab.');
  }

  document.addEventListener('click', async event => {
    const close=event.target.closest('[data-close-dialog]');
    if(close){closeDialog(close.dataset.closeDialog);return;}
    const nav=event.target.closest('[data-nav]');
    if(nav){navigate(nav.dataset.nav);return;}
    const trigger=event.target.closest('[data-action]');
    if(!trigger)return;
    const action=trigger.dataset.action,id=trigger.dataset.id;
    switch(action) {
      case 'add-repo': openRepoDialog();break;
      case 'add-app':openEditApp();break;
      case 'navigate':navigate(trigger.dataset.page);break;
      case 'edit-app':openEditApp(id);break;
      case 'toggle-favorite':{const app=getAppById(id);if(app)changeApp(id,{favorite:!app.favorite});break;}
      case 'open-app': markOpened(id);break;
      case 'refresh-all': await refreshSources();break;
      case 'refresh-source':{const source=state.sources.find(x=>x.id===id);const element=trigger.closest('.source-card')?.querySelector('.source-scan-select');await applyScanMode(id,element?.value||source?.scanMode||'apps');break;}
      case 'save-pages-root':savePagesRoot();break;
      case 'save-source-base':saveSourceBase(id,trigger);break;
      case 'use-auto-url':{const app=getAppById($('#appEditId').value);if(app){$('#appUrl').value=app.autoUrl||'';$('#appMessage').textContent='Using the generated link. Save the app to remove a previous override.';}break;}
      case 'remove-source':removeSource(id);break;
      case 'show-more':catalogLimit+=60;render();break;
      case 'category':category=trigger.dataset.category;catalogLimit=60;render();break;
      case 'layout':state.layout=trigger.dataset.layout;persist();break;
      case 'toggle-reorder':if(state.sort!=='custom'){state.sort='custom';}reorderMode=!reorderMode;persist();break;
      case 'move-up':moveApp(id,-1);break;
      case 'move-down':moveApp(id,1);break;
      case 'discover':$('#discoverResults').innerHTML='<p class="muted">Enter a GitHub username to see its public repositories.</p>';openDialog('discoverDialog');break;
      case 'discover-add':await addFromDiscovery(trigger);break;
      case 'save-name':saveWorkspaceName();break;
      case 'theme':state.theme=trigger.dataset.theme;persist();break;
      case 'accent':state.accent=trigger.dataset.color;persist();break;
      case 'export':triggerDownload(jsonExport(),'toms-app-hub-backup.json','application/json');notify('JSON backup exported.');break;
      case 'import':$('#importFile').click();break;
      case 'restore-app':changeApp(id,{hidden:false});notify('App restored.');break;
      case 'set-token':setToken();break;
      case 'clear-token':githubToken='';render();notify('Session token forgotten.');break;
      case 'publish-cloud':await publishConfig();break;
      case 'load-cloud':await loadCloud();break;
      case 'load-published':await loadPublishedConfig();break;
    }
  });
  document.addEventListener('input', event => {
    if(event.target.id==='appSearch') {search=event.target.value;catalogLimit=60;updateSearch();}
  });
  document.addEventListener('change', event => {
    if(event.target.id==='appSort'){state.sort=event.target.value;reorderMode=false;persist();}
  });
  document.addEventListener('keydown', event => {
    const tag=document.activeElement?.tagName;
    if ((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k') {
      event.preventDefault();if(!['apps','favorites'].includes(view))navigate('apps');$('#appSearch')?.focus();
    } else if (event.key==='Escape' && $('#sidebar').classList.contains('open')) {
      $('#sidebar').classList.remove('open');$('#mobileMenu').setAttribute('aria-expanded','false');
    } else if(event.key==='/' && !event.ctrlKey && !event.metaKey && !['INPUT','TEXTAREA','SELECT'].includes(tag) && !document.querySelector('dialog[open]')){
      event.preventDefault();if(!['apps','favorites'].includes(view))navigate('apps');$('#appSearch')?.focus();
    }
  });
  $('#mobileMenu').addEventListener('click',()=>{
    const opened=$('#sidebar').classList.toggle('open');
    $('#mobileMenu').setAttribute('aria-expanded',String(opened));
  });
  $('#topRefresh').addEventListener('click',refreshSources);
  $('#repoForm').addEventListener('submit',handleRepoSubmit);
  $('#appForm').addEventListener('submit',handleAppSubmit);
  $('#deleteAppButton').addEventListener('click',removeAppFromDialog);
  $('#discoverForm').addEventListener('submit',handleDiscover);
  $('#importFile').addEventListener('change', async event => {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try {
      if(file.size>5_000_000)throw new Error('Backup must be smaller than 5 MB.');
      replaceConfig(JSON.parse(await file.text()),'backup');
    }catch(e){notify(`Could not import: ${e.message}`,'error');}
  });

  async function initialize() {
    inferHostingRepo();
    render();
    // Never rescan stored repositories in the background. This prevents sudden
    // dashboard changes, rate-limit surprises, and collisions with user edits.
    await loadPublishedConfig({auto:true});
  }
  initialize();
})();
