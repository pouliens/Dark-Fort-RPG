// =============================================================================
// Headless simulation: plays thousands of runs with a simple bot to catch
// crashes / soft-locks and to report balance numbers.
//   node tests/sim.js            → invariants + summary
//   node tests/sim.js 5000 -v    → more runs, per-cause breakdown
// =============================================================================

const assert = require('assert');
const Engine = require('../engine.js');
const DATA = require('../game-data.js');

const RUNS = Number(process.argv[2]) || 1500;
const VERBOSE = process.argv.includes('-v');
const MAX_ACTIONS = 600;

function pct(pool) {
    return pool.cur / pool.max;
}

function lowPool(S, threshold) {
    return DATA.POOLS.find(p => pct(S.hero.pools[p]) < threshold);
}

function healItemFor(S, pool) {
    return S.hero.pack.findIndex(e => {
        const d = Engine.ITEM[e.id];
        return d.effects?.some(([op, p]) => (op === 'heal' && (p === pool || p === 'all')) || (op === 'o2' && pool === 'o2'))
            && Engine.canUse(S, e);
    });
}

function botAction(S) {
    const sc = S.scene;
    const h = S.hero;
    const escape = h ? Engine.escapeCost(S) : 0;
    const o2 = h ? h.pools.o2.cur : 0;

    // Heal between fights when hurt.
    if (h && ['doors', 'event', 'shop', 'extract'].includes(sc.kind)) {
        const low = lowPool(S, 0.45);
        if (low) {
            const idx = healItemFor(S, low);
            if (idx >= 0) return { type: 'use', index: idx };
        }
        if (o2 < escape + 2) {
            const idx = healItemFor(S, 'o2');
            if (idx >= 0) return { type: 'use', index: idx };
        }
        const gear = S.hero.pack.findIndex(e => {
            const d = Engine.ITEM[e.id];
            return (d.kind === 'weapon' && d.dmg && Engine.exprRange(d.dmg)[1] > Engine.exprRange(Engine.weapon(S).dmg)[1])
                || (d.kind === 'armor' && !S.hero.armor);
        });
        if (gear >= 0 && sc.kind !== 'combat') return { type: 'equip', index: gear };
        if (Engine.overweight(S) > 0) {
            const junk = S.hero.pack.findIndex(e => Engine.ITEM[e.id].kind !== 'consumable');
            return { type: 'drop', index: junk >= 0 ? junk : 0 };
        }
    }

    switch (sc.kind) {
        case 'choose': {
            let best = 0;
            sc.candidates.forEach((c, i) => {
                const score = c.pools.body + c.pools.mind + c.pools.soul;
                const b = sc.candidates[best].pools;
                if (score > b.body + b.mind + b.soul) best = i;
            });
            return { type: 'choose', index: best };
        }
        case 'doors': {
            if (S.target && (o2 < escape + 6 || lowPool(S, 0.5) || Math.random() < 0.5)) return { type: 'extract' };
            if (!S.target && (o2 <= escape + 1 || lowPool(S, 0.2))) return { type: 'extract' };
            const views = sc.doors.map((d, i) => ({ v: Engine.doorView(S, d), i, d }))
                .filter(x => !x.v.fled);
            const hurt = lowPool(S, 0.5);
            const score = ({ v }) => {
                if (v.type === 'lift') return 8;
                if (v.type === 'vault') {
                    const bossPool = Engine.ENEMY[Engine.mission(S).boss].pool;
                    return o2 >= escape + 4 && pct(h.pools[bossPool]) >= 0.7 ? 9 : -5;
                }
                if (v.type === 'shrine') return hurt ? 7 : 2;
                if (v.type === 'peddler') return h.credits >= 8 ? 4 : 1;
                if (v.type === 'elite') return hurt ? -3 : 1;
                if (v.type === 'threat') return hurt ? 0 : 3;
                if (v.type === 'salvage') return 4;
                if (v.type === 'strange') return 3;
                return 2;
            };
            views.sort((a, b) => score(b) - score(a) + (Math.random() - 0.5));
            return { type: 'door', index: views[0].i };
        }
        case 'event': {
            const opts = sc.options.map((o, i) => ({ o, i })).filter(({ o }) => !Engine.optionBlocked(S, o));
            const scored = opts.map(({ o, i }) => {
                let s = 1;
                if (o.test) {
                    const chance = Engine.testChance(S, o.test);
                    s = chance * 3 - 1;
                }
                if (o.effects?.some(([op]) => op === 'heal')) s += lowPool(S, 0.6) ? 2 : 0.5;
                if (o.effects?.some(([op, a]) => op === 'o2' && !String(a).startsWith('-'))) s += o2 < escape + 6 ? 2 : 0.5;
                if (o.effects?.some(([op, a]) => op === 'o2' && String(a).startsWith('-'))) s -= 0.5;
                if (o.effects?.some(([op]) => op === 'credits' || op === 'item' || op === 'relic')) s += 1;
                if (o.effects?.some(([op]) => op === 'fight')) s -= 1;
                return { i, s: s + Math.random() * 0.5 };
            });
            scored.sort((a, b) => b.s - a.s);
            return { type: 'option', index: scored[0].i };
        }
        case 'test':
            if (sc.canPush && o2 > escape + 1) return { type: 'test', choice: 'push' };
            if (sc.canReroll) return { type: 'test', choice: 'reroll' };
            return { type: 'test', choice: 'accept' };
        case 'combat': {
            const v = Engine.combatView(S);
            const e = sc.enemy;
            const pool = e.pool === 'o2' ? 'body' : e.pool;
            const routed = h.pools[pool];
            const [, maxIn] = v.incoming;
            if (sc.parley && v.parleyChance >= 0.5) return { type: 'parley' };
            if (routed.cur <= maxIn + 1) {
                const idx = healItemFor(S, pool);
                if (idx >= 0) return { type: 'use', index: idx };
            }
            if (routed.cur <= maxIn + 1 && routed.cur > 4 && e.tier !== 'boss' && e.hp > 3) return { type: 'flee' };
            const combatItem = h.pack.findIndex(x => {
                const d = Engine.ITEM[x.id];
                return d.use === 'combat' && (d.blast || d.stun || d.aegis) && Engine.canUse(S, x);
            });
            if (combatItem >= 0 && (e.tier !== 'weak' || routed.cur <= maxIn * 2)) return { type: 'use', index: combatItem };
            if (sc.intent === 'charge' && (routed.cur <= maxIn * 2 || e.tier === 'boss')) return { type: 'brace' };
            if (sc.intent === 'guard' && o2 > escape + 3) return { type: 'push' };
            return { type: 'attack' };
        }
        case 'shop': {
            const want = sc.stock.findIndex(s => !s.sold && s.price <= h.credits
                && (s.relic || ['o2Canister', 'redStim', 'sedative', 'soilCharm', 'hardsuit'].includes(s.id)));
            if (want >= 0 && h.pack.length < Engine.packSlots(S)) return { type: 'buy', index: want };
            return { type: 'leave' };
        }
        case 'levelup':
            return { type: 'advance', id: sc.choices[Math.floor(Math.random() * sc.choices.length)] };
        case 'extract':
            return { type: 'climb' };
        default:
            throw new Error(`Unknown scene ${sc.kind}`);
    }
}

function checkInvariants(S) {
    const h = S.hero;
    if (!h) return;
    ['body', 'mind', 'soul', 'o2'].forEach(p => {
        const pool = h.pools[p];
        assert(Number.isFinite(pool.cur) && Number.isFinite(pool.max), `${p} not finite`);
        assert(pool.cur >= 0 && pool.cur <= pool.max, `${p} out of range ${pool.cur}/${pool.max}`);
    });
    assert(Number.isFinite(h.credits) && h.credits >= 0, `credits ${h.credits}`);
    assert(Number.isFinite(h.xp) && h.xp >= 0, `xp ${h.xp}`);
    assert(S.scene && S.scene.kind, 'no scene');
    if (S.scene.kind === 'doors') {
        assert(S.scene.doors.length >= 2, 'fewer than two doors');
        assert(S.scene.doors.some(d => !d.fled), 'every door is fled');
    }
    if (S.scene.kind === 'combat') {
        const e = S.scene.enemy;
        assert(e.hp > 0 && Number.isFinite(e.hp), 'combat with dead enemy');
    }
}

function playRun(seed) {
    let S = Engine.newRun({ seed });
    let actions = 0;
    while (!S.over) {
        const action = botAction(S);
        Engine.act(S, action);
        actions++;
        checkInvariants(S);
        // Round-trip through JSON as the browser save does.
        if (actions % 7 === 0) S = JSON.parse(JSON.stringify(S));
        if (actions > MAX_ACTIONS) throw new Error(`Run ${seed} soft-locked in ${S.scene.kind}`);
    }
    return { S, actions };
}

// ---- Determinism -------------------------------------------------------------
{
    const a = playRunSeeded(42);
    const b = playRunSeeded(42);
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b), 'same seed and actions must give the same run');
}

function playRunSeeded(seed) {
    const S = Engine.newRun({ seed });
    Engine.act(S, { type: 'choose', index: 0 });
    for (let i = 0; i < 30 && !S.over; i++) {
        const sc = S.scene;
        if (sc.kind === 'doors') Engine.act(S, { type: 'door', index: 0 });
        else if (sc.kind === 'combat') Engine.act(S, { type: 'attack' });
        else if (sc.kind === 'event') Engine.act(S, { type: 'option', index: sc.options.length - 1 });
        else if (sc.kind === 'shop') Engine.act(S, { type: 'leave' });
        else if (sc.kind === 'levelup') Engine.act(S, { type: 'advance', id: sc.choices[0] });
        else if (sc.kind === 'test') Engine.act(S, { type: 'test', choice: 'accept' });
        else if (sc.kind === 'extract') Engine.act(S, { type: 'climb' });
    }
    return { hero: S.hero, log: S.log };
}

// ---- Every event option and item resolves without throwing -------------------
{
    DATA.EVENTS.forEach(ev => {
        ev.options.forEach((_, i) => {
            for (let seed = 1; seed <= 20; seed++) {
                const S = Engine.newRun({ seed });
                Engine.act(S, { type: 'choose', index: 0 });
                S.hero.credits = 50;
                S.hero.pack.push({ id: 'redStim' });
                S.scene = { kind: 'event', category: 'strange', title: ev.title, text: ev.text, icon: ev.icon, options: ev.options };
                Engine.act(S, { type: 'option', index: i });
                checkInvariants(S);
            }
        });
    });
    DATA.ITEMS.filter(i => i.kind === 'consumable').forEach(item => {
        const S = Engine.newRun({ seed: 7 });
        Engine.act(S, { type: 'choose', index: 0 });
        S.hero.pack.push({ id: item.id });
        const idx = S.hero.pack.length - 1;
        if (item.use === 'combat') {
            S.scene = { kind: 'doors', doors: [{ type: 'threat', enemy: 'moonGolem' }, { type: 'salvage' }] };
            Engine.act(S, { type: 'door', index: 0 });
            if (S.scene.kind === 'combat') Engine.act(S, { type: 'use', index: S.hero.pack.findIndex(p => p.id === item.id) });
        } else {
            Engine.act(S, { type: 'use', index: idx });
        }
        checkInvariants(S);
    });
}

// ---- Fuzz: random (often silly) actions must never crash or corrupt state ------
{
    const pickOne = list => list[Math.floor(Math.random() * list.length)];
    for (let seed = 1; seed <= 400; seed++) {
        let S = Engine.newRun({ seed });
        for (let i = 0; i < 400 && !S.over; i++) {
            const sc = S.scene;
            const n = S.hero ? S.hero.pack.length : 0;
            const generic = n ? [
                { type: 'use', index: Math.floor(Math.random() * n) },
                { type: 'equip', index: Math.floor(Math.random() * n) },
                { type: 'drop', index: Math.floor(Math.random() * n) }
            ] : [];
            const specific = {
                choose: () => [{ type: 'choose', index: Math.floor(Math.random() * 3) }],
                doors: () => [{ type: 'door', index: Math.floor(Math.random() * sc.doors.length) }, { type: 'door', index: 0 }, { type: 'extract' }],
                event: () => sc.options.map((_, idx) => ({ type: 'option', index: idx })),
                test: () => [{ type: 'test', choice: pickOne(['push', 'reroll', 'accept']) }],
                combat: () => ['attack', 'push', 'brace', 'flee', 'parley'].map(type => ({ type })),
                shop: () => [{ type: 'buy', index: Math.floor(Math.random() * sc.stock.length) }, { type: 'sell', index: 0 }, { type: 'leave' }],
                levelup: () => [{ type: 'advance', id: pickOne(sc.choices) }],
                extract: () => [{ type: 'climb' }]
            }[sc.kind]();
            Engine.act(S, pickOne(Math.random() < 0.75 ? specific : [...specific, ...generic, { type: 'unequip', slot: 'armor' }]));
            checkInvariants(S);
            if (i % 5 === 0) S = JSON.parse(JSON.stringify(S));
        }
    }
}

// ---- Bulk runs ---------------------------------------------------------------
const stats = { won: 0, aborted: 0, died: 0, rooms: 0, actions: 0, depth: [0, 0, 0, 0], level: 0, causes: {}, credits: 0, bossFights: 0, killers: {} };
for (let i = 0; i < RUNS; i++) {
    const { S, actions } = playRun(1000 + i);
    const end = S.scene;
    stats.actions += actions;
    stats.rooms += S.stats.rooms;
    stats.depth[S.stats.maxDepth] += 1;
    stats.level += S.hero.level;
    if (end.won) stats.won++;
    else if (end.extracted) stats.aborted++;
    else {
        stats.died++;
        stats.causes[end.pool || 'other'] = (stats.causes[end.pool || 'other'] || 0) + 1;
        const killer = end.cause.split('—')[1]?.trim().replace(/\.$/, '') || '?';
        stats.killers[killer] = (stats.killers[killer] || 0) + 1;
    }
    if (end.extracted) stats.credits += S.hero.credits;
}

const p = n => `${((n / RUNS) * 100).toFixed(1)}%`;
console.log(`Runs: ${RUNS}`);
console.log(`Won ${p(stats.won)} · aborted ${p(stats.aborted)} · died ${p(stats.died)}`);
console.log(`Avg rooms ${(stats.rooms / RUNS).toFixed(1)} · avg taps ${(stats.actions / RUNS).toFixed(1)} · avg level ${(stats.level / RUNS).toFixed(2)}`);
console.log(`Max depth reached: d1 ${p(stats.depth[1])} · d2 ${p(stats.depth[2])} · d3 ${p(stats.depth[3])}`);
console.log(`Deaths by pool: ${JSON.stringify(stats.causes)}`);
if (VERBOSE) {
    console.log('Top killers:', Object.entries(stats.killers).sort((a, b) => b[1] - a[1]).slice(0, 12));
    console.log(`Avg credits on extraction: ${(stats.credits / Math.max(1, stats.won + stats.aborted)).toFixed(1)}`);
}

// Loose balance guard-rails so a data change can't silently break the game.
assert(stats.won / RUNS > 0.05, 'win rate collapsed');
assert(stats.died / RUNS > 0.15, 'game became toothless');
assert(stats.depth[3] / RUNS > 0.15, 'too few runs reach depth 3');
console.log('All simulation checks passed.');
