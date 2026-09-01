const App = {
  games: [],
  usingServer: false,

  normalize(g) {
    const s = {};
    CATEGORIES.forEach((c) => { s[c.key] = g.scores[c.key] || [null, null, null, null, null]; });
    return Object.assign({ cover: { type: 'url', data: '' } }, g, { scores: s });
  },

  loadLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.games = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this.games = [];
    }
    this.games = this.games.filter((g) => g && g.title).map((g) => this.normalize(g));
  },

  async load() {
    this.loadLocalStorage();
    try {
      const res = await fetch('/api/games', { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const games = await res.json();
      if (Array.isArray(games)) {
        this.games = games.filter((g) => g && g.title).map((g) => this.normalize(g));
        this.usingServer = true;
      }
    } catch (e) {
      this.usingServer = false;
    }
    if (!this.usingServer) {
      if (navigator.onLine && window.location.protocol === 'http:') {
        this.toast('⚠️ Server offline — working in local mode. Data saves only to this browser until the server is running.');
      }
    }
  },

  async persist() {
    if (!this.usingServer) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.games));
      return;
    }
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.games),
      });
      if (!res.ok) throw new Error('bad status');
    } catch (e) {
      this.usingServer = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.games));
      this.toast('⚠️ Server lost — switched to local (browser-only) saving.');
    }
  },

  render(html) {
    document.getElementById('app').innerHTML = html;
    window.scrollTo(0, 0);
  },

  home() {
    if (this.games.length === 0) {
      this.render(`
        <div class="home-head">
          <div>
            <div class="home-title">Leaderboard</div>
            <div class="home-count">No games rated yet</div>
          </div>
        </div>
        <div class="empty">
          <div class="big">🕹️</div>
          <h2>No games yet</h2>
          <p>Rate your first game and build your personal ranking.</p>
          <button class="btn btn-add btn-big" id="btn-empty">+ Add Game</button>
        </div>
      `);
      document.getElementById('btn-empty').addEventListener('click', () => Wizard.start(null));
      return;
    }

    const ranked = [...this.games].sort((a, b) => {
      const d = finalScore(b) - finalScore(a);
      if (d !== 0) return d;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    this.render(`
      <div class="home-head">
        <div>
          <div class="home-title">Leaderboard</div>
          <div class="home-count">${this.games.length} game${this.games.length === 1 ? '' : 's'} ranked</div>
        </div>
      </div>
      <div class="grid">
        ${ranked.map((g, i) => this.card(g, i)).join('')}
      </div>
    `);

    document.querySelectorAll('.card').forEach((el, idx) => {
      const key = el.dataset.key;
      el.addEventListener('click', () => this.detail(key));
    });
  },

  card(g, rank) {
    const final = finalScore(g);
    const tier = rankTier(final);
    const mode = finalMode(g);
    const cover = g.cover && g.cover.data ? g.cover.data : '';
    return `
      <div class="card" data-key="${g.key}">
        <div class="rank-chip tier-${tier.cls.slice(6)}">${tier.label}</div>
        ${cover
          ? `<img class="cover" src="${escAttr(cover)}" alt="${escAttr(g.title)}" loading="lazy">`
          : `<div class="cover cover-placeholder">🎮</div>`}
        <div class="card-body">
          <div class="card-title">${escAttr(g.title)}</div>
          <div class="card-foot">
            <span class="card-mode">${mode === 'manual' ? 'manual' : 'auto'}</span>
            <span class="badge badge-${badgeClass(final)}"><small>RANK</small>${final.toFixed(1)}</span>
          </div>
        </div>
      </div>
    `;
  },

  detail(key) {
    const g = this.games.find((x) => x.key === key);
    if (!g) { this.home(); return; }
    const final = finalScore(g);
    const tier = rankTier(final);
    const mode = finalMode(g);
    const cover = g.cover && g.cover.data ? g.cover.data : '';
    const created = g.createdAt ? new Date(g.createdAt).toLocaleDateString() : '—';
    const updated = g.updatedAt ? new Date(g.updatedAt).toLocaleDateString() : created;

    this.render(`
      <div class="back-row"><button class="btn btn-ghost" id="d-back">← Leaderboard</button></div>
      <div class="detail-head">
        ${cover
          ? `<img class="detail-cover" src="${escAttr(cover)}" alt="${escAttr(g.title)}">`
          : `<div class="detail-cover placeholder">🎮</div>`}
        <div class="detail-info">
          <div class="detail-title">${escAttr(g.title)}</div>
          <div class="detail-score-wrap">
            <span class="badge badge-${badgeClass(final)}"><small>RANK</small>${final.toFixed(1)}</span>
            <span class="tier-big ${tier.cls}">Tier ${tier.label}</span>
            <span class="detail-mode">(${mode})</span>
          </div>
          <div class="meta-ts">Added ${created} · Updated ${updated}</div>
          <div class="detail-actions">
            <button class="btn btn-solid" id="d-edit">✏️ Edit</button>
            <button class="btn btn-danger" id="d-del">🗑 Delete</button>
          </div>
        </div>
      </div>
      <h2 style="margin-bottom:6px">Score Breakdown</h2>
      <div class="breakdown">
        ${CATEGORIES.map((cat) => {
          const score = categoryTotal(g.scores, cat.key);
          return `
            <div class="cat-box">
              <div class="cat-box-head">
                <span class="cat-box-name">${cat.icon} ${cat.name}</span>
                <span class="cat-box-score">${score.toFixed(1)}</span>
              </div>
              ${cat.questions.map((text, i) => {
                const v = g.scores[cat.key][i];
                return `
                  <div class="sub-row">
                    <span class="s-name">${escAttr(text)}</span>
                    <span class="s-val"><span class="v-dot v${v}"></span>${v == null ? '—' : v}/3</span>
                  </div>`;
              }).join('')}
            </div>`;
        }).join('')}
      </div>
    `);

    document.getElementById('d-back').addEventListener('click', () => this.home());
    document.getElementById('d-edit').addEventListener('click', () => Wizard.start(g));
    document.getElementById('d-del').addEventListener('click', () => {
      this.confirm('Delete this game?', `"${g.title}" and its rating will be removed permanently.`, () => {
        this.games = this.games.filter((x) => x.key !== key);
        this.persist();
        this.toast('Game deleted.');
        this.home();
      });
    });
  },

  save(draft) {
    const existing = this.games.find((g) => g.key === draft.key);
    if (existing) {
      Object.assign(existing, draft);
      this.toast('Game updated.');
    } else {
      draft.key = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      draft.updatedAt = Date.now();
      this.games.push(draft);
      this.toast('Game added!');
    }
    this.persist();
    this.detail(draft.key);
  },

  confirm(title, msg, onYes) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <h3>${escAttr(title)}</h3>
        <p>${escAttr(msg)}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="m-no">Cancel</button>
          <button class="btn btn-danger" id="m-yes">Yes</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    document.getElementById('m-no').addEventListener('click', close);
    document.getElementById('m-yes').addEventListener('click', () => { close(); onYes(); });
  },

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  },
};

document.addEventListener('DOMContentLoaded', async () => {
  await App.load();
  App.home();
  document.getElementById('btn-add-top').addEventListener('click', () => Wizard.start(null));
});
