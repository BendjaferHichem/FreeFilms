const IMG = {
  poster:   (p, size='w500')  => p ? `https://image.tmdb.org/t/p/${size}${p}` : placeholderPoster(),
  backdrop: (p, size='w1280') => p ? `https://image.tmdb.org/t/p/${size}${p}` : placeholderBackdrop(),
};

const state = {
  apiKey: null,
  demo: false,
  view: 'home',
  heroItems: [],
  heroIndex: 0,
  heroTimer: null,
  genresMovie: {},
  genresTv: {},
};

function placeholderPoster(){
  const n = Math.floor(Math.random()*1000);
  return `https://picsum.photos/seed/rv-poster-${n}/500/750`;
}

function placeholderBackdrop(){
  const n = Math.floor(Math.random()*1000);
  return `https://picsum.photos/seed/rv-back-${n}/1280/720`;
}

const DEMO_TITLES = [
  "Crimson Horizon","The Last Signal","Velvet Static","Nightbound","Glass Cathedral",
  "Echoes of Kaida","Iron Season","The Paper Moon","Wolves at the Door","Static Bloom",
  "Midnight Ledger","The Hollow Choir","Copper Sky","Faultline","Salt & Ember",
  "The Quiet Machine","Borrowed Light","Vanta City","The Long Thaw","Ashfall Diaries"
];

function demoItem(i, type='movie'){
  return {
    id: `demo-${type}-${i}`,
    title: DEMO_TITLES[i % DEMO_TITLES.length],
    name: DEMO_TITLES[i % DEMO_TITLES.length],
    overview: "A placeholder synopsis — connect a TMDB API key to load real titles, posters and details across movies, TV shows and anime.",
    poster_path: null,
    backdrop_path: null,
    vote_average: (6 + Math.random()*3.9).toFixed(1),
    release_date: `20${18 + (i%7)}-0${1+(i%9)%9}-1${i%9}`,
    first_air_date: `20${18 + (i%7)}-0${1+(i%9)%9}-1${i%9}`,
    media_type: type,
    genre_ids: [],
    original_language: 'en',
    _demo: true,
  };
}

function demoList(count=16, type='movie'){
  return Array.from({length:count}, (_,i)=>demoItem(i + Math.floor(Math.random()*20), type));
}

async function tmdb(path, params={}){
  if(state.demo) throw new Error('demo-mode');
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set('api_key', state.apiKey);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if(!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

async function safeList(path, params, type, fallbackCount=16){
  try{
    const data = await tmdb(path, params);
    return (data.results || []).map(r => ({...r, media_type: r.media_type || type}));
  }catch(e){
    return demoList(fallbackCount, type);
  }
}

const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  if (header) header.classList.toggle('is-scrolled', window.scrollY > 30);
});

let toastTimer;
function showToast(msg){
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2600);
}

// Updated to fetch the API key safely from server.js /api/config route
async function loadEnvKey(){
  try{
    const res = await fetch('/api/config');
    if(!res.ok) throw new Error('Failed to fetch config');
    const data = await res.json();
    const key = data.tmdbApiKey;

    if(!key || key === 'your_key_here'){
      throw new Error('No valid TMDB API key set in server environment');
    }

    state.apiKey = key;
    state.demo = false;
    await tmdb('/authentication');
    return true;
  }catch(e){
    state.demo = true;
    showToast('No valid TMDB key found in .env — showing placeholder art.');
    return false;
  }
}

const heroBg = document.getElementById('heroBg');
const heroTitle = document.getElementById('heroTitle');
const heroMeta = document.getElementById('heroMeta');
const heroOverview = document.getElementById('heroOverview');
const heroBadge = document.getElementById('heroBadge');
const heroDots = document.getElementById('heroDots');

function renderHeroSlide(i){
  const item = state.heroItems[i];
  if(!item || !heroBg) return;
  heroBg.style.backgroundImage = `url(${IMG.backdrop(item.backdrop_path)})`;
  if (heroTitle) heroTitle.textContent = item.title || item.name;
  const year = (item.release_date || item.first_air_date || '').slice(0,4);
  const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : '—';
  if (heroMeta) heroMeta.innerHTML = `<span>★ ${rating}</span><span>·</span><span>${year || 'TBD'}</span><span>·</span><span>${item.media_type === 'tv' ? 'Series' : 'Film'}</span>`;
  if (heroOverview) heroOverview.textContent = item.overview || 'No synopsis available yet for this title.';
  if (heroBadge) heroBadge.textContent = i === 0 ? 'Trending Now' : 'Also Trending';
  if (heroDots) [...heroDots.children].forEach((d, idx) => d.classList.toggle('is-active', idx === i));
  heroBg.style.animation = 'none';
  void heroBg.offsetWidth;
  heroBg.style.animation = '';
}

function startHeroRotation(){
  clearInterval(state.heroTimer);
  state.heroTimer = setInterval(() => {
    state.heroIndex = (state.heroIndex + 1) % state.heroItems.length;
    renderHeroSlide(state.heroIndex);
  }, 7000);
}

async function loadHero(){
  const items = await safeList('/trending/all/week', {}, 'movie', 6);
  state.heroItems = items.filter(i => i.backdrop_path || state.demo).slice(0, 9);
  if(state.heroItems.length === 0) state.heroItems = demoList(5);
  if (heroDots) {
    heroDots.innerHTML = state.heroItems.map((_, idx) => `<button data-i="${idx}"></button>`).join('');
    heroDots.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        state.heroIndex = Number(btn.dataset.i);
        renderHeroSlide(state.heroIndex);
        startHeroRotation();
      });
    });
  }
  state.heroIndex = 0;
  renderHeroSlide(0);
  startHeroRotation();
}

const heroPlayBtn = document.getElementById('heroPlayBtn');
if (heroPlayBtn) {
  heroPlayBtn.addEventListener('click', () => {
    const item = state.heroItems[state.heroIndex];
    if (item) openPlayerModal(item);
  });
}

const heroInfoBtn = document.getElementById('heroInfoBtn');
if (heroInfoBtn) {
  heroInfoBtn.addEventListener('click', () => {
    const item = state.heroItems[state.heroIndex];
    if(item) openModal(item);
  });
}

const rowsHost = document.getElementById('rowsHost');

function cardTemplate(item, opts={}){
  const title = item.title || item.name || 'Untitled';
  const poster = IMG.poster(item.poster_path);
  const year = (item.release_date || item.first_air_date || '').slice(0,4);
  const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : null;
  const rankHtml = opts.rank ? `<span class="card__rank">${opts.rank}</span>` : '';
  return `
    <div class="card ${opts.wide ? 'card--wide' : ''}" data-id="${item.id}" data-type="${item.media_type || opts.type || 'movie'}">
      ${rankHtml}
      <img src="${poster}" alt="${escapeHtml(title)}" loading="lazy">
      <div class="card__gradient"></div>
      <div class="card__info">
        <h3>${escapeHtml(title)}</h3>
        <div class="card__badges">
          ${rating ? `<span>★ ${rating}</span>` : ''}
          ${year ? `<span>${year}</span>` : ''}
        </div>
      </div>
    </div>`;
}

function escapeHtml(s){
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function skeletonRow(){
  return Array.from({length:8}, () => `<div class="card__skel"></div>`).join('');
}

function buildRow(id, title, {seeAll=true, wide=false}={}){
  const section = document.createElement('section');
  section.className = 'row';
  section.id = `row-${id}`;
  section.innerHTML = `
    <div class="row__head">
      <h2>${title}</h2>
    </div>
    <div class="row__track-wrap">
      <button class="row__nav row__nav--prev" aria-label="Scroll left">
        <svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="row__track" id="track-${id}">${skeletonRow()}</div>
      <button class="row__nav row__nav--next" aria-label="Scroll right">
        <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>`;
  const prev = section.querySelector('.row__nav--prev');
  const next = section.querySelector('.row__nav--next');
  const track = section.querySelector('.row__track');
  prev.addEventListener('click', () => track.scrollBy({left:-track.clientWidth*0.85, behavior:'smooth'}));
  next.addEventListener('click', () => track.scrollBy({left:track.clientWidth*0.85, behavior:'smooth'}));
  return section;
}

async function fillRow(id, fetcher, {rankStyle=false, wide=false, type='movie'}={}){
  const track = document.getElementById(`track-${id}`);
  if (!track) return;
  const items = await fetcher();
  track.innerHTML = items.map((item, idx) => cardTemplate(item, {rank: rankStyle ? idx+1 : null, wide, type})).join('');
  track.querySelectorAll('.card').forEach((el, idx) => {
    el.addEventListener('click', () => openModal(items[idx]));
  });
}

const ROW_DEFS = {
  home: [
    { id:'trending',  title:'Trending Now',           fetcher:() => safeList('/trending/all/week', {}, 'movie') },
    { id:'popmovies', title:'Popular Movies',          fetcher:() => safeList('/movie/popular', {}, 'movie') },
    { id:'poptv',     title:'Popular TV Shows',        fetcher:() => safeList('/tv/popular', {}, 'tv') },
    { id:'anime',     title:'Anime Spotlight',         fetcher:() => safeList('/discover/tv', {with_genres:16, with_origin_country:'JP', sort_by:'popularity.desc'}, 'tv') },
    { id:'toprated',  title:'Top Rated of All Time',   fetcher:() => safeList('/movie/top_rated', {}, 'movie') },
    { id:'upcoming',  title:'Coming Soon',             fetcher:() => safeList('/movie/upcoming', {}, 'movie'), wide:true },
    { id:'action',    title:'Action & Adventure',      fetcher:() => safeList('/discover/movie', {with_genres:28, sort_by:'popularity.desc'}, 'movie') },
    { id:'family',    title:'Family Favorites',        fetcher:() => safeList('/discover/movie', {with_genres:10751, sort_by:'popularity.desc'}, 'movie') },
  ],
  movies: [
    { id:'m_trending', title:'Trending Movies',       fetcher:() => safeList('/trending/movie/week', {}, 'movie') },
    { id:'m_top',      title:'Top Rated',              fetcher:() => safeList('/movie/top_rated', {}, 'movie') },
    { id:'m_action',   title:'Action',                 fetcher:() => safeList('/discover/movie', {with_genres:28, sort_by:'popularity.desc'}, 'movie') },
    { id:'m_comedy',   title:'Comedy',                 fetcher:() => safeList('/discover/movie', {with_genres:35, sort_by:'popularity.desc'}, 'movie') },
    { id:'m_horror',   title:'Horror',                 fetcher:() => safeList('/discover/movie', {with_genres:27, sort_by:'popularity.desc'}, 'movie') },
    { id:'m_scifi',    title:'Sci-Fi',                 fetcher:() => safeList('/discover/movie', {with_genres:878, sort_by:'popularity.desc'}, 'movie') },
    { id:'m_upcoming', title:'Coming Soon',            fetcher:() => safeList('/movie/upcoming', {}, 'movie'), wide:true },
  ],
  tv: [
    { id:'t_trending', title:'Trending TV Shows',     fetcher:() => safeList('/trending/tv/week', {}, 'tv') },
    { id:'t_top',      title:'Top Rated Series',       fetcher:() => safeList('/tv/top_rated', {}, 'tv') },
    { id:'t_drama',    title:'Drama',                  fetcher:() => safeList('/discover/tv', {with_genres:18, sort_by:'popularity.desc'}, 'tv') },
    { id:'t_crime',    title:'Crime',                  fetcher:() => safeList('/discover/tv', {with_genres:80, sort_by:'popularity.desc'}, 'tv') },
    { id:'t_reality',  title:'Reality TV',             fetcher:() => safeList('/discover/tv', {with_genres:10764, sort_by:'popularity.desc'}, 'tv') },
    { id:'t_kids',     title:'Kids & Family',          fetcher:() => safeList('/discover/tv', {with_genres:10762, sort_by:'popularity.desc'}, 'tv') },
  ],
  anime: [
    { id:'a_trending', title:'Trending Anime',        fetcher:() => safeList('/discover/tv', {with_genres:16, with_origin_country:'JP', sort_by:'popularity.desc'}, 'tv') },
    { id:'a_movies',   title:'Anime Movies',           fetcher:() => safeList('/discover/movie', {with_genres:16, with_origin_country:'JP', sort_by:'popularity.desc'}, 'movie') },
    { id:'a_top',      title:'All-Time Favorites',     fetcher:() => safeList('/discover/tv', {with_genres:16, with_origin_country:'JP', sort_by:'vote_average.desc', 'vote_count.gte':200}, 'tv') },
    { id:'a_action',   title:'Action & Fantasy',       fetcher:() => safeList('/discover/tv', {with_genres:'16,10759', with_origin_country:'JP', sort_by:'popularity.desc'}, 'tv') },
    { id:'a_new',      title:'New Releases',           fetcher:() => safeList('/discover/tv', {with_genres:16, with_origin_country:'JP', sort_by:'first_air_date.desc', 'vote_count.gte':5}, 'tv') },
  ],
};

async function renderView(view){
  state.view = view;
  document.querySelectorAll('.nav__link').forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
  const searchView = document.getElementById('searchResultsView');
  if (searchView) searchView.classList.add('hidden');
  if (rowsHost) rowsHost.innerHTML = '';

  const heroEl = document.getElementById('hero');
  if (heroEl) heroEl.classList.remove('hidden');
  const defs = ROW_DEFS[view] || ROW_DEFS.home;
  if (rowsHost) {
    defs.forEach(def => rowsHost.appendChild(buildRow(def.id, def.title, {wide:def.wide})));
    defs.forEach(def => fillRow(def.id, def.fetcher, {rankStyle:def.rankStyle, wide:def.wide}));
  }
}

const primaryNav = document.getElementById('primaryNav');
if (primaryNav) {
  primaryNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav__link');
    if(!btn) return;
    window.scrollTo({top:0, behavior:'smooth'});
    renderView(btn.dataset.view);
  });
}

const searchWrap = document.getElementById('searchWrap');
const searchInput = document.getElementById('searchInput');
const searchToggle = document.getElementById('searchToggle');

if (searchToggle) {
  searchToggle.addEventListener('click', () => {
    if (searchWrap) searchWrap.classList.toggle('is-open');
    if (searchWrap && searchWrap.classList.contains('is-open') && searchInput) searchInput.focus();
  });
}

let searchDebounce;
if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    const q = searchInput.value.trim();
    if(q.length < 2){
      const searchView = document.getElementById('searchResultsView');
      const heroEl = document.getElementById('hero');
      if (searchView) searchView.classList.add('hidden');
      if (heroEl) heroEl.classList.toggle('hidden', false);
      if (rowsHost) rowsHost.classList.remove('hidden');
      return;
    }
    searchDebounce = setTimeout(() => runSearch(q), 380);
  });
}

async function runSearch(q){
  const heroEl = document.getElementById('hero');
  if (heroEl) heroEl.classList.add('hidden');
  if (rowsHost) rowsHost.innerHTML = '';
  const view = document.getElementById('searchResultsView');
  if (view) view.classList.remove('hidden');
  const label = document.getElementById('searchQueryLabel');
  if (label) label.textContent = q;
  const grid = document.getElementById('searchResultsGrid');
  if (!grid) return;
  grid.innerHTML = skeletonRow();
  let results;
  try{
    const data = await tmdb('/search/multi', {query:q, include_adult:false});
    results = (data.results || []).filter(r => r.media_type !== 'person' && (r.poster_path || r.backdrop_path));
  }catch(e){
    results = demoList(10).filter(d => d.title.toLowerCase().includes(q.toLowerCase())).concat(demoList(6));
  }
  if(results.length === 0){
    grid.innerHTML = `<p style="color:var(--text-mute);">No matches for “${escapeHtml(q)}”. Try a different title.</p>`;
    return;
  }
  grid.innerHTML = results.map(item => cardTemplate(item)).join('');
  grid.querySelectorAll('.card').forEach((el, idx) => {
    el.addEventListener('click', () => openModal(results[idx]));
  });
}

const modalOverlay = document.getElementById('modalOverlay');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalFacts = document.getElementById('modalFacts');
const modalOverview = document.getElementById('modalOverview');
const modalGenres = document.getElementById('modalGenres');
const modalLang = document.getElementById('modalLang');
const modalRating = document.getElementById('modalRating');
const modalMoreGrid = document.getElementById('modalMoreGrid');

let currentModalItem = null;

async function openModal(item){
  currentModalItem = item;
  const type = item.media_type === 'tv' ? 'tv' : 'movie';
  if (modalBackdrop) modalBackdrop.src = IMG.backdrop(item.backdrop_path || item.poster_path);
  if (modalTitle) modalTitle.textContent = item.title || item.name;
  const year = (item.release_date || item.first_air_date || '').slice(0,4);
  const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : null;
  if (modalFacts) modalFacts.innerHTML = `${rating ? `<span class="pct">${Math.round(rating*10)}% match</span>` : ''}<span>${year || 'TBD'}</span><span>${type === 'tv' ? 'Series' : 'Film'}</span>`;
  if (modalOverview) modalOverview.textContent = item.overview || 'No synopsis available for this title yet.';
  if (modalLang) modalLang.textContent = (item.original_language || 'en').toUpperCase();
  if (modalRating) modalRating.textContent = rating ? `★ ${rating} / 10` : 'Not yet rated';
  if (modalGenres) modalGenres.textContent = 'Loading…';
  if (modalMoreGrid) modalMoreGrid.innerHTML = '';

  if (modalOverlay) modalOverlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  if(state.demo || String(item.id).startsWith('demo')){
    if (modalGenres) modalGenres.textContent = 'Demo Genre, Placeholder';
    if (modalMoreGrid) modalMoreGrid.innerHTML = demoList(6, type).map(d => `<div class="mini"><img src="${placeholderPoster()}" alt=""><span>${escapeHtml(d.title)}</span></div>`).join('');
    return;
  }

  try {
    const [details, recResponse] = await Promise.all([
      tmdb(`/${type}/${item.id}`),
      tmdb(`/${type}/${item.id}/recommendations`)
    ]);

    if (modalGenres) modalGenres.textContent = (details.genres || []).map(g => g.name).join(', ') || '—';

    let results = recResponse.results || [];

    if (results.length === 0) {
      const simResponse = await tmdb(`/${type}/${item.id}/similar`);
      results = simResponse.results || [];
    }

    if (results.length === 0 && details.genres && details.genres.length > 0) {
      const genreId = details.genres[0].id;
      const genreResponse = await tmdb(`/discover/${type}`, `&with_genres=${genreId}&sort_by=popularity.desc`);
      results = (genreResponse.results || []).filter(s => s.id !== item.id);
    }

    const sim = results.slice(0, 6);

    if (modalMoreGrid) {
      if (sim.length === 0) {
        modalMoreGrid.innerHTML = '<p class="no-results">No similar titles found.</p>';
      } else {
        modalMoreGrid.innerHTML = sim.map(s => `
          <div class="mini" data-id="${s.id}">
            <img src="${IMG.backdrop(s.backdrop_path || s.poster_path, 'w300')}" alt="${escapeHtml(s.title || s.name)}" loading="lazy">
            <span>${escapeHtml(s.title || s.name)}</span>
          </div>`).join('');

        modalMoreGrid.querySelectorAll('.mini').forEach((el, idx) => {
          el.addEventListener('click', () => openModal({ ...sim[idx], media_type: type }));
        });
      }
    }
  } catch (e) {
    if (modalGenres) modalGenres.textContent = '—';
    if (modalMoreGrid) modalMoreGrid.innerHTML = '';
  }
}

function closeModal(){
  if (modalOverlay) modalOverlay.classList.remove('is-open');
  document.body.style.overflow = '';
}

const modalClose = document.getElementById('modalClose');
if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if(e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeModal(); });

const modalPlayBtn = document.getElementById('modalPlayBtn');
if (modalPlayBtn) {
  modalPlayBtn.addEventListener('click', () => {
    if (currentModalItem) openPlayerModal(currentModalItem);
  });
}

const modalLikeBtn = document.getElementById('modalLikeBtn');
if (modalLikeBtn) {
  modalLikeBtn.addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('is-active');
    showToast(e.currentTarget.classList.contains('is-active') ? 'Thanks for the feedback!' : 'Feedback removed.');
  });
}

/* =========================================================
   VIDCORE PLAYER MODAL SYSTEM (EPISODE CARDS UPDATE)
   ========================================================= */
let playerState = {
  item: null,
  type: 'movie',
  season: 1,
  episode: 1,
  totalSeasons: 1
};

async function openPlayerModal(item) {
  if (state.demo || String(item.id).startsWith('demo')) {
    showToast('Demo mode — connect a valid TMDB key to stream video.');
    return;
  }

  playerState.item = item;
  playerState.type = item.media_type === 'tv' ? 'tv' : 'movie';
  playerState.season = 1;
  playerState.episode = 1;

  const playerOverlay = document.getElementById('playerModalOverlay');
  const drawer = document.getElementById('playerDrawer');

  if (playerState.type === 'tv') {
    if (drawer) drawer.classList.remove('hidden');
    await setupTvDrawer(item.id);
  } else {
    if (drawer) drawer.classList.add('hidden');
  }

  updatePlayerSrc();
  if (playerOverlay) playerOverlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closePlayerModal() {
  const playerOverlay = document.getElementById('playerModalOverlay');
  const iframe = document.getElementById('vidcoreIframe');
  if (iframe) iframe.src = '';
  if (playerOverlay) playerOverlay.classList.remove('is-open');
  document.body.style.overflow = '';
}

async function setupTvDrawer(tvId) {
  const seasonSelect = document.getElementById('seasonSelect');
  if (!seasonSelect) return;

  seasonSelect.innerHTML = '';

  try {
    const details = await tmdb(`/tv/${tvId}`);
    const seasons = (details.seasons || []).filter(s => s.season_number > 0);
    playerState.totalSeasons = seasons.length || 1;

    seasons.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.season_number;
      opt.textContent = `Season ${s.season_number}`;
      seasonSelect.appendChild(opt);
    });

    seasonSelect.value = playerState.season;
    
    // Bind / refresh onchange handler for season updates
    seasonSelect.onchange = async (e) => {
      playerState.season = Number(e.target.value);
      playerState.episode = 1;
      await renderEpisodeCards(playerState.item.id, playerState.season);
      updatePlayerSrc();
    };

    await renderEpisodeCards(tvId, playerState.season);
  } catch (e) {
    console.error('Failed to setup TV drawer:', e);
    seasonSelect.innerHTML = '<option value="1">Season 1</option>';
  }
}

async function renderEpisodeCards(tvId, seasonNum) {
  const episodesList = document.getElementById('episodesList');
  if (!episodesList) return;

  episodesList.innerHTML = '<div class="drawer-loading">Loading episodes…</div>';

  try {
    const seasonData = await tmdb(`/tv/${tvId}/season/${seasonNum}`);
    const episodes = seasonData.episodes || [];

    if (episodes.length === 0) {
      episodesList.innerHTML = '<p class="drawer-empty">No episodes found.</p>';
      return;
    }

    episodesList.innerHTML = episodes.map(ep => {
      const still = ep.still_path 
        ? `https://image.tmdb.org/t/p/w300${ep.still_path}` 
        : placeholderBackdrop();
      const isCurrent = ep.episode_number === playerState.episode;

      return `
        <div class="ep-card ${isCurrent ? 'is-active' : ''}" data-ep="${ep.episode_number}">
          <div class="ep-card__thumb">
            <img src="${still}" alt="${escapeHtml(ep.name)}" loading="lazy">
            <div class="ep-card__play">
              <svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8V4z" fill="currentColor"/></svg>
            </div>
            <span class="ep-card__num">E${ep.episode_number}</span>
          </div>
          <div class="ep-card__info">
            <h4 class="ep-card__title">${escapeHtml(ep.name)}</h4>
            <p class="ep-card__overview">${escapeHtml(ep.overview || 'No synopsis available.')}</p>
          </div>
        </div>
      `;
    }).join('');

    episodesList.querySelectorAll('.ep-card').forEach(card => {
      card.addEventListener('click', () => {
        const epNum = Number(card.dataset.ep);
        playerState.episode = epNum;

        episodesList.querySelectorAll('.ep-card').forEach(c => c.classList.remove('is-active'));
        card.classList.add('is-active');

        updatePlayerSrc();
      });
    });

  } catch (e) {
    console.error('Error rendering episode cards:', e);
    episodesList.innerHTML = '<p class="drawer-empty">Failed to load episodes.</p>';
  }
}

function updatePlayerSrc() {
  const iframe = document.getElementById('vidcoreIframe');
  if (!iframe || !playerState.item) return;

  iframe.setAttribute('allow', 'encrypted-media');
  iframe.setAttribute('allowfullscreen', 'true');

  let url = '';
  if (playerState.type === 'movie') {
    url = `https://vidcore.io/movie/${playerState.item.id}?autoPlay=true`;
  } else {
    url = `https://vidcore.io/tv/${playerState.item.id}/${playerState.season}/${playerState.episode}?autoPlay=true&nextButton=true&autoNext=true`;
  }

  iframe.src = url;
}

const playerCloseBtn = document.getElementById('playerModalClose');
if (playerCloseBtn) playerCloseBtn.addEventListener('click', closePlayerModal);

const playerModalOverlay = document.getElementById('playerModalOverlay');
if (playerModalOverlay) {
  playerModalOverlay.addEventListener('click', (e) => {
    if (e.target === playerModalOverlay) closePlayerModal();
  });
}

const logoBtn = document.getElementById('logoBtn');
if (logoBtn) {
  logoBtn.addEventListener('click', () => {
    window.location.href = '/';
  });
}

async function init(){
  await loadEnvKey();
  await loadHero();
  await renderView('home');
}

document.addEventListener('DOMContentLoaded', init);