// Simplified Dark Fort RPG - Game Logic

// --- GAME STATE ---
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

// --- GAME DATA ---
const weakMonsters = [
    { name: 'Blood-drenched Skeleton', points: 3, damage: 'd4', hp: 6, difficulty: 2 },
    { name: 'Catacomb Cultist', points: 3, damage: 'd4', hp: 6, difficulty: 2 },
    { name: 'Goblin', points: 3, damage: 'd4', hp: 5, difficulty: 2 },
    { name: 'Undead Hound', points: 4, damage: 'd4', hp: 6, difficulty: 3 }
];

const toughMonsters = [
    { name: 'Necro-Sorcerer', points: 4, damage: 'd6', hp: 8, difficulty: 3 },
    { name: 'Small Stone Troll', points: 5, damage: 'd6', hp: 9, difficulty: 4 },
    { name: 'Medusa', points: 4, damage: 'd6', hp: 10, difficulty: 3 },
    { name: 'Ruin Basilisk', points: 4, damage: 'd6', hp: 11, difficulty: 3 }
];

const fortressLord = { name: 'Fortress Lord', points: 20, damage: 'd6', hp: 25, difficulty: 4 };

const lootDrops = [
    { name: 'Sword', type: 'weapon', value: 'd6' },
    { name: 'Leather Armor', type: 'armor', value: 1 },
    { name: 'Potion', type: 'potion' }
];

const shopItems = [
    { name: 'Potion', price: 5, description: 'Heals 2d6 HP.', type: 'potion' },
    { name: 'Sword', price: 10, description: 'A basic weapon (d6 damage).', type: 'weapon', value: 'd6' },
    { name: 'Great Sword', price: 25, description: 'A better weapon (d8 damage).', type: 'weapon', value: 'd8' },
    { name: 'Leather Armor', price: 15, description: 'Basic armor (1 defense).', type: 'armor', value: 1 },
    { name: 'Chainmail Armor', price: 30, description: 'Better armor (2 defense).', type: 'armor', value: 2 },
    { name: 'Rope', price: 5, description: 'Helps avoid pit traps.', type: 'utility' }
];

// --- UTILITY FUNCTIONS ---
function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function rollDamage(diceString) {
    const match = diceString.match(/d(\d+)/);
    if (match) {
        return rollDie(parseInt(match[1], 10));
    }
    return 1;
}

// --- UI FUNCTIONS ---
// Define elements at a scope accessible by all functions
let gameTextEl, logEl;

function log(message) {
    if (logEl) {
        logEl.innerHTML = `<p>${message}</p>` + logEl.innerHTML;
    }
}

function setGameText(html) {
    if (gameTextEl) {
        gameTextEl.innerHTML = html;
    }
}

function triggerDamageEffect() {
    const characterSheetEl = document.querySelector('.character-sheet');
    if (characterSheetEl) {
        characterSheetEl.classList.add('player-damage-flash');
        setTimeout(() => {
            characterSheetEl.classList.remove('player-damage-flash');
        }, 400);
    }
}

function triggerMonsterHitEffect() {
    const monsterStatsEl = document.getElementById('monster-stats-display');
    if (monsterStatsEl) {
        monsterStatsEl.classList.add('monster-hit-flash');
        setTimeout(() => {
            monsterStatsEl.classList.remove('monster-hit-flash');
        }, 400);
    }
}

function updateUI() {
    // Stats
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

    // Inventory
    const inventoryEl = document.getElementById('inventory');
    if (inventoryEl) {
        if (gameState.inventory.length > 0) {
            inventoryEl.innerHTML = gameState.inventory.join(', ');
        } else {
            inventoryEl.innerHTML = 'Empty';
        }
    }

    // Buttons
    const isPlayerActionable = gameState.gameStarted && !gameState.playerIsDead;
    document.getElementById('startBtn').style.display = gameState.gameStarted ? 'none' : 'block';
    document.getElementById('exploreBtn').style.display = isPlayerActionable && !gameState.inCombat && !gameState.inShop ? 'block' : 'none';
    document.getElementById('attackBtn').style.display = isPlayerActionable && gameState.inCombat ? 'block' : 'none';
    document.getElementById('fleeBtn').style.display = isPlayerActionable && gameState.inCombat ? 'block' : 'none';
    document.getElementById('usePotionBtn').style.display = isPlayerActionable && gameState.inventory.includes('Potion') && gameState.hp < gameState.maxHp && !gameState.inShop ? 'block' : 'none';
    
    // Level up button
    const canLevelUp = gameState.points >= 10;
    document.getElementById('levelUpBtn').style.display = isPlayerActionable && canLevelUp && !gameState.inCombat ? 'block' : 'none';
}

// --- GAME ACTIONS ---
function startGame() {
    gameState.gameStarted = true;
  
    gameState.silver = 25 + rollDie(6);

    let startingInventory = ['Sword', 'Potion'];
    if (Math.random() < 0.5) {
        startingInventory.push('Potion');
    }
    if (Math.random() < 0.3) {
        startingInventory.push('Rope');
    }
    gameState.inventory = startingInventory;

    if (gameState.inventory.includes('Sword')) {
        gameState.playerDamage = 'd6';
    }
    
    log(`Adventure begins! Found ${gameState.silver} silver.`);
    log(`Your gear: ${gameState.inventory.join(', ')}.`);
    
    setGameText("<p>You enter a dimly lit chamber. The air is thick with the smell of dust and decay. A single door leads deeper into the catacomb.</p><p>What do you do?</p>");
    
    updateUI();
}

function exploreRoom() {
    // Boss encounter at level 2
    if (gameState.level >= 2 && !gameState.bossEncountered) {
        gameState.bossEncountered = true;
        log(`Encountered the final boss: ${fortressLord.name}.`);
        startCombat(fortressLord);
        return;
    }
    gameState.points++;
    gameState.roomsExplored++;
    const roll = rollDie(6);
    
    let text = `<p><strong>Room ${gameState.roomsExplored}:</strong></p>`;
    
    if (roll <= 2) { // Empty Room
        text += "<p>The room is empty, save for dust and cobwebs.</p>";
        log("Room was empty.");
    } else if (roll === 3) { // Trap
        if (gameState.inventory.includes('Rope')) {
            text += "<p class='success'>You spot a pit trap and use your rope to safely cross it.</p>";
            log("Safely avoided a pit trap.");
        } else {
            const damage = rollDie(4);
            gameState.hp -= damage;
            triggerDamageEffect();
            text += `<p class='warning'>You fall into a pit trap, taking ${damage} damage!</p>`;
            log(`Took ${damage} damage from a trap.`);
        }
    } else if (roll === 4) { // Weak Monster
        const monster = weakMonsters[rollDie(weakMonsters.length) - 1];
        log(`Encountered a ${monster.name}.`);
        startCombat(monster);
        return;
    } else if (roll === 5) { // Tough Monster
        const monster = toughMonsters[rollDie(toughMonsters.length) - 1];
        log(`Encountered a ${monster.name}.`);
        startCombat(monster);
        return;
    } else { // Shop
        log("Found a shop.");
        openShop(true);
        return;
    }
    
    setGameText(text);
    
    if (gameState.hp <= 0) {
        gameOver("You succumbed to a trap!");
        return;
    }
    
    updateUI();
}

function startCombat(monster) {
    gameState.inCombat = true;
    gameState.currentMonster = { ...monster, currentHp: monster.hp };

    let encounterText;
    if (monster.name === fortressLord.name) {
        encounterText = `<p><strong>Final Chamber:</strong></p><p class='warning'>The massive gates of the final chamber creak open, revealing the <strong>${fortressLord.name}</strong> on his throne!</p>`;
    } else if (toughMonsters.some(m => m.name === monster.name)) {
        encounterText = `<p class='warning'>A fearsome ${monster.name} blocks your path!</p>`;
    } else {
        encounterText = `<p class='warning'>A ${monster.name} appears!</p>`;
    }

    let text = `<div id="combat-encounter">${encounterText}</div>`;
    text += `<div class="monster-stats" id="monster-stats-display">`;
    text += `<h4>${monster.name}</h4>`;
    text += `<p>HP: <span id="monster-hp">${monster.hp}</span> / ${monster.hp} | Damage: ${monster.damage}</p>`;
    text += `</div>`;
    text += `<div id="combat-log"></div>`;

    setGameText(text);
    updateUI();
}

function attack() {
    const monster = gameState.currentMonster;
    const attackRoll = rollDie(6);
    let damage = 0; // Initialize damage to 0
    
    let combatLogEl = document.getElementById('combat-log');
    if (combatLogEl) combatLogEl.innerHTML = ''; // Clear previous turn log

    if (attackRoll >= monster.difficulty) {
        damage = rollDamage(gameState.playerDamage) + gameState.playerDamageBonus;
        monster.currentHp -= damage;
        log(`You hit the ${monster.name} for ${damage} damage.`);

        if (combatLogEl) {
            combatLogEl.innerHTML += `<p class='success'>You hit the ${monster.name} for ${damage} damage.</p>`;
        }
        playSound('hit');
        const monsterHpEl = document.getElementById('monster-hp');
        if (monsterHpEl) {
            monsterHpEl.textContent = monster.currentHp;
        }
        triggerMonsterHitEffect();
    } else {
        log(`You missed the ${monster.name}.`);
        if (combatLogEl) {
            combatLogEl.innerHTML += `<p class='warning'>You missed the ${monster.name}.</p>`;
        }
    }
    
    if (monster.currentHp <= 0) {
        winCombat(damage); // Pass the actual damage dealt
    } else {
        monsterAttack();
    }

    updateUI();
}

function monsterAttack() {
    const monster = gameState.currentMonster;
    let damage = rollDamage(monster.damage);
    damage = Math.max(0, damage - gameState.playerDefense); // Apply player defense

    gameState.hp -= damage;
    if (damage > 0) {
        triggerDamageEffect();
        playSound('hit');
    }
    log(`The ${monster.name} hits you for ${damage} damage.`);
    
    const combatLogEl = document.getElementById('combat-log');
    if (combatLogEl) {
        combatLogEl.innerHTML += `<p class='warning'>The ${monster.name} retaliates, hitting you for ${damage} damage.</p>`;
    }
    
    if (gameState.hp <= 0) {
        gameOver(`You were slain by a ${monster.name}.`);
    }
    
    updateUI();
}

function winCombat(killingBlow) {
    const monster = gameState.currentMonster;
    gameState.points += monster.points;
    
    log(`You defeated the ${monster.name} with a final blow of ${killingBlow} damage!`);
    playSound('win');
    // Loot drops
    const silverFound = rollDie(6) + monster.difficulty;
    gameState.silver += silverFound;
    let loot = [ `${silverFound} silver` ];

    // Chance to drop an item
    if (Math.random() < 0.2 + (monster.difficulty * 0.1)) { // Increased drop chance for tougher monsters
        const droppedItem = { ...lootDrops[rollDie(lootDrops.length) - 1] };
        loot.push(droppedItem.name);
        gameState.inventory.push(droppedItem.name);
        log(`The monster dropped a ${droppedItem.name}!`);
        if (droppedItem.type === 'weapon' || droppedItem.type === 'armor') {
            equipItem(droppedItem);
        }
    }

    // Chance to drop a potion
    if (Math.random() < 0.3) {
        loot.push('Potion');
        gameState.inventory.push('Potion');
        log('The monster dropped a potion!');
    }

    if (monster.name === 'Fortress Lord') {
        winGame();
        return;
    }
    
    let text = `<p class='success'>You defeated the ${monster.name} with a final blow of ${killingBlow} damage!</p>`;
    text += `<p>You gained ${monster.points} points.</p>`;
    if (loot.length > 0) {
        text += `<p><strong>Loot:</strong> ${loot.join(', ')}</p>`;
    }
    text += `<p>You may continue exploring.</p>`;
    setGameText(text);
    
    gameState.inCombat = false;
    gameState.currentMonster = null;
    updateUI();
}

function flee() {
    if (gameState.hp <= 0) return; // Prevent fleeing if already dead
    const damage = rollDie(4);
    gameState.hp -= damage;
    triggerDamageEffect();
    log(`You fled from combat, taking ${damage} damage.`);
    
    gameState.inCombat = false;
    gameState.currentMonster = null;

    if (gameState.hp <= 0) {
        updateUI(); // Update UI to show correct HP before game over
        gameOver("You died while trying to flee.");
        return;
    }
    
    // Move to the next room immediately after fleeing.
    exploreRoom();
}

function usePotion() {
    if (gameState.inventory.includes('Potion')) {
        const healing = rollDie(6) + rollDie(6);
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + healing);
        
        const potionIndex = gameState.inventory.indexOf('Potion');
        gameState.inventory.splice(potionIndex, 1);
        
        log(`You used a potion and healed for ${healing} HP.`);
        if (gameState.inCombat) {
            const combatLogEl = document.getElementById('combat-log');
            if (combatLogEl) {
                combatLogEl.innerHTML = `<p class='success'>You drink a potion, restoring ${healing} health. You now have ${gameState.hp} HP.</p>`;
            }
            monsterAttack();
        } else {
            setGameText(`<p class='success'>You drink a potion, restoring ${healing} health. You now have ${gameState.hp} HP.</p>`);
        }

        updateUI();
    }
}

function openShop(isFirstTime = false, tab = 'buy') {
    gameState.inShop = true;
    let shopText = "";
    if (isFirstTime) {
        shopText += "<p class='success'>A mysterious peddler appears, offering their wares.</p>";
    }
    shopText += `
        <div>
            <button onclick="openShop(false, 'buy')">Buy</button>
            <button onclick="openShop(false, 'sell')">Sell</button>
        </div>
    `;

    if (tab === 'buy') {
        shopText += "<h4>🛒 Peddler's Wares</h4>";
        shopItems.forEach(item => {
            shopText += `<p class="shop-item"><span>${item.name} (${item.price}s): ${item.description}</span> <button onclick="buyItem('${item.name}', ${item.price})" ${gameState.silver < item.price ? 'disabled' : ''}>Buy</button></p>`;
        });
    } else { // Sell tab
        shopText += "<h4>🎒 Your Wares</h4>";
        if (gameState.inventory.length === 0) {
            shopText += "<p>You have nothing to sell.</p>";
        } else {
            const sellableInventory = [...new Set(gameState.inventory)]; // Unique items
            sellableInventory.forEach(itemName => {
                const itemDetails = shopItems.find(i => i.name === itemName);
                const sellPrice = itemDetails ? Math.floor(itemDetails.price / 2) : 2; // Default sell price if not in shop list
                const itemCount = gameState.inventory.filter(i => i === itemName).length;
                shopText += `<p class="shop-item"><span>${itemName} (x${itemCount})</span> <button onclick="sellItem('${itemName}', ${sellPrice})">Sell for ${sellPrice}s</button></p>`;
            });
        }
    }

    shopText += `<button onclick="closeShop()">Leave Shop</button>`;
    setGameText(shopText);
    updateUI();
}

function getDamageValue(diceString) {
    const match = diceString.match(/d(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
}

function equipItem(item) {
    if (item.type === 'weapon') {
        const currentDamageValue = getDamageValue(gameState.playerDamage);
        const newItemValue = getDamageValue(item.value);
        if (newItemValue > currentDamageValue) {
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

function buyItem(itemName, price) {
    if (gameState.silver >= price) {
        const item = shopItems.find(i => i.name === itemName);
        if (!item) return;

        gameState.silver -= price;
        gameState.inventory.push(itemName);
        log(`You bought a ${itemName}.`);

        if (item.type === 'weapon' || item.type === 'armor') {
            equipItem(item);
        }

        openShop(false, 'buy'); // Refresh shop view
    }
}

function sellItem(itemName, sellPrice) {
    const itemIndex = gameState.inventory.indexOf(itemName);
    if (itemIndex > -1) {
        gameState.inventory.splice(itemIndex, 1);
        gameState.silver += sellPrice;
        log(`You sold a ${itemName} for ${sellPrice} silver.`);
        recalculateStats();
        openShop(false, 'sell'); // Refresh sell tab
    }
}

function recalculateStats() {
    // Reset stats to default
    gameState.playerDamage = 'd4';
    gameState.playerDefense = 0;

    // Recalculate based on inventory
    const weapons = shopItems.filter(item => item.type === 'weapon' && gameState.inventory.includes(item.name));
    const armors = shopItems.filter(item => item.type === 'armor' && gameState.inventory.includes(item.name));

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

function levelUp() {
    gameState.level++;
    gameState.points -= 10; // Subtract the cost of leveling up
    
    gameState.playerDefense++;
    gameState.playerDamageBonus++;
    let damageUpgraded = false;
    if (gameState.playerDamage === 'd4') {
        gameState.playerDamage = 'd6';
        damageUpgraded = true;
    } else if (gameState.playerDamage === 'd6') {
        gameState.playerDamage = 'd8';
        damageUpgraded = true;
    }
    let bonusText = "Your defense increased by 1 and your damage increased by 1";
    if (damageUpgraded) {
        bonusText += " and your damage die was upgraded!";
    } else {
        bonusText += "!";
    }
    
    log(`LEVEL UP! You are now level ${gameState.level}!`);
    playSound('levelUp');
    setGameText(`<p class='success'>You leveled up to level ${gameState.level}! ${bonusText}</p>`);
    updateUI();
}

function winGame() {
    log(`VICTORY! You defeated the Fortress Lord!`);
    setGameText(`<h3>🏆 VICTORY! 🏆</h3><p>You have defeated the Fortress Lord and conquered the Dark Fort!</p><p>Your final score: ${gameState.points}</p><button onclick="resetGame()">Start New Adventure</button>`);

    gameState.inCombat = false;
    updateUI();
}

function gameOver(reason) {
    gameState.playerIsDead = true;
    log(`GAME OVER: ${reason}`);
    setGameText(`<h3>💀 GAME OVER 💀</h3><p>${reason}</p><p>Your adventure ends here.</p><button onclick="resetGame()">Start New Adventure</button>`);
    updateUI();
}

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
    if (logEl) {
        logEl.innerHTML = "";
    }
    setGameText('<p>Welcome to the Dark Fort, brave Kargunt!</p><p>Click "Start Adventure" to begin your perilous journey...</p>');
    updateUI();
}

// --- SOUNDS ---
const sounds = {
    attack: new Audio('https://www.soundjay.com/sword/sword-slide2.mp3'),
    hit: new Audio('https://www.soundjay.com/human/sounds/man-getting-hit-01.mp3'),
    win: new Audio('https://www.soundjay.com/misc/sounds/coins-in-hand-2.mp3'),
    levelUp: new Audio('https://www.soundjay.com/misc/sounds/magic-chime-01.mp3')
};

function playSound(soundName) {
    if (sounds[soundName]) {
        sounds[soundName].currentTime = 0;
        sounds[soundName].play().catch(e => console.log(`Could not play sound: ${e}`));
    }
}

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    gameTextEl = document.getElementById('gameText');
    logEl = document.getElementById('log');
    // Add click sounds to all buttons
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => playSound('attack'));
    });
    updateUI();
});
