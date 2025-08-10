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
    playerDamage: 'd4', // Numatytasis žaidėjo žalos dydis
    playerDamageBonus: 0,
    playerDefense: 0,   // Numatytasis žaidėjo gynybos dydis
    inventory: [],
    currentMonster: null,
    inCombat: false,
    inShop: false,
    gameStarted: false,
    roomsExplored: 0,
    bossEncountered: false,
    playerIsDead: false
};

// -----------------------------------------------------------------------------
// ŽAIDIMO DUOMENYS
// -----------------------------------------------------------------------------

const WEAK_MONSTERS = [
    { name: 'Kraujuotas Skeletas', points: 3, damage: 'd4', hp: 6, difficulty: 2 },
    { name: 'Katakombų Kultistas', points: 3, damage: 'd4', hp: 6, difficulty: 2 },
    { name: 'Goblinas', points: 3, damage: 'd4', hp: 5, difficulty: 2 },
    { name: 'Nemirėlių Šuo', points: 4, damage: 'd4', hp: 6, difficulty: 3 }
];

const TOUGH_MONSTERS = [
    { name: 'Nekromantas-Burtininkas', points: 4, damage: 'd6', hp: 8, difficulty: 3 },
    { name: 'Mažas Akmeninis Trolis', points: 5, damage: 'd6', hp: 9, difficulty: 4 },
    { name: 'Medūza', points: 4, damage: 'd6', hp: 10, difficulty: 3 },
    { name: 'Griuvėsių Baziliskas', points: 4, damage: 'd6', hp: 11, difficulty: 3 }
];

const FORTRESS_LORD = { name: 'Tvirtovės Valdovas', points: 20, damage: 'd6', hp: 25, difficulty: 4 };

const LOOT_DROPS = [
    { name: 'Kardas', type: 'weapon', value: 'd6' },
    { name: 'Odiniai Šarvai', type: 'armor', value: 1 },
    { name: 'Mikstūra', type: 'potion' }
];

const SHOP_ITEMS = [
    { name: 'Mikstūra', price: 5, description: 'Gydo 2d6 gyvybių.', type: 'potion' },
    { name: 'Kardas', price: 10, description: 'Paprastas ginklas (d6 žala).', type: 'weapon', value: 'd6' },
    { name: 'Didysis Kardas', price: 25, description: 'Geresnis ginklas (d8 žala).', type: 'weapon', value: 'd8' },
    { name: 'Odiniai Šarvai', price: 15, description: 'Paprasti šarvai (1 gynyba).', type: 'armor', value: 1 },
    { name: 'Grandininiai Šarvai', price: 30, description: 'Geresni šarvai (2 gynyba).', type: 'armor', value: 2 },
    { name: 'Virvė', price: 5, description: 'Padeda išvengti spąstų duobių.', type: 'utility' }
];

// -----------------------------------------------------------------------------
// UTILITY FUNCTIONS
// -----------------------------------------------------------------------------

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
        logEl.innerHTML = `<p>${message}</p>` + logEl.innerHTML;
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
    let damageString = gameState.playerDamage;
    if (gameState.playerDamageBonus > 0) {
        damageString += `+${gameState.playerDamageBonus}`;
    }
    document.getElementById('playerDamage').textContent = damageString;
    document.getElementById('playerDefense').textContent = gameState.playerDefense;

    // Update Inventory
    const inventoryEl = document.getElementById('inventory');
    if (gameState.inventory.length === 0) {
        inventoryEl.innerHTML = 'Tuščia';
    } else {
        const inventoryDisplay = gameState.inventory.map(itemName => {
            const itemDetails = SHOP_ITEMS.find(i => i.name === itemName) || LOOT_DROPS.find(i => i.name === itemName);
            if (itemDetails) {
                if (itemDetails.type === 'weapon') {
                    return `${itemName} (${itemDetails.value} žala)`;
                } else if (itemDetails.type === 'armor') {
                    return `${itemName} (${itemDetails.value} gynyba)`;
                }
            }
            return itemName;
        }).join(', ');
        inventoryEl.innerHTML = inventoryDisplay;
    }

    // Update Buttons
    const isPlayerActionable = gameState.gameStarted && !gameState.playerIsDead;
    document.getElementById('startBtn').style.display = gameState.gameStarted ? 'none' : 'block';
    document.getElementById('exploreBtn').style.display = isPlayerActionable && !gameState.inCombat && !gameState.inShop ? 'block' : 'none';
    document.getElementById('attackBtn').style.display = isPlayerActionable && gameState.inCombat ? 'block' : 'none';
    document.getElementById('fleeBtn').style.display = isPlayerActionable && gameState.inCombat ? 'block' : 'none';
    
    const canUsePotion = isPlayerActionable && gameState.inventory.includes('Mikstūra') && gameState.hp < gameState.maxHp && !gameState.inShop;
    document.getElementById('usePotionBtn').style.display = canUsePotion ? 'block' : 'none';

    const canLevelUp = gameState.points >= 10;
    document.getElementById('levelUpBtn').style.display = isPlayerActionable && canLevelUp && !gameState.inCombat && !gameState.inShop ? 'block' : 'none';
}


// -----------------------------------------------------------------------------
// CORE GAME ACTIONS
// -----------------------------------------------------------------------------

/**
 * Starts a new game.
 */
function startGame() {
    playStartGameSound();
    gameState.gameStarted = true;
    gameState.silver = 25 + rollDie(6);

    // Starting inventory
    let startingInventory = ['Kardas', 'Mikstūra'];
    if (Math.random() < 0.5) startingInventory.push('Mikstūra');
    if (Math.random() < 0.3) startingInventory.push('Virvė');
    gameState.inventory = startingInventory;

    if (gameState.inventory.includes('Kardas')) {
        gameState.playerDamage = 'd6';
    }
    
    log(`Nuotykis prasideda! Radai ${gameState.silver} sidabro.`);
    log(`Tavo įranga: ${gameState.inventory.join(', ')}.`);
    
    setGameText("<p>Įeini į prieblandoje skendintį kambarį. Ore tvyro dulkių ir puvėsių kvapas. Vienerios durys veda gilyn į katakombas.</p><p>Ką darysi?</p>");
    updateUI();
}

/**
 * Explores a new room, triggering events like traps, monsters, or shops.
 */
function exploreRoom() {
    playExploreSound();

    if (gameState.level >= 2 && !gameState.bossEncountered) {
        gameState.bossEncountered = true;
        log(`Sutikai galutinį bosą: ${FORTRESS_LORD.name}.`);
        startCombat(FORTRESS_LORD);
        return;
    }

    gameState.points++;
    gameState.roomsExplored++;
    const roll = rollDie(6);
    let text = `<p><strong>Kambarys ${gameState.roomsExplored}:</strong></p>`;

    switch (roll) {
        case 1:
        case 2: // Empty Room
            text += "<p>Kambarys tuščias, tik dulkės ir voratinkliai.</p>";
            log("Kambarys buvo tuščias.");
            break;
        case 3: // Trap
            if (gameState.inventory.includes('Virvė')) {
                text += "<p class='success'>Pastebėjai spąstus-duobę ir saugiai perėjai per ją virve.</p>";
                log("Saugiai išvengta spąstų-duobės.");
            } else {
                const damage = rollDie(4);
                gameState.hp -= damage;
                playPlayerHitSound();
                triggerDamageEffect();
                text += `<p class='warning'>Įkritai į spąstus-duobę ir patyrei ${damage} žalos!</p>`;
                log(`Patyrė ${damage} žalos nuo spąstų.`);
            }
            break;
        case 4: // Weak Monster
            const weakMonster = WEAK_MONSTERS[rollDie(WEAK_MONSTERS.length) - 1];
            log(`Sutikai ${weakMonster.name}.`);
            startCombat(weakMonster);
            return;
        case 5: // Tough Monster
            const toughMonster = TOUGH_MONSTERS[rollDie(TOUGH_MONSTERS.length) - 1];
            log(`Sutikai ${toughMonster.name}.`);
            startCombat(toughMonster);
            return;
        case 6: // Shop
            log("Radai parduotuvę.");
            openShop(true);
            return;
    }
    
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
        playPotionSound();
        const healing = rollDie(6) + rollDie(6);
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + healing);

        gameState.inventory.splice(potionIndex, 1);
        log(`Išgėrei mikstūrą ir išsigydei ${healing} gyvybių.`);

        if (gameState.inCombat) {
            document.getElementById('combat-log').innerHTML = `<p class='success'>Išgeri mikstūrą, atstatydamas ${healing} gyvybių. Dabar turi ${gameState.hp} gyvybių.</p>`;
            monsterAttack();
        } else {
            setGameText(`<p class='success'>Išgeri mikstūrą, atstatydamas ${healing} gyvybių. Dabar turi ${gameState.hp} gyvybių.</p>`);
        }
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

    let encounterText = monster.name === FORTRESS_LORD.name
        ? `<p><strong>Paskutinė menė:</strong></p><p class='warning'>Didžiuliai paskutinės menės vartai girgždėdami atsidaro, atidengdami <strong>${FORTRESS_LORD.name}</strong> savo soste!</p>`
        : TOUGH_MONSTERS.some(m => m.name === monster.name)
            ? `<p class='warning'>Bauginantis ${monster.name} pastoja tau kelią!</p>`
            : `<p class='warning'>Pasirodo ${monster.name}!</p>`;

    let text = `<div id="combat-encounter">${encounterText}</div>
                <div class="monster-stats" id="monster-stats-display">
                    <h4>${monster.name}</h4>
                    <p>GYVYBĖS: <span id="monster-hp">${monster.hp}</span> / ${monster.hp} | ŽALA: ${monster.damage}</p>
                </div>
                <div id="combat-log"></div>`;

    setGameText(text);
    updateUI();
}

/**
 * Player attacks the current monster.
 */
function attack() {
    const monster = gameState.currentMonster;
    if (!monster) return;

    playAttackSound();

    const combatLogEl = document.getElementById('combat-log');
    combatLogEl.innerHTML = ''; // Clear previous log

    const attackRoll = rollDie(6);
    if (attackRoll >= monster.difficulty) {
        const damage = rollDamage(gameState.playerDamage) + gameState.playerDamageBonus;
        monster.currentHp -= damage;

        playMonsterHitSound();
        triggerMonsterHitEffect();
        log(`Pataikei ${monster.name} ir padarei ${damage} žalos.`);
        combatLogEl.innerHTML = `<p class='success'>Pataikei ${monster.name} ir padarei ${damage} žalos.</p>`;

        document.getElementById('monster-hp').textContent = Math.max(0, monster.currentHp);

        if (monster.currentHp <= 0) {
            winCombat(damage);
        } else {
            monsterAttack();
        }
    } else {
        playMissSound();
        log(`Nepataikei į ${monster.name}.`);
        combatLogEl.innerHTML = `<p class='warning'>Nepataikei į ${monster.name}.</p>`;
        monsterAttack();
    }
    updateUI();
}

/**
 * Flees from combat.
 */
function flee() {
    playFleeSound();
    const combatLogEl = document.getElementById('combat-log');

    if (Math.random() < 0.5) { // 50% chance to flee
        gameState.inCombat = false;
        gameState.currentMonster = null;
        log("Sėkmingai pabėgai iš kovos.");
        setGameText("<p class='success'>Pavyko pabėgti!</p><p>Gali tęsti tyrinėjimą.</p>");
        updateUI();
    } else {
        log("Nepavyko pabėgti.");
        combatLogEl.innerHTML = `<p class='warning'>Nepavyko pabėgti!</p>`;
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
    playWinCombatSound();
    gameState.points += monster.points;
    
    const silverFound = rollDie(6) + monster.difficulty;
    gameState.silver += silverFound;
    let loot = [`${silverFound} sidabro`];

    if (Math.random() < 0.2 + (monster.difficulty * 0.1)) {
        const droppedItem = { ...LOOT_DROPS[rollDie(LOOT_DROPS.length) - 1] };
        loot.push(droppedItem.name);
        gameState.inventory.push(droppedItem.name);
        log(`Pabaisa išmetė ${droppedItem.name}!`);
        equipItem(droppedItem);
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
    updateUI();
}


// -----------------------------------------------------------------------------
// SHOP ACTIONS
// -----------------------------------------------------------------------------


function openShop(isFirstTime = false, tab = 'buy') {
    gameState.inShop = true;
    playShopSound();

    let shopText = isFirstTime ? "<p class='success'>Atsiranda paslaptingas prekeivis, siūlantis savo prekes.</p>" : "";

    shopText += `
        <div class="shop-tabs">
            <button class="${tab === 'buy' ? 'active' : ''}" onclick="openShop(false, 'buy')">Pirkti</button>
            <button class="${tab === 'sell' ? 'active' : ''}" onclick="openShop(false, 'sell')">Parduoti</button>
        </div>
    `;

    if (tab === 'buy') {
        shopText += "<h4>🛒 Prekeivio Prekės</h4>";
        SHOP_ITEMS.forEach(item => {
            shopText += `<div class="shop-item">
                <span>${item.name} (${item.price}s): ${item.description}</span>
                <button onclick="buyItem('${item.name}')" ${gameState.silver < item.price ? 'disabled' : ''}>Pirkti</button>
            </div>`;
        });
    } else { // Sell tab
        shopText += "<h4>🎒 Tavo Prekės</h4>";
        const sellableInventory = [...new Set(gameState.inventory)];
        if (sellableInventory.length === 0) {
            shopText += "<p>Neturi nieko parduoti.</p>";
        } else {
            sellableInventory.forEach(itemName => {
                const itemDetails = SHOP_ITEMS.find(i => i.name === itemName) || LOOT_DROPS.find(i => i.name === itemName);
                const sellPrice = itemDetails ? Math.floor((itemDetails.price || 5) / 2) : 2;
                const itemCount = gameState.inventory.filter(i => i === itemName).length;
                shopText += `<div class="shop-item">
                    <span>${itemName} (x${itemCount})</span>
                    <button onclick="sellItem('${itemName}', ${sellPrice})">Parduoti už ${sellPrice}s</button>
                </div>`;
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
        equipItem(item);
        openShop(false, 'buy'); // Refresh shop view
    }
}

function sellItem(itemName, sellPrice) {
    const itemIndex = gameState.inventory.indexOf(itemName);
    if (itemIndex > -1) {
        playSellSound();
        gameState.inventory.splice(itemIndex, 1);
        gameState.silver += sellPrice;
        log(`Pardavei ${itemName} už ${sellPrice} sidabro.`);
        recalculateStats();
        openShop(false, 'sell');
    }
}

function recalculateStats() {
    // Reset stats to base
    gameState.playerDamage = 'd4';
    gameState.playerDefense = 0;

    // Recalculate based on inventory
    const weapons = (SHOP_ITEMS.concat(LOOT_DROPS)).filter(item => item.type === 'weapon' && gameState.inventory.includes(item.name));
    const armors = (SHOP_ITEMS.concat(LOOT_DROPS)).filter(item => item.type === 'armor' && gameState.inventory.includes(item.name));

    if (weapons.length > 0) {
        const bestWeapon = weapons.reduce((best, current) => getDamageValue(current.value) > getDamageValue(best.value) ? current : best);
        gameState.playerDamage = bestWeapon.value;
    }

    if (armors.length > 0) {
        const bestArmor = armors.reduce((best, current) => current.value > best.value ? current : best);
        gameState.playerDefense = bestArmor.value;
    }
    updateUI();
}

function closeShop() {
    gameState.inShop = false;
    setGameText("<p>Palieki prekeivį ir toliau keliauji į tamsą.</p>");
    updateUI();
}

// -----------------------------------------------------------------------------
// PLAYER AND CHARACTER ACTIONS
// -----------------------------------------------------------------------------

function equipItem(item) {
    if (item.type === 'weapon') {
        if (getDamageValue(item.value) > getDamageValue(gameState.playerDamage)) {
            gameState.playerDamage = item.value;
            log(`Užsidėjai ${item.name}, padidindamas savo žalą!`);
        }
    } else if (item.type === 'armor') {
        if (item.value > gameState.playerDefense) {
            gameState.playerDefense = item.value;
            log(`Užsidėjai ${item.name}, padidindamas savo gynybą!`);
        }
    }
    updateUI();
}

function levelUp() {
    if (gameState.points < 10) return;
    
    playLevelUpSound();
    gameState.level++;
    gameState.points -= 10;

    let bonusText = "Tavo gynyba padidėjo 1";
    gameState.playerDefense++;

    // Damage bonus applies to each attack
    gameState.playerDamageBonus++;
    bonusText += " ir tavo žala padidėjo 1";

    // Occasional die upgrade
    if (gameState.level % 2 === 0) {
        if (gameState.playerDamage === 'd4') {
            gameState.playerDamage = 'd6';
            bonusText += " ir tavo žalos kauliukas buvo patobulintas į d6!";
        } else if (gameState.playerDamage === 'd6') {
            gameState.playerDamage = 'd8';
            bonusText += " ir tavo žalos kauliukas buvo patobulintas į d8!";
        }
    }
    
    log(`PASIEKEI NAUJĄ LYGĮ! Dabar esi ${gameState.level} lygio!`);
    setGameText(`<p class='success'>Pasiekei ${gameState.level} lygį! ${bonusText}.</p>`);
    updateUI();
}


// -----------------------------------------------------------------------------
// GAME STATE MANAGEMENT
// -----------------------------------------------------------------------------

/**
 * Ends the game in victory.
 */
function winGame() {
    playWinGameSound();
    log(`PERGALĖ! Nugalėjai Tvirtovės Valdovą!`);
    setGameText(`<h3>🏆 PERGALĖ! 🏆</h3><p>Nugalėjai Tvirtovės Valdovą ir užkariavai Tamsiąją Tvirtovę!</p><p>Tavo galutinis rezultatas: ${gameState.points}</p><button onclick="resetGame()">Pradėti Naują Nuotykį</button>`);
    gameState.inCombat = false;
    updateUI();
}

/**
 * Ends the game in defeat.
 * @param {string} reason - The reason for the game over.
 */
function gameOver(reason) {
    playGameOverSound();
    gameState.playerIsDead = true;
    log(`ŽAIDIMAS BAIGTAS: ${reason}`);
    setGameText(`<h3>💀 ŽAIDIMAS BAIGTAS 💀</h3><p>${reason}</p><p>Tavo nuotykis čia baigiasi.</p><button onclick="resetGame()">Pradėti Naują Nuotykį</button>`);
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
        playerDamage: 'd4',
        playerDamageBonus: 0,
        playerDefense: 0,
        inventory: [],
        currentMonster: null,
        inCombat: false,
        inShop: false,
        gameStarted: false,
        roomsExplored: 0,
    bossEncountered: false,
    playerIsDead: false
    };
    logEl.innerHTML = "";
    setGameText('<p>Sveikas atvykęs į Tamsiąją Tvirtovę, drąsusis Karguntai!</p><p>Spausk "Pradėti Nuotykį" ir leiskis į pavojingą kelionę...</p>');
    updateUI();
}


// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    gameTextEl = document.getElementById('gameText');
    logEl = document.getElementById('log');
    updateUI();
});
