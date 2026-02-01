// =============================================================================
// DARK FORT RPG - ŽAIDIMO LOGIKA
// =============================================================================

// -----------------------------------------------------------------------------
// ŽAIDIMO BŪSENOS INICIALIZACIJA
// -----------------------------------------------------------------------------

let gameState = {
    hp: 20,
    maxHp: 20,
    silver: 0,
    points: 0,
    level: 1,
    playerName: '',
    playerProfession: '',
    playerDamage: 'd4', // Numatytasis žaidėjo žalos dydis
    playerDamageBonus: 0,
    playerDefense: 0,   // Numatytasis žaidėjo gynybos dydis
    inventory: [],
    equippedWeapon: null,
    equippedArmor: null,
    currentMonster: null,
    inCombat: false,
    inShop: false,
    gameStarted: false,
    roomsExplored: 0,
    bossEncountered: false,
    playerIsDead: false,
    canScavenge: false,
    challenges: {},
    map: []
};

// Data is now in game-data.js

// -----------------------------------------------------------------------------
// OPTIMIZATIONS
// -----------------------------------------------------------------------------

const ITEM_LOOKUP = {};
// Populate lookup map. Order matters: LOOT_DROPS first, then SHOP_ITEMS overwrites.
// This preserves the precedence of SHOP_ITEMS which was implicit in the original [...SHOP_ITEMS, ...LOOT_DROPS].find()
// or SHOP_ITEMS.find() || LOOT_DROPS.find() logic.
if (typeof LOOT_DROPS !== 'undefined') {
    LOOT_DROPS.forEach(item => ITEM_LOOKUP[item.name] = item);
}
if (typeof SHOP_ITEMS !== 'undefined') {
    SHOP_ITEMS.forEach(item => ITEM_LOOKUP[item.name] = item);
}

// -----------------------------------------------------------------------------
// CHALLENGE FUNCTIONS
// -----------------------------------------------------------------------------

function loadChallenges() {
    const savedChallenges = localStorage.getItem('darkFortressChallenges');
    if (savedChallenges) {
        gameState.challenges = JSON.parse(savedChallenges);
    } else {
        gameState.challenges = CHALLENGES.reduce((acc, challenge) => {
            acc[challenge.id] = { ...challenge, progress: 0 };
            return acc;
        }, {});
    }
}

function saveChallenges() {
    localStorage.setItem('darkFortressChallenges', JSON.stringify(gameState.challenges));
}

function updateChallengeProgress(type, name, amount) {
    Object.values(gameState.challenges).forEach(challenge => {
        if (challenge.type === type && challenge.targetName === name && challenge.progress < challenge.targetValue) {
            const oldProgress = challenge.progress;
            challenge.progress = Math.min(challenge.targetValue, challenge.progress + amount);

            if (challenge.progress > oldProgress) {
                 log(`Iššūkio progresas: ${challenge.description} (${challenge.progress}/${challenge.targetValue})`);
            }
        }
    });
}

// -----------------------------------------------------------------------------
// UTILITY FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Shows a toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - 'info', 'success', or 'danger'.
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'danger') icon = 'warning';

    toast.innerHTML = `<span class="material-symbols-outlined">${icon}</span> ${message}`;

    container.appendChild(toast);

    // Remove after animation (3s total: 0.3 slideIn + 2.2 wait + 0.5 fadeOut)
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Rolls a die with a given number of sides.
 * @param {number} sides - The number of sides on the die.
 * @returns {number} The result of the roll.
 */
function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

/**
 * Calculates damage based on a dice string (e.g., 'd6').
 * @param {string} diceString - The dice string.
 * @returns {number} The calculated damage.
 */
function rollDamage(diceString) {
    const match = diceString.match(/d(\d+)/);
    return match ? rollDie(parseInt(match[1], 10)) : 1;
}

/**
 * Gets the numerical value of a damage die string.
 * @param {string} diceString - The dice string (e.g., 'd6').
 * @returns {number} The max roll of the die.
 */
function getDamageValue(diceString) {
    const match = diceString.match(/d(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
}

/**
 * Handles clicks on inventory items, routing to use or equip functions.
 * @param {string} itemName - The name of the item clicked.
 */
function handleInventoryClick(itemName) {
    if (itemName === 'Žemėlapis') {
        openMap();
        return;
    }

    const itemDetails = ITEM_LOOKUP[itemName];

    if (!itemDetails) {
        log(`Negalima panaudoti daikto ${itemName}.`);
        return;
    }

    if (itemDetails.type === 'utility') {
        log(`Daiktas ${itemName} naudojamas automatiškai.`);
        return;
    }

    if (itemDetails.type === 'potion') {
        usePotion();
    } else if (itemDetails.type === 'weapon' || itemDetails.type === 'armor') {
        toggleEquip(itemName, itemDetails.type);
    } else {
        log(`Daiktas ${itemName} neturi panaudojimo.`);
    }
}


// -----------------------------------------------------------------------------
// UI FUNCTIONS
// -----------------------------------------------------------------------------

let gameTextEl, logEl;

/**
 * Logs a message to the game log.
 * @param {string} message - The message to log.
 */
function log(message) {
    if (logEl) {
        logEl.insertAdjacentHTML('afterbegin', `<p>${message}</p>`);
    }
}

/**
 * Sets the main game text.
 * @param {string} html - The HTML content to set.
 */
function setGameText(html) {
    if (gameTextEl) {
        gameTextEl.innerHTML = html;
    }
}

/**
 * Triggers a visual effect for player damage.
 */
function triggerDamageEffect() {
    const characterSheetEl = document.querySelector('.character-sheet');
    if (characterSheetEl) {
        characterSheetEl.classList.add('player-damage-flash');
        setTimeout(() => characterSheetEl.classList.remove('player-damage-flash'), 400);
    }
}

/**
 * Triggers a visual effect for monster hits.
 */
function triggerMonsterHitEffect() {
    const monsterStatsEl = document.getElementById('monster-stats-display');
    if (monsterStatsEl) {
        monsterStatsEl.classList.add('monster-hit-flash');
        setTimeout(() => monsterStatsEl.classList.remove('monster-hit-flash'), 400);
    }
}

/**
 * Updates the entire UI based on the current game state.
 */
function updateUI() {
    // Update Stats
    document.getElementById('hp').textContent = gameState.hp;
    document.getElementById('maxHp').textContent = gameState.maxHp;
    document.getElementById('silver').textContent = gameState.silver;
    document.getElementById('points').textContent = gameState.points;
    document.getElementById('maxPoints').textContent = 10;
    document.getElementById('level').textContent = gameState.level;
    if (gameState.playerName) {
        document.getElementById('playerName').innerHTML = `<span class="material-symbols-outlined">history_edu</span> ${gameState.playerName}`;
    }
    let damageString = gameState.playerDamage;
    if (gameState.playerDamageBonus > 0) {
        damageString += `+${gameState.playerDamageBonus}`;
    }
    document.getElementById('playerDamage').textContent = damageString;
    document.getElementById('playerDefense').textContent = gameState.playerDefense;

    // Update Battle Interface Stats (if active)
    if (gameState.inCombat) {
        const battleHp = document.getElementById('battle-player-hp');
        const battleMaxHp = document.getElementById('battle-player-max-hp');
        const battleDamage = document.getElementById('battle-player-damage');
        const battleDefense = document.getElementById('battle-player-defense');

        if (battleHp) battleHp.textContent = gameState.hp;
        if (battleMaxHp) battleMaxHp.textContent = gameState.maxHp;
        if (battleDamage) battleDamage.textContent = damageString;
        if (battleDefense) battleDefense.textContent = gameState.playerDefense;

        if (gameState.currentMonster) {
            const hpBar = document.getElementById('battle-enemy-hp-bar');
            if (hpBar) {
                const pct = Math.max(0, (gameState.currentMonster.currentHp / gameState.currentMonster.hp) * 100);
                hpBar.style.width = `${pct}%`;
            }
        }

        // Quick Items (Potions)
        const quickItemsEl = document.getElementById('battle-quick-items');
        if (quickItemsEl) {
            const potions = gameState.inventory.filter(i => i === 'Mikstūra');
            if (potions.length > 0) {
                quickItemsEl.innerHTML = `<button class="battle-item-btn" onclick="usePotion()">
                    <span class="material-symbols-outlined icon-small">local_pharmacy</span> Gydytis (${potions.length})
                </button>`;
            } else {
                quickItemsEl.innerHTML = '';
            }
        }
    }

    // Update Inventory
    const inventoryEl = document.getElementById('inventory');
    if (gameState.inventory.length === 0) {
        inventoryEl.innerHTML = 'Tuščia';
    } else {
        const itemCounts = gameState.inventory.reduce((acc, itemName) => {
            acc[itemName] = (acc[itemName] || 0) + 1;
            return acc;
        }, {});

        inventoryEl.innerHTML = Object.entries(itemCounts).map(([itemName, count]) => {
            let displayText = itemName;
            if (count > 1) {
                displayText += ` (x${count})`;
            }
            const itemDetails = ITEM_LOOKUP[itemName];
            const isEquipped = itemName === gameState.equippedWeapon || itemName === gameState.equippedArmor;
            const isUtility = itemDetails && itemDetails.type === 'utility';
            const isMap = itemName === 'Žemėlapis';

            let classes = 'inventory-item';
            if (isEquipped) classes += ' equipped';
            if (isUtility) classes += ' non-selectable';

            const onclick = (isUtility && !isMap) ? '' : `onclick="handleInventoryClick('${itemName}')"`;

            return `<button class="${classes}" ${onclick}>
                        ${displayText}
                    </button>`;
        }).join(' ');
    }

    // Update Buttons
    const isPlayerActionable = gameState.gameStarted && !gameState.playerIsDead;
    document.getElementById('startBtn').style.display = gameState.gameStarted ? 'none' : 'block';
    document.getElementById('exploreBtn').style.display = isPlayerActionable && !gameState.inCombat && !gameState.inShop ? 'block' : 'none';
    document.getElementById('attackBtn').style.display = isPlayerActionable && gameState.inCombat ? 'block' : 'none';
    document.getElementById('powerAttackBtn').style.display = isPlayerActionable && gameState.inCombat ? 'block' : 'none';
    document.getElementById('scavengeBtn').style.display = isPlayerActionable && gameState.canScavenge && !gameState.inCombat && !gameState.inShop ? 'block' : 'none';
    document.getElementById('fleeBtn').style.display = isPlayerActionable && gameState.inCombat ? 'block' : 'none';
    
    const canLevelUp = gameState.points >= 10;
    document.getElementById('levelUpBtn').style.display = isPlayerActionable && canLevelUp && !gameState.inCombat && !gameState.inShop ? 'block' : 'none';

    // Update Challenges
    const challengesEl = document.getElementById('challenges');
    if (gameState.challenges && Object.keys(gameState.challenges).length > 0) {
        challengesEl.innerHTML = Object.values(gameState.challenges).map(challenge => {
            const progress = Math.min(challenge.progress, challenge.targetValue);
            const isComplete = progress >= challenge.targetValue;
            const progressText = isComplete ? 'Įvykdyta!' : `${progress} / ${challenge.targetValue}`;
            return `
                <div class="challenge ${isComplete ? 'complete' : ''}">
                    <span class="challenge-desc">${challenge.description}</span>
                    <span class="challenge-progress">${progressText}</span>
                </div>
            `;
        }).join('');
    } else {
        challengesEl.innerHTML = 'Nėra iššūkių.';
    }
}


// -----------------------------------------------------------------------------
// CORE GAME ACTIONS
// -----------------------------------------------------------------------------

/**
 * Starts a new game.
 */
function startGame() {
    loadChallenges();
    gameState.gameStarted = true;
    const startingSilver = 25 + rollDie(6);
    gameState.silver = startingSilver;
    updateChallengeProgress('collect', 'silver', startingSilver);

    // Assign random name and profession
    gameState.playerName = PLAYER_NAMES[rollDie(PLAYER_NAMES.length) - 1];
    gameState.playerProfession = PLAYER_PROFESSIONS[rollDie(PLAYER_PROFESSIONS.length) - 1];

    // Starting inventory
    let startingInventory = ['Žemėlapis', 'Kardas', 'Mikstūra'];
    if (Math.random() < 0.5) startingInventory.push('Mikstūra');
    if (Math.random() < 0.3) startingInventory.push('Virvė');
    gameState.inventory = startingInventory;

    if (gameState.inventory.includes('Kardas')) {
        gameState.equippedWeapon = 'Kardas';
    }
    
    log(`Tavo vardas yra ${gameState.playerName}, tu esi ${gameState.playerProfession}.`);
    log(`Nuotykis prasideda! Radai ${startingSilver} sidabro.`);
    log(`Tavo įranga: ${gameState.inventory.join(', ')}.`);
    
    setGameText("<p>Įeini į prieblandoje skendintį kambarį. Ore tvyro dulkių ir puvėsių kvapas. Vienerios durys veda gilyn į katakombas.</p><p>Ką darysi?</p>");
    recalculateStats(); // To apply starting equipment
    updateUI();
    showToast("Nuotykis prasidėjo!", "success");
}

/**
 * Explores a new room, triggering events like traps, monsters, or shops.
 */
function exploreRoom() {
    gameState.canScavenge = false;

    if (gameState.level >= 2) {
        let triggerBoss = false;

        if (!gameState.bossEncountered) {
            triggerBoss = true;
        } else if (Math.random() < 0.15) {
            triggerBoss = true;
        }

        if (triggerBoss) {
            gameState.bossEncountered = true;
            log(`Sutikai galutinį bosą: ${FORTRESS_LORD.name}.`);
            // showToast("BOSSAS!", "danger");
            startCombat(FORTRESS_LORD);
            return;
        }
    }

    gameState.points++;
    gameState.roomsExplored++;
    updateChallengeProgress('explore', 'room', 1);
    const roll = rollDie(6);
    let text = `<p><strong>Kambarys ${gameState.roomsExplored}:</strong></p>`;
    let roomEvent = { room: gameState.roomsExplored, type: 'Tuščias', details: '' };

    switch (roll) {
        case 1:
        case 2: // Empty Room
            text += "<p>Kambarys tuščias, tik dulkės ir voratinkliai.</p>";
            log("Kambarys buvo tuščias.");
            roomEvent.type = 'Tuščias';
            gameState.canScavenge = true;
            break;
        case 3: // Trap
            roomEvent.type = 'Spąstai';
            if (gameState.inventory.includes('Virvė')) {
                text += "<p class='success'>Pastebėjai spąstus-duobę ir saugiai perėjai per ją virve.</p>";
                log("Saugiai išvengta spąstų-duobės.");
                roomEvent.details = 'Išvengta';
                // showToast("Išvengta spąstų (Virvė)", "success");
            } else {
                const damage = rollDie(4);
                gameState.hp -= damage;
                playPlayerHitSound();
                triggerDamageEffect();
                text += `<p class='warning'>Įkritai į spąstus-duobę ir patyrei ${damage} žalos!</p>`;
                log(`Patyrė ${damage} žalos nuo spąstų.`);
                roomEvent.details = `Patyrė ${damage} žalos`;
                // showToast(`Spąstai! -${damage} HP`, "danger");
            }
            break;
        case 4: // Weak Monster
            const weakMonster = WEAK_MONSTERS[rollDie(WEAK_MONSTERS.length) - 1];
            log(`Sutikai ${weakMonster.name}.`);
            gameState.map.push({ room: gameState.roomsExplored, type: 'Priešas', details: weakMonster.name });
            // showToast(`Priešas: ${weakMonster.name}`, "warning");
            startCombat(weakMonster);
            return;
        case 5: // Tough Monster
            const toughMonster = TOUGH_MONSTERS[rollDie(TOUGH_MONSTERS.length) - 1];
            log(`Sutikai ${toughMonster.name}.`);
            gameState.map.push({ room: gameState.roomsExplored, type: 'Priešas', details: toughMonster.name });
            // showToast(`Priešas: ${toughMonster.name}`, "danger");
            startCombat(toughMonster);
            return;
        case 6: // Shop
            log("Radai parduotuvę.");
            gameState.map.push({ room: gameState.roomsExplored, type: 'Parduotuvė', details: '' });
            // showToast("Radai Parduotuvę", "info");
            openShop(true);
            return;
    }
    
    gameState.map.push(roomEvent);

    setGameText(text);
    if (gameState.hp <= 0) {
        gameOver("Mirėte nuo spąstų!");
    } else {
        updateUI();
    }
}

/**
 * Uses a potion to heal the player.
 */
function usePotion() {
    const potionIndex = gameState.inventory.indexOf('Mikstūra');
    if (potionIndex > -1) {
        const healing = rollDie(6) + rollDie(6);
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + healing);

        gameState.inventory.splice(potionIndex, 1);
        log(`Išgėrei mikstūrą ir išsigydei ${healing} gyvybių.`);
        // showToast(`Pasigydei: +${healing} HP`, "success");

        if (gameState.inCombat) {
            document.getElementById('combat-log').innerHTML = `<p class='success'>Išgeri mikstūrą, atstatydamas ${healing} gyvybių. Dabar turi ${gameState.hp} gyvybių.</p>`;
            monsterAttack();
        } else {
            setGameText(`<p class='success'>Išgeri mikstūrą, atstatydamas ${healing} gyvybių. Dabar turi ${gameState.hp} gyvybių.</p>`);
        }
        updateUI();
    }
}


/**
 * Scavenge the current room for resources.
 */
function scavenge() {
    gameState.canScavenge = false;
    const roll = rollDie(6);

    if (roll <= 2) {
        // Ambush!
        const weakMonster = WEAK_MONSTERS[rollDie(WEAK_MONSTERS.length) - 1];
        log(`Ieškodamas sukėlei triukšmą ir prisišaukei ${weakMonster.name}!`);
        // showToast("PASALA!", "danger");
        setGameText(`<p class="warning">Besirausdamas griuvėsiuose pažadinai ${weakMonster.name}!</p>`);
        startCombat(weakMonster);
    } else if (roll <= 4) {
        // Nothing
        log("Nieko neradai.");
        // showToast("Nieko neradai", "info");
        setGameText("<p>Nieko naudingo neradai.</p>");
        updateUI();
    } else {
        // Loot!
        const silver = rollDie(6) + 2;
        gameState.silver += silver;
        updateChallengeProgress('collect', 'silver', silver);
        log(`Radai ${silver} sidabro!`);
        // showToast(`Radai: ${silver} sidabro`, "success");
        setGameText(`<p class="success">Tarp šiukšlių radai paslėptą kapšą su ${silver} sidabro!</p>`);
        updateUI();
    }
}


// -----------------------------------------------------------------------------
// COMBAT ACTIONS
// -----------------------------------------------------------------------------

/**
 * Initiates combat with a monster.
 * @param {object} monster - The monster to fight.
 */
function startCombat(monster) {
    gameState.inCombat = true;
    gameState.currentMonster = { ...monster, currentHp: monster.hp };
    document.body.classList.add('in-combat');

    let encounterText = monster.name === FORTRESS_LORD.name
        ? `<p><strong>Paskutinė menė:</strong></p><p class='warning'>Didžiuliai paskutinės menės vartai girgždėdami atsidaro, atidengdami <strong>${FORTRESS_LORD.name}</strong> savo soste!</p>`
        : TOUGH_MONSTERS.some(m => m.name === monster.name)
            ? `<p class='warning'>Bauginantis ${monster.name} pastoja tau kelią!</p>`
            : `<p class='warning'>Pasirodo ${monster.name}!</p>`;

    let damageString = gameState.playerDamage;
    if (gameState.playerDamageBonus > 0) damageString += `+${gameState.playerDamageBonus}`;

    let text = `
        <div class="battle-interface">
            <!-- Enemy Section (Top) -->
            <div class="battle-enemy">
                <div class="battle-enemy-visual">
                     <img src="https://img.itch.zone/aW1hZ2UvMTQwODA2NC84MjAzNTg5LmdpZg==/original/CIfGNn.gif" class="enemy-gif" alt="${monster.name}">
                </div>
                <div class="battle-enemy-stats" id="monster-stats-display">
                    <h3 class="battle-enemy-name">${monster.name}</h3>
                    <div class="battle-hp-bar-container">
                        <div id="battle-enemy-hp-bar" class="battle-hp-bar-fill" style="width: 100%;"></div>
                    </div>
                    <div class="battle-enemy-hp-text">
                        HP: <span id="monster-hp">${monster.hp}</span> / ${monster.hp}
                        <br>Žala: ${monster.damage}
                    </div>
                </div>
            </div>

            <!-- Player Section (Middle) -->
            <div class="battle-player">
                <div class="battle-player-header">
                    <span class="battle-player-name">${gameState.playerName}</span>
                    <span class="battle-player-level">Lygis ${gameState.level}</span>
                </div>
                <div class="battle-player-stats-row">
                    <div class="battle-stat hp">
                        <span class="material-symbols-outlined">favorite</span>
                        <span id="battle-player-hp">${gameState.hp}</span>/<span id="battle-player-max-hp">${gameState.maxHp}</span>
                    </div>
                    <div class="battle-stat damage">
                        <span class="material-symbols-outlined">flash_on</span> <span id="battle-player-damage">${damageString}</span>
                    </div>
                    <div class="battle-stat defense">
                         <span class="material-symbols-outlined">shield</span> <span id="battle-player-defense">${gameState.playerDefense}</span>
                    </div>
                </div>
                <!-- Quick Items (Potions) -->
                <div id="battle-quick-items" class="battle-quick-items">
                    <!-- Populated by updateUI -->
                </div>
            </div>

            <!-- Combat Log (Bottom) -->
            <div id="combat-log" class="battle-log">
                ${encounterText}
                <div class="turn-separator">KOVA PRASIDEDA</div>
            </div>
        </div>
    `;

    setGameText(text);
    updateUI();
}

/**
 * Player attacks the current monster.
 */
function attack() {
    performAttack(false);
}

/**
 * Player performs a power attack.
 */
function powerAttack() {
    performAttack(true);
}

function performAttack(isPowerAttack) {
    const monster = gameState.currentMonster;
    if (!monster) return;

    playAttackSound();

    const combatLogEl = document.getElementById('combat-log');
    combatLogEl.innerHTML = ''; // Clear previous log

    let attackRoll = rollDie(6);
    let hitBonus = 0;
    let damageBonus = 0;

    if (isPowerAttack) {
        hitBonus = -2;
        damageBonus = 2;
        log("Bandai galingą smūgį...");
    }

    if (attackRoll + hitBonus >= monster.difficulty) {
        const damage = rollDamage(gameState.playerDamage) + gameState.playerDamageBonus + damageBonus;
        monster.currentHp -= damage;

        triggerMonsterHitEffect();

        let msg = `Pataikei ${monster.name} ir padarei ${damage} žalos.`;
        if (isPowerAttack) msg = `Galingas smūgis! ${damage} žalos!`;

        log(msg);
        // showToast(isPowerAttack ? `Galingas! -${damage} HP` : `Pataikei! -${damage} HP`, "success");
        combatLogEl.innerHTML = `<p class='success'>${msg}</p>`;

        document.getElementById('monster-hp').textContent = Math.max(0, monster.currentHp);

        if (monster.currentHp <= 0) {
            winCombat(damage);
        } else {
            monsterAttack();
        }
    } else {
        log(isPowerAttack ? `Galingas smūgis nepavyko!` : `Nepataikei į ${monster.name}.`);
        // showToast(isPowerAttack ? "Nepavyko!" : "Nepataikei!", "danger");
        combatLogEl.innerHTML = `<p class='warning'>${isPowerAttack ? 'Galingas smūgis nepavyko (nepataikei)!' : `Nepataikei į ${monster.name}.`}</p>`;
        monsterAttack();
    }
    updateUI();
}

/**
 * Flees from combat.
 */
function flee() {
    const combatLogEl = document.getElementById('combat-log');

    if (Math.random() < 0.5) { // 50% chance to flee
        gameState.inCombat = false;
        gameState.currentMonster = null;
        document.body.classList.remove('in-combat');
        log("Sėkmingai pabėgai iš kovos.");
        setGameText("<p class='success'>Pavyko pabėgti!</p><p>Gali tęsti tyrinėjimą.</p>");
        updateUI();
    } else {
        log("Nepavyko pabėgti.");
        if (combatLogEl) combatLogEl.innerHTML += `<p class='warning'>Nepavyko pabėgti!</p>`;
        monsterAttack();
    }
}

/**
 * The current monster attacks the player.
 */
function monsterAttack() {
    const monster = gameState.currentMonster;
    let damage = Math.max(0, rollDamage(monster.damage) - gameState.playerDefense);

    if (damage > 0) {
        gameState.hp -= damage;
        playPlayerHitSound();
        triggerDamageEffect();
        // showToast(`Gavai smūgį! -${damage} HP`, "danger");
    } else {
        // showToast("Blokavai smūgį!", "info");
    }

    log(`${monster.name} tau smogė ir padarė ${damage} žalos.`);
    
    const combatLogEl = document.getElementById('combat-log');
    if(combatLogEl) {
        combatLogEl.innerHTML += `<p class='warning'>${monster.name} atsako smūgiu, padarydamas tau ${damage} žalos.</p>`;
    }

    if (gameState.hp <= 0) {
        gameOver(`Tave nužudė ${monster.name}.`);
    }
    updateUI();
}

function winCombat(killingBlowDamage) {
    const monster = gameState.currentMonster;
    gameState.points += monster.points;
    updateChallengeProgress('slay', monster.name, 1);
    
    const silverFound = rollDie(6) + monster.difficulty;
    gameState.silver += silverFound;
    updateChallengeProgress('collect', 'silver', silverFound);
    let loot = [`${silverFound} sidabro`];

    if (Math.random() < 0.2 + (monster.difficulty * 0.1)) {
        const droppedItem = { ...LOOT_DROPS[rollDie(LOOT_DROPS.length) - 1] };
        loot.push(droppedItem.name);
        gameState.inventory.push(droppedItem.name);
        log(`Pabaisa išmetė ${droppedItem.name}!`);
        // showToast(`Radai daiktą: ${droppedItem.name}`, "success");
        // Player must now equip manually
    }

    log(`Nugalėjai ${monster.name}!`);

    if (monster.name === FORTRESS_LORD.name) {
        winGame();
        return;
    }
    
    let text = `<p class='success'>Nugalėjai ${monster.name} su lemiamu ${killingBlowDamage} žalos smūgiu!</p>
                <p>Gavai ${monster.points} taškų.</p>
                <p><strong>Grobis:</strong> ${loot.join(', ')}</p>
                <p>Gali tęsti tyrinėjimą.</p>`;

    setGameText(text);
    
    gameState.inCombat = false;
    gameState.currentMonster = null;
    document.body.classList.remove('in-combat');
    updateUI();
}


// -----------------------------------------------------------------------------
// SHOP ACTIONS
// -----------------------------------------------------------------------------


function openShop(isFirstTime = false, tab = 'buy') {
    gameState.inShop = true;

    let shopText = isFirstTime ? "<p class='success'>Atsiranda paslaptingas prekeivis, siūlantis savo prekes.</p>" : "";

    shopText += `
        <div class="shop-tabs">
            <button class="${tab === 'buy' ? 'active' : ''}" onclick="openShop(false, 'buy')">Pirkti</button>
            <button class="${tab === 'sell' ? 'active' : ''}" onclick="openShop(false, 'sell')">Parduoti</button>
        </div>
    `;

    // Helper to generate item HTML
    const createShopItemHTML = (item, isBuying, count = 1) => {
        let icon = 'help';
        let statInfo = '';
        let price = 0;
        let action = '';
        let disabled = '';
        let btnText = '';

        if (isBuying) {
            price = item.price;
            action = `onclick="buyItem('${item.name}')"`;
            disabled = gameState.silver < price ? 'disabled' : '';
            btnText = `${price} <span class="material-symbols-outlined icon-small">paid</span>`;
        } else {
            price = Math.floor((item.price || 5) / 2);
            action = `onclick="sellItem('${item.name}', ${price})"`;
            btnText = `+${price} <span class="material-symbols-outlined icon-small">paid</span>`;
        }

        // Determine icon and stats
        if (item.type === 'weapon') {
            icon = 'flash_on';
            statInfo = `<span class="stat-badge damage" title="Žala">${item.value} <span class="material-symbols-outlined icon-small">flash_on</span></span>`;
        } else if (item.type === 'armor') {
            icon = 'shield';
            statInfo = `<span class="stat-badge defense" title="Gynyba">+${item.value} <span class="material-symbols-outlined icon-small">shield</span></span>`;
        } else if (item.type === 'potion') {
            icon = 'local_pharmacy';
            statInfo = `<span class="stat-badge healing" title="Gydymas">HP <span class="material-symbols-outlined icon-small">favorite</span></span>`;
        } else {
            icon = 'backpack';
            statInfo = `<span class="stat-badge utility" title="Naudingas"><span class="material-symbols-outlined icon-small">build</span></span>`;
        }

        const nameDisplay = isBuying ? item.name : `${item.name} ${count > 1 ? `(x${count})` : ''}`;

        return `<div class="shop-item">
            <div class="shop-item-info">
                <span class="material-symbols-outlined item-icon">${icon}</span>
                <div class="item-details">
                    <div class="item-header">
                        <span class="item-name">${nameDisplay}</span>
                        ${statInfo}
                    </div>
                    <div class="item-desc">${item.description || 'Nėra aprašymo.'}</div>
                </div>
            </div>
            <button class="buy-btn" ${action} ${disabled}>
                ${btnText}
            </button>
        </div>`;
    };

    if (tab === 'buy') {
        shopText += "<h4><span class=\"material-symbols-outlined\">storefront</span> Prekeivio Prekės</h4>";
        SHOP_ITEMS.forEach(item => {
            shopText += createShopItemHTML(item, true);
        });
    } else { // Sell tab
        shopText += "<h4><span class=\"material-symbols-outlined\">backpack</span> Tavo Prekės</h4>";
        const sellableInventory = [...new Set(gameState.inventory)];

        if (sellableInventory.length === 0) {
            shopText += "<p>Neturi nieko parduoti.</p>";
        } else {
            sellableInventory.forEach(itemName => {
                let itemDetails = ITEM_LOOKUP[itemName];

                // Fallback if item details missing
                if (!itemDetails) {
                    itemDetails = { name: itemName, type: 'misc', description: 'Paprastas daiktas.', price: 2 };
                }

                const count = gameState.inventory.filter(i => i === itemName).length;
                shopText += createShopItemHTML(itemDetails, false, count);
            });
        }
    }

    shopText += `<button onclick="closeShop()">Išeiti iš Parduotuvės</button>`;
    setGameText(shopText);
    updateUI();
}

function buyItem(itemName) {
    const item = SHOP_ITEMS.find(i => i.name === itemName);
    if (item && gameState.silver >= item.price) {
        playBuySound();
        gameState.silver -= item.price;
        gameState.inventory.push(itemName);
        log(`Nusipirkai ${itemName}.`);
        // showToast(`Nusipirkai: ${itemName}`, "success");
        // Player must now equip manually from inventory
        openShop(false, 'buy'); // Refresh shop view
    }
}

function sellItem(itemName, sellPrice) {
    const itemIndex = gameState.inventory.indexOf(itemName);
    if (itemIndex > -1) {
        playSellSound();
        // If selling equipped item, unequip it
        if (itemName === gameState.equippedWeapon) gameState.equippedWeapon = null;
        if (itemName === gameState.equippedArmor) gameState.equippedArmor = null;

        gameState.inventory.splice(itemIndex, 1);
        gameState.silver += sellPrice;
        updateChallengeProgress('collect', 'silver', sellPrice);
        log(`Pardavei ${itemName} už ${sellPrice} sidabro.`);
        // showToast(`Pardavei: ${itemName} (+${sellPrice})`, "info");
        recalculateStats(); // Recalculate stats after selling
        openShop(false, 'sell');
    }
}

function toggleEquip(itemName, itemType) {
    const slot = itemType === 'weapon' ? 'equippedWeapon' : 'equippedArmor';

    if (gameState[slot] === itemName) {
        // Unequip if clicking the same item
        gameState[slot] = null;
        log(`Nusiėmei ${itemName}.`);
        // showToast(`Nusiėmei: ${itemName}`, "info");
    } else {
        // Equip new item
        gameState[slot] = itemName;
        log(`Užsidėjai ${itemName}.`);
        // showToast(`Užsidėjai: ${itemName}`, "success");
    }
    recalculateStats();
}

function recalculateStats() {
    // Reset stats to base values, considering level but not items
    gameState.playerDamage = 'd4';
    gameState.playerDefense = gameState.level - 1; // 0 at level 1, 1 at level 2, etc.

    // Re-apply damage die upgrades from levels
    if (gameState.level >= 4) gameState.playerDamage = 'd8';
    else if (gameState.level >= 2) gameState.playerDamage = 'd6';

    // Apply equipped items' stats
    if (gameState.equippedWeapon) {
        const weaponDetails = ITEM_LOOKUP[gameState.equippedWeapon];
        if (weaponDetails) gameState.playerDamage = weaponDetails.value;
    }

    if (gameState.equippedArmor) {
        const armorDetails = ITEM_LOOKUP[gameState.equippedArmor];
        if (armorDetails) gameState.playerDefense += armorDetails.value;
    }

    updateUI();
}

function closeShop() {
    gameState.inShop = false;
    setGameText("<p>Palieki prekeivį ir toliau keliauji į tamsą.</p>");
    updateUI();
}


// -----------------------------------------------------------------------------
// MAP ACTIONS
// -----------------------------------------------------------------------------

function getRoomIcon(type) {
    switch (type) {
        case 'Priešas': return '<span class="material-symbols-outlined">skull</span>';
        case 'Spąstai': return '<span class="material-symbols-outlined">warning</span>';
        case 'Parduotuvė': return '<span class="material-symbols-outlined">storefront</span>';
        case 'Lobis': return '<span class="material-symbols-outlined">diamond</span>';
        case 'Tuščias': return '<span class="material-symbols-outlined">door_front</span>';
        default: return '<span class="material-symbols-outlined">help</span>';
    }
}

function openMap() {
    const mapGridEl = document.getElementById('mapGrid');
    const mapModalEl = document.getElementById('mapModal');

    mapGridEl.innerHTML = ''; // Clear previous map

    const fragment = document.createDocumentFragment();

    gameState.map.forEach(room => {
        const roomEl = document.createElement('div');
        roomEl.className = 'map-cell';
        roomEl.innerHTML = `
            <div class="map-cell-icon">${getRoomIcon(room.type)}</div>
            <div class="map-cell-room-number">${room.room}</div>
            <div class="map-cell-details">${room.details}</div>
        `;
        fragment.appendChild(roomEl);
    });

    mapGridEl.appendChild(fragment);

    mapModalEl.style.display = 'block';
}

function closeMap() {
    const mapModalEl = document.getElementById('mapModal');
    mapModalEl.style.display = 'none';
}


// -----------------------------------------------------------------------------
// PLAYER AND CHARACTER ACTIONS
// -----------------------------------------------------------------------------

function levelUp() {
    if (gameState.points < 10) return;
    
    gameState.level++;
    gameState.points -= 10;
    gameState.playerDamageBonus++; // This is a direct damage add, separate from die type

    log(`PASIEKEI NAUJĄ LYGĮ! Dabar esi ${gameState.level} lygio!`);
    // showToast(`LYGIS PAKILO! (${gameState.level})`, "success");
    setGameText(`<p class='success'>Pasiekei ${gameState.level} lygį! Tavo žala padidėjo 1, o bazinė gynyba ir kiti atributai galėjo pagerėti.</p>`);

    recalculateStats(); // Recalculate all stats to apply level benefits
}


// -----------------------------------------------------------------------------
// GAME STATE MANAGEMENT
// -----------------------------------------------------------------------------

/**
 * Ends the game in victory.
 */
function winGame() {
    log(`PERGALĖ! Nugalėjai Tvirtovės Valdovą!`);
    showToast("PERGALĖ!", "success");
    saveChallenges();
    setGameText(`<h3><span class="material-symbols-outlined">emoji_events</span> PERGALĖ! <span class="material-symbols-outlined">emoji_events</span></h3><p>Nugalėjai Tvirtovės Valdovą ir užkariavai Tamsiąją Tvirtovę!</p><p>Tavo galutinis rezultatas: ${gameState.points}</p><button onclick="resetGame()">Pradėti Naują Nuotykį</button>`);
    gameState.inCombat = false;
    updateUI();
}

/**
 * Ends the game in defeat.
 * @param {string} reason - The reason for the game over.
 */
function gameOver(reason) {
    gameState.playerIsDead = true;
    saveChallenges();
    document.body.classList.remove('in-combat');
    log(`ŽAIDIMAS BAIGTAS: ${reason}`);
    showToast("ŽAIDIMAS BAIGTAS", "danger");
    setGameText(`<h3><span class="material-symbols-outlined">skull</span> ŽAIDIMAS BAIGTAS <span class="material-symbols-outlined">skull</span></h3><p>${reason}</p><p>Tavo nuotykis čia baigiasi.</p><button onclick="resetGame()">Pradėti Naują Nuotykį</button>`);
    updateUI();
}

/**
 * Resets the game to its initial state for a new adventure.
 */
function resetGame() {
    gameState = {
        hp: 20,
        maxHp: 20,
        silver: 0,
        points: 0,
        level: 1,
        playerName: '',
        playerProfession: '',
        playerDamage: 'd4',
        playerDamageBonus: 0,
        playerDefense: 0,
        inventory: [],
        equippedWeapon: null,
        equippedArmor: null,
        currentMonster: null,
        inCombat: false,
        inShop: false,
        gameStarted: false,
        roomsExplored: 0,
        bossEncountered: false,
        playerIsDead: false,
        map: []
    };
    document.body.classList.remove('in-combat');
    logEl.innerHTML = "";
    setGameText('<p>Sveikas atvykęs į Tamsiąją Tvirtovę!</p><p>Spausk "Pradėti Nuotykį" ir leiskis į pavojingą kelionę...</p>');
    updateUI();
}


// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    gameTextEl = document.getElementById('gameText');
    logEl = document.getElementById('log');

    // Make log expandable
    const logContainerEl = document.querySelector('.log');
    if (logContainerEl) {
        logContainerEl.addEventListener('click', () => {
            logContainerEl.classList.toggle('expanded');
        });
    }

    updateUI();
});
