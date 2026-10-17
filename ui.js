// =============================================================================
// DARK FORT: MOON DEVILS — INTERFACE
// Renders Engine state, animates the beats of each action, saves after every
// tap, and keeps the graveyard / records between runs.
// =============================================================================

const UI = (() => {
    const $ = id => document.getElementById(id);
    const ROMAN = ['', 'I', 'II', 'III'];
    const KIND_ICON = { weapon: 'broadsword', armor: 'breastplate', consumable: 'medicines', gear: 'gears' };
    const POOL_ICON = { body: 'heart-organ', mind: 'brain', soul: 'candle-flame', o2: 'lungs' };
    const DOOR_EMOJI = { threat: '⚔️', elite: '👑', salvage: '📦', strange: '👁️', shrine: '🕯️', peddler: '🪙', lift: '⬇️', vault: '🔒', dark: '❓' };

    let S = null;
    let busy = false;
    let lastBeats = [];
    let stageKey = '';
    let sheetKind = null;
    let skipRoll = null;

    // -------------------------------------------------------------------------
    // STORAGE (always guarded: private mode / blocked storage must not break play)
    // -------------------------------------------------------------------------

    function load(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function store(key, value) {
        try {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, JSON.stringify(value));
        } catch (e) { /* storage is a convenience */ }
    }

    const settings = load(GAME_RULES.settingsKey, { sound: true, ambience: true, fast: false, haptics: true, seenHints: {} });
    const meta = load(GAME_RULES.metaKey, {
        graveyard: [],
        stats: { kills: 0, maxDepth: 0, bossKills: 0, wins: 0, bestCredits: 0, eliteKills: 0, bestRelics: 0, deaths: 0, winBackgrounds: [], runs: 0 },
        best: 0,
        daily: {},
        records: []
    });

    function saveRun() {
        if (!S) return;
        const { beats, ...rest } = S;
        store(GAME_RULES.saveKey, S.over ? null : rest);
    }

    function loadRun() {
        try {
            const raw = localStorage.getItem(GAME_RULES.saveKey);
            if (!raw) return null;
            const run = JSON.parse(raw);
            return run && run.v === GAME_RULES.version && run.hero ? { ...run, beats: [] } : null;
        } catch (e) {
            return null;
        }
    }

    // -------------------------------------------------------------------------
    // SMALL HELPERS
    // -------------------------------------------------------------------------

    function esc(v) {
        return String(v ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function icon(name, cls = '') {
        const body = (typeof ICONS !== 'undefined' && (ICONS[name] || ICONS['perspective-dice-six-faces-random'])) || '';
        return `<svg class="ico ${cls}" viewBox="0 0 512 512" aria-hidden="true" focusable="false">${body}</svg>`;
    }

    const pct = n => `${Math.round(n * 100)}%`;
    const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const wait = ms => new Promise(r => setTimeout(r, settings.fast ? ms * 0.4 : ms));

    function vibrate(ms) {
        if (settings.haptics && navigator.vibrate) {
            try { navigator.vibrate(ms); } catch (e) { /* unsupported */ }
        }
    }

    function sfx(name) {
        if (settings.sound) Sfx.play(name);
    }

    function poolName(pool) {
        return `<b class="pc-${pool}">${POOL_SHORT[pool]}</b>`;
    }

    function testLabel(pool) {
        return pool === 'luck' ? 'Luck' : `${POOL_LABELS[pool]} test`;
    }

    function chanceClass(p) {
        return p >= 0.67 ? 'odds-good' : p >= 0.45 ? 'odds-mid' : 'odds-bad';
    }

    function dateKey(d = new Date()) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function hashSeed(text) {
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function toast(html, tone = 'info', ms = 2200) {
        const el = document.createElement('div');
        el.className = `toast toast-${tone}`;
        el.innerHTML = `<span class="toast-body">${html}</span>`;
        const box = $('toasts');
        box.appendChild(el);
        while (box.children.length > 2) box.firstElementChild.remove();
        setTimeout(() => el.classList.add('out'), ms);
        setTimeout(() => el.remove(), ms + 400);
    }

    // First-time tips show inline at the top of the stage, once each.
    let pendingHint = null;

    function hint(id, html) {
        if (settings.seenHints[id] || pendingHint) return;
        settings.seenHints[id] = true;
        store(GAME_RULES.settingsKey, settings);
        pendingHint = html;
    }

    function hintCard() {
        if (!pendingHint) return '';
        const html = pendingHint;
        pendingHint = null;
        return `<aside class="tip">${icon('help', 'tip-icon')}<p>${html}</p><button class="icon-btn tip-close" data-action="dismissTip" aria-label="Dismiss tip">×</button></aside>`;
    }

    // -------------------------------------------------------------------------
    // SCREENS
    // -------------------------------------------------------------------------

    function showTitle() {
        S = null;
        closeSheet();
        $('game').hidden = true;
        $('title').hidden = false;
        document.body.dataset.depth = '1';
        const saved = loadRun();
        const cont = $('continueBtn');
        cont.hidden = !saved;
        if (saved) {
            cont.innerHTML = `Continue <small>${esc(saved.hero.name)} · Depth ${ROMAN[saved.depth]}</small>`;
        }
        $('newRunBtn').classList.toggle('btn-primary', !saved);
        const today = dateKey();
        const best = meta.daily[today];
        $('dailyBtn').innerHTML = `${icon('sun')} Daily descent <small>${today}${best != null ? ` · best ${best}` : ''}</small>`;
        const dead = meta.graveyard.length;
        $('titleFoot').textContent = dead
            ? `${dead} ${dead === 1 ? 'name' : 'names'} in the graveyard · best score ${meta.best}`
            : 'The base is waiting.';
    }

    function showGame() {
        $('title').hidden = true;
        $('game').hidden = false;
        stageKey = '';
        render();
    }

    function observeHud() {
        if (!window.ResizeObserver) return;
        new ResizeObserver(entries => {
            const r = entries[0].target.getBoundingClientRect();
            document.documentElement.style.setProperty('--hud-h', `${Math.round(r.bottom)}px`);
        }).observe($('hud'));
    }

    function startRun(daily = false) {
        Sfx.unlock();
        const seed = daily ? hashSeed(`darkfort-${dateKey()}`) : undefined;
        S = Engine.newRun({ seed, daily: daily ? dateKey() : null });
        meta.stats.runs += 1;
        store(GAME_RULES.metaKey, meta);
        lastBeats = [];
        showGame();
    }

    function continueRun() {
        Sfx.unlock();
        S = loadRun();
        if (!S) return showTitle();
        lastBeats = [];
        showGame();
    }

    // -------------------------------------------------------------------------
    // ACTIONS
    // -------------------------------------------------------------------------

    // `lead` plays before the rules resolve (e.g. a door swinging open), but the
    // game is already locked so a second tap can't sneak in.
    async function act(action, lead = null) {
        if (busy || !S) return;
        busy = true;
        document.body.classList.add('busy');
        const before = { depth: S.depth, kind: S.scene?.kind };
        try {
            if (lead) await lead();
            Engine.act(S, action);
            const beats = S.beats.slice();
            await playBeats(beats);
            lastBeats = beats;
            if (S.depth !== before.depth) {
                document.body.dataset.depth = String(S.depth);
                Sfx.setDepth(S.depth);
            }
            contextHints(before.kind);
            render();
            saveRun();
            if (S.over) onRunEnd();
        } catch (err) {
            console.error(err);
            toast('Something broke. Your run was saved before this tap.', 'bad');
        } finally {
            busy = false;
            document.body.classList.remove('busy');
        }
    }

    function contextHints(prevKind) {
        const kind = S?.scene?.kind;
        if (kind === 'combat' && prevKind !== 'combat') {
            hint('combat', 'The enemy shows its <b>next move</b>. Brace a <b>Charge</b>, Push through a <b>Guard</b>, trade blows on a <b>Strike</b>.');
        }
        if (kind === 'test') hint('push', 'You missed by one. Spend <b>1 Oxygen</b> to push it into a success.');
        if (kind === 'doors' && S.depth === 1 && S.roomNo === 0) {
            hint('doors', 'Each door costs <b>1 Oxygen</b>. Its sign tells you roughly what waits behind it. Find the <b>Lift</b> to go deeper.');
        }
        if (kind === 'doors' && S.target) hint('greed', 'You have the target. <b>Extract</b> now, or keep looting for <b>double credits</b>.');
        if (kind === 'levelup') hint('levelup', 'Pick one advancement. The others are gone.');
    }

    // -------------------------------------------------------------------------
    // BEATS → ANIMATION
    // -------------------------------------------------------------------------

    async function playBeats(beats) {
        for (const b of beats) {
            switch (b.t) {
                case 'roll': await showRoll(b); break;
                case 'dmg':
                    floatAt(poolEl(b.pool), `−${b.amount}`, 'bad');
                    flash(poolEl(b.pool), 'hit');
                    if (b.pool !== 'o2') {
                        sfx('hurt');
                        vibrate(40);
                        shake($('hud'));
                    }
                    await wait(220);
                    break;
                case 'o2':
                    floatAt($('o2Meter'), `−${b.amount} O2`, 'o2');
                    break;
                case 'heal':
                    floatAt(poolEl(b.pool), `+${b.amount}`, 'good');
                    flash(poolEl(b.pool), 'healed');
                    sfx('heal');
                    await wait(120);
                    break;
                case 'max':
                    floatAt(poolEl(b.pool), `${b.amount > 0 ? '+' : ''}${b.amount} max`, b.amount > 0 ? 'good' : 'bad');
                    break;
                case 'ehit':
                    floatAt(enemyEl(), `−${b.amount}${b.crit ? '!' : ''}`, b.crit ? 'crit' : 'bad');
                    shake(enemyEl());
                    sfx(b.crit ? 'crit' : 'hit');
                    if (b.crit) vibrate(25);
                    await wait(b.crit ? 360 : 240);
                    break;
                case 'emiss':
                    floatAt(enemyEl(), 'MISS', 'miss');
                    sfx('miss');
                    await wait(200);
                    break;
                case 'eheal':
                    floatAt(enemyEl(), `+${b.amount}`, 'eheal');
                    await wait(150);
                    break;
                case 'eact':
                    lunge(enemyEl());
                    await wait(180);
                    break;
                case 'block':
                    floatAt(enemyEl() || $('pools'), 'BLOCKED', 'good');
                    sfx('block');
                    await wait(160);
                    break;
                case 'brace':
                    sfx('block');
                    break;
                case 'kill':
                    stamp(enemyEl(), b.peaceful ? 'AT REST' : 'SLAIN');
                    sfx('kill');
                    vibrate(60);
                    await wait(650);
                    break;
                case 'credits': sfx('coin'); break;
                case 'spend': floatAt($('credits'), `−${b.amount}`, 'bad'); sfx('coin'); break;
                case 'item': sfx('item'); break;
                case 'relic': sfx('relic'); break;
                case 'msg':
                    if (S.scene?.kind !== 'combat') toast(esc(b.text), b.tone || 'info', 2400);
                    await wait(120);
                    break;
                case 'saved':
                    if (S.scene?.kind !== 'combat') toast(`${icon('angel-wings')} ${esc(b.text)}`, 'relic', 3200);
                    sfx('relic');
                    await wait(300);
                    break;
                case 'use': sfx('tap'); break;
                case 'equip': sfx('item'); break;
                case 'levelup': sfx('levelup'); break;
                case 'descend': sfx('descend'); break;
                case 'target': sfx('relic'); break;
                case 'death': sfx('death'); vibrate(200); break;
                case 'end': sfx(b.won ? 'win' : 'success'); break;
                default: break;
            }
        }
    }

    function showRoll(b) {
        const tray = $('diceTray');
        const okClass = b.ok ? 'ok' : 'no';
        const showNeed = b.need != null;
        const bonus = b.bonus ? `<span class="roll-bonus">${b.bonus > 0 ? '+' : '−'}${Math.abs(b.bonus)}</span>` : '';
        tray.innerHTML = `
            <div class="roll ${b.pool ? `roll-${b.pool}` : ''}">
                <div class="roll-label">${esc(b.label)}</div>
                <div class="roll-row">
                    <div class="die" id="rollDie"><span>${b.value}</span></div>
                    ${bonus}
                    ${showNeed ? `<span class="roll-vs">need</span><span class="roll-need">${b.need}+</span>` : ''}
                </div>
                <div class="roll-result ${okClass}">${b.crit ? 'CRITICAL' : b.invert ? (b.ok ? 'SAFE' : 'TRIGGERED') : b.ok ? (showNeed ? 'SUCCESS' : '') : 'FAIL'}</div>
            </div>`;
        tray.classList.add('show');
        sfx('dice');
        const dieEl = $('rollDie').querySelector('span');
        const sides = b.sides || 6;
        let spins = 0;
        const spinMs = reduceMotion() ? 0 : settings.fast ? 160 : 380;
        return new Promise(resolve => {
            let done = false;
            const finish = () => {
                if (done) return;
                done = true;
                clearInterval(timer);
                dieEl.textContent = b.value;
                tray.querySelector('.roll').classList.add('landed');
                sfx(b.ok ? 'success' : 'fail');
                setTimeout(() => {
                    tray.classList.remove('show');
                    skipRoll = null;
                    resolve();
                }, settings.fast ? 380 : 750);
            };
            skipRoll = finish;
            const timer = setInterval(() => {
                spins++;
                dieEl.textContent = 1 + Math.floor(Math.random() * sides);
                if (spins * 60 >= spinMs) finish();
            }, 60);
            if (!spinMs) finish();
        });
    }

    function poolEl(pool) {
        return pool === 'o2' ? $('o2Meter') : document.querySelector(`.pool[data-pool="${pool}"]`);
    }

    function enemyEl() {
        return document.querySelector('.enemy-portrait');
    }

    function floatAt(el, text, tone) {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const f = document.createElement('div');
        f.className = `floater fl-${tone}`;
        f.textContent = text;
        f.style.left = `${r.left + r.width / 2 + (Math.random() * 24 - 12)}px`;
        f.style.top = `${r.top + r.height * 0.35}px`;
        document.body.appendChild(f);
        setTimeout(() => f.remove(), 1100);
    }

    function flash(el, cls) {
        if (!el) return;
        el.classList.remove(cls);
        void el.offsetWidth;
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), 500);
    }

    function shake(el) {
        if (!el || reduceMotion()) return;
        flash(el, 'shake');
    }

    function lunge(el) {
        if (!el || reduceMotion()) return;
        flash(el, 'lunge');
    }

    function stamp(el, text) {
        if (!el) return;
        const s = document.createElement('div');
        s.className = 'stamp-overlay';
        s.textContent = text;
        el.appendChild(s);
    }

    // -------------------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------------------

    function render() {
        if (!S) return;
        document.body.dataset.depth = String(S.depth);
        document.body.dataset.scene = S.scene.kind;
        renderHud();
        renderStage();
        renderDock();
        renderTabs();
        if (sheetKind) renderSheet(sheetKind);
    }

    function renderHud() {
        const h = S.hero;
        const hud = $('hud');
        hud.hidden = !h;
        if (!h) return;
        $('depthChip').innerHTML = `<span class="depth-num">${ROMAN[S.depth]}</span><span class="depth-name">${esc(DEPTHS[S.depth - 1].name)}</span>`;
        const m = Engine.mission(S);
        $('hudMeta').innerHTML = `<span class="target-chip ${S.target ? 'have' : ''}" title="${esc(m.target)}">${icon('locked-door')}${S.target ? 'Target' : `Room ${S.roomNo}`}</span>`;

        const poolsEl = $('pools');
        if (!poolsEl.children.length) {
            poolsEl.innerHTML = POOLS.map(p => `
                <div class="pool" data-pool="${p}">
                    <div class="pool-head">${icon(POOL_ICON[p])}<span class="pool-name">${POOL_LABELS[p]}</span><span class="pool-num"></span></div>
                    <div class="bar"><div class="bar-fill"></div></div>
                </div>`).join('');
        }
        POOLS.forEach(p => {
            const el = poolsEl.querySelector(`[data-pool="${p}"]`);
            const v = h.pools[p];
            el.querySelector('.pool-num').innerHTML = `${v.cur}<small>/${v.max}</small>`;
            el.querySelector('.bar-fill').style.width = `${(v.cur / v.max) * 100}%`;
            el.classList.toggle('low', v.cur / v.max <= 0.34);
            const need = Engine.testNeed(S, p);
            el.title = `${POOL_LABELS[p]} ${v.cur}/${v.max} · tests need ${need}+`;
        });

        const o2 = h.pools.o2;
        const escape = Engine.escapeCost(S);
        $('o2Fill').style.width = `${(o2.cur / o2.max) * 100}%`;
        $('o2Meter').style.setProperty('--o2max', o2.max);
        $('o2Escape').style.left = `${Math.min(100, (escape / o2.max) * 100)}%`;
        $('o2Meter').classList.toggle('danger', o2.cur <= escape);
        $('o2Meter').classList.toggle('empty', o2.cur === 0);
        $('o2Label').innerHTML = `${icon('lungs')}<b>${o2.cur}</b><small>/${o2.max} Oxygen</small><span class="o2-escape-label">escape ≈${escape}</span>`;

        const need = Engine.xpToNext(S);
        $('xp').innerHTML = `<span class="lv">LV ${h.level}</span><div class="bar xp-bar"><div class="bar-fill" style="width:${Math.min(100, (h.xp / need) * 100)}%"></div></div><small>${h.xp}/${need}</small>`;
        $('credits').innerHTML = `${icon('two-coins')}<b>${h.credits}</b>`;
        const statuses = [];
        if (h.status.breached) statuses.push(['breached', 'Breached', 'bad']);
        if (h.status.cursed) statuses.push(['cursed', 'Cursed', 'bad']);
        if (h.status.blessed) statuses.push(['blessed', 'Blessed', 'good']);
        if (Engine.overweight(S)) statuses.push(['heavy', `Overloaded +${Engine.overweight(S)}`, 'bad']);
        if (S.target) statuses.push(['target', 'Carrying', 'good']);
        $('statuses').innerHTML = statuses.map(([k, label, tone]) =>
            `<span class="status st-${tone}" data-action="status" data-arg="${k}">${icon(statusIcon(k))}${esc(label)}</span>`).join('');
    }

    function statusIcon(name) {
        return { breached: 'cracked-glass', cursed: 'cursed-star', blessed: 'angel-wings', heavy: 'knapsack', target: 'locked-door' }[name] || 'info';
    }

    function statusLabel(name) {
        return { breached: 'Breached', cursed: 'Cursed', blessed: 'Blessed' }[name] || name;
    }

    function renderTabs() {
        const tabs = $('tabbar');
        tabs.hidden = !S.hero || S.scene.kind === 'end';
        if (tabs.hidden) return;
        const slots = Engine.packSlots(S);
        const n = S.hero.pack.length;
        tabs.querySelector('[data-action="pack"]').innerHTML = `${icon('knapsack')}<span>Pack <small class="${n > slots ? 'over' : ''}">${n}/${slots}</small></span>`;
        tabs.querySelector('[data-action="map"]').innerHTML = `${icon('treasure-map')}<span>Map</span>`;
        tabs.querySelector('[data-action="log"]').innerHTML = `${icon('scroll-unfurled')}<span>Log</span>`;
    }

    // ---- Stage ---------------------------------------------------------------

    function renderStage() {
        const sc = S.scene;
        const stage = $('stage');
        if (sc.kind === 'combat' && stageKey === `combat:${sc.enemy.name}`) {
            patchCombat();
            return;
        }
        stageKey = sc.kind === 'combat' ? `combat:${sc.enemy.name}` : `${sc.kind}:${Math.random()}`;
        const renderers = {
            choose: stageChoose, doors: stageDoors, event: stageEvent, test: stageTest, combat: stageCombat,
            shop: stageShop, levelup: stageLevelup, extract: stageExtract, end: stageEnd
        };
        stage.innerHTML = hintCard() + renderers[sc.kind]();
        stage.scrollTop = 0;
    }

    function beatSummary(beats) {
        const dmg = {};
        const heal = {};
        let credits = 0;
        let xp = 0;
        const items = [];
        beats.forEach(b => {
            if (b.t === 'dmg') dmg[b.pool] = (dmg[b.pool] || 0) + b.amount;
            if (b.t === 'o2') dmg.o2 = (dmg.o2 || 0) + b.amount;
            if (b.t === 'heal') heal[b.pool] = (heal[b.pool] || 0) + b.amount;
            if (b.t === 'credits') credits += b.amount;
            if (b.t === 'spend') credits -= b.amount;
            if (b.t === 'xp') xp += b.amount;
            if (b.t === 'item') items.push(['item', b.name]);
            if (b.t === 'relic') items.push(['relic', b.name]);
            if (b.t === 'lose') items.push(['lose', b.name]);
            if (b.t === 'status') items.push([b.on && b.name !== 'blessed' ? 'lose' : 'item', `${b.on ? '' : 'no longer '}${statusLabel(b.name)}`]);
        });
        const chips = [];
        Object.entries(dmg).forEach(([p, n]) => chips.push(`<span class="chip chip-bad">−${n} ${POOL_SHORT[p]}</span>`));
        Object.entries(heal).forEach(([p, n]) => chips.push(`<span class="chip chip-good">+${n} ${POOL_SHORT[p]}</span>`));
        if (credits) chips.push(`<span class="chip ${credits > 0 ? 'chip-gold' : 'chip-bad'}">${credits > 0 ? '+' : '−'}${Math.abs(credits)} ${icon('two-coins')}</span>`);
        if (xp) chips.push(`<span class="chip chip-xp">+${xp} XP</span>`);
        items.forEach(([k, name]) => chips.push(`<span class="chip chip-${k}">${k === 'relic' ? icon('gem-pendant') : ''}${esc(name)}</span>`));
        return chips.length ? `<div class="chips">${chips.join('')}</div>` : '';
    }

    function stageChoose() {
        const sc = S.scene;
        const m = Engine.MISSION[S.mission];
        const boss = Engine.ENEMY[m.boss];
        const daily = S.daily ? `<span class="stamp stamp-small">Daily · ${esc(S.daily)}</span>` : '';
        return `
            <article class="card mission-card">
                ${daily}
                <div class="card-kicker">Contract</div>
                <h2 class="card-title">${esc(m.briefing)}</h2>
                <p class="flavor">${esc(m.target)}. It waits in the Vault at Depth III, guarded by <b>${esc(boss.name)}</b>.</p>
                <p class="small-print">Pays ${m.payout} credits. ${esc(m.twistText)}</p>
            </article>
            <h3 class="section-label">Choose who goes down</h3>
            <div class="candidates">
                ${sc.candidates.map((c, i) => {
                    const bg = Engine.BG[c.bg];
                    const kit = [bg.weapon, bg.armor, ...bg.kit].filter(Boolean).map(id => Engine.ITEM[id].name);
                    return `
                    <button class="card candidate" data-action="choose" data-arg="${i}">
                        <div class="cand-head">${icon(bg.icon, 'cand-icon')}<div><div class="cand-name">${esc(c.name)}</div><div class="cand-bg">${esc(bg.name)}</div></div></div>
                        <div class="cand-pools">
                            ${['body', 'mind', 'soul', 'o2'].map(p => `<span class="cp pc-${p}">${icon(POOL_ICON[p])}${c.pools[p]}</span>`).join('')}
                        </div>
                        <p class="cand-perk">${esc(bg.perkText)}</p>
                        <p class="cand-kit">${kit.map(esc).join(' · ')}</p>
                    </button>`;
                }).join('')}
            </div>`;
    }

    function outcomeCard() {
        const o = S.outcome;
        const summary = beatSummary(lastBeats);
        if (!o && !summary) return '';
        if (o?.banner) {
            return `
                <article class="card banner-card">
                    <div class="banner-depth">Depth ${ROMAN[o.banner]}</div>
                    <h2 class="banner-title">${esc(DEPTHS[o.banner - 1].name)}</h2>
                    <p class="flavor">${esc(o.text)}</p>
                    ${summary}
                </article>`;
        }
        return `
            <article class="card outcome-card tone-${o?.tone || 'info'}">
                ${o ? `<div class="outcome-head">${icon(o.icon || 'door', 'outcome-icon')}<h2 class="card-title">${esc(o.title)}</h2></div>
                <p class="flavor">${esc(o.text)}</p>` : ''}
                ${summary}
            </article>`;
    }

    function depthProgress() {
        if (S.target) return 'You have the target. Every credit is doubled. Extract when you dare.';
        const min = GAME_RULES.liftMinRooms - (Engine.BG[S.hero.bg].perk === 'pathfinder' ? 1 : 0);
        const sure = GAME_RULES.liftGuaranteedRooms - (Engine.BG[S.hero.bg].perk === 'pathfinder' ? 1 : 0);
        const what = S.depth < GAME_RULES.depths ? 'Lift' : 'Vault';
        const n = S.roomsAtDepth;
        const pips = Array.from({ length: sure }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
        const text = n >= sure ? `The ${what} is near.` : n >= min ? `The ${what} may show up now.` : `The ${what} shows up after ${min - n} more room${min - n === 1 ? '' : 's'}.`;
        return `<span class="pips">${pips}</span>${text}`;
    }

    function stageDoors() {
        const cost = Engine.roomCost(S);
        return `
            ${outcomeCard()}
            <p class="depth-progress">${depthProgress()}</p>
            <div class="doors-head">
                <h3 class="section-label">Choose a door</h3>
                <span class="door-cost ${cost > 1 ? 'pricey' : ''}">${icon('lungs')} ${cost} O2 each</span>
            </div>`;
    }

    function stageEvent() {
        const sc = S.scene;
        const kicker = { strange: 'Strange', salvage: 'Salvage', shrine: 'Shrine' }[sc.category] || '';
        return `
            <article class="card event-card cat-${sc.category}">
                <div class="event-art">${icon(sc.icon, 'event-icon')}</div>
                <div class="card-kicker">${kicker}</div>
                <h2 class="card-title">${esc(sc.title)}</h2>
                <p class="flavor">${esc(sc.text)}</p>
                ${beatSummary(lastBeats)}
            </article>`;
    }

    function stageTest() {
        const sc = S.scene;
        const t = sc.pending;
        return `
            <article class="card test-card">
                <div class="card-kicker">${esc(testLabel(t.pool))}</div>
                <h2 class="card-title">So close.</h2>
                <div class="test-dice"><div class="die die-static"><span>${t.roll}</span></div>${t.bonus ? `<span class="roll-bonus">${t.bonus > 0 ? '+' : '−'}${Math.abs(t.bonus)}</span>` : ''}<span class="roll-vs">need</span><span class="roll-need">${t.need}+</span></div>
                <p class="flavor">${esc(t.label)}. ${sc.canPush ? 'You missed by one. Burn some air and force it?' : 'The mirror script could give you another try.'}</p>
            </article>`;
    }

    function enemyPortrait(e) {
        const art = e.sprite
            ? `<img src="${ENEMY_SPRITE_DIR}/${e.sprite}" alt="" draggable="false">`
            : icon('two-shadows', 'enemy-icon');
        return `<div class="enemy-portrait tier-${e.tier} ${e.tint ? `tint-${e.tint}` : ''} ${e.affix ? 'elite' : ''}">${art}</div>`;
    }

    function stageCombat() {
        const sc = S.scene;
        const e = sc.enemy;
        const tierLabel = e.tier === 'boss' ? 'Vault guardian' : e.affix ? 'Marked' : e.tier === 'tough' ? 'Tough' : 'Weak';
        return `
            <article class="card combat-card" data-tier="${e.tier}">
                <div class="combat-top">
                    <span class="stamp stamp-small tier-stamp-${e.tier}">${esc(tierLabel)} · ${esc(e.kind)}</span>
                    <span class="round" id="roundNum">Round ${sc.round}</span>
                </div>
                <div class="combat-body">
                    ${enemyPortrait(e)}
                    <div class="combat-info">
                        <h2 class="enemy-name">${esc(e.name)}</h2>
                        <div class="enemy-hp">
                            <div class="bar bar-enemy"><div class="bar-fill" id="enemyHpFill" style="width:${(e.hp / e.maxHp) * 100}%"></div></div>
                            <span id="enemyHpText">${e.hp}/${e.maxHp}</span>
                        </div>
                        <div class="enemy-stats">
                            <span>${icon('crosshair')} Hit on <b>${e.def}+</b></span>
                            <span>${icon('sword-wound')} ${esc(Engine.dmgLabel(e.dmg, e.dmgBonus))} → ${poolName(e.pool)}</span>
                        </div>
                    </div>
                </div>
                <div class="combat-feed" id="combatFeed">${combatFeed()}</div>
                <div id="intentBox">${intentHtml()}</div>
                <p class="trait">${esc(e.traitText)}${e.affixText ? `<br><b>${esc(e.affixText)}</b>` : ''}</p>
            </article>`;
    }

    function intentHtml() {
        const sc = S.scene;
        const intent = INTENTS[sc.intent];
        const [lo, hi] = Engine.combatView(S).incoming;
        const dmg = sc.intent === 'guard' ? 'No attack' : `${lo === hi ? lo : `${lo}–${hi}`} ${POOL_SHORT[sc.enemy.pool]}`;
        const stunned = sc.stunned ? '<span class="intent-mod">Blinded: loses this move</span>' : '';
        const aegis = sc.aegis ? '<span class="intent-mod">Aegis up</span>' : '';
        return `
            <div class="intent intent-${sc.intent}">
                <div class="intent-label">Next move</div>
                <div class="intent-main">${icon(intent.icon)}<b>${intent.label}</b><span class="intent-dmg">${dmg}</span></div>
                <div class="intent-hint">${esc(intent.hint)}</div>
                ${stunned}${aegis}
            </div>`;
    }

    // One line per thing that happened last round, so fights read at a glance.
    function combatFeed() {
        const e = S.scene.enemy;
        const verbs = { strike: 'strikes', charge: 'charges', guard: 'guards' };
        const out = [];
        lastBeats.forEach(b => {
            if (b.t === 'roll' && b.need != null && !b.pool) {
                const total = b.value + (b.bonus || 0);
                out.push(`<span class="${b.ok ? 'f-good' : 'f-bad'}">${esc(b.label)} ${total} vs ${b.need}+ · ${b.crit ? 'CRIT' : b.ok ? 'hit' : 'miss'}</span>`);
            } else if (b.t === 'ehit') {
                out.push(`<span class="f-good">${b.drone ? 'Drone' : b.riposte ? 'Riposte' : 'Hit'} −${b.amount}</span>`);
            } else if (b.t === 'eheal') {
                out.push(`<span class="f-bad">${esc(e.name)} heals ${b.amount}</span>`);
            } else if (b.t === 'eact') {
                out.push(`<span>${esc(e.name)} ${verbs[b.intent]}</span>`);
            } else if (b.t === 'dmg') {
                out.push(`<span class="f-bad">You −${b.amount} ${POOL_SHORT[b.pool]}</span>`);
            } else if (b.t === 'o2') {
                out.push(`<span class="f-o2">−${b.amount} O2</span>`);
            } else if (b.t === 'block') {
                out.push('<span class="f-good">Blocked</span>');
            } else if (b.t === 'msg' || b.t === 'saved') {
                out.push(`<span class="f-${b.tone === 'bad' ? 'bad' : 'good'}">${esc(b.text)}</span>`);
            } else if (b.t === 'use') {
                out.push(`<span>Used ${esc(b.name)}</span>`);
            }
        });
        return out.length ? out.join('<i>›</i>') : `<span>${esc(e.name)} blocks the way.</span>`;
    }

    function patchCombat() {
        const sc = S.scene;
        const e = sc.enemy;
        const fill = $('enemyHpFill');
        if (fill) fill.style.width = `${Math.max(0, (e.hp / e.maxHp) * 100)}%`;
        const txt = $('enemyHpText');
        if (txt) txt.textContent = `${Math.max(0, e.hp)}/${e.maxHp}`;
        const rn = $('roundNum');
        if (rn) rn.textContent = `Round ${sc.round}`;
        const feed = $('combatFeed');
        if (feed) feed.innerHTML = combatFeed();
        const box = $('intentBox');
        if (box) {
            box.innerHTML = intentHtml();
            flash(box.firstElementChild, 'pop');
        }
    }

    function stageShop() {
        const sc = S.scene;
        const h = S.hero;
        const rows = sc.stock.map((s, i) => {
            const def = s.relic ? Engine.RELIC[s.relic] : Engine.ITEM[s.id];
            const kind = s.relic ? 'relic' : def.kind;
            const afford = h.credits >= s.price;
            return `
                <div class="ware ${s.sold ? 'sold' : ''} kind-${kind}">
                    ${icon(s.relic ? 'gem-pendant' : KIND_ICON[def.kind], 'ware-icon')}
                    <div class="ware-text"><div class="ware-name">${esc(def.name)}${s.relic ? ' <span class="tag">Relic</span>' : ''}</div><div class="ware-desc">${esc(def.text)}</div></div>
                    <button class="btn btn-buy" data-action="buy" data-arg="${i}" ${s.sold || !afford ? 'disabled' : ''}>${s.sold ? 'Sold' : `${s.price} ${icon('two-coins')}`}</button>
                </div>`;
        }).join('');
        const sells = h.pack.map((p, i) => {
            const def = Engine.ITEM[p.id];
            return `
                <div class="ware">
                    ${icon(KIND_ICON[def.kind], 'ware-icon')}
                    <div class="ware-text"><div class="ware-name">${esc(def.name)}</div></div>
                    <button class="btn btn-sell" data-action="sell" data-arg="${i}">+${Engine.sellValue(p.id)} ${icon('two-coins')}</button>
                </div>`;
        }).join('');
        return `
            <article class="card shop-card">
                <div class="outcome-head">${icon('shop', 'outcome-icon')}<h2 class="card-title">Void Peddler</h2></div>
                <p class="flavor">${esc(sc.line)}</p>
                ${beatSummary(lastBeats)}
            </article>
            <h3 class="section-label">Wares</h3>
            <div class="wares">${rows}</div>
            <h3 class="section-label">Sell from your pack</h3>
            <div class="wares">${sells || '<p class="empty">Nothing to sell.</p>'}</div>`;
    }

    function stageLevelup() {
        const sc = S.scene;
        return `
            <article class="card levelup-card">
                <div class="card-kicker">Level ${S.hero.level + 1}</div>
                <h2 class="card-title">The base has taught you something</h2>
                <p class="flavor">Keep one. The others are gone.</p>
            </article>
            <div class="adv-list">
                ${sc.choices.map(id => {
                    const a = Engine.ADV[id];
                    return `<button class="card adv-card path-${a.path.toLowerCase()}" data-action="advance" data-arg="${id}">
                        <span class="adv-path">${esc(a.path)}</span>
                        <span class="adv-name">${esc(a.name)}</span>
                        <span class="adv-text">${esc(a.text)}</span>
                    </button>`;
                }).join('')}
            </div>`;
    }

    function stageExtract() {
        const sc = S.scene;
        const shaft = [3, 2, 1, 0].filter(d => d <= S.depth).map(d => {
            const here = d === sc.level;
            const done = d > sc.level;
            return `<div class="shaft-level ${here ? 'here' : ''} ${done ? 'done' : ''}">
                <span class="shaft-mark">${d === 0 ? icon('moon') : ROMAN[d]}</span>
                <span class="shaft-name">${d === 0 ? 'Surface' : esc(DEPTHS[d - 1].name)}</span>
            </div>`;
        }).reverse().join('');
        const results = sc.results.map(r => `<li class="${r.ok ? 'ok' : 'no'}">${r.ok ? icon('check-mark') : icon('hazard-sign')} ${esc(r.label)}${r.text ? ` <small>${esc(r.text)}</small>` : ''}</li>`).join('');
        return `
            <article class="card extract-card">
                <div class="card-kicker">${sc.withTarget ? 'Extraction' : 'Abort mission'}</div>
                <h2 class="card-title">${sc.withTarget ? 'Get the target out' : 'Run for the surface'}</h2>
                <p class="flavor">Climb one depth at a time. Each climb costs air, and a bad roll means trouble.</p>
                ${beatSummary(lastBeats)}
            </article>
            <div class="shaft">${shaft}</div>
            ${results ? `<ul class="climb-results">${results}</ul>` : ''}`;
    }

    function stageEnd() {
        const sc = S.scene;
        const h = S.hero;
        const bg = Engine.BG[h.bg];
        const word = sc.won ? 'Extracted' : sc.extracted ? 'Survived' : 'Dead';
        return `
            <article class="card end-card ${sc.won ? 'won' : sc.extracted ? 'survived' : 'dead'}">
                <div class="end-stamp">${word}</div>
                <h2 class="card-title">${esc(h.name)}</h2>
                <p class="cand-bg">${esc(bg.name)} · Level ${h.level}</p>
                <p class="flavor">${esc(sc.cause)}</p>
                <div class="end-score"><span>Score</span><b>${sc.score}</b></div>
                <div class="end-stats">
                    <span>Depth <b>${ROMAN[S.stats.maxDepth]}</b></span>
                    <span>Rooms <b>${S.stats.rooms}</b></span>
                    <span>Kills <b>${S.stats.kills}</b></span>
                    <span>Credits <b>${sc.extracted ? h.credits : 0}</b></span>
                </div>
                <div class="end-path">${pathEmoji()}</div>
            </article>`;
    }

    function pathEmoji() {
        const rows = [1, 2, 3].map(d => S.path.filter(p => p.d === d).map(p => DOOR_EMOJI[p.t] || '·').join('')).filter(Boolean);
        return rows.map((r, i) => `<div><b>${ROMAN[i + 1]}</b> ${r}</div>`).join('');
    }

    // ---- Dock ----------------------------------------------------------------

    function renderDock() {
        const dock = $('dock');
        const sc = S.scene;
        const renderers = {
            choose: () => '',
            doors: dockDoors,
            event: dockEvent,
            test: dockTest,
            combat: dockCombat,
            shop: () => `<button class="btn btn-wide" data-action="leave">${icon('exit-door')} Leave the Peddler</button>`,
            levelup: () => '',
            extract: dockExtract,
            end: dockEnd
        };
        dock.innerHTML = renderers[sc.kind]();
        dock.dataset.kind = sc.kind;
    }

    function dockDoors() {
        const doors = S.scene.doors.map((d, i) => {
            const v = Engine.doorView(S, d);
            return `
                <button class="door door-${v.type} ${v.fled ? 'fled' : ''} ${v.wasDark ? 'was-dark' : ''}" data-action="door" data-arg="${i}" ${v.fled ? 'disabled' : ''}>
                    <span class="door-arch">${icon(v.icon, 'door-icon')}</span>
                    <span class="door-label">${esc(v.fled ? 'Fled' : v.label)}</span>
                    <span class="door-detail">${esc(v.detail || v.hint)}</span>
                </button>`;
        }).join('');
        const escape = Engine.escapeCost(S);
        const label = S.target ? 'Extract' : 'Abort &amp; extract';
        return `
            <div class="doors n${S.scene.doors.length}">${doors}</div>
            <button class="btn btn-wide btn-extract ${S.target ? 'btn-primary' : 'btn-ghost'}" data-action="extract">
                ${icon('exit-door')} ${label} <small>${S.depth} climb${S.depth > 1 ? 's' : ''} · ≈${escape} O2${S.target ? ` · +${S.payout} pay` : ' · no pay'}</small>
            </button>`;
    }

    function optionSub(opt) {
        const parts = [];
        const blocked = Engine.optionBlocked(S, opt);
        if (opt.sub) parts.push(esc(opt.sub));
        if (opt.test) {
            const p = Engine.testChance(S, opt.test);
            parts.push(`${testLabel(opt.test)} <b class="${chanceClass(p)}">${pct(p)}</b>`);
        }
        if (blocked) parts.push(`<span class="blocked">${esc(blocked)}</span>`);
        return parts.join(' · ');
    }

    function dockEvent() {
        return `<div class="options">${S.scene.options.map((o, i) => {
            const blocked = Engine.optionBlocked(S, o);
            return `<button class="btn option ${o.test ? `opt-test opt-${o.test}` : ''}" data-action="option" data-arg="${i}" ${blocked ? 'disabled' : ''}>
                <span class="opt-label">${esc(o.label)}</span>
                <span class="opt-sub">${optionSub(o)}</span>
            </button>`;
        }).join('')}</div>`;
    }

    function dockTest() {
        const sc = S.scene;
        const script = S.hero.pack.find(p => p.id === 'mirrorScript');
        return `<div class="options">
            ${sc.canPush ? `<button class="btn option btn-primary" data-action="test" data-arg="push"><span class="opt-label">${icon('lungs')} Push it</span><span class="opt-sub">Spend 1 O2 → success</span></button>` : ''}
            ${sc.canReroll ? `<button class="btn option" data-action="test" data-arg="reroll"><span class="opt-label">${icon('mirror-mirror')} Reroll</span><span class="opt-sub">Mirror script · ${script?.charges || 0} left</span></button>` : ''}
            <button class="btn option btn-ghost" data-action="test" data-arg="accept"><span class="opt-label">Accept the failure</span></button>
        </div>`;
    }

    function dockCombat() {
        const sc = S.scene;
        const v = Engine.combatView(S);
        const usable = S.hero.pack.some(p => Engine.canUse(S, p));
        const braceText = sc.intent === 'guard' ? 'Nothing to block' : v.braceTaken ? 'Take 1 instead' : 'Block it all';
        const parley = sc.parley
            ? `<button class="btn act act-parley" data-action="parley">${icon('prayer')}<span class="act-label">${sc.enemy.trait === 'restless' ? 'Lay to rest' : 'Salute'}</span><span class="act-sub">Soul test <b class="${chanceClass(v.parleyChance)}">${pct(v.parleyChance)}</b></span></button>`
            : '';
        return `
            <div class="actions">
                ${parley}
                <button class="btn act act-attack" data-action="attack">${icon('broadsword')}<span class="act-label">Attack</span><span class="act-sub"><b class="${chanceClass(v.hit)}">${pct(v.hit)}</b> · ${v.dmg} dmg</span></button>
                <button class="btn act act-push" data-action="push">${icon('lungs')}<span class="act-label">Push</span><span class="act-sub"><b class="${chanceClass(v.pushHit)}">${pct(v.pushHit)}</b> · ${v.pushDmg} dmg · ${v.pushCost ? '−1&nbsp;O2' : 'free'}</span></button>
                <button class="btn act act-brace ${sc.intent === 'charge' ? 'suggest' : ''}" data-action="brace">${icon('checked-shield')}<span class="act-label">Brace</span><span class="act-sub">${braceText}</span></button>
                <button class="btn act act-item" data-action="pack" ${usable ? '' : 'disabled'}>${icon('medicines')}<span class="act-label">Item</span><span class="act-sub">${usable ? 'Uses your turn' : 'Nothing usable'}</span></button>
                <button class="btn act act-flee" data-action="flee">${icon('run')}<span class="act-label">Flee</span><span class="act-sub">${esc(v.fleeCost)}</span></button>
            </div>`;
    }

    function dockExtract() {
        const sc = S.scene;
        const mod = Engine.extractionMod(S);
        let wins = 0;
        for (let r = 1; r <= 6; r++) if (r + mod >= GAME_RULES.extractionTarget) wins++;
        const p = wins / 6;
        return `<button class="btn btn-wide btn-primary btn-climb" data-action="climb">
            ${icon('stairs')} Climb to ${sc.level - 1 === 0 ? 'the surface' : `Depth ${ROMAN[sc.level - 1]}`}
            <small>${Engine.climbCost(S)} O2 · clean on ${GAME_RULES.extractionTarget - mod}+ <b class="${chanceClass(p)}">${pct(p)}</b></small>
        </button>`;
    }

    function dockEnd() {
        return `<div class="end-actions">
            <button class="btn btn-primary" data-action="again">${icon('perspective-dice-six-faces-random')} Descend again</button>
            <button class="btn" data-action="share">${icon('share')} Share</button>
            <button class="btn btn-ghost" data-action="title">Title</button>
        </div>`;
    }

    // -------------------------------------------------------------------------
    // SHEETS
    // -------------------------------------------------------------------------

    function openSheet(kind) {
        sheetKind = kind;
        renderSheet(kind);
        $('sheet').hidden = false;
        $('sheetBackdrop').hidden = false;
        requestAnimationFrame(() => {
            $('sheet').classList.add('open');
            $('sheetBackdrop').classList.add('open');
        });
    }

    function closeSheet() {
        sheetKind = null;
        $('sheet').classList.remove('open');
        $('sheetBackdrop').classList.remove('open');
        setTimeout(() => {
            if (!sheetKind) {
                $('sheet').hidden = true;
                $('sheetBackdrop').hidden = true;
            }
        }, 250);
    }

    function renderSheet(kind) {
        const sheets = { pack: sheetPack, map: sheetMap, log: sheetLog, menu: sheetMenu, graveyard: sheetGraveyard, records: sheetRecords, howto: sheetHowto, status: sheetStatus };
        const [title, body] = sheets[kind]();
        $('sheetTitle').innerHTML = title;
        $('sheetBody').innerHTML = body;
    }

    function sheetPack() {
        const h = S.hero;
        const kind = S.scene.kind;
        const inCombat = kind === 'combat';
        const w = Engine.weapon(S);
        const a = Engine.armor(S);
        const slots = Engine.packSlots(S);
        const items = h.pack.map((p, i) => {
            const def = Engine.ITEM[p.id];
            const btns = [];
            if (Engine.canUse(S, p)) btns.push(`<button class="btn btn-small btn-primary" data-action="use" data-arg="${i}">Use</button>`);
            if ((def.kind === 'weapon' || def.kind === 'armor') && !inCombat) btns.push(`<button class="btn btn-small" data-action="equip" data-arg="${i}">Equip</button>`);
            if (kind === 'shop') btns.push(`<button class="btn btn-small" data-action="sell" data-arg="${i}">Sell +${Engine.sellValue(p.id)}</button>`);
            if (!inCombat) btns.push(`<button class="btn btn-small btn-ghost" data-action="drop" data-arg="${i}">Drop</button>`);
            const charges = p.charges != null ? ` <span class="tag">${p.charges} left</span>` : '';
            const over = i >= slots ? ' over' : '';
            return `<div class="item kind-${def.kind}${over}">
                ${icon(KIND_ICON[def.kind], 'item-icon')}
                <div class="item-text"><div class="item-name">${esc(def.name)}${charges}${def.dmg ? ` <span class="tag">${esc(def.dmg)}</span>` : ''}</div><div class="item-desc">${esc(def.text)}</div></div>
                <div class="item-btns">${btns.join('')}</div>
            </div>`;
        }).join('');
        const relics = h.relics.map(id => `<div class="item kind-relic">${icon('gem-pendant', 'item-icon')}<div class="item-text"><div class="item-name">${esc(Engine.RELIC[id].name)}</div><div class="item-desc">${esc(Engine.RELIC[id].text)}</div></div></div>`).join('');
        const advs = h.advancements.map(id => `<div class="item kind-adv">${icon('upgrade', 'item-icon')}<div class="item-text"><div class="item-name">${esc(Engine.ADV[id].name)}</div><div class="item-desc">${esc(Engine.ADV[id].text)}</div></div></div>`).join('');
        const bg = Engine.BG[h.bg];
        const n = h.pack.length;
        return [
            `${icon('knapsack')} Pack <small class="${n > slots ? 'over' : ''}">${n}/${slots}</small>`,
            `${inCombat ? '<p class="sheet-note">Using an item takes your turn.</p>' : ''}
            <div class="equipped">
                <div class="item kind-weapon equipped-slot">${icon('broadsword', 'item-icon')}<div class="item-text"><div class="item-name">${esc(w.name)} <span class="tag">${esc(w.dmg)}</span></div><div class="item-desc">${esc(w.text)}</div></div></div>
                <div class="item kind-armor equipped-slot">${icon('breastplate', 'item-icon')}<div class="item-text"><div class="item-name">${a ? esc(a.name) : 'No suit mod'}</div><div class="item-desc">${a ? esc(a.text) : 'Find or buy one: each protects a different pool.'}</div></div>
                ${a && !inCombat ? '<div class="item-btns"><button class="btn btn-small btn-ghost" data-action="unequip" data-arg="armor">Remove</button></div>' : ''}</div>
            </div>
            <h3 class="section-label">Carried ${n > slots ? `<span class="over">· overloaded: +${n - slots} O2 per room</span>` : ''}</h3>
            ${items || '<p class="empty">Empty.</p>'}
            ${relics ? `<h3 class="section-label">Relics</h3>${relics}` : ''}
            <h3 class="section-label">${esc(bg.name)}</h3>
            <div class="item kind-adv">${icon(bg.icon, 'item-icon')}<div class="item-text"><div class="item-desc">${esc(bg.perkText)}</div></div></div>
            ${advs}`
        ];
    }

    function sheetMap() {
        const m = Engine.mission(S);
        const rows = [1, 2, 3].map(d => {
            const rooms = S.path.filter(p => p.d === d);
            const nodes = rooms.map(p => {
                const def = DOOR_TYPES[p.t];
                return `<span class="map-node node-${p.t}" title="${esc(def.label)}">${icon(def.icon)}</span>`;
            }).join('<span class="map-link"></span>');
            const here = d === S.depth ? '<span class="map-link"></span><span class="map-node node-here">' + icon('position-marker') + '</span>' : '';
            const locked = d > S.depth ? '<span class="map-unknown">Unexplored</span>' : '';
            return `<div class="map-depth ${d === S.depth ? 'current' : ''}">
                <div class="map-depth-head"><b>${ROMAN[d]}</b> ${esc(DEPTHS[d - 1].name)}</div>
                <div class="map-row">${nodes}${here}${locked}</div>
            </div>`;
        }).join('');
        return [`${icon('treasure-map')} Map`, `
            <div class="map-mission">
                <div class="card-kicker">Contract</div>
                <b>${esc(m.briefing)}</b>
                <p>${esc(m.target)} · Vault guardian: ${esc(Engine.ENEMY[m.boss].name)} · Pays ${m.payout}</p>
                <p class="small-print">${esc(m.twistText)}</p>
            </div>
            ${rows}
            <div class="map-legend">${Object.entries(DOOR_TYPES).map(([k, d]) => `<span>${icon(d.icon)} ${esc(d.label)}</span>`).join('')}</div>`];
    }

    function sheetLog() {
        return [`${icon('scroll-unfurled')} Log`, `<ol class="log">${S.log.slice().reverse().map(l => `<li>${esc(l)}</li>`).join('')}</ol>`];
    }

    function toggleRow(key, label, sub) {
        return `<button class="toggle ${settings[key] ? 'on' : ''}" data-action="toggle" data-arg="${key}">
            <span><b>${label}</b><small>${sub}</small></span><span class="switch"></span>
        </button>`;
    }

    function sheetMenu() {
        const inRun = S && !S.over;
        return [`${icon('hamburger-menu')} Menu`, `
            ${toggleRow('sound', 'Sound', 'Effects and dice')}
            ${toggleRow('ambience', 'Ambience', 'A low drone from the deep')}
            ${toggleRow('fast', 'Fast mode', 'Quicker dice and animations')}
            ${toggleRow('haptics', 'Vibration', 'On hits, where supported')}
            <div class="menu-buttons">
                <button class="btn" data-action="howto">${icon('help')} How to play</button>
                <a class="btn" href="reference.html">${icon('open-book')} Pen &amp; paper rules</a>
                ${inRun ? `<button class="btn" data-action="title">${icon('exit-door')} Save &amp; quit to title</button>
                <button class="btn btn-danger" data-action="giveup">${icon('tombstone')} Give up this run</button>` : ''}
            </div>
            <p class="small-print">Icons by Lorc, Delapouite and contributors at <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a> (CC BY 3.0). Adapted from the Dark Fort / Moon Devils rules.</p>`];
    }

    function sheetGraveyard() {
        const rows = meta.graveyard.map(g => `
            <div class="grave ${g.won ? 'won' : g.extracted ? 'survived' : ''}">
                ${icon(g.won ? 'trophy' : g.extracted ? 'exit-door' : 'tombstone', 'grave-icon')}
                <div class="grave-text">
                    <div class="grave-name">${esc(g.name)} <small>${esc(g.bg)}</small></div>
                    <div class="grave-cause">${esc(g.cause)}</div>
                    <div class="grave-meta">Depth ${ROMAN[g.depth] || g.depth} · score ${g.score} · ${esc(g.date)}${g.daily ? ' · daily' : ''}</div>
                </div>
            </div>`).join('');
        return [`${icon('tombstone')} Graveyard`, rows || '<p class="empty">No one has gone down yet.</p>'];
    }

    function recordProgress(r) {
        const v = meta.stats[r.stat];
        return Array.isArray(v) ? v.length : (v || 0);
    }

    function sheetRecords() {
        const rows = RECORDS.map(r => {
            const p = Math.min(r.target, recordProgress(r));
            const done = p >= r.target;
            return `<div class="record ${done ? 'done' : ''}">${icon(done ? 'laurels-trophy' : 'hourglass', 'rec-icon')}<span>${esc(r.text)}</span><b>${done ? 'Done' : `${p}/${r.target}`}</b></div>`;
        }).join('');
        const s = meta.stats;
        return [`${icon('laurels-trophy')} Records`, `${rows}
            <div class="end-stats lifetime">
                <span>Runs <b>${s.runs}</b></span><span>Extractions <b>${s.wins}</b></span><span>Kills <b>${s.kills}</b></span><span>Best <b>${meta.best}</b></span>
            </div>`];
    }

    function sheetHowto() {
        return [`${icon('help')} How to play`, `
            <div class="howto">
                <p><b>The goal.</b> Go down three depths, kill the Vault guardian, take the target, and climb back out. You can also abort and leave early: you live, but there's no pay.</p>
                <p>${icon('lungs')} <b>Oxygen is the clock.</b> Every door costs 1 O2. Climbing out costs about 2 per depth (the marker on the bar). At 0 O2, you pay in Body instead.</p>
                <p>${icon('heart-organ')}${icon('brain')}${icon('candle-flame')} <b>Body, Mind, Soul.</b> If any one hits 0, you die. Enemies and rooms hurt different pools. The lower a pool, the harder its tests: 13+ needs 2, 9–12 needs 3, 5–8 needs 4, 1–4 needs 5. If you miss a test by 1, you can spend 1 O2 to push it into a success.</p>
                <p>${icon('door')} <b>Doors show what's behind them.</b> ${icon('crossed-swords')} Threat, ${icon('crowned-skull')} Marked elite (drops a relic), ${icon('open-chest')} Salvage, ${icon('third-eye')} Strange, ${icon('candle-light')} Shrine, ${icon('shop')} Peddler, ${icon('perspective-dice-six-faces-random')} Dark (unknown, +1 XP), ${icon('stairs')} Lift down.</p>
                <p>${icon('crossed-swords')} <b>Combat.</b> The enemy shows its next move. <b>Strike</b>: trade blows. <b>Charge</b>: it hits harder but is easier to hit, and Brace cuts it to 1. <b>Guard</b>: it doesn't attack but soaks 2 damage, and Push breaks through. A natural 6 is a crit. You can flee, but the room stays shut.</p>
                <p>${icon('upgrade')} <b>Level up</b> by filling the XP bar, then pick 1 of 3 advancements. Relics are rare and powerful.</p>
                <p>${icon('knapsack')} <b>Pack.</b> Each item over the slot limit costs +1 O2 per room. Sell extras to Peddlers.</p>
                <p>${icon('locked-door')} <b>Greed.</b> While you carry the target, every credit you find is doubled. The mission twist starts biting too.</p>
            </div>`];
    }

    function sheetStatus() {
        return [`${icon('info')} Status`, `
            <div class="howto">
                <p>${icon('cracked-glass')} <b>Breached.</b> Every room and every climb costs +1 O2. A suit patch kit or an airlock fixes it.</p>
                <p>${icon('cursed-star')} <b>Cursed.</b> −1 to all tests and Extraction rolls. A Moon-salt pouch or a chapel prayer lifts it.</p>
                <p>${icon('angel-wings')} <b>Blessed.</b> The next killing blow leaves you at 1 instead.</p>
                <p>${icon('knapsack')} <b>Overloaded.</b> Too many items: +1 O2 per room for each one over the limit.</p>
                <p>${icon('locked-door')} <b>Carrying.</b> Credits found are doubled. The mission twist is active.</p>
            </div>`];
    }

    // -------------------------------------------------------------------------
    // RUN END, META, SHARING
    // -------------------------------------------------------------------------

    function onRunEnd() {
        const sc = S.scene;
        const s = meta.stats;
        const before = new Set(RECORDS.filter(r => recordProgress(r) >= r.target).map(r => r.id));
        s.kills += S.stats.kills;
        s.maxDepth = Math.max(s.maxDepth, S.stats.maxDepth);
        s.bossKills += S.stats.bossKills;
        s.eliteKills += S.stats.eliteKills;
        s.bestRelics = Math.max(s.bestRelics, S.stats.bestRelics);
        if (!sc.extracted) s.deaths += 1;
        if (sc.won) {
            s.wins += 1;
            s.bestCredits = Math.max(s.bestCredits, S.hero.credits);
            if (!s.winBackgrounds.includes(S.hero.bg)) s.winBackgrounds.push(S.hero.bg);
        }
        meta.best = Math.max(meta.best, sc.score);
        if (S.daily) meta.daily[S.daily] = Math.max(meta.daily[S.daily] ?? 0, sc.score);
        meta.graveyard.unshift({
            name: S.hero.name,
            bg: Engine.BG[S.hero.bg].name,
            depth: S.stats.maxDepth,
            cause: sc.cause,
            score: sc.score,
            won: sc.won,
            extracted: sc.extracted,
            daily: Boolean(S.daily),
            date: dateKey()
        });
        meta.graveyard = meta.graveyard.slice(0, 60);
        store(GAME_RULES.metaKey, meta);
        store(GAME_RULES.saveKey, null);
        RECORDS.filter(r => !before.has(r.id) && recordProgress(r) >= r.target)
            .forEach((r, i) => setTimeout(() => toast(`${icon('laurels-trophy')} Record: <b>${esc(r.text)}</b>`, 'relic', 3500), 600 + i * 500));
    }

    async function share() {
        const sc = S.scene;
        const word = sc.won ? '🏆 Extracted' : sc.extracted ? '🚪 Survived' : '☠️ Dead';
        const rows = [1, 2, 3].map(d => S.path.filter(p => p.d === d).map(p => DOOR_EMOJI[p.t] || '·').join('')).filter(Boolean);
        const text = [
            `DARK FORT: MOON DEVILS${S.daily ? ` · Daily ${S.daily}` : ''}`,
            `${word} · ${S.hero.name} (${Engine.BG[S.hero.bg].name})`,
            `Depth ${ROMAN[S.stats.maxDepth]} · ${S.stats.kills} kills · score ${sc.score}`,
            ...rows
        ].join('\n');
        try {
            if (navigator.share) {
                await navigator.share({ text, url: location.href.split('#')[0] });
                return;
            }
            await navigator.clipboard.writeText(`${text}\n${location.href.split('#')[0]}`);
            toast('Copied to clipboard.', 'good');
        } catch (e) {
            toast('Could not share from this browser.', 'bad');
        }
    }

    // -------------------------------------------------------------------------
    // INPUT
    // -------------------------------------------------------------------------

    async function onClick(ev) {
        if (skipRoll && !ev.target.closest('[data-action]')) {
            skipRoll();
            return;
        }
        const el = ev.target.closest('[data-action]');
        if (!el || el.disabled) return;
        const action = el.dataset.action;
        const arg = el.dataset.arg;
        const idx = arg != null && /^\d+$/.test(arg) ? Number(arg) : arg;
        Sfx.unlock();
        switch (action) {
            case 'new': sfx('tap'); startRun(false); break;
            case 'daily': sfx('tap'); startRun(true); break;
            case 'continue': sfx('tap'); continueRun(); break;
            case 'again': startRun(false); break;
            case 'title': if (S && !S.over) saveRun(); showTitle(); break;
            case 'share': share(); break;
            case 'graveyard': case 'records': case 'howto': case 'menu': case 'map': case 'log': case 'status':
                sfx('tap');
                openSheet(action === 'status' ? 'status' : action);
                break;
            case 'pack': sfx('tap'); openSheet('pack'); break;
            case 'closeSheet': closeSheet(); break;
            case 'dismissTip': el.closest('.tip')?.remove(); break;
            case 'toggle':
                settings[arg] = !settings[arg];
                store(GAME_RULES.settingsKey, settings);
                Sfx.setEnabled(settings.sound);
                Sfx.setAmbience(settings.ambience);
                renderSheet('menu');
                break;
            case 'giveup':
                if (!confirm('Give up this run? It goes in the graveyard.')) return;
                closeSheet();
                S.dead = true;
                S.over = true;
                S.scene = { kind: 'end', won: false, extracted: false, payout: 0, score: 0, cause: 'Gave up and lay down in the dark.' };
                lastBeats = [];
                render();
                onRunEnd();
                break;
            case 'door':
                await act({ type: 'door', index: idx }, async () => {
                    sfx('door');
                    el.classList.add('opening');
                    await wait(reduceMotion() ? 0 : 220);
                });
                break;
            case 'use':
                if (S.scene.kind === 'combat') closeSheet();
                await act({ type: 'use', index: idx });
                break;
            case 'equip': case 'drop': case 'sell': case 'buy':
                await act({ type: action, index: idx });
                break;
            case 'unequip': await act({ type: 'unequip', slot: arg }); break;
            case 'choose': sfx('door'); await act({ type: 'choose', index: idx }); break;
            case 'option': await act({ type: 'option', index: idx }); break;
            case 'test': await act({ type: 'test', choice: arg }); break;
            case 'advance': await act({ type: 'advance', id: arg }); break;
            case 'attack': case 'push': case 'brace': case 'flee': case 'parley':
            case 'extract': case 'climb': case 'leave':
                await act({ type: action });
                break;
            default: break;
        }
    }

    function init() {
        document.querySelector('[data-action="graveyard"]').innerHTML = `${icon('tombstone')} Graveyard`;
        document.querySelector('[data-action="records"]').innerHTML = `${icon('laurels-trophy')} Records`;
        document.querySelector('#title [data-action="howto"]').innerHTML = `${icon('help')} How to play`;
        document.querySelector('#hud [data-action="menu"]').innerHTML = icon('hamburger-menu');
        document.querySelector('[data-action="closeSheet"]').textContent = '×';
        document.addEventListener('click', onClick);
        $('sheetBackdrop').addEventListener('click', closeSheet);
        observeHud();
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeSheet();
        });
        Sfx.setEnabled(settings.sound);
        Sfx.setAmbience(settings.ambience);
        showTitle();
    }

    document.addEventListener('DOMContentLoaded', init);

    return { get state() { return S; }, act, render };
})();
