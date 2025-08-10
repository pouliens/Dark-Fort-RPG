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
    playerDamage: 'd4',
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
    document.getElementById('playerDamage').textContent = gameState.playerDamage;
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
    const combatLogEl = document.getElementById('combat-log');
    combatLogEl.innerHTML = ''; // Clear previous turn log

    if (rollDie(6) >= monster.difficulty) {
        playAttackSound();
        const damage = rollDamage(gameState.playerDamage);
        monster.currentHp -= damage;
        log(`You hit the ${monster.name} for ${damage} damage.`);
        combatLogEl.innerHTML += `<p class='success'>You hit the ${monster.name} for ${damage} damage. It has ${monster.currentHp} HP left.</p>`;

        document.getElementById('monster-hp').textContent = monster.currentHp;
        playMonsterHitSound();
        triggerMonsterHitEffect();
    } else {
        playMissSound();
        log(`You missed the ${monster.name}.`);
        combatLogEl.innerHTML += `<p class='warning'>You missed the ${monster.name}.</p>`;
    }
    
    if (monster.currentHp <= 0) {
        winCombat();
    } else {
        monsterAttack();
    }
    updateUI();
}

/**
 * The current monster attacks the player.
 */
function monsterAttack() {
    const monster = gameState.currentMonster;
    let damage = Math.max(0, rollDamage(monster.damage) - gameState.playerDefense);

    gameState.hp -= damage;
    if (damage > 0) {
        playPlayerHitSound();
        triggerDamageEffect();
    }
    log(`The ${monster.name} hits you for ${damage} damage.`);
    
    const combatLogEl = document.getElementById('combat-log');
    combatLogEl.innerHTML += `<p class='warning'>The ${monster.name} retaliates, hitting you for ${damage} damage.</p>`;
    
    if (gameState.hp <= 0) {
        gameOver(`You were slain by a ${monster.name}.`);
    }
    updateUI();
}

/**
 * Player flees from combat, taking some damage.
 */
function flee() {
    if (gameState.hp <= 0) return;
    playFleeSound();
    const damage = rollDie(4);
    gameState.hp -= damage;
    triggerDamageEffect();
    log(`You fled from combat, taking ${damage} damage.`);

    gameState.inCombat = false;
    gameState.currentMonster = null;

    if (gameState.hp <= 0) {
        updateUI();
        gameOver("You died while trying to flee.");
    } else {
        exploreRoom();
    }
}

/**
 * Handles the player winning a combat encounter.
 */
function winCombat() {
    playWinCombatSound();
    const monster = gameState.currentMonster;
    gameState.points += monster.points;
    log(`You defeated the ${monster.name}!`);

    // Loot
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
    if (Math.random() < 0.3) {
        loot.push('Potion');
        gameState.inventory.push('Potion');
        log('The monster dropped a potion!');
    }

    if (monster.name === 'Fortress Lord') {
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

/**
 * Opens the shop interface.
 * @param {boolean} isFirstTime - Whether this is the first time opening the shop in this location.
 */
function openShop(isFirstTime = false) {
    if (isFirstTime) playShopSound();
    gameState.inShop = true;

    let shopText = isFirstTime ? "<p class='success'>A mysterious peddler appears, offering their wares.</p>" : "";
    shopText += "<h4>🛒 Peddler's Wares</h4>";
    SHOP_ITEMS.forEach(item => {
        const disabled = gameState.silver < item.price ? 'disabled' : '';
        shopText += `<p class="shop-item"><span>${item.name} (${item.price}s): ${item.description}</span> <button onclick="buyItem('${item.name}')" ${disabled}>Buy</button></p>`;
    });
    shopText += `<button onclick="closeShop()">Leave Shop</button>`;

    setGameText(shopText);
    updateUI();
}

/**
 * Buys an item from the shop.
 * @param {string} itemName - The name of the item to buy.
 */
function buyItem(itemName) {
    const item = SHOP_ITEMS.find(i => i.name === itemName);
    if (item && gameState.silver >= item.price) {
        playBuySound();
        gameState.silver -= item.price;
        gameState.inventory.push(itemName);
        log(`You bought a ${itemName}.`);
        equipItem(item);
        openShop(); // Refresh shop view
    }
}

/**
 * Closes the shop interface.
 */
function closeShop() {
    gameState.inShop = false;
    setGameText("<p>You leave the peddler behind and continue into the darkness.</p>");
    updateUI();
}


// -----------------------------------------------------------------------------
// PLAYER AND CHARACTER ACTIONS
// -----------------------------------------------------------------------------

/**
 * Equips an item, updating player stats if it's better than current gear.
 * @param {object} item - The item to equip.
 */
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
}

/**
 * Levels up the player, improving stats.
 */
function levelUp() {
    if (gameState.points < 10) return;
    playLevelUpSound();
    
    gameState.level++;
    gameState.points -= 10;
    gameState.playerDefense++;

    let bonusText = "Your defense increased by 1";
    if (gameState.playerDamage === 'd4') {
        gameState.playerDamage = 'd6';
        bonusText += " and your damage die was upgraded!";
    } else if (gameState.playerDamage === 'd6') {
        gameState.playerDamage = 'd8';
        bonusText += " and your damage die was upgraded!";
    } else {
        bonusText += "!";
    }
    
    log(`LEVEL UP! You are now level ${gameState.level}!`);
    setGameText(`<p class='success'>You leveled up to level ${gameState.level}! ${bonusText}</p>`);
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
        hp: 20, maxHp: 20, silver: 0, points: 0, level: 1,
        playerDamage: 'd4', playerDefense: 0, inventory: [],
        currentMonster: null, inCombat: false, inShop: false,
        gameStarted: false, roomsExplored: 0, bossEncountered: false, playerIsDead: false
    };
    logEl.innerHTML = "";
    setGameText('<p>Welcome to the Dark Fort, brave Kargunt!</p><p>Click "Start Adventure" to begin your perilous journey...</p>');
    updateUI();
}

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    gameTextEl = document.getElementById('gameText');
    logEl = document.getElementById('log');
    updateUI();
});
