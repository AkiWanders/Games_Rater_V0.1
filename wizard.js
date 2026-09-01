const Wizard = {
  game: null,
  isEdit: false,

  // flattened question list: [{catKey, catName, icon, index (0-4), text}]
  get questions() {
    const flat = [];
    CATEGORIES.forEach((cat, ci) => {
      cat.questions.forEach((text, qi) => {
        flat.push({ catKey: cat.key, catName: cat.name, icon: cat.icon, catIndex: ci, qi, text });
      });
    });
    return flat;
  },

  start(game) {
    this.isEdit = !!game;
    this.game = game
      ? {
          key: game.key,
          title: game.title,
          cover: game.cover,
          scores: JSON.parse(JSON.stringify(game.scores)),
          override: game.override,
          createdAt: game.createdAt,
        }
      : {
          key: null,
          title: '',
          cover: { type: 'url', data: '' },
          scores: {},
          override: null,
          createdAt: Date.now(),
        };
    CATEGORIES.forEach((c) => {
      if (!this.game.scores[c.key]) this.game.scores[c.key] = [null, null, null, null, null];
    });
    this.renderMeta();
  },

  renderMeta() {
    const g = this.game;
    const coverSrc = g.cover && g.cover.data ? g.cover.data : '';
    App.render(`
      <div class="wizard">
        <div class="wizard-head">
          <button class="btn btn-ghost" id="w-back">← Cancel</button>
          <div class="wizard-title">${this.isEdit ? 'Edit' : 'Add'} Game</div>
          <div style="width:80px"></div>
        </div>
        <div class="meta-step">
          <h2>${this.isEdit ? 'Update details' : 'Let\'s set up your game'}</h2>
          <p>Give it a name and add its cover art. You can paste a URL or upload a file.</p>
        </div>
        <div class="field">
          <label for="g-title">Game title *</label>
          <input type="text" id="g-title" value="${escAttr(g.title)}" placeholder="e.g. Elden Ring">
        </div>
        <div class="field">
          <label for="g-cover">Cover image URL</label>
          <div class="cover-actions">
            <input type="text" id="g-cover" value="${g.cover && g.cover.type === 'url' ? escAttr(g.cover.data || '') : ''}" placeholder="https://example.com/cover.jpg">
            <button class="btn btn-ghost upload-btn">🗂 Upload<input type="file" id="g-upload" accept="image/*"></button>
          </div>
          ${coverSrc ? `<img class="cover-preview" id="cover-prev" src="${escAttr(coverSrc)}" alt="cover preview">` : ''}
        </div>
        <div class="wizard-nav">
          <div class="spacer"></div>
          <button class="btn btn-solid btn-big" id="w-begin">Begin Rating →</button>
        </div>
      </div>
    `);

    const titleInput = document.getElementById('g-title');
    const coverUrlInput = document.getElementById('g-cover');
    const coverPrev = document.getElementById('cover-prev') || null;

    const refreshPreview = () => {
      const url = coverUrlInput.value.trim();
      if (!url) return;
      this.game.cover = { type: 'url', data: url };
      let existing = document.getElementById('cover-prev');
      if (!existing) {
        existing = document.createElement('img');
        existing.className = 'cover-preview';
        existing.id = 'cover-prev';
        coverUrlInput.closest('.field').appendChild(existing);
      }
      existing.src = url;
    };
    coverUrlInput.addEventListener('input', refreshPreview);

    const fileInput = document.getElementById('g-upload');
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result;
        this.game.cover = { type: 'file', data: src };
        coverUrlInput.value = '';
        let existing = document.getElementById('cover-prev');
        if (!existing) {
          existing = document.createElement('img');
          existing.className = 'cover-preview';
          existing.id = 'cover-prev';
          coverUrlInput.closest('.field').appendChild(existing);
        }
        existing.src = src;
      };
      reader.readAsDataURL(f);
    });

    document.getElementById('w-begin').addEventListener('click', () => {
      const title = titleInput.value.trim();
      if (!title) { App.toast('Please enter a game title.'); return; }
      this.game.title = title;
      const url = coverUrlInput.value.trim();
      if (url) this.game.cover = { type: 'url', data: url };
      this.renderQuestion(0);
    });
    document.getElementById('w-back').addEventListener('click', () => App.home());
  },

  flatIndex: 0,

  renderQuestion(idx) {
    this.flatIndex = idx;
    const q = this.questions[idx];
    const total = this.questions.length;
    const pct = Math.round(((idx) / total) * 100);
    const currentVal = this.game.scores[q.catKey][q.qi];

    App.render(`
      <div class="wizard">
        <div class="wizard-head">
          <button class="btn btn-ghost" id="w-back">←</button>
          <div class="wizard-title">${this.game.title}</div>
          <div style="width:80px"></div>
        </div>
        <div class="progress">
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-count">${idx} / ${total}</div>
        </div>
        <div class="q-card">
          <span class="q-cat">${q.icon} ${q.catName}</span>
          <div class="q-num">Question ${idx + 1} of ${total}</div>
          <div class="q-text">${q.text}</div>
          <div class="opt-grid">
            ${SCORES.map((s) => `
              <button class="opt ${currentVal === s.value ? 'selected' : ''}" data-v="${s.value}">
                <span class="o-e">${s.emoji}</span>
                <span>
                  <span class="o-label">${s.label}</span>
                  <div class="o-value">${s.value} / 3</div>
                </span>
              </button>`).join('')}
          </div>
          <div class="wizard-nav">
            <button class="btn btn-ghost" id="w-prev">← Back</button>
            <button class="btn btn-solid" id="w-next" ${currentVal == null ? 'disabled' : ''}>Next →</button>
          </div>
        </div>
      </div>
    `);

    document.querySelectorAll('.opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = Number(btn.dataset.v);
        this.game.scores[q.catKey][q.qi] = v;
        document.querySelectorAll('.opt').forEach((b) => b.classList.toggle('selected', b === btn));
        document.getElementById('w-next').disabled = false;
      });
    });

    document.getElementById('w-next').addEventListener('click', () => {
      if (this.game.scores[q.catKey][q.qi] == null) return;
      if (idx + 1 < total) this.renderQuestion(idx + 1);
      else this.renderSummary();
    });
    document.getElementById('w-prev').addEventListener('click', () => {
      if (idx === 0) this.renderMeta();
      else this.renderQuestion(idx - 1);
    });
    document.getElementById('w-back').addEventListener('click', () => {
      if (idx === 0) this.renderMeta();
      else this.renderQuestion(idx - 1);
    });
  },

  renderSummary() {
    const g = this.game;
    const cats = CATEGORIES.map((cat) => {
      const score = categoryTotal(g.scores, cat.key);
      return { cat, score };
    });
    let final = finalScore(g);
    let mode = finalMode(g);
    const tier = rankTier(final);

    App.render(`
      <div class="wizard">
        <div class="wizard-head">
          <button class="btn btn-ghost" id="w-edit">← Back</button>
          <div class="wizard-title">Review</div>
          <div style="width:80px"></div>
        </div>
        <div class="meta-step" style="padding-top:0">
          <h2>${g.title}</h2>
        </div>

        ${cats.map(({ cat, score }) => `
          <div class="review-cat">
            <div class="review-cat-head">
              <span class="review-cat-name">${cat.icon} ${cat.name}</span>
              <span class="review-cat-score">${score.toFixed(1)}<span style="font-size:12px;color:var(--text-dim)"> /10</span></span>
            </div>
            ${cat.questions.map((text, i) => `
              <div class="review-sub">
                <span class="s-dot">${dotEmoji(g.scores[cat.key][i])} ${text}</span>
              </div>`).join('')}
          </div>`).join('')}

        <div class="review-total">
          <div class="t-label">${mode === 'manual' ? 'Final Score (manual)' : 'Final Score (auto)'}</div>
          <div class="t-score">${final.toFixed(1)}</div>
          <div class="t-tier"><span class="tier-big ${tier.cls}">Tier ${tier.label}</span></div>
          <div class="override-row">
            <input type="number" id="override-in" min="0" max="10" step="0.1" placeholder="auto" ${mode === 'manual' ? `value="${final}"` : 'disabled'}>
            <label class="switch" title="Toggle manual override">
              <input type="checkbox" id="override-ck" ${mode === 'manual' ? 'checked' : ''}>
              <span>Override</span>
            </label>
          </div>
        </div>

        <div class="wizard-nav">
          <button class="btn btn-ghost" id="w-cancel">Cancel</button>
          <button class="btn btn-solid btn-big" id="w-save">Save Game 💾</button>
        </div>
      </div>
    `);

    const overrideCk = document.getElementById('override-ck');
    const overrideIn = document.getElementById('override-in');
    const scoreEl = document.querySelector('.review-total .t-score');
    const tierEl = document.querySelector('.review-total .t-tier');

    const refresh = () => {
      const t = document.querySelector('.review-total .t-label');
      if (overrideCk.checked) {
        overrideIn.disabled = false;
        let v = parseFloat(overrideIn.value);
        if (isNaN(v)) v = final;
        v = Math.max(0, Math.min(10, v));
        scoreEl.textContent = v.toFixed(1);
        const tr = rankTier(v);
        tierEl.innerHTML = `<span class="tier-big ${tr.cls}">Tier ${tr.label}</span>`;
        t.textContent = 'Final Score (manual)';
      } else {
        overrideIn.disabled = true;
        scoreEl.textContent = final.toFixed(1);
        tierEl.innerHTML = `<span class="tier-big ${tier.cls}">Tier ${tier.label}</span>`;
        t.textContent = 'Final Score (auto)';
      }
    };

    overrideCk.addEventListener('change', refresh);
    overrideIn.addEventListener('input', refresh);

    document.getElementById('w-edit').addEventListener('click', () => this.renderQuestion(this.questions.length - 1));
    document.getElementById('w-cancel').addEventListener('click', () => App.confirm(
      'Discard this rating?',
      'Your answers will not be saved.',
      () => this.isEdit ? App.detail(this.game.key) : App.home(),
    ));
    document.getElementById('w-save').addEventListener('click', () => {
      if (overrideCk.checked) {
        let v = parseFloat(overrideIn.value);
        if (isNaN(v)) { App.toast('Enter a manual score between 0 and 10.'); return; }
        g.override = Math.max(0, Math.min(10, v));
      } else {
        g.override = null;
      }
      g.updatedAt = Date.now();
      App.save(this.game);
    });
  },
};

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function dotEmoji(v) {
  switch (v) {
    case 0: return '🟥';
    case 1: return '🟧';
    case 2: return '🟨';
    case 3: return '🟩';
    default: return '⬜';
  }
}
