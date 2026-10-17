// =============================================================================
// DARK FORT: MOON DEVILS — RULES ENGINE
// Pure game logic: no DOM. State is plain JSON (saved after every action).
// Every action fills `S.beats` with what happened, for the UI to animate.
// =============================================================================

/* eslint-disable no-var */
if (typeof module !== 'undefined' && typeof ENEMIES === 'undefined') {
    Object.assign(globalThis, require('./game-data.js'));
}

const Engine = (() => {
    const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));
    const RELIC = Object.fromEntries(RELICS.map(r => [r.id, r]));
    const ENEMY = Object.fromEntries(ENEMIES.map(e => [e.id, e]));
    const EVENT = Object.fromEntries(EVENTS.map(e => [e.id, e]));
    const BG = Object.fromEntries(BACKGROUNDS.map(b => [b.id, b]));
    const ADV = Object.fromEntries(ADVANCEMENTS.map(a => [a.id, a]));
    const MISSION = Object.fromEntries(MISSIONS.map(m => [m.id, m]));

    // -------------------------------------------------------------------------
    // RNG (mulberry32, state stored in S.rng so runs are seedable and resumable)
    // -------------------------------------------------------------------------

    function rand(S) {
        S.rng = (S.rng + 0x6D2B79F5) >>> 0;
        let t = S.rng;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    function die(S, sides) {
        return Math.floor(rand(S) * sides) + 1;
    }

    function pick(S, list) {
        return list[Math.floor(rand(S) * list.length)];
    }

    function weighted(S, entries) {
        const total = entries.reduce((sum, [, w]) => sum + w, 0);
        let r = rand(S) * total;
        for (const [value, w] of entries) {
            r -= w;
            if (r < 0) return value;
        }
        return entries[entries.length - 1][0];
    }

    function shuffle(S, list) {
        const out = list.slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(rand(S) * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }

    function tokens(expr) {
        return String(expr).replace(/\s+/g, '').match(/[+-]?(\d*d\d+|\d+)/g) || [];
    }

    // Roll an expression like "2d4+1", "-d4", "7+d6".
    function roll(S, expr) {
        return tokens(expr).reduce((sum, tok) => {
            const sign = tok.startsWith('-') ? -1 : 1;
            const t = tok.replace(/^[+-]/, '');
            if (!t.includes('d')) return sum + sign * Number(t);
            const [c, s] = t.split('d');
            let total = 0;
            for (let i = 0; i < (c ? Number(c) : 1); i++) total += die(S, Number(s));
            return sum + sign * total;
        }, 0);
    }

    function exprRange(expr) {
        return tokens(expr).reduce(([lo, hi], tok) => {
            const sign = tok.startsWith('-') ? -1 : 1;
            const t = tok.replace(/^[+-]/, '');
            if (!t.includes('d')) return [lo + sign * Number(t), hi + sign * Number(t)];
            const [c, s] = t.split('d');
            const n = c ? Number(c) : 1;
            return sign > 0 ? [lo + n, hi + n * Number(s)] : [lo - n * Number(s), hi - n];
        }, [0, 0]);
    }

    // -------------------------------------------------------------------------
    // SMALL HELPERS
    // -------------------------------------------------------------------------

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const hasAdv = (S, id) => S.hero.advancements.includes(id);
    const hasRelic = (S, id) => S.hero.relics.includes(id);
    const hasGear = (S, id) => S.hero.pack.some(p => p.id === id);
    const perk = (S, id) => BG[S.hero.bg].perk === id;
    const weapon = S => ITEM[S.hero.weapon] || ITEM.fists;
    const armor = S => ITEM[S.hero.armor] || null;
    const mission = S => MISSION[S.mission];
    const carrying = S => S.target && !S.over;

    function beat(S, b) {
        S.beats.push(b);
    }

    function say(S, text) {
        S.log.push(text);
        if (S.log.length > 120) S.log.splice(0, S.log.length - 120);
    }

    function packSlots(S) {
        return GAME_RULES.packSlots + (perk(S, 'packMule') ? 3 : 0);
    }

    function overweight(S) {
        return Math.max(0, S.hero.pack.length - packSlots(S));
    }

    function xpToNext(S) {
        return GAME_RULES.xpBase + GAME_RULES.xpStep * S.hero.level;
    }

    function testNeed(S, pool) {
        if (pool === 'luck') return 4;
        const cur = S.hero.pools[pool].cur;
        return TEST_TARGETS.find(t => cur >= t.min).need;
    }

    function testBonus(S, pool) {
        let b = 0;
        if (pool === 'body' && weapon(S).id === 'pryHammer') b += 1;
        if (pool === 'body' && hasGear(S, 'climbingLine')) b += 1;
        if (pool === 'soul' && perk(S, 'faith')) b += 1;
        if (pool === 'mind' && perk(S, 'static')) b += 1;
        if (pool === 'mind' && hasAdv(S, 'coldMind')) b += 1;
        if (pool === 'soul' && hasAdv(S, 'oldSoul')) b += 1;
        if (S.hero.status.cursed && pool !== 'luck') b -= 1;
        return b;
    }

    function testChance(S, pool) {
        const need = testNeed(S, pool);
        const bonus = testBonus(S, pool);
        let wins = 0;
        for (let r = 1; r <= 6; r++) if (r + bonus >= need) wins++;
        return wins / 6;
    }

    function roomCost(S) {
        let cost = 1 + overweight(S);
        if (S.hero.status.breached) cost += 1;
        if (carrying(S) && mission(S).twist === 'hot') cost += 1;
        return cost;
    }

    function climbCost(S) {
        let cost = GAME_RULES.extractionO2;
        if (hasAdv(S, 'exitSaint')) cost -= 1;
        if (hasGear(S, 'prayerWire')) cost -= 1;
        cost = Math.max(1, cost);
        if (S.hero.status.breached) cost += 1;
        return cost;
    }

    function extractionMod(S) {
        let m = 0;
        if (hasGear(S, 'climbingLine')) m += 1;
        if (hasAdv(S, 'exitSaint')) m += 1;
        if (S.hero.status.cursed) m -= 1;
        if (carrying(S) && mission(S).twist === 'heavy') m -= 1;
        return m;
    }

    function escapeCost(S) {
        return climbCost(S) * S.depth;
    }

    // -------------------------------------------------------------------------
    // POOLS, DAMAGE, DEATH
    // -------------------------------------------------------------------------

    function heal(S, pool, amount) {
        if (pool === 'all') {
            POOLS.forEach(p => heal(S, p, amount));
            return;
        }
        if (pool === 'lowest') {
            pool = POOLS.reduce((lo, p) => {
                const a = S.hero.pools[p];
                const b = S.hero.pools[lo];
                return a.cur / a.max < b.cur / b.max ? p : lo;
            }, 'body');
        }
        const p = S.hero.pools[pool];
        const before = p.cur;
        p.cur = clamp(p.cur + amount, 0, p.max);
        const gained = p.cur - before;
        if (gained > 0) {
            beat(S, { t: 'heal', pool, amount: gained });
            say(S, `+${gained} ${POOL_LABELS[pool]}.`);
        }
    }

    function hurt(S, pool, amount, { armorApplies = true, source = '' } = {}) {
        if (S.dead || amount <= 0) return 0;
        let dmg = amount;
        const suit = armor(S);
        if (armorApplies && suit?.protects === pool) {
            dmg = Math.max(0, dmg - 1);
            if (dmg < amount) beat(S, { t: 'msg', text: `${suit.name} absorbs 1.`, tone: 'info' });
        }
        if (dmg <= 0) {
            beat(S, { t: 'block' });
            return 0;
        }
        if (pool === 'o2') {
            const o2 = S.hero.pools.o2;
            const fromO2 = Math.min(o2.cur, dmg);
            o2.cur -= fromO2;
            if (fromO2) beat(S, { t: 'dmg', pool: 'o2', amount: fromO2, source });
            S.stats.damageTaken += fromO2;
            say(S, `${source ? source + ': ' : ''}−${fromO2} Oxygen.`);
            if (dmg > fromO2) return fromO2 + hurt(S, 'body', dmg - fromO2, { armorApplies: false, source: 'Suffocating' });
            return fromO2;
        }
        const p = S.hero.pools[pool];
        p.cur = Math.max(0, p.cur - dmg);
        S.stats.damageTaken += dmg;
        beat(S, { t: 'dmg', pool, amount: dmg, source });
        say(S, `${source ? source + ': ' : ''}−${dmg} ${POOL_LABELS[pool]}.`);
        checkDeath(S, source);
        return dmg;
    }

    function spendO2(S, amount, reason) {
        if (amount <= 0) return;
        const o2 = S.hero.pools.o2;
        const paid = Math.min(o2.cur, amount);
        o2.cur -= paid;
        if (paid) beat(S, { t: 'o2', amount: paid, reason });
        const short = amount - paid;
        if (short > 0) {
            hurt(S, 'body', short, { armorApplies: false, source: 'Suffocating' });
        }
    }

    function checkDeath(S, source) {
        if (S.dead) return;
        const failing = POOLS.find(p => S.hero.pools[p].cur <= 0);
        if (!failing) return;
        const pool = S.hero.pools[failing];
        if (S.hero.status.blessed) {
            S.hero.status.blessed = false;
            pool.cur = 1;
            beat(S, { t: 'saved', text: 'Your blessing breaks instead of you.' });
            say(S, 'Blessing spent: you hold on at 1.');
            return;
        }
        if (hasAdv(S, 'lastBreath') && !S.used.lastBreath) {
            S.used.lastBreath = true;
            pool.cur = 1;
            beat(S, { t: 'saved', text: 'Last Breath. You refuse to die here.' });
            say(S, 'Last Breath holds you at 1.');
            return;
        }
        if (hasRelic(S, 'drownedBell') && !S.used.drownedBell) {
            S.used.drownedBell = true;
            pool.cur = Math.min(5, pool.max);
            beat(S, { t: 'saved', text: 'The Bell of the Drowned tolls. You are pulled back.' });
            say(S, 'The Bell of the Drowned restores you.');
            return;
        }
        const causes = {
            body: 'Your body gave out',
            mind: 'Your mind went quiet and did not come back',
            soul: 'Your soul slipped out through the visor'
        };
        die_(S, `${causes[failing]}${source ? ` — ${source}` : ''}.`, failing);
    }

    // -------------------------------------------------------------------------
    // CREDITS, XP, ITEMS, RELICS, STATUS
    // -------------------------------------------------------------------------

    function gainCredits(S, amount) {
        if (amount <= 0) return;
        let n = amount;
        if (hasRelic(S, 'aitvarasFeather')) n += 2;
        if (carrying(S)) n *= GAME_RULES.greedMultiplier;
        S.hero.credits += n;
        S.stats.creditsFound += n;
        beat(S, { t: 'credits', amount: n });
        say(S, `+${n} credits.`);
    }

    function gainXp(S, n) {
        if (n <= 0) return;
        S.hero.xp += n;
        beat(S, { t: 'xp', amount: n });
    }

    function pickItemId(S, tag) {
        if (ITEM[tag]) return tag;
        const pool = ITEMS.filter(i => !i.hidden);
        if (tag === 'consumable') return pick(S, pool.filter(i => i.kind === 'consumable')).id;
        if (tag === 'medical') return pick(S, pool.filter(i => i.medical)).id;
        if (['weapon', 'gear', 'armor'].includes(tag)) {
            const list = pool.filter(i => i.kind === tag && (tag !== 'weapon' || !i.rare || S.depth >= 2));
            return pick(S, list).id;
        }
        const kind = weighted(S, [['consumable', 50], ['gear', 18], ['weapon', 17], ['armor', 15]]);
        if (kind === 'weapon' && S.depth >= 2 && rand(S) < 0.35) {
            return pick(S, pool.filter(i => i.rare)).id;
        }
        return pickItemId(S, kind);
    }

    function gainItem(S, id) {
        const def = ITEM[id];
        if (!def) return;
        const entry = { id };
        if (def.charges) entry.charges = def.charges;
        // An empty hand or suit slot takes it straight away.
        if (def.kind === 'weapon' && !S.hero.weapon) {
            S.hero.weapon = id;
        } else if (def.kind === 'armor' && !S.hero.armor) {
            S.hero.armor = id;
        } else {
            S.hero.pack.push(entry);
        }
        beat(S, { t: 'item', id, name: def.name });
        say(S, `Found ${def.name}.`);
    }

    function gainRelic(S, id = null) {
        const options = RELICS.filter(r => !hasRelic(S, r.id));
        if (!options.length) {
            gainCredits(S, 15);
            return;
        }
        const relic = id ? RELIC[id] : pick(S, options);
        S.hero.relics.push(relic.id);
        beat(S, { t: 'relic', id: relic.id, name: relic.name });
        say(S, `Relic: ${relic.name}. ${relic.text}`);
        if (relic.onGain) applyEffects(S, relic.onGain);
        S.stats.bestRelics = Math.max(S.stats.bestRelics, S.hero.relics.length);
    }

    function loseRandomItem(S) {
        if (!S.hero.pack.length) {
            const lost = Math.min(S.hero.credits, roll(S, 'd6'));
            S.hero.credits -= lost;
            if (lost) beat(S, { t: 'lose', name: `${lost} credits` });
            return;
        }
        const idx = Math.floor(rand(S) * S.hero.pack.length);
        const [entry] = S.hero.pack.splice(idx, 1);
        beat(S, { t: 'lose', name: ITEM[entry.id].name });
        say(S, `Lost ${ITEM[entry.id].name}.`);
    }

    function setStatus(S, name, on) {
        if (on && name === 'cursed' && hasRelic(S, 'sauleMedallion')) {
            beat(S, { t: 'msg', text: 'The Saulė medallion burns the curse away.', tone: 'good' });
            return;
        }
        if (on && name === 'breached' && armor(S)?.noBreach) {
            beat(S, { t: 'msg', text: 'The sealant rig foams shut.', tone: 'good' });
            return;
        }
        if (Boolean(S.hero.status[name]) === on) return;
        S.hero.status[name] = on;
        beat(S, { t: 'status', name, on });
        say(S, on ? `You are ${name}.` : `No longer ${name}.`);
    }

    function changeMax(S, pool, n) {
        const p = S.hero.pools[pool];
        p.max = Math.max(1, p.max + n);
        if (n > 0) p.cur += n;
        p.cur = Math.min(p.cur, p.max);
        beat(S, { t: 'max', pool, amount: n });
        say(S, `${n > 0 ? '+' : ''}${n} max ${POOL_LABELS[pool]}.`);
        checkDeath(S, 'withered');
    }

    // -------------------------------------------------------------------------
    // EFFECT DSL
    // -------------------------------------------------------------------------

    function applyEffects(S, effects = []) {
        for (const [op, a, b] of effects) {
            if (S.dead) return;
            switch (op) {
                case 'xp': gainXp(S, a); break;
                case 'credits': gainCredits(S, roll(S, a)); break;
                case 'o2': {
                    const n = roll(S, a);
                    if (n >= 0) heal(S, 'o2', n);
                    else spendO2(S, -n, 'lost air');
                    break;
                }
                case 'heal': heal(S, a, roll(S, b)); break;
                case 'dmg': hurt(S, a, roll(S, b), { armorApplies: false, source: S.scene?.title || '' }); break;
                case 'maxPool': changeMax(S, a, b); break;
                case 'item': gainItem(S, pickItemId(S, a)); break;
                case 'relic': gainRelic(S); break;
                case 'loseItem': loseRandomItem(S); break;
                case 'status': setStatus(S, a, b); break;
                case 'reveal': S.revealNext = true; break;
                case 'flag':
                    S.flags[a] = true;
                    beat(S, { t: 'msg', text: 'Your weapon hums with captured thunder.', tone: 'good' });
                    break;
                case 'fight': {
                    const after = S.context === 'extract' ? 'extract' : 'doors';
                    if (ENEMY[a]) startCombat(S, a, { after });
                    else startCombat(S, rollEnemy(S, a), { after });
                    break;
                }
                default: break;
            }
        }
    }

    // -------------------------------------------------------------------------
    // RUN SETUP
    // -------------------------------------------------------------------------

    function rollCandidate(S, bg) {
        const pools = {};
        ['body', 'mind', 'soul', 'o2'].forEach(p => {
            pools[p] = Math.max(3, roll(S, BASE_POOLS[p]) + (bg.mods[p] || 0));
        });
        return {
            bg: bg.id,
            name: `${pick(S, PLAYER_NAMES)} ${pick(S, PLAYER_EPITHETS)}`,
            pools
        };
    }

    function newRun({ seed = Math.floor(Math.random() * 2 ** 32), daily = null } = {}) {
        const S = {
            v: GAME_RULES.version,
            seed: seed >>> 0,
            rng: seed >>> 0,
            daily,
            beats: [],
            log: [],
            depth: 1,
            roomsAtDepth: 0,
            roomNo: 0,
            target: false,
            payout: 0,
            dead: false,
            over: false,
            context: 'doors',
            flags: {},
            used: {},
            perDepth: {},
            seenEvents: [],
            path: [],
            stats: { kills: 0, eliteKills: 0, bossKills: 0, rooms: 0, creditsFound: 0, damageTaken: 0, maxDepth: 1, bestRelics: 0 },
            hero: null,
            mission: null,
            scene: null,
            outcome: null,
            lastDoors: null
        };
        S.mission = pick(S, MISSIONS).id;
        const bgs = shuffle(S, BACKGROUNDS).slice(0, 3);
        S.scene = { kind: 'choose', candidates: bgs.map(bg => rollCandidate(S, bg)) };
        return S;
    }

    function startHero(S, candidate) {
        const bg = BG[candidate.bg];
        const pools = {};
        Object.entries(candidate.pools).forEach(([p, v]) => { pools[p] = { cur: v, max: v }; });
        S.hero = {
            name: candidate.name,
            bg: bg.id,
            pools,
            credits: 0,
            xp: 0,
            level: 0,
            advancements: [],
            weapon: bg.weapon,
            armor: bg.armor,
            pack: [],
            relics: [],
            status: { breached: false, cursed: false, blessed: bg.perk === 'faith' }
        };
        S.hero.credits = bg.credits + roll(S, 'd6');
        bg.kit.forEach(id => {
            const entry = { id };
            if (ITEM[id].charges) entry.charges = ITEM[id].charges;
            S.hero.pack.push(entry);
        });
        const m = mission(S);
        say(S, `${S.hero.name}, ${bg.name}, takes the contract: ${m.briefing}.`);
        S.outcome = {
            title: m.briefing,
            text: `${m.target}. It waits in the Vault at the bottom of the base. ${DEPTHS[0].blurb}`,
            icon: 'locked-door',
            tone: 'info',
            banner: 1
        };
        S.scene = { kind: 'doors', doors: makeDoors(S, true) };
    }

    // -------------------------------------------------------------------------
    // DOORS
    // -------------------------------------------------------------------------

    function rollEnemy(S, tier) {
        if (tier === 'weak' || tier === 'tough') {
            return pick(S, ENEMIES.filter(e => e.tier === tier && e.id !== 'reflection')).id;
        }
        return rollEnemy(S, rollThreatTier(S));
    }

    function rollThreatTier(S) {
        const toughChance = [S.roomsAtDepth >= 2 ? 1 / 6 : 0, 3 / 6, 4 / 6][S.depth - 1];
        return rand(S) < toughChance ? 'tough' : 'weak';
    }

    function rollDoorContents(S, type) {
        const door = { type };
        if (type === 'threat' || type === 'elite') {
            door.enemy = rollEnemy(S, rollThreatTier(S));
            if (type === 'elite') door.affix = pick(S, ELITE_AFFIXES).id;
        } else if (type === 'strange') {
            const options = EVENTS.filter(e => e.minDepth <= S.depth);
            const fresh = options.filter(e => !S.seenEvents.includes(e.id));
            door.event = pick(S, fresh.length ? fresh : options).id;
        } else if (type === 'shrine') {
            door.shrine = pick(S, SHRINE_TYPES).id;
        } else if (type === 'dark') {
            const inner = weighted(S, [['threat', 34], ['elite', 10], ['salvage', 20], ['strange', 22], ['shrine', 8], ['peddler', 6]]);
            door.inner = rollDoorContents(S, inner);
        }
        return door;
    }

    function makeDoors(S, first = false) {
        const count = first ? 2 : (rand(S) < 0.35 ? 3 : 2);
        const doors = [];
        const liftMin = GAME_RULES.liftMinRooms - (perk(S, 'pathfinder') ? 1 : 0);
        const liftSure = GAME_RULES.liftGuaranteedRooms - (perk(S, 'pathfinder') ? 1 : 0);
        const special = S.depth < GAME_RULES.depths ? 'lift' : (!S.target ? 'vault' : null);
        if (special && S.roomsAtDepth >= liftMin && (S.roomsAtDepth >= liftSure || rand(S) < 0.5)) {
            doors.push({ type: special });
        }
        const di = S.depth - 1;
        const hunted = carrying(S) && mission(S).twist === 'hunted';
        while (doors.length < count) {
            const entries = Object.entries(DOOR_TYPES)
                .map(([type, def]) => {
                    let w = def.weights[di];
                    if (type === 'threat' && hunted) w *= 2;
                    if (type === 'peddler' && doors.some(d => d.type === 'peddler')) w = 0;
                    if (first && (type === 'elite' || type === 'peddler')) w = 0;
                    return [type, w];
                })
                .filter(([, w]) => w > 0);
            doors.push(rollDoorContents(S, weighted(S, entries)));
        }
        const out = shuffle(S, doors);
        if (S.revealNext) {
            out.forEach(d => { d.revealed = true; });
            S.revealNext = false;
        }
        return out;
    }

    // What the player can see on a door.
    function doorView(S, door) {
        const def = DOOR_TYPES[door.type];
        const allSeeing = hasRelic(S, 'moonEye') || door.revealed;
        const scanner = hasGear(S, 'tubeScanner');
        let view = { type: door.type, label: def.label, icon: def.icon, hint: def.hint, detail: '' };
        let actual = door;
        if (door.type === 'dark' && (allSeeing || scanner || perk(S, 'pathfinder'))) {
            actual = door.inner;
            const inner = DOOR_TYPES[actual.type];
            view = { type: actual.type, label: inner.label, icon: inner.icon, hint: `${inner.hint} (+1 XP)`, detail: '', wasDark: true };
        }
        if (allSeeing || (scanner && (actual.type === 'threat' || actual.type === 'elite'))) {
            view.detail = contentsName(actual);
        }
        if (door.type === 'vault') view.detail = ENEMY[mission(S).boss].name;
        if (door.fled) view.fled = true;
        return view;
    }

    function contentsName(door) {
        if (door.enemy) {
            const affix = door.affix ? ELITE_AFFIXES.find(a => a.id === door.affix).name + ' ' : '';
            return affix + ENEMY[door.enemy].name;
        }
        if (door.event) return EVENT[door.event].title;
        if (door.shrine) return SHRINE_TYPES.find(s => s.id === door.shrine).title;
        if (door.type === 'salvage') return 'A cache';
        if (door.type === 'peddler') return 'Void Peddler';
        return '';
    }

    function enterDoor(S, index) {
        const door = S.scene.doors[index];
        if (!door || door.fled) return;
        S.lastDoors = S.scene.doors;
        S.lastDoorIndex = index;
        S.outcome = null;

        spendO2(S, roomCost(S), 'room');
        if (S.dead) return;

        S.roomNo += 1;
        S.stats.rooms += 1;
        if (door.type !== 'lift' && door.type !== 'vault') S.roomsAtDepth += 1;
        gainXp(S, 1);

        const actual = door.type === 'dark' ? door.inner : door;
        if (door.type === 'dark') gainXp(S, 1);
        S.path.push({ d: S.depth, t: actual.type, dark: door.type === 'dark' });

        twistTick(S);
        if (S.dead) return;

        switch (actual.type) {
            case 'threat':
            case 'elite':
                startCombat(S, actual.enemy, { after: 'doors', affix: actual.affix });
                break;
            case 'salvage': openSalvage(S); break;
            case 'strange': openEvent(S, actual.event); break;
            case 'shrine': openShrine(S, actual.shrine); break;
            case 'peddler': openShop(S); break;
            case 'lift': descend(S); break;
            case 'vault':
                S.outcome = null;
                startCombat(S, mission(S).boss, { after: 'vault' });
                break;
            default: afterRoom(S);
        }
    }

    function twistTick(S) {
        if (!carrying(S)) return;
        const twist = mission(S).twist;
        if (twist === 'haunted' && die(S, 6) <= 2) hurt(S, 'soul', 1, { armorApplies: false, source: 'The target whispers' });
        if (twist === 'chatty' && die(S, 6) <= 2) hurt(S, 'mind', 1, { armorApplies: false, source: 'The AI will not stop talking' });
    }

    function descend(S) {
        S.depth += 1;
        S.roomsAtDepth = 0;
        S.perDepth = {};
        S.stats.maxDepth = Math.max(S.stats.maxDepth, S.depth);
        gainXp(S, 2);
        beat(S, { t: 'descend', depth: S.depth });
        const d = DEPTHS[S.depth - 1];
        say(S, `Descended to Depth ${S.depth}: ${d.name}.`);
        if (hasRelic(S, 'ryeSeed')) heal(S, 'all', 2);
        // Every lift car keeps an emergency locker: diving deeper buys a little air.
        heal(S, 'o2', roll(S, 'd4'));
        S.outcome = { title: d.name, text: `${d.blurb} The lift's emergency locker still holds air.`, icon: 'stairs', tone: 'info', banner: S.depth };
        afterRoom(S);
    }

    // After a room resolves: fresh doors (unless a fight or extraction took over).
    function afterRoom(S) {
        if (S.dead || S.over) return;
        if (S.scene && (S.scene.kind === 'combat' || S.scene.kind === 'test')) return;
        if (S.context === 'extract') {
            S.scene = S.extractScene;
            continueExtraction(S);
            return;
        }
        S.scene = { kind: 'doors', doors: makeDoors(S) };
        maybeLevelUp(S);
    }

    // -------------------------------------------------------------------------
    // EVENTS (Strange rooms, Salvage, Shrines all share this machinery)
    // -------------------------------------------------------------------------

    function openEvent(S, eventId) {
        const ev = EVENT[eventId];
        if (!S.seenEvents.includes(eventId)) S.seenEvents.push(eventId);
        if (perk(S, 'static')) gainXp(S, 2);
        S.scene = {
            kind: 'event',
            category: 'strange',
            title: ev.title,
            text: ev.text,
            icon: ev.icon,
            options: ev.options
        };
    }

    function openSalvage(S) {
        const base = roll(S, `d6+${S.depth * 2}`) + (hasAdv(S, 'scavenger') ? 3 : 0);
        S.scene = {
            kind: 'event',
            category: 'salvage',
            title: 'Salvage',
            text: pick(S, SALVAGE_FLAVOR),
            icon: 'open-chest',
            options: [
                { label: 'Grab and go', sub: `+${base} credits`, effects: [['credits', String(base)]], text: 'Quick hands, full pockets.' },
                { label: 'Search thoroughly', test: 'mind',
                  success: [['credits', String(base)], ['item', 'random']],
                  fail: [['credits', String(base)], ['dmg', 'body', 'd4']],
                  successText: 'Behind a false panel: something useful.',
                  failText: 'A booby-trap snaps shut on your glove.' }
            ]
        };
    }

    function openShrine(S, shrineId) {
        const shrine = SHRINE_TYPES.find(s => s.id === shrineId);
        const bonus = hasRelic(S, 'sauleMedallion') ? '+2' : '';
        const options = {
            chapel: [
                { label: 'Rest', sub: `+d4+2${bonus} Body`, effects: [['heal', 'body', `d4+2${bonus}`]], text: 'You sleep sitting up. It is enough.' },
                { label: 'Meditate', sub: `+d4+2${bonus} Mind`, effects: [['heal', 'mind', `d4+2${bonus}`]], text: 'The candle flames slow down to watch you.' },
                { label: 'Pray', sub: `+d4+2${bonus} Soul, lift curses`, effects: [['heal', 'soul', `d4+2${bonus}`], ['status', 'cursed', false]], text: 'Saulė hears. She always hears.' }
            ],
            airlock: [
                { label: 'Cycle fresh air', sub: `+d4+2${bonus} Oxygen`, effects: [['o2', `d4+2${bonus}`]], text: 'Hiss, clunk, breathe.' },
                { label: 'Patch and rest', sub: `Repair breach, +d4${bonus} to your lowest`, effects: [['status', 'breached', false], ['heal', 'lowest', `d4${bonus}`]], text: 'You tape the seams and close your eyes.' }
            ],
            infirmary: [
                { label: 'Patch up', sub: `+d6+1${bonus} Body`, effects: [['heal', 'body', `d6+1${bonus}`]], text: 'Stitches, staples, prayers.' },
                { label: 'Sleep it off', sub: `+d4${bonus} Mind and Soul, −1 O2`, effects: [['o2', '-1'], ['heal', 'mind', `d4${bonus}`], ['heal', 'soul', `d4${bonus}`]], text: 'You dream of rye fields.' }
            ]
        }[shrineId];
        S.scene = { kind: 'event', category: 'shrine', title: shrine.title, text: shrine.text, icon: shrine.icon, options };
    }

    function optionBlocked(S, opt) {
        if (opt.req?.item && !hasGear(S, opt.req.item)) return `Needs ${ITEM[opt.req.item].name}`;
        if (opt.cost?.credits && S.hero.credits < opt.cost.credits) return `Needs ${opt.cost.credits} credits`;
        if (opt.cost?.consumable && !S.hero.pack.some(p => ITEM[p.id].kind === 'consumable')) return 'Needs a consumable';
        return null;
    }

    function chooseOption(S, index) {
        const sc = S.scene;
        const opt = sc.options[index];
        if (!opt || optionBlocked(S, opt)) return;
        if (opt.cost?.credits) {
            S.hero.credits -= opt.cost.credits;
            beat(S, { t: 'spend', amount: opt.cost.credits });
        }
        if (opt.cost?.consumable) {
            const idx = S.hero.pack.findIndex(p => ITEM[p.id].kind === 'consumable');
            const [gone] = S.hero.pack.splice(idx, 1);
            beat(S, { t: 'lose', name: ITEM[gone.id].name });
        }
        const title = sc.title;
        if (opt.test) {
            runTest(S, {
                pool: opt.test,
                label: `${title}: ${opt.label}`,
                success: opt.success,
                fail: opt.fail,
                successText: opt.successText,
                failText: opt.failText,
                title,
                icon: sc.icon,
                then: 'room'
            });
            return;
        }
        S.outcome = { title, text: opt.text || '', icon: sc.icon, tone: 'info' };
        applyEffects(S, opt.effects);
        if (S.dead || S.scene !== sc) return;
        if (opt.risk) {
            const r = die(S, 6);
            const hit = r <= opt.risk[0];
            beat(S, { t: 'roll', label: `Risk ${opt.risk[0]}-in-6`, sides: 6, value: r, ok: !hit, invert: true });
            if (hit) applyEffects(S, opt.risk[1]);
        }
        if (S.dead || S.scene !== sc) return;
        afterRoom(S);
    }

    // -------------------------------------------------------------------------
    // TESTS (with push-your-luck: spend 1 O2 to push a near miss)
    // -------------------------------------------------------------------------

    function runTest(S, t) {
        const need = testNeed(S, t.pool);
        const bonus = testBonus(S, t.pool);
        const r = die(S, 6);
        let ok = r + bonus >= need;
        beat(S, { t: 'roll', label: t.label, pool: t.pool, sides: 6, value: r, bonus, need, ok });
        say(S, `${t.pool === 'luck' ? 'Luck' : POOL_LABELS[t.pool]} test: ${r}${bonus ? (bonus > 0 ? '+' : '') + bonus : ''} vs ${need} — ${ok ? 'success' : 'fail'}.`);
        if (!ok && hasRelic(S, 'laumeThread') && !S.perDepth.laumeThread) {
            S.perDepth.laumeThread = true;
            ok = true;
            beat(S, { t: 'msg', text: "Laumė's thread tugs. The failure unravels into success.", tone: 'good' });
        }
        if (ok) {
            finishTest(S, t, true);
            return;
        }
        const canPush = r + bonus === need - 1 && S.hero.pools.o2.cur > 0;
        const script = S.hero.pack.find(p => p.id === 'mirrorScript' && p.charges > 0);
        if (canPush || script) {
            S.scene = {
                kind: 'test',
                pending: { ...t, need, bonus, roll: r },
                canPush,
                canReroll: Boolean(script),
                back: S.scene,
                title: t.title,
                icon: t.icon
            };
            return;
        }
        finishTest(S, t, false);
    }

    function resolvePending(S, choice) {
        const sc = S.scene;
        const t = sc.pending;
        S.scene = sc.back;
        if (choice === 'push' && sc.canPush) {
            spendO2(S, 1, 'push');
            if (S.dead) return;
            beat(S, { t: 'msg', text: 'You push through on borrowed breath.', tone: 'good' });
            finishTest(S, t, true);
        } else if (choice === 'reroll' && sc.canReroll) {
            const script = S.hero.pack.find(p => p.id === 'mirrorScript' && p.charges > 0);
            script.charges -= 1;
            if (script.charges <= 0) S.hero.pack.splice(S.hero.pack.indexOf(script), 1);
            const r = die(S, 6);
            const ok = r + t.bonus >= t.need;
            beat(S, { t: 'roll', label: 'Mirror script reroll', pool: t.pool, sides: 6, value: r, bonus: t.bonus, need: t.need, ok });
            finishTest(S, t, ok);
        } else {
            finishTest(S, t, false);
        }
    }

    function finishTest(S, t, ok) {
        const before = S.scene;
        if (t.then === 'room') {
            S.outcome = { title: t.title, text: (ok ? t.successText : t.failText) || '', icon: t.icon, tone: ok ? 'good' : 'bad' };
        }
        applyEffects(S, ok ? t.success : t.fail);
        if (S.dead || S.scene !== before) return;
        if (t.then === 'room') {
            afterRoom(S);
        } else if (t.then === 'parley') {
            resolveParley(S, t, ok);
        } else if (t.then === 'extract') {
            continueExtraction(S);
        }
    }

    // -------------------------------------------------------------------------
    // COMBAT
    // -------------------------------------------------------------------------

    function startCombat(S, enemyId, { after = 'doors', affix = null } = {}) {
        const def = ENEMY[enemyId];
        const e = {
            id: def.id, name: def.name, kind: def.kind, tier: def.tier, def: def.def, hp: def.hp, dmg: def.dmg,
            pool: def.pool, trait: def.trait, traitText: def.traitText, sprite: def.sprite, tint: def.tint || null,
            dmgBonus: 0, hungry: false, affix: null, affixText: ''
        };
        if (enemyId === 'reflection') {
            e.dmg = weapon(S).dmg;
            e.hp = Math.max(6, Math.ceil(S.hero.pools.body.max / 2));
        }
        if (affix) {
            const a = ELITE_AFFIXES.find(x => x.id === affix);
            e.affix = a.id;
            e.affixText = `${a.name}: ${a.text}`;
            e.name = `${a.name} ${e.name}`;
            e.hp += a.hpBonus || 0;
            e.def = Math.min(5, e.def + (a.defBonus || 0));
            e.dmgBonus += a.dmgBonus || 0;
            e.hungry = Boolean(a.hungry);
        }
        e.maxHp = e.hp;
        S.scene = {
            kind: 'combat',
            enemy: e,
            round: 1,
            intent: null,
            after,
            parley: ['restless', 'salute'].includes(e.trait),
            counter: false,
            chorus: 0,
            stunned: false,
            aegis: false,
            prevScene: null
        };
        S.scene.intent = rollIntent(S, e, 1);
        say(S, `${e.name} blocks the way.`);
        beat(S, { t: 'enemy', id: e.id, name: e.name });
        if (weapon(S).ranged) {
            beat(S, { t: 'msg', text: `${weapon(S).name}: opening shot.`, tone: 'info' });
            playerAttack(S, { free: true });
            if (e.hp <= 0) winCombat(S);
        }
    }

    function rollIntent(S, e, round) {
        const r = die(S, 6);
        if (e.trait === 'targeting') return r <= 2 ? 'strike' : 'charge';
        if (e.trait === 'overcharge' && round % 3 === 0) return 'charge';
        if (r === 6) return 'guard';
        if (r >= 4) return 'charge';
        return 'strike';
    }

    function hitBonus(S, e, { push = false, round = 1 } = {}) {
        const w = weapon(S);
        let b = w.hit || 0;
        if (w.hitVs?.includes(e.kind)) b += 1;
        if (hasAdv(S, 'huntersHand')) b += 1;
        if (push) b += 1;
        if (S.scene?.intent === 'charge') b += 1;
        if (hasAdv(S, 'adrenaline') && round === 1) b += 1;
        return b;
    }

    function hitChance(S, e, opts) {
        const bonus = hitBonus(S, e, opts);
        let wins = 0;
        for (let r = 2; r <= 6; r++) if (r + bonus >= e.def) wins++;
        return wins / 6;
    }

    function damageMods(S, e, { push = false, round = 1, crit = false, free = false } = {}) {
        let add = 0;
        const w = weapon(S);
        if (w.vsMachine && e.kind === 'Machine') add += w.vsMachine;
        if (push) add += 2 + (hasAdv(S, 'breaker') ? 2 : 0);
        if (crit) add += 2;
        if (hasAdv(S, 'adrenaline') && round === 1 && !free) add += 2;
        if (S.flags.thunderblessed) add += 1;
        if (hasRelic(S, 'devilTooth')) add += 1;
        if (S.scene?.counter) add += 3;
        return add;
    }

    function playerAttack(S, { push = false, free = false } = {}) {
        const sc = S.scene;
        const e = sc.enemy;
        const w = weapon(S);
        const round = free ? 0 : sc.round;
        const r = die(S, 6);
        const bonus = hitBonus(S, e, { push, round });
        const crit = r === 6 || (hasAdv(S, 'deadeye') && r === 5);
        const hit = r !== 1 && (r + bonus >= e.def || crit);
        beat(S, { t: 'roll', label: free ? 'Opening shot' : push ? 'Push' : 'Attack', sides: 6, value: r, bonus, need: e.def, ok: hit, crit: hit && crit });
        if (hit) {
            let dmg = roll(S, w.dmg) + damageMods(S, e, { push, round, crit, free });
            if (w.twin) dmg += roll(S, w.dmg);
            if (sc.intent === 'guard' && !push && !free) dmg -= 2;
            if (e.trait === 'plated' && !w.crushing) dmg -= 1;
            dmg = Math.max(1, dmg);
            if (sc.counter) sc.counter = false;
            e.hp -= dmg;
            beat(S, { t: 'ehit', amount: dmg, crit });
            say(S, `You hit ${e.name} for ${dmg}${crit ? ' (crit)' : ''}.`);
        } else {
            beat(S, { t: 'emiss' });
            say(S, `You miss ${e.name}.`);
            if (!free) {
                if (w.missCost) hurt(S, w.missCost, 1, { armorApplies: false, source: `${w.name} kickback` });
                if (e.trait === 'static') hurt(S, 'mind', 1, { armorApplies: false, source: 'Static' });
                if (push && !hasAdv(S, 'breaker')) hurt(S, e.pool === 'o2' ? 'body' : e.pool, 1, { armorApplies: false, source: 'Overextended' });
            }
        }
        if (!free && e.hp > 0 && hasGear(S, 'droneChip')) {
            e.hp -= 1;
            beat(S, { t: 'ehit', amount: 1, drone: true });
        }
    }

    function enemyDamageRange(S, intent) {
        const sc = S.scene;
        const e = sc.enemy;
        let [lo, hi] = exprRange(e.dmg);
        const add = e.dmgBonus + (sc.chorus || 0);
        lo += add;
        hi += add;
        if (intent === 'charge') {
            const c = e.trait === 'overcharge' && sc.round % 3 === 0 ? 4 : 2;
            lo += c;
            hi += c;
        }
        if (intent === 'guard') {
            lo = 0;
            hi = 0;
        }
        if (armor(S)?.protects === e.pool) {
            lo = Math.max(0, lo - 1);
            hi = Math.max(0, hi - 1);
        }
        return [Math.max(0, lo), Math.max(0, hi)];
    }

    function enemyAct(S, braced) {
        const sc = S.scene;
        const e = sc.enemy;
        const intent = sc.intent;
        if (sc.stunned) {
            sc.stunned = false;
            beat(S, { t: 'msg', text: `${e.name} reels, blinded.`, tone: 'good' });
            return;
        }
        if (intent === 'guard') {
            const regen = e.trait === 'reboot' ? 2 : e.trait === 'eclipse' ? 3 : 0;
            if (regen && e.hp < e.maxHp) {
                const before = e.hp;
                e.hp = Math.min(e.maxHp, e.hp + regen);
                beat(S, { t: 'eheal', amount: e.hp - before });
            }
        }
        let dmg = roll(S, e.dmg) + e.dmgBonus + (sc.chorus || 0);
        if (intent === 'charge') dmg += e.trait === 'overcharge' && sc.round % 3 === 0 ? 4 : 2;
        if (intent === 'guard') dmg = 0;
        beat(S, { t: 'eact', intent });
        if (braced) {
            dmg = intent === 'charge' && !hasAdv(S, 'bulwark') ? 1 : 0;
            sc.chorus = 0;
            if (hasAdv(S, 'counter')) sc.counter = true;
            if (hasRelic(S, 'zaltysCrown')) heal(S, 'body', 1);
            if (perk(S, 'drilled')) {
                e.hp -= 1;
                beat(S, { t: 'ehit', amount: 1, riposte: true });
            }
        }
        if (sc.aegis && dmg > 0) {
            sc.aegis = false;
            dmg = 0;
            beat(S, { t: 'msg', text: 'The aegis coil flares and drinks the blow.', tone: 'good' });
        }
        if (dmg <= 0) {
            beat(S, { t: 'block' });
            say(S, `${e.name} ${braced ? 'is blocked' : 'does no harm'}.`);
            return;
        }
        const dealt = hurt(S, e.pool, dmg, { source: e.name });
        if (S.dead || dealt <= 0) return;
        if (e.trait === 'thief' && S.hero.credits > 0) {
            const stolen = Math.min(2, S.hero.credits);
            S.hero.credits -= stolen;
            beat(S, { t: 'lose', name: `${stolen} credits` });
        }
        if (e.trait === 'cutter' && e.pool === 'body') setStatus(S, 'breached', true);
        if (e.trait === 'claws') spendO2(S, 1, 'claws');
        if (e.hungry) spendO2(S, 1, 'hungry');
        if (e.trait === 'leech' && e.hp < e.maxHp) {
            e.hp += 1;
            beat(S, { t: 'eheal', amount: 1 });
        }
    }

    function combatAction(S, action, arg) {
        const sc = S.scene;
        const e = sc.enemy;
        if (action === 'flee') return flee(S);
        if (action === 'parley') return parley(S);
        let braced = false;
        if (action === 'attack' || action === 'push') {
            const push = action === 'push';
            if (push && !weapon(S).freePush) {
                spendO2(S, 1, 'push');
                if (S.dead) return;
            }
            playerAttack(S, { push });
        } else if (action === 'brace') {
            braced = true;
            beat(S, { t: 'brace' });
        } else if (action === 'use') {
            if (!useItem(S, arg)) return;
        }
        if (S.dead) return;
        sc.parley = false;
        if (e.hp <= 0) return winCombat(S);
        enemyAct(S, braced);
        if (S.dead) return;
        if (e.hp <= 0) return winCombat(S);
        sc.round += 1;
        if (e.trait === 'chorus') sc.chorus += 1;
        sc.intent = rollIntent(S, e, sc.round);
    }

    function parley(S) {
        const sc = S.scene;
        if (!sc.parley) return;
        sc.parley = false;
        const e = sc.enemy;
        runTest(S, {
            pool: 'soul',
            label: e.trait === 'restless' ? 'Lay it to rest' : 'Salute the dead',
            success: [], fail: [],
            title: e.name, icon: 'ghost', then: 'parley', trait: e.trait
        });
    }

    function resolveParley(S, t, ok) {
        const sc = S.scene;
        const e = sc.enemy;
        if (!ok) {
            beat(S, { t: 'msg', text: `${e.name} will not be soothed.`, tone: 'bad' });
            return;
        }
        if (t.trait === 'restless') {
            beat(S, { t: 'msg', text: `${e.name} powers down with a grateful sigh.`, tone: 'good' });
            winCombat(S, { peaceful: true });
        } else {
            e.hp = Math.ceil(e.hp / 2);
            beat(S, { t: 'msg', text: `${e.name} returns the salute. Half its strength leaves it.`, tone: 'good' });
        }
    }

    function flee(S) {
        const sc = S.scene;
        const e = sc.enemy;
        const cloak = armor(S)?.phase && !S.perDepth.phase;
        if (cloak) {
            S.perDepth.phase = true;
            beat(S, { t: 'msg', text: 'The phase cloak folds you out of the fight.', tone: 'good' });
        } else {
            if (!hasAdv(S, 'ghostwalker')) spendO2(S, 1, 'flee');
            let dmg = roll(S, 'd4');
            if (hasAdv(S, 'ghostwalker')) dmg = Math.floor(dmg / 2);
            hurt(S, e.pool, dmg, { source: `Fleeing ${e.name}` });
        }
        if (S.dead) return;
        say(S, `You flee from ${e.name}.`);
        if (sc.after === 'extract') {
            S.scene = S.extractScene;
            continueExtraction(S);
            return;
        }
        S.outcome = { title: 'You fled', text: `${e.name} is still back there. Pick another way.`, icon: 'run', tone: 'bad' };
        const doors = (S.lastDoors || makeDoors(S)).map((d, i) =>
            (i === S.lastDoorIndex && d.type !== 'vault' ? { ...d, fled: true } : d));
        if (doors.every(d => d.fled)) doors.push(rollDoorContents(S, 'salvage'));
        S.scene = { kind: 'doors', doors };
    }

    function winCombat(S, { peaceful = false } = {}) {
        const sc = S.scene;
        const e = sc.enemy;
        e.hp = 0;
        S.stats.kills += 1;
        if (e.affix) S.stats.eliteKills += 1;
        if (e.tier === 'boss') S.stats.bossKills += 1;
        beat(S, { t: 'kill', name: e.name, peaceful });
        say(S, `${e.name} ${peaceful ? 'is at rest' : 'is slain'}.`);

        gainXp(S, ENEMY_XP[e.tier] + (e.affix ? ENEMY_XP.eliteBonus : 0));
        if (!peaceful) {
            gainCredits(S, roll(S, ENEMY_CREDITS[e.tier]) + (e.id === 'rootDoctor' ? roll(S, '3d6') : 0));
            const w = weapon(S);
            if (w.id === 'wolfTooth') heal(S, 'soul', 1);
            if (w.killCost) hurt(S, w.killCost, 1, { armorApplies: false, source: `${w.name} feeds` });
            if (hasRelic(S, 'choirChip')) heal(S, 'mind', 1);
            if (hasAdv(S, 'butcher')) heal(S, 'body', 2);
            if (e.trait === 'hide') changeMax(S, 'o2', 2);
            if (S.dead) return;
            const chance = Math.min(1, ENEMY_LOOT_CHANCE[e.tier] * (hasAdv(S, 'scavenger') ? 2 : 1));
            if (e.tier !== 'boss' && rand(S) < chance) gainItem(S, pickItemId(S, 'random'));
            if (e.affix || e.tier === 'boss') gainRelic(S);
        }

        if (sc.after === 'extract') {
            S.scene = S.extractScene;
            continueExtraction(S);
            return;
        }
        if (sc.after === 'vault') {
            S.target = true;
            S.payout = mission(S).payout;
            beat(S, { t: 'target' });
            say(S, `Target recovered: ${mission(S).target}.`);
            S.outcome = {
                title: 'Target recovered',
                text: `${mission(S).target}. Extract now, or keep looting: every credit you find is doubled while you carry it. ${mission(S).twistText}`,
                icon: 'locked-door',
                tone: 'good'
            };
            S.scene = null;
            afterRoom(S);
            return;
        }
        S.outcome = {
            title: peaceful ? `${e.name} rests` : `${e.name} slain`,
            text: peaceful ? 'It goes quietly.' : 'The way is clear.',
            icon: 'skull-crossed-bones',
            tone: 'good',
            sprite: e.sprite
        };
        S.scene = null;
        afterRoom(S);
    }

    // -------------------------------------------------------------------------
    // ITEMS IN PLAY
    // -------------------------------------------------------------------------

    function canUse(S, entry) {
        const def = ITEM[entry.id];
        const where = S.scene.kind;
        if (def.kind === 'gear') {
            if (def.id !== 'graveBell') return false;
            return !S.perDepth.graveBell && where !== 'end';
        }
        if (def.kind !== 'consumable') return false;
        if (def.use === 'combat') return where === 'combat';
        if (def.use === 'doors') return where === 'doors';
        if (def.use === 'explore') return where !== 'combat' && where !== 'end';
        return where !== 'end' && where !== 'choose';
    }

    // Returns false if nothing happened (so combat does not consume the turn).
    function useItem(S, packIndex) {
        const entry = S.hero.pack[packIndex];
        if (!entry || !canUse(S, entry)) return false;
        const def = ITEM[entry.id];
        beat(S, { t: 'use', name: def.name });
        say(S, `Used ${def.name}.`);
        if (def.id === 'graveBell') {
            S.perDepth.graveBell = true;
            applyEffects(S, def.effects);
            return true;
        }
        S.hero.pack.splice(packIndex, 1);
        const sc = S.scene;
        if (def.stun) sc.stunned = true;
        if (def.aegis) sc.aegis = true;
        if (def.blast) {
            const dmg = roll(S, def.blast);
            sc.enemy.hp -= dmg;
            beat(S, { t: 'ehit', amount: dmg });
        }
        if (def.moonSalt && sc.kind === 'combat' && ['Ghost', 'Devil'].includes(sc.enemy.kind)) {
            const dmg = roll(S, '2d4');
            sc.enemy.hp -= dmg;
            beat(S, { t: 'ehit', amount: dmg });
        }
        if (def.reroll) {
            sc.doors = makeDoors(S);
            beat(S, { t: 'msg', text: 'The cassette hisses. The corridors rearrange.', tone: 'info' });
        }
        if (def.revealDoors) sc.doors.forEach(d => { d.revealed = true; });
        applyEffects(S, def.effects);
        return true;
    }

    function equip(S, packIndex) {
        const entry = S.hero.pack[packIndex];
        if (!entry || S.scene.kind === 'combat') return;
        const def = ITEM[entry.id];
        const slot = def.kind === 'weapon' ? 'weapon' : def.kind === 'armor' ? 'armor' : null;
        if (!slot) return;
        S.hero.pack.splice(packIndex, 1);
        const old = S.hero[slot];
        S.hero[slot] = def.id;
        if (old && old !== 'fists') S.hero.pack.push({ id: old });
        beat(S, { t: 'equip', name: def.name });
        say(S, `Equipped ${def.name}.`);
    }

    function unequip(S, slot) {
        if (S.scene.kind === 'combat' || !S.hero[slot]) return;
        S.hero.pack.push({ id: S.hero[slot] });
        S.hero[slot] = null;
    }

    function drop(S, packIndex) {
        const entry = S.hero.pack[packIndex];
        if (!entry || S.scene.kind === 'combat') return;
        S.hero.pack.splice(packIndex, 1);
        beat(S, { t: 'lose', name: ITEM[entry.id].name });
        say(S, `Dropped ${ITEM[entry.id].name}.`);
    }

    // -------------------------------------------------------------------------
    // PEDDLER
    // -------------------------------------------------------------------------

    function price(S, base) {
        return perk(S, 'haggler') ? Math.max(1, Math.ceil(base * 0.75)) : base;
    }

    function sellValue(id) {
        return Math.max(1, Math.floor((ITEM[id].price || 2) / 2));
    }

    function openShop(S) {
        const stock = [];
        if (rand(S) < 0.6) stock.push({ id: 'o2Canister' });
        while (stock.length < 4) {
            const id = pickItemId(S, 'random');
            if (!stock.some(s => s.id === id)) stock.push({ id });
        }
        stock.forEach(s => { s.price = price(S, ITEM[s.id].price); });
        if (S.depth >= 2 && rand(S) < 0.5) {
            const options = RELICS.filter(r => !hasRelic(S, r.id));
            if (options.length) stock.push({ relic: pick(S, options).id, price: price(S, 20 + 4 * S.depth) });
        }
        S.scene = { kind: 'shop', line: pick(S, PEDDLER_LINES), stock };
    }

    function buy(S, index) {
        const s = S.scene.stock[index];
        if (!s || s.sold || S.hero.credits < s.price) return;
        S.hero.credits -= s.price;
        s.sold = true;
        beat(S, { t: 'spend', amount: s.price });
        if (s.relic) gainRelic(S, s.relic);
        else gainItem(S, s.id);
    }

    function sell(S, packIndex) {
        const entry = S.hero.pack[packIndex];
        if (!entry) return;
        S.hero.pack.splice(packIndex, 1);
        const v = sellValue(entry.id);
        S.hero.credits += v;
        beat(S, { t: 'credits', amount: v });
        say(S, `Sold ${ITEM[entry.id].name} for ${v}.`);
    }

    function leaveShop(S) {
        S.outcome = { title: 'Void Peddler', text: 'The Peddler folds back into the pressure leak.', icon: 'shop', tone: 'info' };
        S.scene = null;
        afterRoom(S);
    }

    // -------------------------------------------------------------------------
    // ADVANCEMENT
    // -------------------------------------------------------------------------

    function maybeLevelUp(S) {
        if (S.dead || S.over || S.scene?.kind !== 'doors') return;
        if (S.hero.xp < xpToNext(S)) return;
        const options = shuffle(S, ADVANCEMENTS.filter(a => !hasAdv(S, a.id))).slice(0, 3);
        if (!options.length) return;
        S.scene = { kind: 'levelup', choices: options.map(a => a.id), back: S.scene };
        beat(S, { t: 'levelup' });
    }

    function chooseAdvancement(S, id) {
        const sc = S.scene;
        if (!sc.choices.includes(id)) return;
        S.hero.xp -= xpToNext(S);
        S.hero.level += 1;
        S.hero.advancements.push(id);
        const p = S.hero.pools;
        if (id === 'ironBody') { p.body.max += 3; p.body.cur = p.body.max; }
        if (id === 'bulwark') { p.body.max += 2; p.body.cur += 2; }
        if (id === 'coldMind') { p.mind.max += 3; p.mind.cur += 3; }
        if (id === 'oldSoul') { p.soul.max += 3; p.soul.cur += 3; }
        if (id === 'longBreath') { p.o2.max += 4; p.o2.cur = Math.min(p.o2.max, p.o2.cur + 4); }
        say(S, `Advancement: ${ADV[id].name}.`);
        beat(S, { t: 'advance', name: ADV[id].name });
        S.scene = sc.back;
        maybeLevelUp(S);
    }

    // -------------------------------------------------------------------------
    // EXTRACTION
    // -------------------------------------------------------------------------

    function startExtraction(S) {
        S.context = 'extract';
        S.outcome = null;
        S.extractScene = { kind: 'extract', level: S.depth, results: [], withTarget: S.target, cost: climbCost(S) };
        S.scene = S.extractScene;
        say(S, S.target ? 'You turn for the surface with the target.' : 'You abandon the mission and head for the surface.');
    }

    function climb(S) {
        const sc = S.extractScene;
        if (!sc || sc.level <= 0) return;
        const cost = climbCost(S);
        spendO2(S, cost, 'climb');
        if (S.dead) return;
        const r = die(S, 6);
        const mod = extractionMod(S);
        const ok = r + mod >= GAME_RULES.extractionTarget;
        beat(S, { t: 'roll', label: `Climb from Depth ${sc.level}`, sides: 6, value: r, bonus: mod, need: GAME_RULES.extractionTarget, ok });
        sc.level -= 1;
        if (ok) {
            sc.results.push({ ok: true, label: 'Clean climb' });
            say(S, 'A clean climb.');
            continueExtraction(S);
            return;
        }
        let comp = EXTRACTION_COMPLICATIONS[die(S, 6) - 1];
        if (carrying(S) && mission(S).twist === 'beacon') comp = EXTRACTION_COMPLICATIONS[1];
        sc.results.push({ ok: false, label: comp.label, text: comp.text });
        beat(S, { t: 'msg', text: `${comp.label}: ${comp.text}`, tone: 'bad' });
        say(S, `Complication: ${comp.label}.`);
        if (comp.test) {
            runTest(S, { pool: comp.test, label: comp.label, success: [], fail: comp.fail, title: comp.label, icon: 'hazard-sign', then: 'extract' });
            return;
        }
        const before = S.scene;
        applyEffects(S, comp.effects);
        if (S.dead || S.scene !== before) return;
        continueExtraction(S);
    }

    function continueExtraction(S) {
        if (S.dead) return;
        S.scene = S.extractScene;
        if (S.extractScene.level <= 0) finishRun(S);
    }

    function finishRun(S) {
        if (S.over) return;
        const won = S.target;
        const payout = won ? S.payout : 0;
        S.hero.credits += payout;
        const score = scoreOf(S, true) + payout;
        S.over = true;
        S.scene = {
            kind: 'end',
            won,
            extracted: true,
            payout,
            score,
            cause: won ? 'Extracted with the target.' : 'Aborted the mission and made it out alive.'
        };
        beat(S, { t: 'end', won });
        say(S, won ? `Mission complete. Payout: ${payout}.` : 'You survived. The contract did not.');
    }

    function die_(S, cause, pool) {
        S.dead = true;
        S.over = true;
        S.scene = { kind: 'end', won: false, extracted: false, payout: 0, score: scoreOf(S, false), cause, pool };
        beat(S, { t: 'death', pool });
        say(S, cause);
    }

    function scoreOf(S, alive) {
        return (alive ? S.hero.credits : 0) + S.stats.kills * 3 + S.stats.maxDepth * 10 + S.hero.level * 5 + (S.target ? 25 : 0);
    }

    // -------------------------------------------------------------------------
    // DISPATCH
    // -------------------------------------------------------------------------

    function act(S, action) {
        S.beats = [];
        if (S.over) return S;
        if (!S.hero && action.type !== 'choose') return S;
        const kind = S.scene?.kind;
        switch (action.type) {
            case 'choose':
                if (kind === 'choose') startHero(S, S.scene.candidates[action.index]);
                break;
            case 'door':
                if (kind === 'doors') enterDoor(S, action.index);
                break;
            case 'extract':
                if (kind === 'doors') startExtraction(S);
                break;
            case 'climb':
                if (kind === 'extract') climb(S);
                break;
            case 'option':
                if (kind === 'event') chooseOption(S, action.index);
                break;
            case 'test':
                if (kind === 'test') resolvePending(S, action.choice);
                break;
            case 'attack': case 'push': case 'brace': case 'flee': case 'parley':
                if (kind === 'combat') combatAction(S, action.type);
                break;
            case 'use':
                if (kind === 'combat') {
                    if (canUse(S, S.hero.pack[action.index] || { id: 'fists' })) combatAction(S, 'use', action.index);
                } else {
                    useItem(S, action.index);
                    if (S.scene.kind === 'doors') maybeLevelUp(S);
                }
                break;
            case 'equip': equip(S, action.index); break;
            case 'unequip': unequip(S, action.slot); break;
            case 'drop': drop(S, action.index); break;
            case 'buy': if (kind === 'shop') buy(S, action.index); break;
            case 'sell': if (kind === 'shop') sell(S, action.index); break;
            case 'leave': if (kind === 'shop') leaveShop(S); break;
            case 'advance': if (kind === 'levelup') chooseAdvancement(S, action.id); break;
            default: break;
        }
        return S;
    }

    // -------------------------------------------------------------------------
    // VIEW HELPERS — what the UI shows on buttons
    // -------------------------------------------------------------------------

    function combatView(S) {
        const sc = S.scene;
        const e = sc.enemy;
        const range = enemyDamageRange(S, sc.intent);
        const w = weapon(S);
        const [wlo, whi] = exprRange(w.dmg);
        const mods = damageMods(S, e, { round: sc.round });
        const pushMods = damageMods(S, e, { round: sc.round, push: true });
        const guardSoak = sc.intent === 'guard' ? 2 : 0;
        const plate = e.trait === 'plated' && !w.crushing ? 1 : 0;
        const twin = w.twin ? 2 : 1;
        const dmgText = (add, soak) => {
            const lo = Math.max(1, wlo * twin + add - soak - plate);
            const hi = Math.max(1, whi * twin + add - soak - plate);
            return lo === hi ? `${lo}` : `${lo}–${hi}`;
        };
        const braceTaken = sc.intent === 'charge' && !hasAdv(S, 'bulwark') ? 1 : 0;
        return {
            hit: hitChance(S, e, { round: sc.round }),
            pushHit: hitChance(S, e, { round: sc.round, push: true }),
            dmg: dmgText(mods, guardSoak),
            pushDmg: dmgText(pushMods, 0),
            pushCost: w.freePush ? 0 : 1,
            incoming: range,
            braceTaken,
            fleeCost: armor(S)?.phase && !S.perDepth.phase ? 'free' : hasAdv(S, 'ghostwalker') ? 'd4÷2' : '1 O2 + d4',
            parleyChance: sc.parley ? testChance(S, 'soul') : null
        };
    }

    function itemDef(id) {
        return ITEM[id];
    }

    // "d4+1" with +1 bonus → "d4+2"
    function dmgLabel(expr, bonus = 0) {
        if (!bonus) return expr;
        const m = String(expr).match(/^(\d*d\d+)([+-]\d+)?$/);
        if (!m) return `${expr}+${bonus}`;
        const flat = Number(m[2] || 0) + bonus;
        return flat ? `${m[1]}${flat > 0 ? '+' : ''}${flat}` : m[1];
    }

    return {
        newRun, act, doorView, combatView, testChance, testNeed, testBonus, optionBlocked, canUse,
        xpToNext, packSlots, overweight, roomCost, climbCost, escapeCost, extractionMod, sellValue, exprRange,
        itemDef, dmgLabel, weapon, armor, mission,
        ITEM, RELIC, ENEMY, EVENT, BG, ADV, MISSION
    };
})();

if (typeof module !== 'undefined') module.exports = Engine;
