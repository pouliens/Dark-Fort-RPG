// =============================================================================
// Dark Fort: Moon Devils — Pen & Paper reference page
// Renders every game-data.js table, with click-to-roll rows and a dice tray.
// =============================================================================

function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function rollDice(sides, count = 1) {
    let total = 0;
    const rolls = [];
    for (let i = 0; i < count; i++) {
        const r = rollDie(sides);
        rolls.push(r);
        total += r;
    }
    return { total, rolls, label: count > 1 ? `${count}d${sides}` : `d${sides}` };
}

function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// -----------------------------------------------------------------------------
// Dice tray (top of page)
// -----------------------------------------------------------------------------

function showDiceResult({ total, rolls, label }, extra = '') {
    const value = document.getElementById('diceTrayValue');
    const detail = document.getElementById('diceTrayDetail');
    if (!value) return;
    value.textContent = total;
    let detailText = label;
    if (rolls.length > 1) detailText += ` (${rolls.join(' + ')})`;
    if (extra) detailText += ` · ${extra}`;
    detail.textContent = detailText;
    value.classList.remove('flash');
    void value.offsetWidth;
    value.classList.add('flash');
}

function initDiceTray() {
    document.querySelectorAll('.dice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const die = parseInt(btn.dataset.die, 10);
            const count = parseInt(btn.dataset.count || '1', 10);
            const result = rollDice(die, count);
            showDiceResult(result);
        });
    });
}

// -----------------------------------------------------------------------------
// Table definitions — how each table renders and how a "Roll" maps roll → row
// -----------------------------------------------------------------------------

const TABLES = {
    missions: {
        data: () => MISSIONS,
        die: { sides: 6 },
        rollToIndex: roll => roll - 1,
        rowKey: (_item, i) => i + 1,
        cells: item => [
            escapeHtml(item.briefing),
            escapeHtml(item.target),
            escapeHtml(item.twist),
            typeof item.payout === 'number' ? `${item.payout}c` : escapeHtml(item.payout)
        ]
    },
    factions: {
        data: () => FACTIONS,
        die: { sides: 4 },
        rollToIndex: roll => roll - 1,
        rowKey: (_item, i) => i + 1,
        cells: item => [escapeHtml(item.name), escapeHtml(item.edge), escapeHtml(item.debt)]
    },
    playerNames: {
        data: () => PLAYER_NAMES,
        die: { sides: 6 },
        rollToIndex: roll => roll - 1,
        rowKey: (_item, i) => i + 1,
        cells: item => [escapeHtml(item)]
    },
    playerProfessions: {
        data: () => PLAYER_PROFESSIONS,
        die: { sides: 6 },
        rollToIndex: roll => roll - 1,
        rowKey: (_item, i) => i + 1,
        cells: item => [escapeHtml(item)]
    },
    roomTable: {
        data: () => ROOM_TABLE,
        die: { sides: 6 },
        rollToIndex: roll => ROOM_TABLE.findIndex(r => r.roll === roll),
        rowKey: item => item.roll,
        cells: item => [escapeHtml(item.label), escapeHtml(item.description)]
    },
    roomShapes: {
        data: () => ROOM_SHAPES,
        die: { sides: 6, count: 2 },
        rollToIndex: roll => ROOM_SHAPES.findIndex(r => roll >= r.min && roll <= r.max),
        rowKey: item => item.min === item.max ? `${item.min}` : `${item.min}–${item.max}`,
        cells: item => [escapeHtml(item.name), escapeHtml(item.effect), item.threatPoints]
    },
    doorsTable: {
        data: () => DOORS_TABLE,
        die: { sides: 4 },
        rollToIndex: roll => DOORS_TABLE.findIndex(r => r.roll === roll),
        rowKey: item => item.roll,
        cells: item => [item.doors, escapeHtml(item.description)]
    },
    weakMonsters: {
        data: () => WEAK_MONSTERS,
        die: { sides: 6 },
        rollToIndex: roll => roll - 1,
        rowKey: (_item, i) => i + 1,
        cells: item => [
            escapeHtml(item.name),
            escapeHtml(item.type),
            item.hp,
            item.points,
            `${escapeHtml(item.damage)} → ${escapeHtml(POOL_LABELS[item.damagePool])}`,
            escapeHtml(item.special)
        ]
    },
    toughMonsters: {
        data: () => TOUGH_MONSTERS,
        die: { sides: 6 },
        rollToIndex: roll => roll - 1,
        rowKey: (_item, i) => i + 1,
        cells: item => [
            escapeHtml(item.name),
            escapeHtml(item.type),
            item.hp,
            item.points,
            `${escapeHtml(item.damage)} → ${escapeHtml(POOL_LABELS[item.damagePool])}`,
            escapeHtml(item.special)
        ]
    },
    weapons: {
        data: () => WEAPONS,
        die: { sides: 6 },
        rollToIndex: roll => roll - 1,
        rowKey: (_item, i) => i + 1,
        cells: item => [
            escapeHtml(item.name),
            escapeHtml(item.value),
            `${item.price}c`,
            escapeHtml(item.description)
        ]
    },
    suits: {
        data: () => SUITS,
        die: { sides: SUITS.length },
        rollToIndex: roll => roll - 1,
        rowKey: (_item, i) => i + 1,
        cells: item => [
            escapeHtml(item.name),
            `${item.price}c`,
            escapeHtml(item.description)
        ]
    },
    consumables: {
        data: () => CONSUMABLES,
        die: { sides: 6 },
        rollToIndex: roll => roll - 1,
        rowKey: (_item, i) => i + 1,
        cells: item => [
            escapeHtml(item.name),
            `${item.price}c`,
            escapeHtml(item.description)
        ]
    },
    gear: {
        data: () => GEAR,
        die: { sides: 6 },
        rollToIndex: roll => roll - 1,
        rowKey: (_item, i) => i + 1,
        cells: item => [
            escapeHtml(item.name),
            `${item.price}c`,
            escapeHtml(item.description)
        ]
    },
    devices: {
        data: () => DEVICES,
        die: { sides: 6 },
        rollToIndex: roll => roll - 1,
        rowKey: (_item, i) => i + 1,
        cells: item => [
            escapeHtml(item.name),
            `${item.price}c`,
            escapeHtml(item.description)
        ]
    },
    lootCategory: {
        data: () => [
            { roll: 1, category: 'Weapon', action: 'Roll d6 on the Weapons table.' },
            { roll: 2, category: 'Consumable', action: 'Roll d6 on the Consumables table.' },
            { roll: 3, category: 'Gear', action: 'Roll d6 on the Gear table.' },
            { roll: 4, category: 'Device', action: 'Roll d6 on the Devices table.' },
            { roll: 5, category: 'Suit', action: 'Roll d5 on the Suits & Armor table.' },
            { roll: 6, category: 'Artifact clue', action: '+2 threat points and +1 to locate the target chamber.' }
        ],
        die: { sides: 6 },
        rollToIndex: roll => roll - 1,
        rowKey: item => item.roll,
        cells: item => [escapeHtml(item.category), escapeHtml(item.action)]
    },
    extractionComplications: {
        data: () => EXTRACTION_COMPLICATIONS,
        die: { sides: 6 },
        rollToIndex: roll => roll - 1,
        rowKey: item => item.roll,
        cells: item => [escapeHtml(item.label), escapeHtml(item.description)]
    },
    advancements: {
        data: () => ADVANCEMENTS,
        die: { sides: 6 },
        rollToIndex: roll => roll - 1,
        rowKey: (_item, i) => i + 1,
        cells: item => [escapeHtml(item.name), escapeHtml(item.description)]
    }
};

// -----------------------------------------------------------------------------
// Render each table
// -----------------------------------------------------------------------------

function renderTable(key) {
    const def = TABLES[key];
    const tbody = document.querySelector(`[data-table-body="${key}"] tbody`);
    if (!def || !tbody) return;
    const data = def.data();
    tbody.innerHTML = data.map((item, i) => {
        const rowKey = def.rowKey(item, i);
        const cells = def.cells(item).map(c => `<td>${c}</td>`).join('');
        return `<tr data-row-key="${escapeHtml(rowKey)}"><td class="col-roll">${escapeHtml(rowKey)}</td>${cells}</tr>`;
    }).join('');
}

function renderTestTargets() {
    const tbody = document.querySelector('#testTargetsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = TEST_TARGETS.map(row =>
        `<tr><td>${escapeHtml(row.range)}</td><td><strong>${escapeHtml(row.threshold)}</strong></td></tr>`
    ).join('');
}

// -----------------------------------------------------------------------------
// Per-table "Roll" button — rolls the table's die and highlights the row
// -----------------------------------------------------------------------------

function highlightRow(key, roll) {
    const def = TABLES[key];
    const block = document.querySelector(`[data-table-key="${key}"]`);
    if (!def || !block) return;
    const index = def.rollToIndex(roll);
    block.querySelectorAll('tr.rolled').forEach(tr => tr.classList.remove('rolled'));
    const rows = block.querySelectorAll('tbody tr');
    if (index >= 0 && index < rows.length) {
        const target = rows[index];
        target.classList.add('rolled');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function initTableRollers() {
    document.querySelectorAll('.table-roll-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.table;
            const def = TABLES[key];
            if (!def) return;
            const sides = parseInt(btn.dataset.die || def.die.sides, 10);
            const count = parseInt(btn.dataset.count || def.die.count || '1', 10);
            const result = rollDice(sides, count);
            showDiceResult(result, `${key} table`);
            highlightRow(key, result.total);
        });
    });
}

// -----------------------------------------------------------------------------
// Boot
// -----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    Object.keys(TABLES).forEach(renderTable);
    renderTestTargets();
    initDiceTray();
    initTableRollers();
});
