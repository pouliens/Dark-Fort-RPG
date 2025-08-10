// =============================================================================
// DARK FORT RPG - GAME LOGIC
// =============================================================================

// -----------------------------------------------------------------------------
// GAME STATE INITIALIZATION
// -----------------------------------------------------------------------------

let gameState = {
    hp: 20,
    maxHp: 20,
    silver: 0,
    points: 0,
    level: 1,
    playerDamage: 'd4', // Default player damage
    playerDamageBonus: 0,
    playerDefense: 0,   // Default player defense
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
// GAME DATA
// -----------------------------------------------------------------------------

const WEAK_MONSTERS = [
    { name: 'Blood-drenched Skeleton', points: 3, damage: 'd4', hp: 6, difficulty: 2 },
    { name: 'Catacomb Cultist', points: 3, damage: 'd4', hp: 6, difficulty: 2 },
    { name: 'Goblin', points: 3, damage: 'd4', hp: 5, difficulty: 2 },
    { name: 'Undead Hound', points: 4, damage: 'd4', hp: 6, difficulty: 3 }
];

const TOUGH_MONSTERS = [
    { name: 'Necro-Sorcerer', points: 4, damage: 'd6', hp: 8, difficulty: 3 },
    { name: 'Small Stone Troll', points: 5, damage: 'd6', hp: 9, difficulty: 4 },
    { name: 'Medusa', points: 4, damage: 'd6', hp: 10, difficulty: 3 },
    { name: 'Ruin Basilisk', points: 4, damage: 'd6', hp: 11, difficulty: 3 }
];

const FORTRESS_LORD = { name: 'Fortress Lord', points: 20, damage: 'd6', hp: 25, difficulty: 4 };

const LOOT_DROPS = [
    { name: 'Sword', type: 'weapon', value: 'd6' },
    { name: 'Leather Armor', type: 'armor', value: 1 },
    { name: 'Potion', type: 'potion' }
];

const SHOP_ITEMS = [
    { name: 'Potion', price: 5, description: 'Heals 2d6 HP.', type: 'potion' },
    { name: 'Sword', price: 10, description: 'A basic weapon (d6 damage).', type: 'weapon', value: 'd6' },
    { name: 'Great Sword', price: 25, description: 'A better weapon (d8 damage).', type: 'weapon', value: 'd8' },
    { name: 'Leather Armor', price: 15, description: 'Basic armor (1 defense).', type: 'armor', value: 1 },
    { name: 'Chainmail Armor', price: 30, description: 'Better armor (2 defense).', type: 'armor', value: 2 },
    { name: 'Rope', price: 5, description: 'Helps avoid pit traps.', type: 'utility' }
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
    inventoryEl.innerHTML = gameState.inventory.length > 0 ? gameState.inventory.join(', ') : 'Empty';

    // Update Buttons
    const isPlayerActionable = gameState.gameStarted && !gameState.playerIsDead;
    document.getElementById('startBtn').style.display = gameState.gameStarted ? 'none' : 'block';
    document.getElementById('exploreBtn').style.display = isPlayerActionable && !gameState.inCombat && !gameState.inShop ? 'block' : 'none';
    document.getElementById('attackBtn').style.display = isPlayerActionable && gameState.inCombat ? 'block' : 'none';
    document.getElementById('fleeBtn').style.display = isPlayerActionable && gameState.inCombat ? 'block' : 'none';
    
    const canUsePotion = isPlayerActionable && gameState.inventory.includes('Potion') && gameState.hp < gameState.maxHp && !gameState.inShop;
    document.getElementById('usePotionBtn').style.display = canUsePotion ? 'block' : 'none';

    const canLevelUp = gameState.points >= 10;
    document.getElementById('levelUpBtn').style.display = isPlayerActionable && canLevelUp && !gameState.inCombat ? 'block' : 'none';
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
    let startingInventory = ['Sword', 'Potion'];
    if (Math.random() < 0.5) startingInventory.push('Potion');
    if (Math.random() < 0.3) startingInventory.push('Rope');
    gameState.inventory = startingInventory;

    if (gameState.inventory.includes('Sword')) {
        gameState.playerDamage = 'd6';
    }
    
    log(`Adventure begins! Found ${gameState.silver} silver.`);
    log(`Your gear: ${gameState.inventory.join(', ')}.`);
    
    setGameText("<p>You enter a dimly lit chamber. The air is thick with the smell of dust and decay. A single door leads deeper into the catacomb.</p><p>What do you do?</p>");
    updateUI();
}

/**
 * Explores a new room, triggering events like traps, monsters, or shops.
 */
function exploreRoom() {
    playExploreSound();

    if (gameState.level >= 2 && !gameState.bossEncountered) {
        gameState.bossEncountered = true;
        log(`Encountered the final boss: ${FORTRESS_LORD.name}.`);
        startCombat(FORTRESS_LORD);
        return;
    }

    gameState.points++;
    gameState.roomsExplored++;
    const roll = rollDie(6);
    let text = `<p><strong>Room ${gameState.roomsExplored}:</strong></p>`;

    switch (roll) {
        case 1:
        case 2: // Empty Room
            text += "<p>The room is empty, save for dust and cobwebs.</p>";
            log("Room was empty.");
            break;
        case 3: // Trap
            if (gameState.inventory.includes('Rope')) {
                text += "<p class='success'>You spot a pit trap and use your rope to safely cross it.</p>";
                log("Safely avoided a pit trap.");
            } else {
                const damage = rollDie(4);
                gameState.hp -= damage;
                playPlayerHitSound();
                triggerDamageEffect();
                text += `<p class='warning'>You fall into a pit trap, taking ${damage} damage!</p>`;
                log(`Took ${damage} damage from a trap.`);
            }
            break;
        case 4: // Weak Monster
            const weakMonster = WEAK_MONSTERS[rollDie(WEAK_MONSTERS.length) - 1];
            log(`Encountered a ${weakMonster.name}.`);
            startCombat(weakMonster);
            return;
        case 5: // Tough Monster
            const toughMonster = TOUGH_MONSTERS[rollDie(TOUGH_MONSTERS.length) - 1];
            log(`Encountered a ${toughMonster.name}.`);
            startCombat(toughMonster);
            return;
        case 6: // Shop
            log("Found a shop.");
            openShop(true);
            return;
    }
    
    setGameText(text);
    if (gameState.hp <= 0) {
        gameOver("You succumbed to a trap!");
    } else {
        updateUI();
    }
}

/**
 * Uses a potion to heal the player.
 */
function usePotion() {
    const potionIndex = gameState.inventory.indexOf('Potion');
    if (potionIndex > -1) {
        playPotionSound();
        const healing = rollDie(6) + rollDie(6);
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + healing);

        gameState.inventory.splice(potionIndex, 1);
        log(`You used a potion and healed for ${healing} HP.`);

        if (gameState.inCombat) {
            document.getElementById('combat-log').innerHTML = `<p class='success'>You drink a potion, restoring ${healing} health. You now have ${gameState.hp} HP.</p>`;
            monsterAttack();
        } else {
            setGameText(`<p class='success'>You drink a potion, restoring ${healing} health. You now have ${gameState.hp} HP.</p>`);
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
        ? `<p><strong>Final Chamber:</strong></p><p class='warning'>The massive gates of the final chamber creak open, revealing the <strong>${FORTRESS_LORD.name}</strong> on his throne!</p>`
        : TOUGH_MONSTERS.some(m => m.name === monster.name)
            ? `<p class='warning'>A fearsome ${monster.name} blocks your path!</p>`
            : `<p class='warning'>A ${monster.name} appears!</p>`;

    let text = `<div id="combat-encounter">${encounterText}</div>
                <div class="monster-stats" id="monster-stats-display">
                    <h4>${monster.name}</h4>
                    <p>HP: <span id="monster-hp">${monster.hp}</span> / ${monster.hp} | Damage: ${monster.damage}</p>
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
        log(`You hit the ${monster.name} for ${damage} damage.`);
        combatLogEl.innerHTML = `<p class='success'>You hit the ${monster.name} for ${damage} damage. It has ${Math.max(0, monster.currentHp)} HP left.</p>`;

        document.getElementById('monster-hp').textContent = monster.currentHp;

        if (monster.currentHp <= 0) {
            winCombat();
        } else {
            monsterAttack();
        }
    } else {
        playMissSound();
        log(`You missed the ${monster.name}.`);
        combatLogEl.innerHTML = `<p class='warning'>You missed the ${monster.name}.</p>`;
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
        log("You successfully fled from the combat.");
        setGameText("<p class='success'>You managed to escape!</p><p>You may continue exploring.</p>");
        updateUI();
    } else {
        log("You failed to flee.");
        combatLogEl.innerHTML = `<p class='warning'>You failed to escape!</p>`;
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

    log(`The ${monster.name} hits you for ${damage} damage.`);
    
    const combatLogEl = document.getElementById('combat-log');
    if(combatLogEl) {
        combatLogEl.innerHTML += `<p class='warning'>The ${monster.name} retaliates, hitting you for ${damage} damage.</p>`;
    }

    if (gameState.hp <= 0) {
        gameOver(`You were slain by a ${monster.name}.`);
    }
    updateUI();
}

function winCombat() {
    const monster = gameState.currentMonster;
    playWinCombatSound();
    gameState.points += monster.points;
    
    const silverFound = rollDie(6) + monster.difficulty;
    gameState.silver += silverFound;
    let loot = [`${silverFound} silver`];

    if (Math.random() < 0.2 + (monster.difficulty * 0.1)) {
        const droppedItem = { ...LOOT_DROPS[rollDie(LOOT_DROPS.length) - 1] };
        loot.push(droppedItem.name);
        gameState.inventory.push(droppedItem.name);
        log(`The monster dropped a ${droppedItem.name}!`);
        equipItem(droppedItem);
    }

    log(`You defeated the ${monster.name}!`);

    if (monster.name === FORTRESS_LORD.name) {
        winGame();
        return;
    }
    
    let text = `<p class='success'>You defeated the ${monster.name}!</p>
                <p>You gained ${monster.points} points.</p>
                <p><strong>Loot:</strong> ${loot.join(', ')}</p>
                <p>You may continue exploring.</p>`;

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

    let shopText = isFirstTime ? "<p class='success'>A mysterious peddler appears, offering their wares.</p>" : "";

    shopText += `
        <div class="shop-tabs">
            <button onclick="openShop(false, 'buy')">Buy</button>
            <button onclick="openShop(false, 'sell')">Sell</button>
        </div>
    `;

    if (tab === 'buy') {
        shopText += "<h4>🛒 Peddler's Wares</h4>";
        SHOP_ITEMS.forEach(item => {
            shopText += `<div class="shop-item">
                <span>${item.name} (${item.price}s): ${item.description}</span>
                <button onclick="buyItem('${item.name}')" ${gameState.silver < item.price ? 'disabled' : ''}>Buy</button>
            </div>`;
        });
    } else { // Sell tab
        shopText += "<h4>🎒 Your Wares</h4>";
        const sellableInventory = [...new Set(gameState.inventory)];
        if (sellableInventory.length === 0) {
            shopText += "<p>You have nothing to sell.</p>";
        } else {
            sellableInventory.forEach(itemName => {
                const itemDetails = SHOP_ITEMS.find(i => i.name === itemName) || LOOT_DROPS.find(i => i.name === itemName);
                const sellPrice = itemDetails ? Math.floor((itemDetails.price || 5) / 2) : 2;
                const itemCount = gameState.inventory.filter(i => i === itemName).length;
                shopText += `<div class="shop-item">
                    <span>${itemName} (x${itemCount})</span>
                    <button onclick="sellItem('${itemName}', ${sellPrice})">Sell for ${sellPrice}s</button>
                </div>`;
            });
        }
    }

    shopText += `<button onclick="closeShop()">Leave Shop</button>`;
    setGameText(shopText);
    updateUI();
}

function buyItem(itemName) {
    const item = SHOP_ITEMS.find(i => i.name === itemName);
    if (item && gameState.silver >= item.price) {
        playBuySound();
        gameState.silver -= item.price;
        gameState.inventory.push(itemName);
        log(`You bought a ${itemName}.`);
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
        log(`You sold a ${itemName} for ${sellPrice} silver.`);
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
    setGameText("<p>You leave the peddler behind and continue into the darkness.</p>");
    updateUI();
}

// -----------------------------------------------------------------------------
// PLAYER AND CHARACTER ACTIONS
// -----------------------------------------------------------------------------

function equipItem(item) {
    if (item.type === 'weapon') {
        if (getDamageValue(item.value) > getDamageValue(gameState.playerDamage)) {
            gameState.playerDamage = item.value;
            log(`You equipped the ${item.name}, increasing your damage!`);
        }
    } else if (item.type === 'armor') {
        if (item.value > gameState.playerDefense) {
            gameState.playerDefense = item.value;
            log(`You equipped the ${item.name}, increasing your defense!`);
        }
    }
    updateUI();
}

function levelUp() {
    if (gameState.points < 10) return;
    
    playLevelUpSound();
    gameState.level++;
    gameState.points -= 10;

    let bonusText = "Your defense increased by 1";
    gameState.playerDefense++;

    // Damage bonus applies to each attack
    gameState.playerDamageBonus++;
    bonusText += " and your damage increased by 1";

    // Occasional die upgrade
    if (gameState.level % 2 === 0) {
        if (gameState.playerDamage === 'd4') {
            gameState.playerDamage = 'd6';
            bonusText += " and your damage die was upgraded to d6!";
        } else if (gameState.playerDamage === 'd6') {
            gameState.playerDamage = 'd8';
            bonusText += " and your damage die was upgraded to d8!";
        }
    }
    
    log(`LEVEL UP! You are now level ${gameState.level}!`);
    setGameText(`<p class='success'>You leveled up to level ${gameState.level}! ${bonusText}.</p>`);
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
    log(`VICTORY! You defeated the Fortress Lord!`);
    setGameText(`<h3>🏆 VICTORY! 🏆</h3><p>You have defeated the Fortress Lord and conquered the Dark Fort!</p><p>Your final score: ${gameState.points}</p><button onclick="resetGame()">Start New Adventure</button>`);
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
    log(`GAME OVER: ${reason}`);
    setGameText(`<h3>💀 GAME OVER 💀</h3><p>${reason}</p><p>Your adventure ends here.</p><button onclick="resetGame()">Start New Adventure</button>`);
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
    setGameText('<p>Welcome to the Dark Fort, brave Kargunt!</p><p>Click "Start Adventure" to begin your perilous journey...</p>');
    updateUI();
}


// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    gameTextEl = document.getElementById('gameText');
    logEl = document.getElementById('log');
    updateUI();
});
