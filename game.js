// =============================================================================
// DARK FORT: MOON DEVILS - GAME LOGIC
// =============================================================================

const PLAYER_SPRITE = 'assets/player/player-token.png';
const DEFAULT_MONSTER_SPRITE = typeof ENEMY_SPRITE_DIR !== 'undefined'
    ? `${ENEMY_SPRITE_DIR}/tough-threat-6.png`
    : 'assets/enemies/tough-threat-6.png';
const LEVEL_UP_COST = GAME_RULES.levelUpCost;

const ITEM_LOOKUP = {};
[
    { name: 'Base map', type: 'map', price: 0, description: 'A rough route back to the airlock.' },
    ...LOOT_DROPS,
    ...SHOP_ITEMS
].forEach(item => {
    ITEM_LOOKUP[item.name] = item;
});
DEVICES.forEach(item => {
    ITEM_LOOKUP[item.name] = item;
});

function createInitialGameState() {
    return {
        pools: {
            body: { current: 0, max: 0 },
            mind: { current: 0, max: 0 },
            soul: { current: 0, max: 0 },
            oxygen: { current: 0, max: 0 }
        },
        credits: 0,
        totalCreditsCollected: 0,
        totalSilverCollected: 0,
        threatPoints: 0,
        points: 0,
        level: 0,
        playerName: '',
        playerProfession: '',
        faction: null,
        factionEdgeUsed: false,
        mission: null,
        targetRecovered: false,
        targetRoomNumber: null,
        keptExploringAfterTarget: false,
        inventory: [],
        itemUses: {},
        equippedWeapon: null,
        equippedArmor: null,
        currentMonster: null,
        currentRoom: null,
        inCombat: false,
        inShop: false,
        inVictory: false,
        gameStarted: false,
        playerIsDead: false,
        gameWon: false,
        roomsExplored: 0,
        map: [],
        canScavenge: false,
        pendingInsertion: true,
        monstersDefeated: 0,
        autoBattle: false,
        autoBattleDelay: 500,
        autoExplore: false,
        autoExploreDelay: 900,
        combatTurn: 1,
        combatFeed: [],
        monsterDying: false,
        advancements: [],
        attackBonus: 0,
        extractionBonus: 0,
        longBreathAvailable: false,
        hunterHandAvailable: false,
        ironBodyAvailable: false,
        coldMindAvailable: false,
        oldSoulAvailable: false,
        exitSaintAvailable: false,
        mirrorVisorAvailable: false,
        sealantAvailable: false,
        breached: false,
        firstMindDamagePlusOne: false,
        challenges: {},
        challengeLookup: {},
        hp: 0,
        maxHp: 0,
        silver: 0,
        playerDamage: 'd4-1',
        playerDamageBonus: 0,
        playerDefense: 0
    };
}

let gameState = createInitialGameState();
let gameTextEl;
let logEl;
let combatActionBusy = false;
let lastInventorySnapshot = [];
let lastEquippedWeapon = null;
let lastEquippedArmor = null;

// -----------------------------------------------------------------------------
// BASIC UTILITIES
// -----------------------------------------------------------------------------

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function rollExpression(expression, minimum = 0) {
    const expr = String(expression).replace(/\s+/g, '');
    const tokens = expr.match(/[+-]?(\d*d\d+|\d+)/g);
    if (!tokens) return minimum;

    const total = tokens.reduce((sum, token) => {
        const sign = token.startsWith('-') ? -1 : 1;
        const clean = token.replace(/^[+-]/, '');
        if (clean.includes('d')) {
            const [countText, sidesText] = clean.split('d');
            const count = countText ? Number(countText) : 1;
            const sides = Number(sidesText);
            let rolled = 0;
            for (let i = 0; i < count; i++) {
                rolled += rollDie(sides);
            }
            return sum + sign * rolled;
        }
        return sum + sign * Number(clean);
    }, 0);

    return Math.max(minimum, total);
}

function rollDamage(diceString) {
    return rollExpression(diceString, 0);
}

function getExpressionMax(expression) {
    const expr = String(expression).replace(/\s+/g, '');
    const tokens = expr.match(/[+-]?(\d*d\d+|\d+)/g);
    if (!tokens) return 0;
    return tokens.reduce((sum, token) => {
        const sign = token.startsWith('-') ? -1 : 1;
        const clean = token.replace(/^[+-]/, '');
        if (clean.includes('d')) {
            const [countText, sidesText] = clean.split('d');
            const count = countText ? Number(countText) : 1;
            return sum + sign * count * Number(sidesText);
        }
        return sum + sign * Number(clean);
    }, 0);
}

function getDieSides(diceString) {
    const match = String(diceString).match(/d(\d+)/);
    return match ? Number(match[1]) : 0;
}

function getDamageValue(diceString) {
    return getExpressionMax(diceString);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function sample(array) {
    return array[rollDie(array.length) - 1];
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function safeSound(fnName) {
    if (typeof window !== 'undefined' && typeof window[fnName] === 'function') {
        window[fnName]();
    } else if (typeof globalThis[fnName] === 'function') {
        globalThis[fnName]();
    }
}

function getMonsterSprite(monster) {
    return monster && monster.sprite ? monster.sprite : DEFAULT_MONSTER_SPRITE;
}

function syncLegacyAliases() {
    gameState.hp = gameState.pools.body.current;
    gameState.maxHp = gameState.pools.body.max;
    gameState.silver = gameState.credits;
    gameState.points = gameState.threatPoints;
    gameState.totalSilverCollected = gameState.totalCreditsCollected;
    const weapon = getEquippedWeapon();
    gameState.playerDamage = weapon.value;
    gameState.playerDamageBonus = getAttackBonus(gameState.currentMonster);
    gameState.playerDefense = gameState.equippedArmor === 'Hardsuit plating' ? 'd4' : 0;
}

// -----------------------------------------------------------------------------
// CHALLENGES
// -----------------------------------------------------------------------------

function loadChallenges() {
    const saved = localStorage.getItem(GAME_RULES.challengeStorageKey);
    if (saved) {
        gameState.challenges = JSON.parse(saved);
    } else {
        gameState.challenges = CHALLENGES.reduce((acc, challenge) => {
            acc[challenge.id] = { ...challenge, progress: 0 };
            return acc;
        }, {});
    }
    rebuildChallengeLookup();
}

function rebuildChallengeLookup() {
    gameState.challengeLookup = {};
    Object.values(gameState.challenges).forEach(challenge => {
        if (!gameState.challengeLookup[challenge.type]) {
            gameState.challengeLookup[challenge.type] = {};
        }
        if (!gameState.challengeLookup[challenge.type][challenge.targetName]) {
            gameState.challengeLookup[challenge.type][challenge.targetName] = [];
        }
        gameState.challengeLookup[challenge.type][challenge.targetName].push(challenge);
    });
}

function saveChallenges() {
    localStorage.setItem(GAME_RULES.challengeStorageKey, JSON.stringify(gameState.challenges));
}

function updateChallengeProgress(type, name, amount) {
    const matches = gameState.challengeLookup?.[type]?.[name];
    if (!matches) return;

    matches.forEach(challenge => {
        if (challenge.progress >= challenge.targetValue) return;
        const oldProgress = challenge.progress;
        challenge.progress = Math.min(challenge.targetValue, challenge.progress + amount);
        if (challenge.progress > oldProgress) {
            log(`Progress: ${challenge.description} (${challenge.progress}/${challenge.targetValue})`);
        }
    });
}

// -----------------------------------------------------------------------------
// UI HELPERS
// -----------------------------------------------------------------------------

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'danger') icon = 'warning';
    toast.innerHTML = `<span class="material-symbols-outlined">${icon}</span> ${escapeHtml(message)}`;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function setActionsDisabled(disabled) {
    document.querySelectorAll(
        '#gameActions button, .battle-actions button, #quick-items button, #battle-quick-items button, .inventory-item, .shop-item'
    ).forEach(el => {
        el.disabled = disabled;
        el.style.pointerEvents = disabled ? 'none' : '';
    });
}

async function showDiceRoll({ context, dice, threshold, outcome, isSuccess, detail = null }) {
    const overlay = document.getElementById('dice-overlay');
    const contextEl = document.getElementById('dice-context');
    const facesRow = document.getElementById('dice-faces-row');
    const vsWrap = document.getElementById('dice-vs-wrap');
    const detailEl = document.getElementById('dice-detail');
    const outcomeEl = document.getElementById('dice-outcome');
    if (!overlay || !contextEl || !facesRow || !vsWrap || !detailEl || !outcomeEl) return;

    facesRow.innerHTML = dice.map((d, i) =>
        `<div class="die-face" data-type="${d.type}">
            <span class="die-type-label">${d.type}</span>
            <span class="die-number rolling" id="die-num-${i}">${d.result}</span>
        </div>${i < dice.length - 1 ? '<span class="dice-plus">+</span>' : ''}`
    ).join('');

    contextEl.textContent = context;
    if (threshold !== undefined && threshold !== null) {
        vsWrap.style.display = 'flex';
        setText('dice-threshold', threshold);
    } else {
        vsWrap.style.display = 'none';
    }
    detailEl.textContent = detail || '';
    detailEl.style.display = detail ? 'block' : 'none';
    outcomeEl.textContent = '';
    outcomeEl.className = 'dice-roll-outcome';

    overlay.classList.add('visible');
    setActionsDisabled(true);

    const intervals = dice.map((d, i) => {
        const el = document.getElementById(`die-num-${i}`);
        const sides = Number(String(d.type).slice(1)) || 6;
        return setInterval(() => {
            if (el) el.textContent = rollDie(sides);
        }, 80);
    });

    await sleep(500);
    intervals.forEach(clearInterval);
    dice.forEach((d, i) => {
        const el = document.getElementById(`die-num-${i}`);
        if (el) {
            el.textContent = d.result;
            el.classList.remove('rolling');
        }
    });

    await sleep(80);
    outcomeEl.textContent = outcome;
    outcomeEl.classList.add(isSuccess === true ? 'success' : isSuccess === false ? 'failure' : 'neutral', 'visible');

    let earlyResolve;
    const earlyPromise = new Promise(resolve => { earlyResolve = resolve; });
    overlay.addEventListener('click', earlyResolve, { once: true });
    await Promise.race([earlyPromise, sleep(1000)]);

    overlay.removeEventListener('click', earlyResolve);
    overlay.classList.remove('visible');
    await sleep(240);
    setActionsDisabled(false);
}

function log(message) {
    if (logEl) {
        logEl.insertAdjacentHTML('afterbegin', `<p>${message}</p>`);
    }
}

function setGameText(html) {
    if (gameTextEl) {
        gameTextEl.innerHTML = html;
    }
}

function renderPool(pool) {
    const value = gameState.pools[pool];
    return `${value.current}/${value.max}`;
}

function poolClass(pool) {
    const value = gameState.pools[pool];
    if (value.max <= 0) return '';
    const pct = value.current / value.max;
    if (pct <= 0.25) return 'danger';
    if (pct <= 0.5) return 'warning';
    return '';
}

function updateUI() {
    syncLegacyAliases();

    setText('body', gameState.pools.body.current);
    setText('maxBody', gameState.pools.body.max);
    setText('mind', gameState.pools.mind.current);
    setText('maxMind', gameState.pools.mind.max);
    setText('soul', gameState.pools.soul.current);
    setText('maxSoul', gameState.pools.soul.max);
    setText('oxygen', gameState.pools.oxygen.current);
    setText('maxOxygen', gameState.pools.oxygen.max);
    setText('credits', gameState.credits);
    setText('points', gameState.threatPoints);
    setText('maxPoints', LEVEL_UP_COST);
    setText('level', gameState.level);

    const nameEl = document.getElementById('playerName');
    if (nameEl) {
        nameEl.innerHTML = gameState.playerName
            ? `<span class="material-symbols-outlined">history_edu</span> ${escapeHtml(gameState.playerName)} <small>${escapeHtml(gameState.playerProfession)}</small>`
            : '<span class="material-symbols-outlined">history_edu</span>';
    }

    const damageString = getEquippedWeapon().value;
    setText('playerDamage', damageString);
    setText('playerDefense', gameState.equippedArmor || 'None');

    document.querySelectorAll('[data-pool]').forEach(el => {
        el.classList.remove('warning', 'danger');
        const css = poolClass(el.dataset.pool);
        if (css) el.classList.add(css);
    });

    updateBattleUI();
    updateInventoryUI();
    updateDungeonTracker();
    updateChallengeUI();
    updateButtons();
}

function updateButtons() {
    const isPlayerActionable = gameState.gameStarted && !gameState.playerIsDead && !gameState.gameWon;
    const buttonsVisible = !gameState.inVictory;
    const inDowntime = isPlayerActionable && !gameState.inCombat && !gameState.inShop && buttonsVisible;
    const showManualCombat = isPlayerActionable && gameState.inCombat && !gameState.monsterDying && buttonsVisible && !gameState.autoBattle;

    const startBtn = document.getElementById('startBtn');
    const referenceLink = document.getElementById('referenceLink');
    const exploreBtn = document.getElementById('exploreBtn');
    const autoExploreBtn = document.getElementById('autoExploreBtn');
    const attackBtn = document.getElementById('attackBtn');
    const powerAttackBtn = document.getElementById('powerAttackBtn');
    const scavengeBtn = document.getElementById('scavengeBtn');
    const fleeBtn = document.getElementById('fleeBtn');
    const levelUpBtn = document.getElementById('levelUpBtn');
    const extractBtn = document.getElementById('extractBtn');

    if (startBtn) startBtn.style.display = gameState.gameStarted ? 'none' : 'block';
    if (referenceLink) referenceLink.style.display = gameState.gameStarted ? 'none' : '';
    if (exploreBtn) exploreBtn.style.display = inDowntime ? 'block' : 'none';
    if (autoExploreBtn) autoExploreBtn.style.display = inDowntime ? 'block' : 'none';
    if (attackBtn) attackBtn.style.display = showManualCombat ? 'block' : 'none';
    if (powerAttackBtn) powerAttackBtn.style.display = showManualCombat ? 'block' : 'none';
    if (scavengeBtn) scavengeBtn.style.display = inDowntime && gameState.canScavenge ? 'block' : 'none';
    if (fleeBtn) fleeBtn.style.display = showManualCombat ? 'block' : 'none';
    if (levelUpBtn) levelUpBtn.style.display = inDowntime && canLevelUpNow() ? 'block' : 'none';
    if (extractBtn) extractBtn.style.display = inDowntime && gameState.targetRecovered ? 'block' : 'none';
}

function updateChallengeUI() {
    const challengesEl = document.getElementById('challenges');
    if (!challengesEl) return;
    const values = Object.values(gameState.challenges || {});
    if (!values.length) {
        challengesEl.innerHTML = 'No records yet.';
        return;
    }
    challengesEl.innerHTML = values.map(challenge => {
        const progress = Math.min(challenge.progress, challenge.targetValue);
        const isComplete = progress >= challenge.targetValue;
        return `
            <div class="challenge ${isComplete ? 'complete' : ''}">
                <span class="challenge-desc">${escapeHtml(challenge.description)}</span>
                <span class="challenge-progress">${isComplete ? 'Done' : `${progress} / ${challenge.targetValue}`}</span>
            </div>
        `;
    }).join('');
}

// -----------------------------------------------------------------------------
// INVENTORY AND ITEMS
// -----------------------------------------------------------------------------

function getItem(itemName) {
    return ITEM_LOOKUP[itemName] || null;
}

function addItem(itemName) {
    const item = getItem(itemName);
    gameState.inventory.push(itemName);

    if (item && (item.uses || item.skipFights) && !gameState.itemUses[itemName]) {
        const uses = item.uses || item.skipFights;
        gameState.itemUses[itemName] = typeof uses === 'string' ? rollExpression(uses, 1) : uses;
    }

    if (item?.type === 'weapon' && !gameState.equippedWeapon) {
        gameState.equippedWeapon = itemName;
    }
    if (item?.type === 'armor' && !gameState.equippedArmor) {
        gameState.equippedArmor = itemName;
        applyArmorFlags(itemName);
    }
}

function removeOneItem(itemName) {
    const index = gameState.inventory.indexOf(itemName);
    if (index < 0) return false;
    gameState.inventory.splice(index, 1);
    if (!gameState.inventory.includes(itemName)) {
        delete gameState.itemUses[itemName];
    }
    if (gameState.equippedWeapon === itemName) gameState.equippedWeapon = null;
    if (gameState.equippedArmor === itemName) gameState.equippedArmor = null;
    return true;
}

function countItem(itemName) {
    return gameState.inventory.filter(item => item === itemName).length;
}

function significantInventoryCount() {
    return gameState.inventory.filter(itemName => itemName !== 'Base map' && itemName !== gameState.equippedArmor).length;
}

function getEquippedWeapon() {
    if (gameState.equippedWeapon) {
        const weapon = getItem(gameState.equippedWeapon);
        if (weapon?.type === 'weapon') return weapon;
    }
    return { name: 'Unarmed', type: 'weapon', value: 'd4-1', description: 'Unarmed damage.' };
}

function applyArmorFlags(itemName) {
    gameState.mirrorVisorAvailable = itemName === 'Mirror visor';
    gameState.sealantAvailable = itemName === 'Perkūnas sealant rig';
}

function handleInventoryClick(itemName) {
    if (itemName === 'Base map') {
        openMap();
        return;
    }

    const item = getItem(itemName);
    if (!item) {
        log(`No rule is attached to ${itemName}.`);
        return;
    }

    if (item.type === 'weapon') {
        toggleEquip(itemName, 'weapon');
        return;
    }

    if (item.type === 'armor') {
        toggleEquip(itemName, 'armor');
        return;
    }

    if (item.type === 'consumable') {
        useConsumable(itemName);
        return;
    }

    log(`${itemName} is ready when a room or combat rule calls for it.`);
}

async function useConsumable(itemName) {
    const item = getItem(itemName);
    if (!item || item.type !== 'consumable') return;

    if (item.repairsBreach) {
        gameState.breached = false;
        removeOneItem(itemName);
        log(`Used ${itemName}; suit breach repaired.`);
        setGameText(`<p class="success">You seal the suit breach with ${escapeHtml(itemName)}.</p>`);
        updateUI();
        return;
    }

    if (item.restores) {
        const amount = rollExpression(item.restores.dice, 1);
        restorePool(item.restores.pool, amount);
        removeOneItem(itemName);
        if (item.sideEffectOnOne && amount === 1) {
            await applyDamage(item.sideEffectOnOne.pool, item.sideEffectOnOne.amount, `${itemName} side effect`);
        }
        if (item.threatPointOnFull && gameState.pools[item.restores.pool].current === gameState.pools[item.restores.pool].max) {
            addThreatPoints(1, 'courage from Mother-soil charm');
        }
        setGameText(`<p class="success">Used ${escapeHtml(itemName)}. Restored ${amount} ${POOL_LABELS[item.restores.pool]}.</p>`);
        updateUI();
        return;
    }

    if (item.restoresAll) {
        Object.entries(item.restoresAll).forEach(([pool, amount]) => restorePool(pool, amount));
        removeOneItem(itemName);
        setGameText(`<p class="success">Used ${escapeHtml(itemName)}. Body, Mind, and Soul each recover.</p>`);
        updateUI();
        return;
    }

    log(`${itemName} is kept for a specific danger.`);
}

async function usePotion() {
    const preferred = ['Red stim', 'Dream sedative', 'Mother-soil charm', 'O2 canister']
        .find(itemName => countItem(itemName) > 0 && shouldUseConsumable(itemName));
    if (preferred) {
        await useConsumable(preferred);
    }
}

function shouldUseConsumable(itemName) {
    const item = getItem(itemName);
    if (!item?.restores) return false;
    const pool = gameState.pools[item.restores.pool];
    return pool.current < pool.max;
}

function toggleEquip(itemName, itemType) {
    const slot = itemType === 'weapon' ? 'equippedWeapon' : 'equippedArmor';
    if (gameState[slot] === itemName) {
        gameState[slot] = null;
        log(`Unequipped ${itemName}.`);
    } else {
        gameState[slot] = itemName;
        log(`Equipped ${itemName}.`);
    }
    if (itemType === 'armor') {
        applyArmorFlags(gameState.equippedArmor);
    }
    updateUI();
}

function updateInventoryUI() {
    const inventoryEl = document.getElementById('inventory');
    if (!inventoryEl) return;

    const signature = JSON.stringify({
        inventory: gameState.inventory,
        weapon: gameState.equippedWeapon,
        armor: gameState.equippedArmor,
        uses: gameState.itemUses
    });
    if (
        signature === JSON.stringify(lastInventorySnapshot)
        && gameState.equippedWeapon === lastEquippedWeapon
        && gameState.equippedArmor === lastEquippedArmor
    ) {
        return;
    }

    lastInventorySnapshot = JSON.parse(signature);
    lastEquippedWeapon = gameState.equippedWeapon;
    lastEquippedArmor = gameState.equippedArmor;

    if (gameState.inventory.length === 0) {
        inventoryEl.innerHTML = 'Empty';
        return;
    }

    const counts = gameState.inventory.reduce((acc, itemName) => {
        acc[itemName] = (acc[itemName] || 0) + 1;
        return acc;
    }, {});

    inventoryEl.innerHTML = Object.entries(counts).map(([itemName, count]) => {
        const item = getItem(itemName);
        const isEquipped = itemName === gameState.equippedWeapon || itemName === gameState.equippedArmor;
        const uses = gameState.itemUses[itemName] ? ` · ${gameState.itemUses[itemName]} use${gameState.itemUses[itemName] === 1 ? '' : 's'}` : '';
        const countText = count > 1 ? ` (x${count})` : '';
        const classes = ['inventory-item', isEquipped ? 'equipped' : '', item?.type === 'gear' || item?.type === 'device' ? 'non-selectable' : '']
            .filter(Boolean)
            .join(' ');
        return `<button class="${classes}" onclick="handleInventoryClick('${escapeHtml(itemName)}')" title="${escapeHtml(item?.description || '')}">
            ${escapeHtml(itemName)}${countText}${uses}
        </button>`;
    }).join(' ');
}

// -----------------------------------------------------------------------------
// POOLS, TESTS, AND DAMAGE
// -----------------------------------------------------------------------------

function setPool(pool, max) {
    gameState.pools[pool] = { current: max, max };
}

function restorePool(pool, amount) {
    const value = gameState.pools[pool];
    value.current = clamp(value.current + amount, 0, value.max);
    log(`Restored ${amount} ${POOL_LABELS[pool]}.`);
}

function testTargetForPool(pool) {
    const current = gameState.pools[pool].current;
    if (current >= 13) return 2;
    if (current >= 9) return 3;
    if (current >= 5) return 4;
    if (current >= 1) return 5;
    return Infinity;
}

function getPoolTestBonus(pool) {
    let bonus = 0;
    const weapon = getEquippedWeapon();
    if (pool === 'body' && weapon.bodyTestBonus) bonus += weapon.bodyTestBonus;
    if (pool === 'body' && gameState.inventory.includes('Climbing line')) bonus += 1;
    return bonus;
}

async function attributeTest(pool, label, oxygenPush = false) {
    const threshold = testTargetForPool(pool);
    if (threshold === Infinity) return false;
    let roll = rollDie(6);
    let bonus = getPoolTestBonus(pool);
    if (oxygenPush) {
        spendOxygen(1, `push ${label}`);
        bonus += 1;
    }
    let total = roll + bonus;
    let success = total >= threshold;
    let rerollDetail = '';
    if (!success && pool === 'mind' && gameState.coldMindAvailable) {
        gameState.coldMindAvailable = false;
        const secondRoll = rollDie(6);
        rerollDetail = ` · Cold Mind reroll ${secondRoll}`;
        roll = secondRoll;
        total = roll + bonus;
        success = total >= threshold;
    }
    if (!success && pool === 'soul' && gameState.oldSoulAvailable) {
        gameState.oldSoulAvailable = false;
        const secondRoll = rollDie(6);
        rerollDetail = ` · Old Soul reroll ${secondRoll}`;
        roll = secondRoll;
        total = roll + bonus;
        success = total >= threshold;
    }
    await showDiceRoll({
        context: `${POOL_LABELS[pool]} Test`,
        dice: [{ type: 'd6', result: roll }],
        threshold,
        outcome: success ? 'SUCCESS' : 'FAIL',
        isSuccess: success,
        detail: `${label}${bonus ? ` · +${bonus}` : ''}${rerollDetail}`
    });
    log(`${POOL_LABELS[pool]} test for ${label}: ${roll}${bonus ? ` + ${bonus}` : ''} vs ${threshold} (${success ? 'success' : 'fail'}).`);
    return success;
}

function spendOxygen(amount, reason) {
    let remaining = amount;
    while (remaining > 0) {
        if (gameState.pools.oxygen.current > 0) {
            gameState.pools.oxygen.current -= 1;
        } else {
            gameState.pools.body.current -= 1;
            log(`Oxygen is empty; ${reason} costs 1 Body.`);
        }
        remaining--;
    }
    checkDefeat(`${reason} with no Oxygen`);
}

async function oxygenCollapseTick(reason) {
    if (gameState.pools.oxygen.current > 0) return;
    await applyDamage('body', 1, `oxygen collapse during ${reason}`, { bypassArmor: true });
}

async function breachSuit(source) {
    if (gameState.sealantAvailable) {
        gameState.sealantAvailable = false;
        log('Perkūnas sealant rig ignores the first suit breach.');
        return;
    }
    if (!gameState.breached) {
        gameState.breached = true;
        const loss = rollExpression('d4', 1);
        await applyDamage('oxygen', loss, `${source} suit breach`, { bypassArmor: true });
    }
}

async function applyDamage(pool, amount, source, options = {}) {
    let damage = Math.max(0, amount);
    const physical = pool === 'body' && !options.bypassArmor;

    if (pool === 'mind' && gameState.firstMindDamagePlusOne) {
        damage += 1;
        gameState.firstMindDamagePlusOne = false;
    }

    if (pool === 'mind' && gameState.equippedArmor === 'Mirror visor' && gameState.mirrorVisorAvailable && damage > 0) {
        const reduction = rollExpression('d4', 1);
        damage = Math.max(0, damage - reduction);
        gameState.mirrorVisorAvailable = false;
        log(`Mirror visor reduces Mind damage by ${reduction}.`);
    }

    if (pool === 'soul' && countItem('Moon-salt pouch') > 0 && damage > 0) {
        removeOneItem('Moon-salt pouch');
        if (gameState.currentRoom) gameState.currentRoom.unsafe = true;
        log('Moon-salt pouch cancels Soul damage; the room becomes unsafe.');
        damage = 0;
    }

    if (physical && gameState.equippedArmor === 'Hardsuit plating' && damage > 0) {
        const armorDie = gameState.currentMonster?.name === 'Moon Devil' ? 'd4-1' : 'd4';
        const absorbed = rollExpression(armorDie, 0);
        damage = Math.max(0, damage - absorbed);
        log(`Hardsuit plating absorbs ${absorbed} Body.`);
    }

    if (pool === 'body' && gameState.ironBodyAvailable && damage > 0) {
        damage = Math.max(0, damage - 1);
        gameState.ironBodyAvailable = false;
        log('Iron Body reduces this Body damage by 1.');
    }

    if (damage > 0) {
        gameState.pools[pool].current = Math.max(0, gameState.pools[pool].current - damage);
        log(`${source}: ${damage} ${POOL_LABELS[pool]} damage.`);
        if (pool === 'body' || pool === 'mind' || pool === 'soul') {
            safeSound('playPlayerHitSound');
            triggerDamageEffect();
        }
    } else {
        log(`${source}: no damage gets through.`);
    }

    if (physical && damage > 0 && gameState.breached) {
        gameState.pools.oxygen.current = Math.max(0, gameState.pools.oxygen.current - 1);
        log('Breached suit loses 1 Oxygen after a physical hit.');
    }

    if (pool === 'oxygen' && gameState.pools.oxygen.current === 0 && gameState.breached) {
        gameState.pools.soul.current = Math.max(0, gameState.pools.soul.current - 1);
        log('The empty breached suit costs 1 Soul.');
    }

    checkDefeat(source);
}

function checkDefeat(source) {
    if (gameState.playerIsDead || gameState.gameWon) return;
    if (gameState.pools.body.current <= 0) {
        gameOver(`Body reached 0. ${source}`);
    } else if (gameState.pools.mind.current <= 0) {
        gameOver(`Mind reached 0. Catatonia ends the mission. ${source}`);
    } else if (gameState.pools.soul.current <= 0) {
        gameOver(`Soul reached 0. You break and run for the airlock. ${source}`);
    }
}

// -----------------------------------------------------------------------------
// START, EXPLORATION, AND ROOMS
// -----------------------------------------------------------------------------

function startGame() {
    const titleEl = document.querySelector('h1.cyber-glitch');
    if (titleEl) titleEl.style.display = 'none';

    gameState = createInitialGameState();
    combatActionBusy = false;
    lastInventorySnapshot = [];
    lastEquippedWeapon = null;
    lastEquippedArmor = null;
    loadChallenges();

    gameState.gameStarted = true;
    gameState.playerName = sample(PLAYER_NAMES);
    gameState.playerProfession = sample(PLAYER_PROFESSIONS);
    gameState.faction = sample(FACTIONS);
    gameState.mission = sample(MISSIONS);

    setPool('body', rollExpression('3d6', 3));
    setPool('mind', rollExpression('3d6', 3));
    setPool('soul', rollExpression('3d6', 3));
    setPool('oxygen', rollExpression('12+d6', 13));

    const startingCredits = rollExpression('15+d6', 16);
    addCredits(startingCredits, 'starting credits');

    addItem('Base map');
    const startingWeapon = STARTING_WEAPONS[rollDie(6) - 1];
    const startingItem = STARTING_ITEMS[rollDie(6) - 1];
    addItem(startingWeapon.name);
    addItem(startingItem.name);

    gameState.equippedWeapon = startingWeapon.name;
    if (startingItem.type === 'armor') {
        gameState.equippedArmor = startingItem.name;
        applyArmorFlags(startingItem.name);
    }

    updateAutoExploreButton();

    log(`${gameState.playerName}, ${gameState.playerProfession}, enters under contract with ${gameState.faction.name}.`);
    log(`Mission: ${gameState.mission.briefing}. Target: ${gameState.mission.target}.`);
    log(`Starting kit: ${startingWeapon.name}, ${startingItem.name}.`);

    setGameText(`
        <p><strong>${escapeHtml(gameState.mission.briefing)}</strong></p>
        <p>Target: ${escapeHtml(gameState.mission.target)}.</p>
        <p class="info">Faction tie: <strong>${escapeHtml(gameState.faction.name)}</strong>. ${escapeHtml(gameState.faction.edge)}</p>
        <p>The airlock opens. The base waits below.</p>
    `);
    updateUI();
    showToast('Mission started', 'success');
}

function createRoom({ shape = null, doors = null, eventType = 'Unknown', details = '' } = {}) {
    return {
        room: gameState.map.length + 1,
        shape,
        doors,
        type: eventType,
        details,
        explored: false,
        safe: false,
        unsafe: false,
        fled: false,
        livingThreat: false,
        threatPoints: shape?.threatPoints || 1
    };
}

function rollRoomShape() {
    const roll = rollDie(6) + rollDie(6);
    const shape = ROOM_SHAPES.find(row => roll >= row.min && roll <= row.max);
    return { ...shape, roll };
}

function rollDoors(shape) {
    if (shape?.fixedDoors) return shape.fixedDoors;
    const roll = rollDie(4);
    const entry = DOORS_TABLE.find(row => row.roll === roll);
    return entry ? entry.doors : 2;
}

function markRoomExplored(room, reason = 'room explored') {
    if (!room || room.explored) return;
    room.explored = true;
    room.livingThreat = false;
    gameState.roomsExplored += 1;
    addThreatPoints(room.threatPoints || 1, reason);
    updateChallengeProgress('explore', 'room', 1);
}

function addThreatPoints(amount, reason) {
    gameState.threatPoints += amount;
    log(`+${amount} threat point${amount === 1 ? '' : 's'} (${reason}).`);
}

function addCredits(amount, reason) {
    const finalAmount = gameState.targetRecovered && gameState.keptExploringAfterTarget ? amount * 2 : amount;
    gameState.credits += finalAmount;
    gameState.totalCreditsCollected += finalAmount;
    updateChallengeProgress('collect', 'credits', finalAmount);
    log(`+${finalAmount} credits (${reason}).`);
    if (gameState.mission?.scrapTarget && !gameState.targetRecovered && gameState.credits >= gameState.mission.scrapTarget) {
        recoverTarget('salvage quota reached');
    }
}

async function exploreRoom() {
    if (!gameState.gameStarted || gameState.inCombat || gameState.inShop || gameState.playerIsDead) return;

    gameState.canScavenge = false;

    if (gameState.pendingInsertion) {
        await resolveInsertion();
        return;
    }

    const wasCarryingTarget = gameState.targetRecovered;
    if (wasCarryingTarget) {
        gameState.keptExploringAfterTarget = true;
    }

    const extraLoad = Math.max(0, significantInventoryCount() - GAME_RULES.inventoryLimit);
    let oxygenCost = 1 + extraLoad;
    if (gameState.longBreathAvailable && oxygenCost > 0) {
        oxygenCost -= 1;
        gameState.longBreathAvailable = false;
        log('Long Breath makes this room entry cost 0 base Oxygen.');
    }
    spendOxygen(oxygenCost, `entering room${extraLoad ? ' with overloaded kit' : ''}`);
    if (gameState.playerIsDead) return;

    const shape = rollRoomShape();
    const doors = rollDoors(shape);
    const room = createRoom({ shape, doors });
    gameState.currentRoom = room;
    gameState.map.push(room);

    const roomRoll = rollDie(6);
    await showDiceRoll({
        context: 'Room Table',
        dice: [{ type: 'd6', result: roomRoll }],
        outcome: roomRollToLabel(roomRoll),
        isSuccess: roomRoll === 1 || roomRoll === 6 ? true : roomRoll >= 4 ? false : null,
        detail: `${shape.name} · ${doors} exit${doors === 1 ? '' : 's'}`
    });

    if (shouldFindTarget(roomRoll)) {
        await resolveTargetRoom(room);
    } else {
        await resolveRoomRoll(room, roomRoll);
    }

    if (!gameState.playerIsDead && wasCarryingTarget && rollDie(6) === 1) {
        const damage = rollExpression('d4', 1);
        await applyDamage(gameState.mission.pool, damage, 'the recovered artifact wakes');
    }
}

async function resolveInsertion() {
    gameState.pendingInsertion = false;
    const roll = rollDie(4);
    const room = createRoom({
        shape: { name: 'Entry chamber', effect: 'airlock insertion', threatPoints: 1 },
        doors: roll,
        eventType: 'Entry',
        details: `${roll} exit${roll === 1 ? '' : 's'}`
    });
    gameState.currentRoom = room;
    gameState.map.push(room);

    await showDiceRoll({
        context: 'Insertion',
        dice: [{ type: 'd4', result: roll }],
        outcome: ['LOOT', 'GUARD', 'SURVEYOR', 'SILENCE'][roll - 1],
        isSuccess: roll === 1 || roll === 4,
        detail: `${roll} door${roll === 1 ? '' : 's'} deeper`
    });

    if (roll === 1) {
        const item = rollRandomLoot();
        addItem(item.name);
        room.type = 'Loot';
        room.details = item.name;
        markRoomExplored(room, 'entry chamber resolved');
        setGameText(`<p class="success">The entry chamber holds ${escapeHtml(item.name)}.</p><p>${escapeHtml(item.description || '')}</p>`);
    } else if (roll === 2) {
        const monster = sample(WEAK_MONSTERS);
        room.type = 'Threat';
        room.details = monster.name;
        room.livingThreat = true;
        setGameText(`<p class="warning">A ${escapeHtml(monster.name)} guards the airlock approach.</p>`);
        startCombat(monster, room);
        return;
    } else if (roll === 3) {
        const device = sample(DEVICES);
        addItem(device.name);
        room.type = 'Surveyor';
        room.details = device.name;
        await applyDamage('soul', 1, 'leaving the dying surveyor breathing', { bypassArmor: true });
        markRoomExplored(room, 'entry chamber resolved');
        setGameText(`<p>A dying surveyor presses ${escapeHtml(device.name)} into your glove. The mercy you do not give costs 1 Soul.</p>`);
    } else {
        room.type = 'Safe';
        room.safe = true;
        restorePool('soul', 1);
        markRoomExplored(room, 'entry chamber resolved');
        setGameText('<p>The chamber is silent. Lights flicker in an old folk-song rhythm. You mark it as a safe backtrack point and steady your Soul.</p>');
    }

    updateUI();
}

function roomRollToLabel(roll) {
    const entry = ROOM_TABLE.find(row => row.roll === roll);
    return entry ? entry.label.toUpperCase() : 'ROOM';
}

function shouldFindTarget(roomRoll) {
    if (gameState.targetRecovered) return false;
    if (gameState.mission?.scrapTarget && gameState.credits >= gameState.mission.scrapTarget) return true;
    if (gameState.roomsExplored >= 12 && roomRoll !== 4 && roomRoll !== 5) return true;
    return gameState.roomsExplored >= 6 && roomRoll === 1;
}

async function resolveTargetRoom(room) {
    room.type = 'Target';
    room.details = gameState.mission.target;
    const pool = gameState.mission.pool;
    const success = await attributeTest(pool, gameState.mission.briefing);
    if (!success) {
        const damage = rollExpression('d4', 1);
        await applyDamage(pool, damage, `${gameState.mission.briefing} complication`);
        if (gameState.mission.briefing === 'Wake the AI') {
            gameState.firstMindDamagePlusOne = true;
        }
    }
    recoverTarget('target chamber');
    markRoomExplored(room, 'target chamber secured');
    setGameText(`
        <p class="success"><strong>Target recovered:</strong> ${escapeHtml(gameState.mission.target)}.</p>
        <p>${escapeHtml(gameState.mission.twist)}</p>
        <p>You can extract now, or keep looting and let the artifact wake on a 1-in-6 after each new room.</p>
    `);
    updateUI();
}

function recoverTarget(reason) {
    if (gameState.targetRecovered) return;
    gameState.targetRecovered = true;
    gameState.targetRoomNumber = gameState.currentRoom?.room || null;
    updateChallengeProgress('target', 'mission', 1);
    log(`Mission target recovered (${reason}).`);
}

async function resolveRoomRoll(room, roll) {
    if (roll === 1) {
        await resolveQuietSalvage(room);
    } else if (roll === 2) {
        await resolvePit(room);
    } else if (roll === 3) {
        await resolveAnomaly(room);
    } else if (roll === 4) {
        const monster = sample(WEAK_MONSTERS);
        room.type = 'Threat';
        room.details = monster.name;
        room.livingThreat = true;
        startCombat(monster, room);
    } else if (roll === 5) {
        const monster = sample(TOUGH_MONSTERS);
        room.type = 'Threat';
        room.details = monster.name;
        room.livingThreat = true;
        startCombat(monster, room);
    } else {
        room.type = 'Void Peddler';
        room.details = 'trade';
        markRoomExplored(room, 'void peddler room resolved');
        openShop(true);
    }
}

async function resolveQuietSalvage(room) {
    room.type = 'Quiet salvage';
    if (gameState.pools.soul.current < gameState.pools.soul.max) {
        restorePool('soul', 1);
        room.details = '+1 Soul';
    } else {
        const credits = rollExpression('d6', 1);
        addCredits(credits, 'quiet salvage');
        room.details = `${credits} credits`;
    }
    gameState.canScavenge = true;
    markRoomExplored(room, 'quiet salvage room resolved');
    setGameText('<p class="success">Quiet salvage. You take the obvious benefit. You may rush the search with a Mind test for more.</p>');
    updateUI();
}

async function resolvePit(room) {
    room.type = 'Pit / drop';
    const success = await attributeTest('body', 'cross pit / drop / cable well');
    if (!success) {
        const damage = rollExpression('d6', 1);
        await applyDamage('body', damage, 'pit fall');
        await breachSuit('pit fall');
        room.details = `${damage} Body`;
    } else {
        room.details = 'crossed';
    }
    markRoomExplored(room, 'pit room resolved');
    setGameText(`<p>${success ? 'You cross cleanly.' : 'You cross, but the fall and breach leave a mark.'}</p>`);
    updateUI();
}

async function resolveAnomaly(room) {
    room.type = 'Anomaly';
    const pool = gameState.pools.mind.current >= gameState.pools.soul.current ? 'mind' : 'soul';
    const success = await attributeTest(pool, 'parse anomaly broadcast');
    if (success) {
        if (gameState.pools.mind.current < gameState.pools.mind.max) {
            const amount = rollExpression('d4', 1);
            restorePool('mind', amount);
            room.details = `+${amount} Mind`;
        } else {
            addThreatPoints(3, 'understood anomaly');
            room.details = '+3 threat';
        }
    } else {
        const damage = rollExpression('d4', 1);
        await applyDamage(pool, damage, 'anomaly broadcast');
        room.details = `${damage} ${POOL_LABELS[pool]}`;
    }
    markRoomExplored(room, 'anomaly room resolved');
    setGameText(`<p>${success ? 'You parse the impossible signal before it parses you.' : 'The signal gets inside the suit.'}</p>`);
    updateUI();
}

async function scavenge() {
    if (!gameState.canScavenge || !gameState.currentRoom) return;
    gameState.canScavenge = false;
    const success = await attributeTest('mind', 'rush quiet salvage');
    if (success) {
        const credits = rollExpression('d6', 1);
        addCredits(credits, 'rushed salvage');
        gameState.currentRoom.safe = true;
        gameState.currentRoom.details = `${gameState.currentRoom.details}; safe; +${credits} credits`;
        setGameText(`<p class="success">The rushed search pays off: ${credits} credits and a safe backtrack point.</p>`);
    } else {
        gameState.currentRoom.unsafe = true;
        gameState.currentRoom.details = `${gameState.currentRoom.details}; unsafe`;
        setGameText('<p class="warning">The search makes noise. Backtracking through this room is unsafe.</p>');
    }
    updateUI();
}

function rollRandomLoot() {
    const roll = rollDie(6);
    if (roll === 1) return sample(WEAPONS);
    if (roll === 2) return sample(CONSUMABLES);
    if (roll === 3) return sample(GEAR);
    if (roll === 4) return sample(DEVICES);
    if (roll === 5) return sample(SUITS);
    addThreatPoints(2, 'artifact clue');
    return { name: 'Artifact clue', type: 'clue', description: '+2 threat points and +1 to locate the target chamber.' };
}

// -----------------------------------------------------------------------------
// COMBAT
// -----------------------------------------------------------------------------

function startCombat(monster, room = gameState.currentRoom) {
    const armor = getItem(gameState.equippedArmor);
    if (armor?.skipFights && gameState.itemUses[gameState.equippedArmor] > 0) {
        gameState.itemUses[gameState.equippedArmor] -= 1;
        addThreatPoints(monster.points, `${monster.name} bypassed with ${gameState.equippedArmor}`);
        if (room) {
            room.type = 'Bypassed threat';
            room.details = `${monster.name} bypassed`;
            markRoomExplored(room, 'threat bypassed by phase cloak');
        }
        setGameText(`<p class="success">${escapeHtml(gameState.equippedArmor)} phases you past ${escapeHtml(monster.name)}. You keep the threat points as cunning survival.</p>`);
        updateUI();
        return;
    }

    gameState.inCombat = true;
    gameState.currentRoom = room;
    gameState.currentMonster = { ...monster, currentHp: monster.hp, difficulty: monster.points, firstMiss: true };
    gameState.combatTurn = 1;
    gameState.combatFeed = [];
    gameState.autoBattle = false;
    gameState.monsterDying = false;
    combatActionBusy = false;
    document.body.classList.add('in-combat');

    const m = gameState.currentMonster;
    const hitChance = Math.max(0, Math.min(100, Math.round(((7 - m.points) / 6) * 100)));

    setGameText(`
        <div class="battle-interface" id="battle-interface">
            <div class="battle-header">
                <span class="battle-header-title"><span class="material-symbols-outlined">swords</span> Combat</span>
                <span class="round-chip">Round <span id="battle-turn-counter">${gameState.combatTurn}</span></span>
            </div>
            <div class="battle-arena">
                <div class="arena-combatant player-side">
                    <div class="arena-name">${escapeHtml(gameState.playerName)}</div>
                    <div class="arena-sprite arena-sprite-enter-player" id="battle-player-actor">
                        <img src="${PLAYER_SPRITE}" alt="${escapeHtml(gameState.playerName || 'Explorer')}">
                    </div>
                    <div class="arena-hp-wrap">
                        <div class="arena-hp-bar">
                            <div id="battle-player-hp-bar-fill" class="arena-hp-fill player-hp" style="width:${poolPercent('body')}%;"></div>
                            <div class="arena-hp-text">Body <span id="battle-body">${renderPool('body')}</span></div>
                        </div>
                    </div>
                </div>
                <div class="arena-center">
                    <div class="arena-vs">VS</div>
                </div>
                <div class="arena-combatant enemy-side ${TOUGH_MONSTERS.some(t => t.name === m.name) ? 'tough' : 'weak'}">
                    <div class="arena-name">${escapeHtml(m.name)} <span class="threat-pips">${escapeHtml(m.type)}</span></div>
                    <div class="arena-sprite arena-sprite-enter-enemy" id="battle-enemy-actor">
                        <img src="${getMonsterSprite(m)}" alt="${escapeHtml(m.name)}" id="monster-stats-display">
                    </div>
                    <div class="arena-hp-wrap">
                        <div class="arena-hp-bar">
                            <div id="battle-enemy-hp-bar" class="arena-hp-fill enemy-hp" style="width:100%;"></div>
                            <div class="arena-hp-text"><span id="monster-hp">${m.currentHp}</span>/${m.hp}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="battle-stats-bar">
                <div class="stat-card you">
                    <div class="battle-stat-item dmg" title="Weapon damage"><span class="material-symbols-outlined">flash_on</span><span id="battle-player-damage">${escapeHtml(getEquippedWeapon().value)}</span></div>
                    <div class="battle-stat-item def" title="Armor"><span class="material-symbols-outlined">shield</span><span id="battle-player-defense">${escapeHtml(gameState.equippedArmor || 'None')}</span></div>
                </div>
                <div class="stat-card" style="background: rgba(242,255,0,0.05); border-color: rgba(242,255,0,0.2);">
                    <div class="battle-stat-item hit" title="Base hit chance"><span class="material-symbols-outlined">my_location</span><span id="battle-hit-chance">${hitChance}%</span></div>
                </div>
                <div class="stat-card enemy">
                    <div class="battle-stat-item threat" title="Threat damage"><span class="material-symbols-outlined">swords</span><span>${escapeHtml(m.damage)} ${POOL_LABELS[m.damagePool]}</span></div>
                </div>
            </div>
            <p class="battle-special">${escapeHtml(m.special || '')}</p>
            <div class="auto-battle-row">
                <button id="auto-battle-btn" class="auto-battle-btn" onclick="toggleAutoBattle()">
                    <span class="material-symbols-outlined">play_arrow</span> <span>Auto</span>
                </button>
                <button id="auto-speed-btn" class="auto-battle-btn auto-speed-btn" onclick="cycleAutoBattleSpeed()">
                    <span class="material-symbols-outlined">bolt</span> <span id="auto-battle-speed-label">x1</span>
                </button>
                <div class="battle-intent hidden" id="battle-intent">
                    <span class="intent-label">Next:</span>
                    <span class="intent-value" id="battle-intent-value">Attack</span>
                </div>
            </div>
            <div id="battle-feed" class="battle-feed"></div>
            <div id="combat-log" class="battle-log"></div>
        </div>
    `);

    pushCombatFeed('info', `${m.name} blocks the route.`);
    updateUI();
    setTimeout(() => {
        document.getElementById('battle-player-actor')?.classList.remove('arena-sprite-enter-player');
        document.getElementById('battle-enemy-actor')?.classList.remove('arena-sprite-enter-enemy');
    }, 700);
}

function poolPercent(pool) {
    const value = gameState.pools[pool];
    return value.max > 0 ? clamp(Math.round((value.current / value.max) * 100), 0, 100) : 0;
}

function updateBattleUI() {
    if (!gameState.inCombat) return;
    setText('battle-body', renderPool('body'));
    setText('battle-player-damage', getEquippedWeapon().value);
    setText('battle-player-defense', gameState.equippedArmor || 'None');
    setText('battle-turn-counter', gameState.combatTurn);

    const playerHpBar = document.getElementById('battle-player-hp-bar-fill');
    if (playerHpBar) {
        const pct = poolPercent('body');
        playerHpBar.style.width = `${pct}%`;
        playerHpBar.className = 'arena-hp-fill player-hp';
        if (pct <= 25) playerHpBar.classList.add('low-hp');
        else if (pct <= 50) playerHpBar.classList.add('medium-hp');
    }

    const monster = gameState.currentMonster;
    if (monster) {
        setText('monster-hp', Math.max(0, monster.currentHp));
        const hpBar = document.getElementById('battle-enemy-hp-bar');
        if (hpBar) hpBar.style.width = `${clamp((monster.currentHp / monster.hp) * 100, 0, 100)}%`;
        const hitEl = document.getElementById('battle-hit-chance');
        if (hitEl) {
            const needed = Math.max(2, monster.points - getAttackBonus(monster));
            const chance = clamp(Math.round(((7 - needed) / 6) * 100), 0, 100);
            hitEl.textContent = `${chance}%`;
        }
    }
    updateBattleIntent();
}

function getAttackBonus(monster) {
    const weapon = getEquippedWeapon();
    let bonus = gameState.attackBonus || 0;
    if (weapon.attackBonus) bonus += weapon.attackBonus;
    if (monster) {
        if (weapon.attackBonusVs?.includes(monster.type) || (weapon.attackBonusVsPool && monster.damagePool === weapon.attackBonusVsPool)) bonus += 1;
        if (monster.name === 'Moon Golem' && ['Pry-hammer', 'Žaltys shock baton'].includes(weapon.name)) bonus += 1;
    }
    if (gameState.currentRoom?.shape?.name === 'Corridor / service shaft' && ['Perkūnas service pistol', 'Moon-salt carbine'].includes(weapon.name)) {
        bonus += 1;
    }
    return bonus;
}

async function attack() {
    await performAttack(false);
}

async function powerAttack() {
    await performAttack(true);
}

async function performAttack(pushWithOxygen) {
    const monster = gameState.currentMonster;
    if (!monster || gameState.monsterDying || combatActionBusy) return;
    combatActionBusy = true;
    setTurnIndicator('player');
    await oxygenCollapseTick('combat round');
    if (gameState.playerIsDead) {
        combatActionBusy = false;
        return;
    }

    let pushBonus = 0;
    if (pushWithOxygen) {
        spendOxygen(1, 'pushing an attack');
        pushBonus = 1;
    }

    safeSound('playAttackSound');
    animateBattleAttack('player');
    const combatLogEl = document.getElementById('combat-log');
    if (combatLogEl) combatLogEl.innerHTML = '';

    const roll = rollDie(6);
    const attackBonus = getAttackBonus(monster) + pushBonus;
    const total = roll + attackBonus;
    const hit = total >= monster.points;

    await sleep(150);
    if (combatLogEl) {
        combatLogEl.insertAdjacentHTML('beforeend', `<p class="info">Attack: [${roll}]${attackBonus ? ` + ${attackBonus}` : ''} vs ${monster.points}</p>`);
    }

    if (hit) {
        const weapon = getEquippedWeapon();
        let damage = rollExpression(weapon.value, 0);
        if (weapon.machineDamageBonus && monster.type === 'Machine') damage += weapon.machineDamageBonus;
        monster.currentHp -= damage;
        showFloatingCombatText('enemy', damage);
        log(`Hit ${monster.name} for ${damage} damage.`);
        pushCombatFeed('player', `-${damage} HP to ${monster.name}`);

        if (countItem('Aitvaras drone-chip') > 0 && gameState.itemUses['Aitvaras drone-chip'] > 0 && monster.currentHp > 0) {
            const droneDamage = rollExpression('d4', 1);
            gameState.itemUses['Aitvaras drone-chip'] -= 1;
            monster.currentHp -= droneDamage;
            log(`Aitvaras drone-chip deals ${droneDamage} extra damage.`);
            pushCombatFeed('player', `Drone: -${droneDamage} HP`);
        }

        if (monster.currentHp <= 0) {
            monster.currentHp = 0;
            await finishMonsterDeath(damage);
        } else {
            triggerMonsterHitEffect();
            if (combatLogEl) combatLogEl.insertAdjacentHTML('beforeend', `<p class="success">Hit for ${damage}.</p>`);
            gameState.combatTurn += 1;
            pulseRoundChip();
        }
    } else {
        showFloatingCombatText('enemy', 0, { miss: true });
        log(`Missed ${monster.name}.`);
        pushCombatFeed('warning', `Missed ${monster.name}`);
        if (combatLogEl) combatLogEl.insertAdjacentHTML('beforeend', `<p class="warning">Miss. The threat hits back.</p>`);
        await applyWeaponMissCost();
        await monsterAttack();
    }

    combatActionBusy = false;
    updateUI();
}

async function applyWeaponMissCost() {
    const weapon = getEquippedWeapon();
    if (!weapon.missCost) return;

    if (weapon.missCost.preventWithOxygen && gameState.pools.oxygen.current > 0) {
        spendOxygen(1, `${weapon.name} brace`);
        log(`${weapon.name} miss: spent 1 Oxygen to brace.`);
        return;
    }

    await applyDamage(weapon.missCost.pool, weapon.missCost.amount, `${weapon.name} miss`, { bypassArmor: true });
}

async function finishMonsterDeath(killingBlowDamage) {
    const monster = gameState.currentMonster;
    gameState.monsterDying = true;
    const hpBar = document.getElementById('battle-enemy-hp-bar');
    if (hpBar) hpBar.style.width = '0%';
    setText('monster-hp', 0);
    triggerMonsterDeathEffect();
    safeSound('playMonsterDieSound');
    setTimeout(() => showSlainOverlay(monster), 350);
    await sleep(900);
    gameState.monsterDying = false;
    winCombat(killingBlowDamage);
}

async function monsterAttack() {
    const monster = gameState.currentMonster;
    if (!monster) return;
    setTurnIndicator('enemy');
    animateBattleAttack('enemy');

    let damage = rollExpression(monster.damage, 0);
    if (gameState.currentRoom?.doors === 0) damage += 1;
    if (gameState.currentRoom?.shape?.name === 'Oval shrine-lab' && monster.damagePool === 'soul') damage += 1;

    await sleep(150);
    const combatLogEl = document.getElementById('combat-log');
    if (combatLogEl) {
        combatLogEl.insertAdjacentHTML('beforeend', `<p class="info">${escapeHtml(monster.name)} damage: ${damage} ${POOL_LABELS[monster.damagePool]}</p>`);
    }

    await applyDamage(monster.damagePool, damage, monster.name);
    showFloatingCombatText('player', damage);
    pushCombatFeed('enemy', `${monster.name}: -${damage} ${POOL_LABELS[monster.damagePool]}`);

    if (monster.name === 'Possessed AI' && damage > 0 && monster.damagePool === 'mind' && gameState.pools.oxygen.current > 0) {
        spendOxygen(1, 'cutting comms against Possessed AI');
        restorePool('mind', 1);
    }

    if (monster.name === 'Repair Drone' && damage > 0 && countItem('Suit patch kit') > 0) {
        removeOneItem('Suit patch kit');
        restorePool('oxygen', 1);
        log('Suit patch kit prevents the Repair Drone oxygen loss.');
    } else if (monster.name === 'Repair Drone' && damage > 0) {
        await applyDamage('oxygen', 1, 'Repair Drone cutter leak', { bypassArmor: true });
    }

    if (monster.name === 'Moon Devil' && damage > 0) {
        await applyDamage('oxygen', 1, 'Moon Devil claw breach', { bypassArmor: true });
    }

    if (monster.name === 'Wire Devil' && damage > 0 && gameState.currentRoom) {
        gameState.currentRoom.unsafe = true;
    }

    if (!gameState.playerIsDead) {
        gameState.combatTurn += 1;
        setTurnIndicator('player');
        pulseRoundChip();
    }
    updateUI();
}

async function flee() {
    if (combatActionBusy) return;
    combatActionBusy = true;
    gameState.autoBattle = false;
    const monster = gameState.currentMonster;
    const room = gameState.currentRoom;
    const damageExpr = room?.doors >= 2 ? 'd4-1' : 'd4';
    const damage = rollExpression(damageExpr, 0);

    spendOxygen(1, 'fleeing combat');
    await applyDamage(monster.damagePool, damage, `fleeing ${monster.name}`);

    if (room) {
        room.fled = true;
        room.livingThreat = true;
        room.details = `${monster.name} fled`;
    }

    gameState.inCombat = false;
    gameState.currentMonster = null;
    document.body.classList.remove('in-combat');
    setGameText(`<p class="warning">You flee, leaving the room unexplored. ${damage} ${POOL_LABELS[monster.damagePool]} damage follows you out.</p>`);
    combatActionBusy = false;
    updateUI();
}

function winCombat(killingBlowDamage) {
    const monster = gameState.currentMonster;
    gameState.monstersDefeated += 1;

    const threatReward = monster.name === 'Moon Golem' ? 7 : monster.points;
    addThreatPoints(threatReward, `${monster.name} defeated`);
    updateChallengeProgress('slay', monster.name, 1);

    const lootItems = resolveMonsterSpecials(monster);
    if (gameState.currentRoom && !gameState.currentRoom.explored) {
        markRoomExplored(gameState.currentRoom, 'threat room survived');
    }

    gameState.inVictory = true;
    showVictoryScreen(monster, lootItems, threatReward, 0);
    updateUI();
}

function resolveMonsterSpecials(monster) {
    const loot = [];
    const weapon = getEquippedWeapon();

    if (weapon.restoreSoulOnWeakKill && WEAK_MONSTERS.some(m => m.name === monster.name)) {
        restorePool('soul', weapon.restoreSoulOnWeakKill);
    }
    if (weapon.loud && gameState.currentRoom) {
        gameState.currentRoom.unsafe = true;
    }
    if (monster.name === 'Dust Devil' && gameState.currentRoom) {
        gameState.currentRoom.safe = true;
    }
    if (monster.name === 'Space Goblin' && rollDie(6) <= 2) {
        const item = sample(GEAR);
        addItem(item.name);
        loot.push(item.name);
    }
    if (monster.name === 'Root Doctor') {
        const credits = rollExpression('3d6', 3);
        addCredits(credits, 'Root Doctor loot');
    }
    if (monster.name === 'Vacuum Basilisk' && rollDie(6) <= 2) {
        addThreatPoints(10, 'Vacuum Basilisk hide insight');
        if (gameState.breached) gameState.breached = false;
    }
    if (gameState.hunterHandAvailable) {
        const weakestPool = POOLS.reduce((lowest, pool) => {
            const currentPct = gameState.pools[pool].current / gameState.pools[pool].max;
            const lowestPct = gameState.pools[lowest].current / gameState.pools[lowest].max;
            return currentPct < lowestPct ? pool : lowest;
        }, 'body');
        restorePool(weakestPool, 1);
        gameState.hunterHandAvailable = false;
    }

    if (Math.random() < 0.25) {
        const item = rollRandomLoot();
        if (item.name !== 'Artifact clue') {
            addItem(item.name);
            loot.push(item.name);
        }
    }
    return loot;
}

function showVictoryScreen(monster, lootItems, xp, credits) {
    const lootHtml = lootItems.length
        ? lootItems.map(item => `<span class="victory-loot-item">${escapeHtml(item)}</span>`).join('')
        : '<span class="victory-loot-empty">None</span>';

    setGameText(`
        <div class="victory-screen" id="victory-screen-root">
            <h2 class="victory-title">SURVIVED</h2>
            <div class="victory-monster" id="victory-monster">
                <img src="${getMonsterSprite(monster)}" alt="${escapeHtml(monster.name)}">
                <div>Defeated: <strong>${escapeHtml(monster.name)}</strong></div>
            </div>
            <div class="victory-rewards">
                <p class="reward-row reward-xp"><span class="reward-icon"><span class="material-symbols-outlined">star</span></span><span class="reward-value">+${xp}</span><span class="reward-label">Threat points</span></p>
                <p class="reward-row reward-silver"><span class="reward-icon"><span class="material-symbols-outlined">paid</span></span><span class="reward-value">+${credits}</span><span class="reward-label">Credits</span></p>
                <div class="victory-loot"><span class="victory-loot-label">Loot:</span><span class="victory-loot-list">${lootHtml}</span></div>
            </div>
            <button class="victory-continue-btn" onclick="endCombatEncounter()"><span>Continue</span><span class="material-symbols-outlined">arrow_forward</span></button>
        </div>
    `);
    safeSound('playVictorySound');
}

function endCombatEncounter() {
    gameState.autoBattle = false;
    combatActionBusy = false;
    gameState.inVictory = false;
    gameState.inCombat = false;
    gameState.currentMonster = null;
    document.body.classList.remove('in-combat');
    setGameText(`<p>The fight is over. ${canLevelUpNow() ? 'Your threat points are high enough to advance.' : 'The base is quiet for now.'}</p>`);
    updateUI();
    if (gameState.autoExplore) runAutoExplore();
}

function toggleAutoBattle() {
    gameState.autoBattle = !gameState.autoBattle;
    const btn = document.getElementById('auto-battle-btn');
    if (btn) {
        btn.classList.toggle('active', gameState.autoBattle);
        btn.innerHTML = gameState.autoBattle
            ? '<span class="material-symbols-outlined">pause</span> <span>Auto</span>'
            : '<span class="material-symbols-outlined">play_arrow</span> <span>Manual</span>';
    }
    updateBattleIntent();
    updateUI();
    if (gameState.autoBattle) runAutoBattle();
}

function cycleAutoBattleSpeed() {
    if (gameState.autoBattleDelay === 500) gameState.autoBattleDelay = 300;
    else if (gameState.autoBattleDelay === 300) gameState.autoBattleDelay = 150;
    else gameState.autoBattleDelay = 500;
    setText('auto-battle-speed-label', gameState.autoBattleDelay <= 150 ? 'x3' : gameState.autoBattleDelay <= 300 ? 'x2' : 'x1');
}

function updateBattleIntent() {
    const intentEl = document.getElementById('battle-intent');
    const valueEl = document.getElementById('battle-intent-value');
    if (!intentEl || !valueEl) return;
    if (!gameState.inCombat || !gameState.autoBattle || gameState.monsterDying) {
        intentEl.classList.add('hidden');
        return;
    }
    intentEl.classList.remove('hidden');
    valueEl.textContent = pickAutoBattleAction() === 'potion' ? 'Use item' : 'Attack';
}

function pickAutoBattleAction() {
    const lowPool = POOLS.find(pool => gameState.pools[pool].current / gameState.pools[pool].max <= 0.35);
    if (lowPool) {
        const item = ['Red stim', 'Dream sedative', 'Mother-soil charm', 'O2 canister']
            .find(itemName => countItem(itemName) > 0 && getItem(itemName)?.restores?.pool === lowPool);
        if (item) return 'potion';
    }
    return 'attack';
}

async function runAutoBattle() {
    while (gameState.autoBattle && gameState.inCombat && !gameState.playerIsDead && !gameState.inVictory) {
        const action = pickAutoBattleAction();
        if (action === 'potion') await usePotion();
        else await performAttack(false);
        if (gameState.autoBattle && gameState.inCombat) await sleep(gameState.autoBattleDelay);
    }
    gameState.autoBattle = false;
    const btn = document.getElementById('auto-battle-btn');
    if (btn) {
        btn.classList.remove('active');
        btn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> <span>Manual</span>';
    }
}

// -----------------------------------------------------------------------------
// EXTRACTION AND ADVANCEMENT
// -----------------------------------------------------------------------------

async function extractMission() {
    if (!gameState.targetRecovered || gameState.inCombat || gameState.inShop) return;

    const route = calculateExtractionRoute();
    spendOxygen(route.oxygenCost, 'extraction route');
    if (gameState.playerIsDead) return;

    const roll = rollDie(6);
    const total = roll + route.modifier;
    const clean = total >= 4;

    await showDiceRoll({
        context: 'Extraction',
        dice: [{ type: 'd6', result: roll }],
        threshold: 4,
        outcome: clean ? 'CLEAN EXIT' : 'COMPLICATION',
        isSuccess: clean,
        detail: `modifier ${route.modifier >= 0 ? '+' : ''}${route.modifier}; paid ${route.oxygenCost} Oxygen`
    });

    if (clean) {
        addThreatPoints(1, 'clean extraction');
        updateChallengeProgress('extract', 'clean', 1);
    } else {
        await resolveExtractionComplication();
        if (gameState.playerIsDead) return;
    }

    completeMission(clean, route);
}

function calculateExtractionRoute() {
    const pathRooms = Math.max(0, gameState.map.length - 1);
    const safeRooms = gameState.map.filter(room => room.safe).length;
    const oxygenDiscount = Math.min(Math.max(0, safeRooms - 1), pathRooms);
    const oxygenCost = Math.max(0, pathRooms - oxygenDiscount);

    let modifier = gameState.extractionBonus || 0;
    if (safeRooms > 0) modifier += 1;
    if (gameState.map.some(room => room.doors >= 2)) modifier += 1;
    if (gameState.map.some(room => room.fled)) modifier -= 1;
    if (gameState.map.some(room => room.livingThreat)) modifier -= 1;
    if (gameState.keptExploringAfterTarget) modifier -= 1;

    return { pathRooms, oxygenCost, modifier };
}

async function resolveExtractionComplication() {
    const roll = rollDie(6);
    if (roll === 1) {
        const loss = rollExpression('d4', 1);
        await applyDamage('oxygen', loss, 'extraction air leak', { bypassArmor: true });
    } else if (roll === 2) {
        const monster = sample(WEAK_MONSTERS);
        const damage = rollExpression(monster.damage, 1);
        await applyDamage(monster.damagePool, damage, `blocked route: ${monster.name}`);
    } else if (roll === 3) {
        const success = await attributeTest('body', 'hard extraction crossing');
        if (!success) await applyDamage('body', rollExpression('d4', 1), 'hard extraction crossing');
    } else if (roll === 4) {
        const success = await attributeTest('mind', 'bad route signal');
        if (!success) spendOxygen(1, 'bad signal route correction');
    } else if (roll === 5) {
        const success = await attributeTest('soul', 'voices in the suit');
        if (!success) await applyDamage('soul', rollExpression('d4', 1), 'voices in the suit');
    } else {
        const loose = gameState.inventory.find(item => item !== 'Base map' && item !== gameState.equippedWeapon && item !== gameState.equippedArmor);
        if (loose) {
            removeOneItem(loose);
            log(`Dropped salvage during extraction: ${loose}.`);
        } else {
            const lost = Math.min(gameState.credits, rollExpression('d6', 1));
            gameState.credits -= lost;
            log(`Dropped ${lost} credits during extraction.`);
        }
    }
}

function completeMission(clean, route) {
    const payout = typeof gameState.mission.payout === 'number' ? gameState.mission.payout : gameState.credits;
    gameState.credits += payout;
    gameState.totalCreditsCollected += payout;
    updateChallengeProgress('collect', 'credits', payout);
    addThreatPoints(3, 'mission payout');
    saveChallenges();
    winGame(clean
        ? `Clean extraction with ${gameState.mission.target}. Payout: ${payout} credits.`
        : `Extraction succeeded after complications. Payout: ${payout} credits.`);
}

function canLevelUpNow() {
    return gameState.threatPoints >= LEVEL_UP_COST && gameState.advancements.length < ADVANCEMENTS.length;
}

function levelUp() {
    if (!canLevelUpNow()) return;
    const available = ADVANCEMENTS.filter(adv => !gameState.advancements.includes(adv.id));
    const advancement = available[rollDie(available.length) - 1];
    gameState.advancements.push(advancement.id);
    gameState.level = gameState.advancements.length;
    gameState.threatPoints = 0;

    if (advancement.maxPool) {
        gameState.pools[advancement.maxPool].max += advancement.amount;
        gameState.pools[advancement.maxPool].current += advancement.amount;
    }
    if (advancement.attackBonus) gameState.attackBonus += advancement.attackBonus;
    if (advancement.extractionBonus) gameState.extractionBonus += advancement.extractionBonus;
    if (advancement.id === 'exitSaint' && gameState.currentRoom?.explored) {
        gameState.currentRoom.safe = true;
        log('Exit Saint marks the current room as a safe backtrack point.');
    }

    gameState.ironBodyAvailable = gameState.advancements.includes('ironBody');
    gameState.coldMindAvailable = gameState.advancements.includes('coldMind');
    gameState.oldSoulAvailable = gameState.advancements.includes('oldSoul');
    gameState.longBreathAvailable = gameState.advancements.includes('longBreath');
    gameState.hunterHandAvailable = gameState.advancements.includes('huntersHand');
    gameState.exitSaintAvailable = gameState.advancements.includes('exitSaint');

    updateChallengeProgress('level', 'player', 1);
    log(`Advancement scratched: ${advancement.name}.`);
    setGameText(`<p class="success"><strong>${escapeHtml(advancement.name)}</strong></p><p>${escapeHtml(advancement.description)}</p>`);
    updateUI();
}

// -----------------------------------------------------------------------------
// SHOP
// -----------------------------------------------------------------------------

function openShop(isFirstTime = false, tab = 'buy') {
    gameState.inShop = true;
    const intro = isFirstTime ? '<p class="success">A Void Peddler waits in the pressure leak, prices already written in frost.</p>' : '';
    const tabs = `
        <div class="shop-tabs">
            <button class="${tab === 'buy' ? 'active' : ''}" onclick="openShop(false, 'buy')">Buy</button>
            <button class="${tab === 'sell' ? 'active' : ''}" onclick="openShop(false, 'sell')">Sell</button>
        </div>
    `;

    let content = '';
    if (tab === 'buy') {
        content = `<h4><span class="material-symbols-outlined">storefront</span> Void Peddler</h4>${SHOP_ITEMS.map(item => createShopItemHTML(item, true)).join('')}`;
    } else {
        const counts = gameState.inventory.reduce((acc, itemName) => {
            if (itemName !== 'Base map') acc[itemName] = (acc[itemName] || 0) + 1;
            return acc;
        }, {});
        const items = Object.entries(counts).map(([itemName, count]) => createShopItemHTML(getItem(itemName) || { name: itemName, price: 2, type: 'misc' }, false, count)).join('');
        content = `<h4><span class="material-symbols-outlined">backpack</span> Your Salvage</h4>${items || '<p>Nothing to sell.</p>'}`;
    }

    setGameText(`${intro}${tabs}${content}<button onclick="closeShop()">Leave Peddler</button>`);
    updateUI();
}

function createShopItemHTML(item, isBuying, count = 1) {
    const price = isBuying
        ? item.price
        : gameState.faction?.name === 'The Drift Syndicate' ? (item.price || 2) : Math.max(1, Math.floor((item.price || 2) / 2));
    const canAfford = !isBuying || gameState.credits >= price;
    const action = isBuying
        ? canAfford ? `onclick="buyItem('${escapeHtml(item.name)}')"` : ''
        : `onclick="sellItem('${escapeHtml(item.name)}', ${price})"`;
    const icon = item.type === 'weapon' ? 'flash_on'
        : item.type === 'armor' ? 'shield'
        : item.type === 'consumable' ? 'local_pharmacy'
        : item.type === 'device' ? 'memory'
        : 'backpack';
    const statInfo = item.type === 'weapon'
        ? `<span class="stat-badge damage">${escapeHtml(item.value)} <span class="material-symbols-outlined icon-small">flash_on</span></span>`
        : item.type === 'armor'
            ? '<span class="stat-badge defense"><span class="material-symbols-outlined icon-small">shield</span></span>'
            : '';
    const label = isBuying ? item.name : `${item.name}${count > 1 ? ` (x${count})` : ''}`;
    return `<div class="shop-item ${canAfford ? '' : 'disabled'}" ${action}>
        <div class="shop-item-info">
            <span class="material-symbols-outlined item-icon">${icon}</span>
            <div class="item-details">
                <div class="item-header"><span class="item-name">${escapeHtml(label)}</span>${statInfo}</div>
                <div class="item-desc">${escapeHtml(item.description || '')}</div>
            </div>
        </div>
        <div class="shop-item-price">${isBuying ? '' : '+'}${price} <span class="material-symbols-outlined icon-small">paid</span></div>
    </div>`;
}

function buyItem(itemName) {
    const item = getItem(itemName);
    if (!item || gameState.credits < item.price) return;
    gameState.credits -= item.price;
    if (item.randomTable === 'devices') {
        const device = sample(DEVICES);
        addItem(device.name);
        log(`Bought random device: ${device.name}.`);
    } else {
        addItem(itemName);
        log(`Bought ${itemName}.`);
    }
    safeSound('playBuySound');
    openShop(false, 'buy');
}

function sellItem(itemName, sellPrice) {
    if (!removeOneItem(itemName)) return;
    addCredits(sellPrice, `sold ${itemName}`);
    safeSound('playSellSound');
    openShop(false, 'sell');
}

function closeShop() {
    gameState.inShop = false;
    setGameText('<p>The Void Peddler folds back into the pressure leak. The route deeper remains.</p>');
    updateUI();
    if (gameState.autoExplore) runAutoExplore();
}

// -----------------------------------------------------------------------------
// MAP AND TRACKER
// -----------------------------------------------------------------------------

function getRoomIcon(type) {
    switch (type) {
        case 'Threat': return '<span class="material-symbols-outlined">skull</span>';
        case 'Pit / drop': return '<span class="material-symbols-outlined">warning</span>';
        case 'Void Peddler': return '<span class="material-symbols-outlined">storefront</span>';
        case 'Loot': return '<span class="material-symbols-outlined">diamond</span>';
        case 'Target': return '<span class="material-symbols-outlined">vpn_key</span>';
        case 'Safe': return '<span class="material-symbols-outlined">verified</span>';
        case 'Anomaly': return '<span class="material-symbols-outlined">settings_input_antenna</span>';
        default: return '<span class="material-symbols-outlined">door_front</span>';
    }
}

function updateDungeonTracker() {
    const containerEl = document.getElementById('dungeonTrackerContainer');
    const trackerEl = document.getElementById('dungeonTracker');
    if (!containerEl || !trackerEl) return;

    if (!gameState.gameStarted || gameState.map.length === 0) {
        containerEl.style.display = 'none';
        return;
    }

    containerEl.style.display = 'block';
    const visibleRooms = gameState.map.slice(Math.max(0, gameState.map.length - 6));
    trackerEl.innerHTML = visibleRooms.map((room, index) => {
        const icon = iconNameForRoom(room);
        const classes = [
            room.type === 'Threat' ? 'enemy' : '',
            room.type === 'Pit / drop' ? 'trap' : '',
            room.type === 'Void Peddler' ? 'shop' : '',
            room.safe ? 'empty' : '',
            index === visibleRooms.length - 1 ? 'active' : ''
        ].filter(Boolean).join(' ');
        const line = index > 0 ? '<div class="tracker-line"></div>' : '';
        return `${line}<div class="tracker-node-wrap"><div class="tracker-node ${classes}" title="Room ${room.room}: ${escapeHtml(room.type)}">
            <span class="material-symbols-outlined">${icon}</span><span class="tracker-node-label">${room.room}</span>
        </div></div>`;
    }).join('') + `
        <div class="tracker-line"></div>
        <div class="tracker-node-wrap"><div class="tracker-node unknown" title="Next room"><span class="material-symbols-outlined">question_mark</span><span class="tracker-node-label">?</span></div></div>
    `;
    containerEl.scrollLeft = containerEl.scrollWidth;
}

function iconNameForRoom(room) {
    if (room.type === 'Threat') return 'skull';
    if (room.type === 'Pit / drop') return 'warning';
    if (room.type === 'Void Peddler') return 'storefront';
    if (room.type === 'Target') return 'vpn_key';
    if (room.safe) return 'verified';
    if (room.type === 'Anomaly') return 'settings_input_antenna';
    return 'door_front';
}

function openMap() {
    const mapGridEl = document.getElementById('mapGrid');
    const mapModalEl = document.getElementById('mapModal');
    if (!mapGridEl || !mapModalEl) return;
    mapGridEl.innerHTML = gameState.map.map(room => `
        <div class="map-cell ${room.safe ? 'safe' : ''} ${room.unsafe ? 'unsafe' : ''}">
            <div class="map-cell-icon">${getRoomIcon(room.type)}</div>
            <div class="map-cell-room-number">${room.room}</div>
            <div class="map-cell-details">
                <strong>${escapeHtml(room.type)}</strong><br>
                ${escapeHtml(room.shape?.name || '')}<br>
                ${escapeHtml(room.details || '')}
            </div>
        </div>
    `).join('');
    mapModalEl.style.display = 'block';
}

function closeMap() {
    const mapModalEl = document.getElementById('mapModal');
    if (mapModalEl) mapModalEl.style.display = 'none';
}

// -----------------------------------------------------------------------------
// AUTO EXPLORE
// -----------------------------------------------------------------------------

function toggleAutoExplore() {
    gameState.autoExplore = !gameState.autoExplore;
    updateAutoExploreButton();
    if (gameState.autoExplore) runAutoExplore();
}

function updateAutoExploreButton() {
    const btn = document.getElementById('autoExploreBtn');
    if (!btn) return;
    if (gameState.autoExplore) {
        btn.innerHTML = '<span class="material-symbols-outlined">pause</span> Auto<small class="btn-sublabel">Stop</small>';
        btn.style.color = 'var(--accent-yellow)';
        btn.style.borderColor = 'rgba(242, 255, 0, 0.4)';
    } else {
        btn.innerHTML = '<span class="material-symbols-outlined">directions_run</span> Auto<small class="btn-sublabel">Auto explore</small>';
        btn.style.color = '';
        btn.style.borderColor = '';
    }
}

async function runAutoExplore() {
    while (gameState.autoExplore && gameState.gameStarted && !gameState.playerIsDead && !gameState.inCombat && !gameState.inShop && !gameState.inVictory && !gameState.gameWon) {
        if (canLevelUpNow()) levelUp();
        await sleep(gameState.autoExploreDelay);
        if (gameState.targetRecovered) {
            gameState.autoExplore = false;
            updateAutoExploreButton();
            return;
        }
        if (!gameState.inCombat && !gameState.inShop && !gameState.playerIsDead) {
            await exploreRoom();
        }
    }
}

// -----------------------------------------------------------------------------
// VISUAL COMBAT FEEDBACK
// -----------------------------------------------------------------------------

function setTurnIndicator(turn) {
    const playerActor = document.getElementById('battle-player-actor');
    const enemyActor = document.getElementById('battle-enemy-actor');
    if (playerActor) playerActor.classList.toggle('active-turn', turn === 'player');
    if (enemyActor) enemyActor.classList.toggle('active-turn', turn === 'enemy');
}

function animateBattleAttack(attacker) {
    const actorEl = document.getElementById(attacker === 'player' ? 'battle-player-actor' : 'battle-enemy-actor');
    if (!actorEl) return;
    actorEl.classList.add(attacker === 'player' ? 'attack-lunge-right' : 'attack-lunge-left');
    setTimeout(() => actorEl.classList.remove('attack-lunge-right', 'attack-lunge-left'), 260);
}

function showFloatingCombatText(target, amount, { miss = false } = {}) {
    const targetEl = document.getElementById(target === 'player' ? 'battle-player-actor' : 'battle-enemy-actor');
    if (!targetEl) return;
    const float = document.createElement('div');
    if (miss) {
        float.className = 'floating-combat-text miss';
        float.textContent = 'MISS';
    } else {
        float.className = amount > 0 ? 'floating-combat-text damage' : 'floating-combat-text block';
        float.textContent = amount > 0 ? `-${amount}` : 'BLOCK';
    }
    targetEl.appendChild(float);
    setTimeout(() => float.remove(), 900);
}

function shakeBattleScreen(intensity = 'normal') {
    const el = document.getElementById('battle-interface');
    if (!el) return;
    const cls = intensity === 'hard' ? 'battle-shake-hard' : 'battle-shake';
    el.classList.remove('battle-shake', 'battle-shake-hard');
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), intensity === 'hard' ? 480 : 320);
}

function triggerDamageEffect() {
    document.querySelector('.character-sheet')?.classList.add('player-damage-flash');
    setTimeout(() => document.querySelector('.character-sheet')?.classList.remove('player-damage-flash'), 400);
    shakeBattleScreen();
}

function triggerMonsterHitEffect() {
    const monsterStatsEl = document.getElementById('monster-stats-display');
    monsterStatsEl?.classList.add('monster-hit-flash');
    setTimeout(() => monsterStatsEl?.classList.remove('monster-hit-flash'), 400);
}

function triggerMonsterDeathEffect() {
    const monsterImg = document.querySelector('.enemy-side img, .enemy-side .arena-sprite');
    monsterImg?.classList.add('monster-death-flash');
    setTimeout(() => monsterImg?.classList.remove('monster-death-flash'), 900);
}

function showSlainOverlay(monster) {
    const arena = document.querySelector('.battle-interface .battle-arena');
    if (!arena || arena.querySelector('.kill-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'kill-overlay';
    overlay.innerHTML = `
        <div class="kill-overlay-skull"><span class="material-symbols-outlined">skull</span></div>
        <div class="kill-overlay-title">SLAIN</div>
        <div class="kill-overlay-subtitle">${escapeHtml(monster.name)}</div>
    `;
    arena.appendChild(overlay);
}

function pulseRoundChip() {
    const turnEl = document.getElementById('battle-turn-counter');
    const chipEl = turnEl && turnEl.parentElement;
    if (!chipEl) return;
    chipEl.classList.remove('round-chip-pulse');
    void chipEl.offsetWidth;
    chipEl.classList.add('round-chip-pulse');
    setTimeout(() => chipEl.classList.remove('round-chip-pulse'), 450);
}

function pushCombatFeed(type, text, iconOverride) {
    if (!gameState.inCombat) return;
    const iconByType = { player: 'swords', enemy: 'skull', warning: 'priority_high', info: 'info' };
    gameState.combatFeed.unshift({
        type,
        text,
        icon: iconOverride || iconByType[type] || 'info',
        turn: gameState.combatTurn
    });
    if (gameState.combatFeed.length > 5) gameState.combatFeed.length = 5;

    const feedEl = document.getElementById('battle-feed');
    if (!feedEl) return;
    feedEl.innerHTML = gameState.combatFeed.map(item => `
        <div class="battle-feed-item ${item.type}">
            <span class="battle-feed-icon"><span class="material-symbols-outlined">${item.icon}</span></span>
            <span class="battle-feed-turn">#${item.turn}</span>
            <span class="battle-feed-text">${escapeHtml(item.text)}</span>
        </div>
    `).join('');
}

// -----------------------------------------------------------------------------
// END STATE
// -----------------------------------------------------------------------------

function showEndGameScreen(isVictory, message) {
    const title = isVictory ? 'MISSION COMPLETE' : 'MISSION FAILED';
    const cssClass = isVictory ? 'victory' : 'defeat';
    const imageUrl = isVictory ? PLAYER_SPRITE : getMonsterSprite(gameState.currentMonster);
    const threatPoints = gameState.threatPoints || gameState.points || 0;
    const credits = gameState.totalCreditsCollected || gameState.totalSilverCollected || gameState.credits || 0;
    const rooms = gameState.roomsExplored || 0;
    const defeated = gameState.monstersDefeated || 0;

    setGameText(`
        <div class="end-screen ${cssClass}">
            <h2>${title}</h2>
            <div class="end-screen-visual"><img src="${imageUrl}" alt="${title}"></div>
            <p>${escapeHtml(message)}</p>
            <div class="end-screen-stats">
                <div class="stat-row"><span><span class="material-symbols-outlined icon-small">star</span> Threat Points</span><span>${threatPoints}</span></div>
                <div class="stat-row"><span><span class="material-symbols-outlined icon-small">emoji_events</span> Advancements</span><span>${gameState.level || 0}</span></div>
                <div class="stat-row"><span><span class="material-symbols-outlined icon-small">paid</span> Credits Recovered</span><span>${credits}</span></div>
                <div class="stat-row"><span><span class="material-symbols-outlined icon-small">door_front</span> Rooms Explored</span><span>${rooms}</span></div>
                <div class="stat-row"><span><span class="material-symbols-outlined icon-small">skull</span> Threats Defeated</span><span>${defeated}</span></div>
            </div>
            <button onclick="resetGame()">Start New Mission</button>
        </div>
    `);
}

function winGame(message = 'You reach the airlock with the mission target.') {
    gameState.gameWon = true;
    gameState.inCombat = false;
    gameState.inShop = false;
    gameState.inVictory = false;
    gameState.autoBattle = false;
    gameState.autoExplore = false;
    document.body.classList.remove('in-combat');
    log(`MISSION COMPLETE: ${message}`);
    showToast('Mission complete', 'success');
    saveChallenges();
    showEndGameScreen(true, message);
    updateUI();
}

function gameOver(reason) {
    gameState.playerIsDead = true;
    gameState.autoBattle = false;
    gameState.autoExplore = false;
    combatActionBusy = false;
    document.body.classList.remove('in-combat');
    log(`MISSION FAILED: ${reason}`);
    showToast('Mission failed', 'danger');
    saveChallenges();
    showEndGameScreen(false, `${reason}`);
    updateUI();
}

function resetGame() {
    const titleEl = document.querySelector('h1.cyber-glitch');
    if (titleEl) titleEl.style.display = 'block';
    gameState = createInitialGameState();
    combatActionBusy = false;
    lastInventorySnapshot = [];
    lastEquippedWeapon = null;
    lastEquippedArmor = null;
    document.body.classList.remove('in-combat');
    if (logEl) logEl.innerHTML = '';
    setGameText('<p>Welcome to Dark Fort: Moon Devils.</p><p>Start a mission, recover the target, and decide whether one more room is worth the air.</p>');
    updateUI();
}

function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.toggle('expanded');
}

document.addEventListener('DOMContentLoaded', () => {
    gameTextEl = document.getElementById('gameText');
    logEl = document.getElementById('log');
    updateUI();
});
