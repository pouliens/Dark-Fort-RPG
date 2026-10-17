// =============================================================================
// DARK FORT: MOON DEVILS — PEN & PAPER REFERENCE
// Builds every rule card and roll table from game-data.js, so the printed
// rules and the app never drift apart.
// =============================================================================

(() => {
    const $ = id => document.getElementById(id);

    function esc(v) {
        return String(v ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function icon(name) {
        const body = (typeof ICONS !== 'undefined' && ICONS[name]) || '';
        return `<svg class="ico" viewBox="0 0 512 512" aria-hidden="true">${body}</svg>`;
    }

    function rollDie(sides) {
        return Math.floor(Math.random() * sides) + 1;
    }

    const POOL = p => (p === 'o2' ? 'Oxygen' : POOL_LABELS[p]);
    const R = GAME_RULES;
    const ITEMS_BY = kind => ITEMS.filter(i => i.kind === kind && !i.hidden);

    // Rows: { min, max, cells: [] }
    const numbered = (list, cells) => list.map((item, i) => ({ min: i + 1, max: i + 1, cells: cells(item, i) }));
    const ranged = list => list.map(([min, max, ...cells]) => ({ min, max, cells }));

    // Describe a list of effects in plain words for the tables.
    function effectText(effects = []) {
        return effects.map(([op, a, b]) => {
            switch (op) {
                case 'xp': return `+${a} XP`;
                case 'credits': return `+${a} credits`;
                case 'o2': return String(a).startsWith('-') ? `−${String(a).slice(1)} Oxygen` : `+${a} Oxygen`;
                case 'heal': return `+${b} ${a === 'all' ? 'Body, Mind & Soul' : a === 'lowest' ? 'lowest pool' : POOL(a)}`;
                case 'dmg': return `−${b} ${POOL(a)}`;
                case 'maxPool': return `${b > 0 ? '+' : '−'}${Math.abs(b)} max ${POOL(a)}`;
                case 'item': return ITEMS.find(i => i.id === a)?.name || `a ${a === 'random' ? 'Loot roll' : `${a} item`}`;
                case 'relic': return 'a Relic';
                case 'loseItem': return 'lose an item';
                case 'status': return b ? `become ${a[0].toUpperCase() + a.slice(1)}` : `remove ${a[0].toUpperCase() + a.slice(1)}`;
                case 'fight': return `fight a ${ENEMIES.find(e => e.id === a)?.name || `${a} threat`}`;
                case 'reveal': return 'see behind the next doors';
                case 'flag': return '+1 weapon damage for the run';
                default: return op;
            }
        }).join(', ');
    }

    function optionText(o) {
        const parts = [`<b>${esc(o.label)}</b>`];
        if (o.cost?.credits && !/credit/i.test(`${o.label} ${o.sub || ''}`)) parts.push(`(pay ${o.cost.credits} credits)`);
        if (o.cost?.consumable) parts.push('(give a consumable)');
        if (o.req?.item) parts.push(`(needs ${esc(ITEMS.find(i => i.id === o.req.item).name)})`);
        if (o.test) {
            const t = o.test === 'luck' ? 'Luck d6 4+' : `${POOL(o.test)} test`;
            parts.push(`${t}: ✓ ${esc(effectText(o.success) || 'nothing')} ✗ ${esc(effectText(o.fail) || 'nothing')}`);
        } else {
            parts.push(`→ ${esc(effectText(o.effects) || 'nothing')}`);
        }
        if (o.risk) parts.push(`; ${o.risk[0]}-in-6: ${esc(effectText(o.risk[1]))}`);
        return parts.join(' ');
    }

    const weak = ENEMIES.filter(e => e.tier === 'weak');
    const tough = ENEMIES.filter(e => e.tier === 'tough' && e.id !== 'reflection');
    const bosses = ENEMIES.filter(e => e.tier === 'boss');
    const enemyCells = e => [`<b>${esc(e.name)}</b><br><small>${esc(e.kind)}</small>`, `${e.def}+`, e.hp, `${esc(e.dmg)} ${POOL(e.pool)}`, esc(e.traitText)];

    const commonWeapons = ITEMS_BY('weapon').filter(w => !w.rare);
    const rareWeapons = ITEMS_BY('weapon').filter(w => w.rare);
    const consumables = ITEMS_BY('consumable');
    const gear = ITEMS_BY('gear');
    const suits = ITEMS_BY('armor');

    // -------------------------------------------------------------------------
    // RULE CARDS
    // -------------------------------------------------------------------------

    const tests = TEST_TARGETS.filter(t => t.need <= 6).map(t => `<tr><td>${t.range}</td><td><b>${t.need}+</b></td></tr>`).join('');

    const RULES = [
        ['heart-organ', 'Your salvager', `
            <ol>
                <li>Roll a <b>Mission</b> (d6). It names the target, the Vault guardian and a twist. Roll an <b>Omen</b> (d8) too.</li>
                <li>Roll three <b>Backgrounds</b> (d6). For each, roll Body <b>${BASE_POOLS.body}</b>, Mind <b>${BASE_POOLS.mind}</b>, Soul <b>${BASE_POOLS.soul}</b>, Oxygen <b>${BASE_POOLS.o2}</b>, then apply its modifiers. Keep one.</li>
                <li>Take its kit and its perk, and roll its credits + d6.</li>
            </ol>
            <p class="note">If <b>Body, Mind or Soul</b> hits 0, you die. Write the name on the graveyard page.</p>`],
        ['lungs', 'Oxygen is the clock', `
            <ul>
                <li>Every door you open costs <b>1 Oxygen</b>, +1 if Breached, +1 for each item over your pack slots (${R.packSlots}).</li>
                <li>Climbing out costs <b>${R.extractionO2} per depth</b>. Keep that much in reserve.</li>
                <li>At 0 Oxygen, pay every Oxygen cost in Body instead.</li>
            </ul>`],
        ['perspective-dice-six-faces-random', 'Tests', `
            <p>Roll <b>d6</b> plus bonuses and meet the target set by the tested pool's <i>current</i> value:</p>
            <table class="mini"><tbody>${tests}</tbody></table>
            <p class="note">Missed by exactly 1? Spend <b>1 Oxygen</b> to push it into a success. Cursed: −1 to every test.</p>`],
        ['door', 'The descent', `
            <ol>
                <li>Each room shows <b>2 doors</b>, or 3 on a d6 roll of 5–6. Roll each on the <b>Doors</b> table.</li>
                <li>From your ${R.liftMinRooms + 1}rd room on a depth, one door is the <b>Lift</b> on a d6 roll of 4+. From your ${R.liftGuaranteedRooms + 1}th, it is always there. At Depth III the Lift is the <b>Vault</b> instead.</li>
                <li>Pick a door, pay the Oxygen, take <b>+1 XP</b>, and resolve the room.</li>
                <li>Riding the Lift: +2 XP and restore d4 Oxygen from the emergency locker.</li>
            </ol>
            <p class="note">Rolling doors face-down (Dark) and opening one blind earns +1 XP more.</p>`],
        ['crossed-swords', 'Combat', `
            <ul>
                <li>At the start of each round, roll the enemy's <b>Intent</b> (d6) and say it out loud.</li>
                <li><b>Attack</b>: d6 + bonuses ≥ its defence. A 1 always misses. A 6 crits for +2 damage. Then roll your weapon die.</li>
                <li><b>Push</b> (1 Oxygen): +1 to hit, +2 damage, ignores Guard. If it misses, take 1 to the enemy's pool.</li>
                <li><b>Brace</b>: block a Strike completely. A Charge does only 1.</li>
                <li><b>Item</b>: use a consumable. This takes your turn.</li>
                <li><b>Flee</b>: pay 1 Oxygen and take d4 to the enemy's pool. Go back and pick another door.</li>
                <li>After your action, if the enemy lives, it acts on its Intent. It deals damage only to its listed pool. A suit that protects that pool soaks 1.</li>
            </ul>`],
        ['skull-crossed-bones', 'Spoils', `
            <ul>
                <li>Weak: ${ENEMY_XP.weak} XP, ${ENEMY_CREDITS.weak} credits, Loot on a d6 roll of 1–2.</li>
                <li>Tough: ${ENEMY_XP.tough} XP, ${ENEMY_CREDITS.tough} credits, Loot on a d6 roll of 1–3.</li>
                <li>Marked: +${ENEMY_XP.eliteBonus} XP and a <b>Relic</b>. Vault guardian: ${ENEMY_XP.boss} XP, ${ENEMY_CREDITS.boss} credits, a Relic and the target.</li>
                <li>Advance when XP reaches <b>${R.xpBase}</b>, then ${R.xpBase + R.xpStep}, ${R.xpBase + 2 * R.xpStep}… (+${R.xpStep} each time). Roll three Advancements and keep one.</li>
            </ul>`],
        ['exit-door', 'Extraction', `
            <ul>
                <li>You can turn back between any two rooms. Without the target you live, but you get no pay.</li>
                <li>Climb one depth at a time. Each climb costs ${R.extractionO2} Oxygen (+1 if Breached). Roll d6 and get <b>${R.extractionTarget}+</b> for a clean climb: +1 with a Climbing line, −1 if Cursed.</li>
                <li>A failed roll means a roll on <b>Complications</b>.</li>
                <li><b>Greed:</b> while you carry the target, every credit you find is doubled, and the mission twist is active.</li>
            </ul>`],
        ['cracked-glass', 'Conditions', `
            <ul>
                <li><b>Breached</b>: +1 Oxygen per room and per climb. A patch kit or airlock fixes it.</li>
                <li><b>Cursed</b>: −1 to tests and climbs. Lifted by Moon-salt or a chapel prayer.</li>
                <li><b>Blessed</b>: the next killing blow leaves you at 1 instead.</li>
            </ul>`]
    ];

    // -------------------------------------------------------------------------
    // TABLES
    // -------------------------------------------------------------------------

    const TABLES = [
        { group: 'Character', key: 'missions', title: 'Missions', icon: 'locked-door', die: [6],
          head: ['Mission', 'Vault guardian', 'Pay', 'Twist (while carrying)'],
          rows: numbered(MISSIONS, m => [`<b>${esc(m.briefing)}</b><br><small>${esc(m.target)}</small>`, esc(ENEMIES.find(e => e.id === m.boss).name), m.payout, esc(m.twistText)]) },
        { group: 'Character', key: 'backgrounds', title: 'Backgrounds', icon: 'footsteps', die: [6],
          head: ['Background', 'Pools', 'Kit', 'Perk'],
          rows: numbered(BACKGROUNDS, b => [
              `<b>${esc(b.name)}</b><br><small>${esc(b.faction)}</small>`,
              Object.entries(b.mods).filter(([, v]) => v).map(([p, v]) => `${v > 0 ? '+' : '−'}${Math.abs(v)} ${POOL(p)}`).join(', ') || '—',
              esc([b.weapon, b.armor, ...b.kit].filter(Boolean).map(id => ITEMS.find(i => i.id === id).name).join(', ')) + `<br><small>${b.credits} + d6 credits</small>`,
              esc(b.perkText)
          ]) },
        { group: 'Character', key: 'omens', title: 'Omens', icon: 'evil-moon', die: [8],
          head: ['Omen', 'Effect'], rows: numbered(OMENS, o => [`<b>${esc(o.name)}</b>`, esc(o.text)]),
          note: 'Roll one with the Mission. It lasts the whole run.' },
        { group: 'Character', key: 'names', title: 'Names', icon: 'scroll-unfurled', die: [12],
          head: ['Name', 'Epithet'],
          rows: numbered(PLAYER_EPITHETS, (ep, i) => [esc(PLAYER_NAMES[i]), esc(ep)]),
          note: `More names: ${PLAYER_NAMES.slice(12).map(esc).join(', ')}.` },

        { group: 'The descent', key: 'doors', title: 'Doors', icon: 'door', die: [12],
          head: ['Door', 'Behind it'],
          rows: ranged([
              [1, 4, `<b>Threat</b>`, 'Roll threat tier for this depth, then Weak or Tough.'],
              [5, 5, `<b>Marked</b>`, 'A threat with an Elite affix. It guards a Relic.'],
              [6, 7, `<b>Salvage</b>`, `Take d6 + 2×depth credits, or search: Mind test for that plus Loot (fail: d4 Body).`],
              [8, 10, `<b>Strange</b>`, 'Roll on Strange Rooms.'],
              [11, 11, `<b>Shrine</b>`, 'Roll on Shrines.'],
              [12, 12, `<b>Peddler</b>`, 'Roll Loot four times: those are the wares. At Depth II+, on a d6 roll of 4+, also a Relic for 20 + 4×depth credits. Sell for half price.']
          ]),
          note: 'The app shifts these odds a little with depth: fewer shrines and more Marked doors further down.' },
        { group: 'The descent', key: 'tier', title: 'Threat tier', icon: 'crossed-swords', die: [6],
          head: ['Depth', 'Weak', 'Tough'],
          rows: ranged([
              [1, 1, 'I', '1–5', '6 (only after 2 rooms)'],
              [2, 2, 'II', '1–3', '4–6'],
              [3, 3, 'III', '1–2', '3–6']
          ]),
          noRoll: true },
        { group: 'The descent', key: 'weak', title: 'Weak threats', icon: 'crossed-swords', die: [6],
          head: ['Threat', 'Hit', 'HP', 'Damage', 'Trait'], rows: numbered(weak, enemyCells) },
        { group: 'The descent', key: 'tough', title: 'Tough threats', icon: 'crowned-skull', die: [6],
          head: ['Threat', 'Hit', 'HP', 'Damage', 'Trait'], rows: numbered(tough, enemyCells) },
        { group: 'The descent', key: 'affix', title: 'Elite affixes', icon: 'crowned-skull', die: [4],
          head: ['Affix', 'Effect'], rows: numbered(ELITE_AFFIXES, a => [`<b>${esc(a.name)}</b>`, esc(a.text)]) },
        { group: 'The descent', key: 'bosses', title: 'Vault guardians', icon: 'locked-door', die: null,
          head: ['Guardian', 'Hit', 'HP', 'Damage', 'Trait'], rows: numbered(bosses, enemyCells),
          note: 'Your mission names your guardian.' },
        { group: 'The descent', key: 'intents', title: 'Enemy intent', icon: 'hypersonic-bolt', die: [6],
          head: ['Move', 'Effect'],
          rows: ranged([
              [1, 3, '<b>Strike</b>', 'Its damage. Brace blocks it.'],
              [4, 5, '<b>Charge</b>', 'Damage +2, but you get +1 to hit it. Brace cuts it to 1.'],
              [6, 6, '<b>Guard</b>', 'No attack. Your hits deal −2 unless you Push.']
          ]) },
        { group: 'The descent', key: 'events', title: 'Strange rooms', icon: 'third-eye', die: [20],
          head: ['Room', 'Choices'],
          rows: numbered(EVENTS, e => [`<b>${esc(e.title)}</b><br><small>${esc(e.text)}</small>${e.minDepth > 1 ? `<br><small>Depth ${e.minDepth}+, otherwise reroll</small>` : ''}`, `<ul class="opts">${e.options.map(o => `<li>${optionText(o)}</li>`).join('')}</ul>`]) },
        { group: 'The descent', key: 'shrines', title: 'Shrines', icon: 'candle-light', die: [6],
          head: ['Shrine', 'Choose one'],
          rows: ranged([
              [1, 2, '<b>Chapel of Saulė</b>', 'Rest: +d4+2 Body · Meditate: +d4+2 Mind · Pray: +d4+2 Soul and lift curses'],
              [3, 4, '<b>Circular airlock</b>', 'Cycle air: +d4+2 Oxygen · Patch and rest: repair a breach, +d4 to your lowest pool'],
              [5, 6, '<b>Quiet infirmary</b>', 'Patch up: +d6+1 Body · Sleep: −1 Oxygen, +d4 Mind and +d4 Soul']
          ]) },

        { group: 'Loot', key: 'loot', title: 'Loot', icon: 'open-chest', die: [6],
          head: ['Roll', 'You find'],
          rows: ranged([
              [1, 3, 'A consumable', 'Roll d12 on Consumables.'],
              [4, 4, 'Gear', 'Roll d6 on Gear.'],
              [5, 5, 'A weapon', 'Roll d6 on Weapons. At Depth II+, a roll of 1–2 is a Rare weapon instead (d3).'],
              [6, 6, 'A suit', 'Roll d6 on Suits (reroll 6).']
          ]) },
        { group: 'Loot', key: 'consumables', title: 'Consumables', icon: 'medicines', die: [12],
          head: ['Item', 'Price', 'Effect'], rows: numbered(consumables, i => [`<b>${esc(i.name)}</b>`, i.price, esc(i.text)]) },
        { group: 'Loot', key: 'gear', title: 'Gear', icon: 'gears', die: [6],
          head: ['Item', 'Price', 'Effect'], rows: numbered(gear, i => [`<b>${esc(i.name)}</b>`, i.price, esc(i.text)]) },
        { group: 'Loot', key: 'weapons', title: 'Weapons', icon: 'broadsword', die: [6],
          head: ['Weapon', 'Price', 'Effect'], rows: numbered(commonWeapons, i => [`<b>${esc(i.name)}</b>`, i.price, esc(i.text)]),
          note: 'Unarmed: d3.' },
        { group: 'Loot', key: 'rare', title: 'Rare weapons', icon: 'lightning-helix', die: [3],
          head: ['Weapon', 'Price', 'Effect'], rows: numbered(rareWeapons, i => [`<b>${esc(i.name)}</b>`, i.price, esc(i.text)]) },
        { group: 'Loot', key: 'suits', title: 'Suits', icon: 'breastplate', die: [6],
          head: ['Suit', 'Price', 'Effect'], rows: numbered(suits, i => [`<b>${esc(i.name)}</b>`, i.price, esc(i.text)]),
          note: 'Wear one suit. Reroll a 6.' },
        { group: 'Loot', key: 'relics', title: 'Relics', icon: 'gem-pendant', die: [10],
          head: ['Relic', 'Power'], rows: numbered(RELICS, r => [`<b>${esc(r.name)}</b>`, esc(r.text)]),
          note: 'Reroll relics you already hold. Relics take no pack slot.' },

        { group: 'Growth & escape', key: 'advancements', title: 'Advancements', icon: 'upgrade', die: [20],
          head: ['Advancement', 'Path', 'Effect'], rows: numbered(ADVANCEMENTS, a => [`<b>${esc(a.name)}</b>`, esc(a.path), esc(a.text)]),
          note: 'Roll three (reroll 16+ and repeats), keep one.' },
        { group: 'Growth & escape', key: 'complications', title: 'Extraction complications', icon: 'hazard-sign', die: [6],
          head: ['Complication', 'Effect'], rows: EXTRACTION_COMPLICATIONS.map(c => ({ min: c.roll, max: c.roll, cells: [`<b>${esc(c.label)}</b>`, esc(c.text)] })) }
    ];

    // -------------------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------------------

    function rangeLabel(r) {
        return r.min === r.max ? String(r.min) : `${r.min}–${r.max}`;
    }

    function renderRules() {
        $('rulesGrid').innerHTML = RULES.map(([ic, title, body]) => `
            <article class="rule-card">
                <h3>${icon(ic)} ${esc(title)}</h3>
                ${body}
            </article>`).join('');
    }

    function renderTables() {
        const groups = [...new Set(TABLES.map(t => t.group))];
        $('tables').innerHTML = groups.map(g => `
            <section class="ref-section" id="g-${g.replace(/\W+/g, '-').toLowerCase()}">
                <h2>${esc(g)}</h2>
                ${TABLES.filter(t => t.group === g).map(t => `
                    <article class="table-block" id="t-${t.key}">
                        <header class="table-head">
                            <h3>${icon(t.icon)} ${esc(t.title)}</h3>
                            ${t.die && !t.noRoll ? `<button class="btn btn-small roll-btn" data-table="${t.key}">Roll d${t.die[0]}</button>` : ''}
                        </header>
                        <div class="table-scroll">
                            <table class="ref-table">
                                <thead><tr>${t.noRoll || !t.die ? '' : `<th class="col-roll">d${t.die[0]}</th>`}${t.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
                                <tbody>${t.rows.map(r => `<tr data-min="${r.min}" data-max="${r.max}">${t.noRoll || !t.die ? '' : `<td class="col-roll">${rangeLabel(r)}</td>`}${r.cells.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
                            </table>
                        </div>
                        ${t.note ? `<p class="note">${t.note}</p>` : ''}
                    </article>`).join('')}
            </section>`).join('');
        $('toc').innerHTML = ['Rules', ...groups].map(g => `<a href="#${g === 'Rules' ? 'rules' : `g-${g.replace(/\W+/g, '-').toLowerCase()}`}">${esc(g)}</a>`).join('');
    }

    function showRoll(total, detail) {
        const v = $('trayValue');
        v.textContent = total;
        $('trayDetail').textContent = detail;
        v.classList.remove('flash');
        void v.offsetWidth;
        v.classList.add('flash');
    }

    function onClick(e) {
        const die = e.target.closest('.dice-btn');
        if (die) {
            const sides = Number(die.dataset.die);
            const count = Number(die.dataset.count || 1);
            const rolls = Array.from({ length: count }, () => rollDie(sides));
            const total = rolls.reduce((a, b) => a + b, 0);
            showRoll(total, `${count > 1 ? count : ''}d${sides}${count > 1 ? ` (${rolls.join(' + ')})` : ''}`);
            return;
        }
        const btn = e.target.closest('.roll-btn');
        if (!btn) return;
        const t = TABLES.find(x => x.key === btn.dataset.table);
        const roll = rollDie(t.die[0]);
        showRoll(roll, `d${t.die[0]} · ${t.title}`);
        const block = $(`t-${t.key}`);
        block.querySelectorAll('tr.rolled').forEach(tr => tr.classList.remove('rolled'));
        const row = [...block.querySelectorAll('tbody tr')].find(tr => roll >= Number(tr.dataset.min) && roll <= Number(tr.dataset.max));
        if (row) {
            row.classList.add('rolled');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            showRoll(roll, `d${t.die[0]} · ${t.title} · reroll`);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderRules();
        renderTables();
        document.addEventListener('click', onClick);
    });
})();
