// Dark Fort RPG - Game Logic

// Game state
let gameState = {
    hp: 15,
    maxHp: 15,
    silver: 0,
    points: 0,
    rooms: 0,
    level: 1,
    inventory: [],
    currentMonster: null,
    inCombat: false,
    inEncounter: false,
    gameStarted: false,
    levelUpBonuses: [1, 2, 3, 4, 5, 6],
    shopOpen: false,
    currentRoom: 'entrance',
    // Map system
    playerX: 4,
    playerY: 4,
    map: {},
    monstersKilled: 0,
    achievements: [],
    currentTab: 'game',
    // Combat enhancements
    statusEffects: [],
    specialAbilities: {
        charge: { cooldown: 0, maxCooldown: 3 },
        parry: { cooldown: 0, maxCooldown: 2 },
        magicBurst: { cooldown: 0, maxCooldown: 4 }
    },
    combatLog: [],
    combatRound: 1
};

// Game data
const weapons = {
    'Warhammer': { damage: 'd6', bonus: 0, value: 9 },
    'Dagger': { damage: 'd4', bonus: 1, value: 6 },
    'Sword': { damage: 'd6', bonus: 1, value: 12 },
    'Flail': { damage: 'd6+1', bonus: 0, value: 15 },
    'Mighty Zweihänder': { damage: 'd6+2', bonus: 0, value: 25 }
};

const weakMonsters = [
    { name: 'Blood-drenched Skeleton', points: 3, damage: 'd4', hp: 6, difficulty: 3, loot: { chance: 2, item: 'Dagger' } },
    { name: 'Catacomb Cultist', points: 3, damage: 'd4', hp: 6, difficulty: 3, loot: { chance: 2, item: 'Random Scroll' } },
    { name: 'Goblin', points: 3, damage: 'd4', hp: 5, difficulty: 3, loot: { chance: 2, item: 'Rope' } },
    { name: 'Undead Hound', points: 4, damage: 'd4', hp: 6, difficulty: 4, loot: null }
];

const toughMonsters = [
    { name: 'Necro-Sorcerer', points: 4, damage: 'd4/d6', hp: 8, difficulty: 4, special: 'maggot', loot: { silver: '3d6' } },
    { name: 'Small Stone Troll', points: 5, damage: 'd6+1', hp: 9, difficulty: 5, killPoints: 7 },
    { name: 'Medusa', points: 4, damage: 'd6', hp: 10, difficulty: 4, special: 'petrify', loot: { silver: 'd4*d6' } },
    { name: 'Ruin Basilisk', points: 4, damage: 'd6', hp: 11, difficulty: 4, special: 'levelup' }
];

const scrolls = [
    'Summon weak daemon',
    'Palms Open the Southern Gate',
    'Aegis of Sorrow',
    'False Omen'
];

const shopItems = [
    { name: 'Potion', price: 4, type: 'consumable' },
    { name: 'Random Scroll', price: 7, type: 'scroll' },
    { name: 'Dagger', price: 6, type: 'weapon' },
    { name: 'Warhammer', price: 9, type: 'weapon' },
    { name: 'Rope', price: 5, type: 'item' },
    { name: 'Sword', price: 12, type: 'weapon' },
    { name: 'Flail', price: 15, type: 'weapon' },
    { name: 'Mighty Zweihänder', price: 25, type: 'weapon' },
    { name: 'Armor', price: 10, type: 'armor' },
    { name: 'Cloak of Invisibility', price: 15, type: 'special' }
];

const itemDescriptions = {
    'Warhammer': 'A heavy, one-handed hammer. (d6 damage)',
    'Dagger': 'A small, sharp blade. (+1 to hit, d4 damage)',
    'Sword': 'A standard longsword. (+1 to hit, d6 damage)',
    'Flail': 'A spiked ball on a chain. (d6+1 damage)',
    'Mighty Zweihänder': 'A massive, two-handed sword. (d6+2 damage)',
    'Armor': 'Reduces incoming damage. (Roll d4 to reduce damage)',
    'Potion': 'Heals d6 HP when consumed.',
    'Rope': 'Helps you avoid pit traps.',
    'Cloak of Invisibility': 'Provides an advantage in certain situations.',
    'Scroll: Summon weak daemon': 'Summons a weak daemon to fight for you.',
    'Palms Open the Southern Gate': 'A mysterious incantation.',
    'Aegis of Sorrow': 'A protective ward against sorrow.',
    'False Omen': 'A scroll that creates a deceptive illusion.'
};

// Utility functions
function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function rollDamage(diceString) {
    if (diceString.includes('d6+2')) return rollDie(6) + 2;
    if (diceString.includes('d6+1')) return rollDie(6) + 1;
    if (diceString.includes('d6')) return rollDie(6);
    if (diceString.includes('d4')) return rollDie(4);
    return 1;
}

function log(message) {
    const logElement = document.getElementById('log2');
    if (logElement) {
        logElement.innerHTML += '<p>' + message + '</p>';
        logElement.scrollTop = logElement.scrollHeight;
    }
}

// Map system functions
function initializeMap() {
    gameState.map = {};
    gameState.playerX = 4;
    gameState.playerY = 4;
    
    // Mark starting position
    const startKey = `${gameState.playerX},${gameState.playerY}`;
    gameState.map[startKey] = {
        explored: true,
        type: 'entrance',
        description: 'The entrance to the cursed catacomb'
    };
    
    renderMaps();
}

function renderMaps() {
    renderMap('miniMap', 8, 8);
    renderMap('fullMap', 8, 8);
}

function renderMap(containerId, width, height) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = document.createElement('div');
            cell.className = 'map-cell';
            
            const key = `${x},${y}`;
            const roomData = gameState.map[key];
            
            if (x === gameState.playerX && y === gameState.playerY) {
                cell.classList.add('current');
                cell.innerHTML = '🤺';
            } else if (roomData && roomData.explored) {
                cell.classList.add('explored', roomData.type);
                cell.innerHTML = getRoomIcon(roomData.type);
            } else {
                cell.classList.add('unexplored');
                cell.innerHTML = '?';
            }
            
            cell.title = roomData ? roomData.description : 'Unexplored';
            container.appendChild(cell);
        }
    }
}

function getRoomIcon(type) {
    const icons = {
        'entrance': '🚪',
        'empty': '⚪',
        'combat': '🔍',
        'shop': '🛒',
        'treasure': '💰',
        'boss': '👹',
        'secret': '🔍',
        'trap': '🕳'
    };
    return icons[type] || '❓';
}

// Combat helper functions
function addCombatLog(message, type = 'neutral') {
    gameState.combatLog.push({
        message: message,
        type: type,
        round: gameState.combatRound
    });
    
    // Keep only last 10 combat log entries
    if (gameState.combatLog.length > 10) {
        gameState.combatLog.shift();
    }
}

function renderHealthBar(current, max, className = '') {
    const percentage = Math.max(0, (current / max) * 100);
    return `
        <div class="health-bar ${className}">
            <div class="health-fill" style="width: ${percentage}%"></div>
            <div class="health-text">${current}/${max}</div>
        </div>
    `;
}

function formatDamage(damage, type = 'damage') {
    const classes = {
        'damage': 'damage-number',
        'healing': 'healing-number',
        'miss': 'miss-indicator'
    };
    return `<span class="${classes[type]}">${damage}</span>`;
}

function renderStatusEffects(effects) {
    if (effects.length === 0) return '';
    
    return `
        <div class="status-effects">
            ${effects.map(effect => 
                `<span class="status-effect ${effect.type}">${effect.type.toUpperCase()}</span>`
            ).join('')}
        </div>
    `;
}

function renderCombatInterface() {
    const monster = gameState.currentMonster;
    const playerStatusEffects = gameState.statusEffects;
    
    let combatHTML = `
        <div class="combat">
            <div class="combat-header">
                <h3>⚔️ COMBAT - Round ${gameState.combatRound}</h3>
                <div class="round-indicator">Turn: <span id="currentTurn">Your Turn</span></div>
            </div>
            
            <div class="combat-participants">
                <div class="participant player">
                    <h4>🤺 Kargunt</h4>
                    ${renderHealthBar(gameState.hp, gameState.maxHp, 'player-health')}
                    ${renderStatusEffects(playerStatusEffects)}
                </div>
                
                <div class="vs-indicator">⚔️<br>VS</div>
                
                <div class="participant monster">
                    <h4>${monster.name}</h4>
                    ${renderHealthBar(monster.currentHp, monster.hp, 'monster-health')}
                    <div class="monster-stats">
                        <small>Damage: ${monster.damage} | Difficulty: ${monster.difficulty}</small>
                    </div>
                </div>
            </div>
            
            <div class="combat-log">
                <div class="round-header">Combat Log</div>
                <div id="combatLogContent">
                    ${renderCombatLog()}
                </div>
            </div>
            
            <div class="actions" id="gameActions">
                <!-- Combat buttons will be added here -->
            </div>
        </div>
    `;
    
    return combatHTML;
}

function renderCombatLog() {
    if (gameState.combatLog.length === 0) {
        return '<div class="combat-turn">Combat begins...</div>';
    }
    
    // Reverse the array to show latest events at the top
    return gameState.combatLog.slice().reverse().map(entry => {
        const turnClass = entry.type === 'player' ? 'player-turn' : 
                         entry.type === 'monster' ? 'monster-turn' : '';
        return `<div class="combat-turn ${turnClass}">${entry.message}</div>`;
    }).join('');
}

function updateCombatDisplay() {
    const combatHTML = renderCombatInterface();
    
    // Create or update fullscreen combat overlay
    let combatOverlay = document.getElementById('combatOverlay');
    if (!combatOverlay) {
        combatOverlay = document.createElement('div');
        combatOverlay.id = 'combatOverlay';
        combatOverlay.className = 'combat-fullscreen';
        document.body.appendChild(combatOverlay);
        
        // Add combat mode class to body
        document.body.classList.add('combat-mode');
    }
    
    combatOverlay.innerHTML = combatHTML;
}

function movePlayer(direction) {
    const oldX = gameState.playerX;
    const oldY = gameState.playerY;
    
    switch(direction) {
        case 'north': gameState.playerY = Math.max(0, gameState.playerY - 1); break;
        case 'south': gameState.playerY = Math.min(7, gameState.playerY + 1); break;
        case 'east': gameState.playerX = Math.min(7, gameState.playerX + 1); break;
        case 'west': gameState.playerX = Math.max(0, gameState.playerX - 1); break;
    }
    
    // Check if actually moved
    if (oldX !== gameState.playerX || oldY !== gameState.playerY) {
        updatePosition();
        renderMaps();
        return true;
    }
    return false;
}

function updatePosition() {
    const posElement = document.getElementById('position');
    if (posElement) {
        posElement.textContent = `(${gameState.playerX}, ${gameState.playerY})`;
    }
}

function addAchievement(achievement) {
    if (!gameState.achievements.includes(achievement)) {
        gameState.achievements.push(achievement);
        log(`🏆 Achievement unlocked: ${achievement}`);
        updateAchievements();
    }
}

function updateAchievements() {
    const achievementsElement = document.getElementById('achievements');
    if (achievementsElement) {
        achievementsElement.innerHTML = gameState.achievements.length > 0 ? 
            gameState.achievements.join('<br>') : 'None yet - start your adventure!';
    }
}

// Tab system
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Activate button
    event.target.classList.add('active');
    
    gameState.currentTab = tabName;
    
    // Render map when switching to map tab
    if (tabName === 'map') {
        renderMaps();
    }
}

function setGameText(text) {
    document.getElementById('gameText').innerHTML = text;
}

// Store previous values to detect changes
let previousStats = {
    hp: 15,
    maxHp: 15,
    silver: 0,
    points: 0,
    level: 1,
    monstersKilled: 0
};

function highlightStatChange(elementId, changeType = 'neutral') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Find the parent stat container
    let statContainer = element.closest('.stat');
    if (!statContainer) {
        // If not in a .stat container, highlight the element itself
        statContainer = element;
    }
    
    // Remove any existing highlight classes
    statContainer.classList.remove('stat-highlight-increase', 'stat-highlight-decrease', 'stat-highlight-neutral');
    
    // Add the appropriate highlight class
    statContainer.classList.add(`stat-highlight-${changeType}`);
    
    // Remove the class after animation completes
    setTimeout(() => {
        statContainer.classList.remove(`stat-highlight-${changeType}`);
    }, 600);
}

function updateDisplay() {
    // Update all stat displays and check for changes
    const statElements = {
        'hp': gameState.hp,
        'hp2': gameState.hp,
        'maxHp': gameState.maxHp,
        'maxHp2': gameState.maxHp,
        'silver': gameState.silver,
        'silver2': gameState.silver,
        'points': gameState.points,
        'points2': gameState.points,
        'rooms2': Object.keys(gameState.map).length - 1, // Subtract entrance
        'level': gameState.level,
        'level2': gameState.level,
        'monstersKilled': gameState.monstersKilled
    };
    
    Object.entries(statElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
    
    // Update inventory displays
    const inventoryElement = document.getElementById('inventory2');
    if (inventoryElement) {
        if (gameState.inventory.length > 0) {
            let inventoryHTML = '<ul class="inventory-list">';
            gameState.inventory.forEach(item => {
                const description = itemDescriptions[item] || 'An unknown item.';
                inventoryHTML += `<li><strong>${item}</strong>: ${description}</li>`;
            });
            inventoryHTML += '</ul>';
            inventoryElement.innerHTML = inventoryHTML;
        } else {
            inventoryElement.innerHTML = 'Empty';
        }
    }
    
    updatePosition();
    updateAchievements();
}

function updateStatWithHighlight(statName, newValue, changeType = null) {
    const oldValue = gameState[statName];
    gameState[statName] = newValue;
    
    // Determine change type if not specified
    if (!changeType) {
        if (newValue > oldValue) {
            changeType = 'increase';
        } else if (newValue < oldValue) {
            changeType = 'decrease';
        } else {
            changeType = 'neutral';
        }
    }
    
    // Update display
    updateDisplay();
    
    // Highlight both main and secondary stat displays
    const statIds = {
        'hp': ['hp', 'hp2'],
        'maxHp': ['maxHp', 'maxHp2'],
        'silver': ['silver', 'silver2'],
        'points': ['points', 'points2'],
        'level': ['level', 'level2'],
        'monstersKilled': ['monstersKilled']
    };
    
    if (statIds[statName] && oldValue !== newValue) {
        statIds[statName].forEach(id => {
            highlightStatChange(id, changeType);
        });
    }
}

function updateButtons() {
    // Don't update buttons if we're in an encounter - let the encounter screen handle its own buttons
    if (gameState.inEncounter) {
        removeMovementButtons();
        return;
    }
    
    // Context-sensitive button display
    const buttons = {
        'startBtn': !gameState.gameStarted,
        'exploreBtn': gameState.gameStarted && !gameState.inCombat && !gameState.shopOpen,
        'attackBtn': gameState.inCombat,
        'fleeBtn': gameState.inCombat,
        'usePotionBtn': gameState.inventory.includes('Potion') && gameState.hp < gameState.maxHp,
        'shopBtn': gameState.currentRoom === 'shop' && !gameState.inCombat && !gameState.shopOpen
    };
    
    Object.entries(buttons).forEach(([id, show]) => {
        const button = document.getElementById(id);
        if (button) {
            button.style.display = show ? 'block' : 'none';
            button.disabled = false;
        }
    });
    
    // Add movement buttons when exploring (but not during encounters)
    if (gameState.gameStarted && !gameState.inCombat && !gameState.shopOpen && !gameState.inEncounter) {
        addMovementButtons();
    } else {
        removeMovementButtons();
    }
}

function addMovementButtons() {
    // Remove existing movement buttons first
    removeMovementButtons();
    
    // Add movement buttons under the mini-map instead of in actions
    const mapContainer = document.querySelector('.map-container');
    if (!mapContainer) return;
    
    // Create movement controls container
    const movementContainer = document.createElement('div');
    movementContainer.className = 'movement-controls';
    movementContainer.id = 'movementControls';
    
    // Create directional button layout
    movementContainer.innerHTML = `
        <div class="movement-grid">
            <div></div>
            <button id="northBtn" onclick="moveAndExplore('north')" class="movement-btn north">↑</button>
            <div></div>
            <button id="westBtn" onclick="moveAndExplore('west')" class="movement-btn west">←</button>
            <div class="movement-center">🤺</div>
            <button id="eastBtn" onclick="moveAndExplore('east')" class="movement-btn east">→</button>
            <div></div>
            <button id="southBtn" onclick="moveAndExplore('south')" class="movement-btn south">↓</button>
            <div></div>
        </div>
        <div class="movement-label">Move Explorer</div>
    `;
    
    mapContainer.appendChild(movementContainer);
}

function removeMovementButtons() {
    const movementControls = document.getElementById('movementControls');
    if (movementControls) {
        movementControls.remove();
    }
    // Fallback: remove any stray movement buttons
    document.querySelectorAll('.movement-btn').forEach(btn => btn.remove());
}

function moveAndExplore(direction) {
    if (movePlayer(direction)) {
        exploreCurrentRoom();
    } else {
        log("You can't move in that direction - you've reached the edge of the mapped area.");
    }
}

// Game functions
function startGame() {
    gameState.gameStarted = true;
    const startingSilver = 15 + rollDie(6);
    updateStatWithHighlight('silver', startingSilver, 'neutral');
    
    // Starting equipment
    const weaponRoll = rollDie(4);
    const gearRoll = rollDie(4);
    
    const weaponNames = ['Warhammer', 'Dagger', 'Sword', 'Flail'];
    const gearNames = ['Armor', 'Potion', 'Scroll: Summon weak daemon', 'Cloak of Invisibility'];
    
    gameState.inventory.push(weaponNames[weaponRoll - 1]);
    gameState.inventory.push(gearNames[gearRoll - 1]);
    
    log("🎯 Adventure begins! You start with " + startingSilver + " silver pieces.");
    log("🗡️ Starting gear: " + weaponNames[weaponRoll - 1] + ", " + gearNames[gearRoll - 1]);
    
    // Initialize map system
    initializeMap();
    
    enterEntranceRoom();
    updateDisplay();
    updateButtons();
    
    addAchievement('First Steps: Begin your adventure');
}

function enterEntranceRoom() {
    const doorRoll = rollDie(4);
    const eventRoll = rollDie(4);
    
    gameState.rooms++;
    
    let roomText = `<div class="room-info"><h3>🚪 ENTRANCE ROOM</h3>`;
    roomText += `<p>You enter a dimly lit chamber with ${doorRoll} door${doorRoll > 1 ? 's' : ''} leading deeper into the catacomb.</p>`;
    
    switch(eventRoll) {
        case 1:
            const item = getRandomItem();
            gameState.inventory.push(item);
            roomText += `<p class="success">✨ You find a ${item}!</p>`;
            log("🎁 Found item: " + item);
            break;
        case 2:
            roomText += `<p class="warning">⚠️ A weak monster guards this chamber!</p>`;
            startCombat(getRandomWeakMonster());
            return; // Exit early - don't continue with room setup
        case 3:
            const scroll = scrolls[rollDie(4) - 1];
            gameState.inventory.push("Scroll: " + scroll);
            roomText += `<p class="success">🧙 A dying mystic gives you a scroll: "${scroll}"</p>`;
            log("📜 Received scroll: " + scroll);
            break;
        case 4:
            roomText += `<p>😶 The entrance is eerily quiet and desolate...</p>`;
            break;
    }
    
    roomText += `</div>`;
    setGameText(roomText);
}

function exploreCurrentRoom() {
    const key = `${gameState.playerX},${gameState.playerY}`;
    
    // Check if room is already explored
    if (gameState.map[key] && gameState.map[key].explored) {
        setGameText(`<div class="room-info"><h3>🏛️ EXPLORED ROOM</h3><p>You have already explored this area. ${gameState.map[key].description}</p></div>`);
        updateButtons();
        return;
    }
    
    if (gameState.rooms >= 12 && gameState.points >= 15) {
        checkLevelUp();
        return;
    }
    
    const roomRoll = rollDie(6);
    gameState.rooms++;
    
    let roomText = `<div class="room-info"><h3>🏛️ NEW ROOM (${gameState.playerX}, ${gameState.playerY})</h3>`;
    let roomType = 'empty';
    let roomDescription = 'An empty chamber';
    
    switch(roomRoll) {
        case 1:
            roomText += `<p>🕳️ Nothing. The room is empty and explored.</p>`;
            roomType = 'empty';
            roomDescription = 'An empty chamber with nothing of interest';
            break;
        case 2:
            const trapRoll = rollDie(6) + (gameState.inventory.includes('Rope') ? 1 : 0);
            if (trapRoll <= 3) {
                const damage = rollDie(6);
                updateStatWithHighlight('hp', gameState.hp - damage, 'decrease');
                roomText += `<p class="warning">🕳️ Pit trap! You take ${damage} damage!</p>`;
                log("💀 Took " + damage + " damage from pit trap");
                roomType = 'trap';
                roomDescription = 'A dangerous chamber with a pit trap';
                if (gameState.hp <= 0) {
                    gameOver("You died in a pit trap!");
                    return;
                }
            } else {
                roomText += `<p class="success">🕳️ You notice a pit trap and avoid it!</p>`;
                roomType = 'trap';
                roomDescription = 'A chamber with a pit trap (safely avoided)';
                addAchievement('Trap Spotter: Avoid a pit trap');
            }
            break;
        case 3:
            const riddleRoll = rollDie(6);
            if (riddleRoll % 2 === 1) {
                roomText += `<p class="success">🧙 You solve the soothsayer's riddle! Choose your reward:</p>`;
                roomText += `<button onclick="chooseReward('silver')">10 Silver</button> `;
                roomText += `<button onclick="chooseReward('points')">3 Points</button>`;
                roomType = 'treasure';
                roomDescription = 'A mystical chamber with a riddle-solving soothsayer';
            } else {
                const damage = rollDie(4);
                updateStatWithHighlight('hp', gameState.hp - damage, 'decrease');
                roomText += `<p class="warning">🧙 Mind-shattering shockwave! You take ${damage} damage!</p>`;
                log("💀 Took " + damage + " damage from failed riddle");
                roomType = 'trap';
                roomDescription = 'A dangerous chamber with a hostile soothsayer';
                if (gameState.hp <= 0) {
                    gameOver("Your mind was shattered by the soothsayer!");
                    return;
                }
            }
            break;
        case 4:
            roomText += `<p class="warning">👹 A weak monster lurks here!</p>`;
            roomType = 'combat';
            roomDescription = 'A chamber with a lurking monster';
            // Mark room as explored before combat
            gameState.map[key] = {
                explored: true,
                type: roomType,
                description: roomDescription
            };
            startCombat(getRandomWeakMonster());
            return; // Exit early - don't continue with room setup
        case 5:
            roomText += `<p class="warning">🐉 A tough monster blocks your path!</p>`;
            roomType = 'combat';
            roomDescription = 'A chamber with a formidable monster';
            // Mark room as explored before combat
            gameState.map[key] = {
                explored: true,
                type: roomType,
                description: roomDescription
            };
            startCombat(getRandomToughMonster());
            return; // Exit early - don't continue with room setup
        case 6:
            roomText += `<p class="success">🛒 A peddler from beyond the void offers his wares...</p>`;
            roomType = 'shop';
            roomDescription = 'A chamber with a mysterious peddler';
            gameState.currentRoom = 'shop';
            openShop();
            break;
    }
    
    // Mark room as explored
    gameState.map[key] = {
        explored: true,
        type: roomType,
        description: roomDescription
    };
    
    roomText += `</div>`;
    setGameText(roomText);
    renderMaps();
    updateDisplay();
    updateButtons();
}

function exploreRoom() {
    exploreCurrentRoom();
}

function chooseReward(type) {
    if (type === 'silver') {
        updateStatWithHighlight('silver', gameState.silver + 10, 'increase');
        log("🪙 Gained 10 silver from riddle");
    } else {
        updateStatWithHighlight('points', gameState.points + 3, 'increase');
        log("⭐ Gained 3 points from riddle");
    }
    
    setGameText(`<div class="room-info"><h3>🏛️ ROOM ${gameState.rooms}</h3><p class="success">✅ Room explored! You may continue your journey.</p></div>`);
    gameState.currentRoom = 'empty';
    updateButtons();
}

function getRandomItem() {
    const itemRoll = rollDie(6);
    const items = ['Warhammer', 'Potion', 'Rope', 'Random Scroll', 'Armor', 'Cloak of Invisibility'];
    return items[itemRoll - 1];
}

function getRandomWeakMonster() {
    return weakMonsters[rollDie(4) - 1];
}

function getRandomToughMonster() {
    return toughMonsters[rollDie(4) - 1];
}

function startCombat(monster) {
    gameState.currentMonster = { ...monster, currentHp: monster.hp };
    gameState.inCombat = false; // Not in combat yet - still choosing
    gameState.inEncounter = true; // New state for pre-combat choice
    
    showPreCombatChoice(monster);
}

function showPreCombatChoice(monster) {
    let encounterText = `
        <div class="combat-encounter">
            <h3>⚠️ MONSTER ENCOUNTER!</h3>
            <div class="monster-preview">
                <h4>${monster.name}</h4>
                <div class="monster-details">
                    <div class="monster-stat">❤️ HP: ${monster.hp}</div>
                    <div class="monster-stat">⚔️ Damage: ${monster.damage}</div>
                    <div class="monster-stat">🎯 Difficulty: ${monster.difficulty}</div>
                </div>
                ${monster.special ? `<div class="monster-special">⚡ Special: ${getSpecialDescription(monster.special)}</div>` : ''}
            </div>
            
            <div class="encounter-description">
                <p>${getMonsterDescription(monster.name)}</p>
            </div>
            
            <div class="encounter-choices">
                <h4>What do you do?</h4>
                <div class="choice-buttons">
                    <button onclick="chooseAttack()" class="choice-btn attack-choice">
                        ⚔️ Attack<br>
                        <small>Enter combat</small>
                    </button>
                    <button onclick="chooseFlee()" class="choice-btn flee-choice">
                        🏃 Flee<br>
                        <small>Take damage and escape</small>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    setGameText(encounterText);
    log("⚠️ Encountered " + monster.name);
    
    // Hide main action buttons and movement controls during encounter
    hideMainActionButtons();
    removeMovementButtons();
}

function hideMainActionButtons() {
    const mainButtons = ['startBtn', 'exploreBtn', 'attackBtn', 'fleeBtn', 'usePotionBtn', 'shopBtn'];
    mainButtons.forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            button.style.display = 'none';
        }
    });
}

function getSpecialDescription(special) {
    const descriptions = {
        'maggot': 'Transformation curse',
        'petrify': 'Petrifying gaze',
        'levelup': 'Death energy boost'
    };
    return descriptions[special] || 'Unknown ability';
}

function getMonsterDescription(name) {
    const descriptions = {
        'Blood-drenched Skeleton': 'A skeletal warrior rises from ancient bones, its eye sockets glowing with malevolent fire.',
        'Catacomb Cultist': 'A hooded figure emerges from the shadows, chanting dark incantations.',
        'Goblin': 'A small but vicious creature blocks your path, baring its yellowed fangs.',
        'Undead Hound': 'A spectral wolf materializes, its ghostly form radiating cold dread.',
        'Necro-Sorcerer': 'A powerful dark mage surrounded by writhing shadows and the stench of decay.',
        'Small Stone Troll': 'A hulking creature of living rock lumbers forward, each step shaking the ground.',
        'Medusa': 'A serpentine horror with snake hair hisses menacingly, her deadly gaze seeking victims.',
        'Ruin Basilisk': 'An ancient reptilian beast emerges, its very presence warping reality around it.'
    };
    return descriptions[name] || 'A dangerous creature blocks your path.';
}

function chooseAttack() {
    // Now actually start combat
    gameState.inCombat = true;
    gameState.inEncounter = false; // No longer in encounter phase
    gameState.combatLog = [];
    gameState.combatRound = 1;
    
    addCombatLog(`💀 A wild ${gameState.currentMonster.name} appears!`, 'neutral');
    addCombatLog(`🎯 Monster Stats: ${gameState.currentMonster.hp} HP, ${gameState.currentMonster.damage} damage, ${gameState.currentMonster.difficulty} difficulty`, 'neutral');
    
    updateCombatDisplay();
    log("⚔️ Combat started with " + gameState.currentMonster.name);
    updateButtons();
    
    // Add special combat buttons
    addCombatButtons();
}

function chooseFlee() {
    // Use existing flee logic but without being in combat
    const monster = gameState.currentMonster;
    const damage = rollDie(4);
    updateStatWithHighlight('hp', gameState.hp - damage, 'decrease');
    gameState.currentMonster = null;
    gameState.inEncounter = false; // No longer in encounter
    gameState.rooms--; // Don't count this room as explored
    
    // Remove the room from map since we fled
    const key = `${gameState.playerX},${gameState.playerY}`;
    if (gameState.map[key]) {
        delete gameState.map[key];
    }
    
    let fleeText = `<div class="room-info">`;
    fleeText += `<h3>🏃 FLED FROM ENCOUNTER</h3>`;
    fleeText += `<p class="warning">You flee from the ${monster.name}, taking ${damage} damage in your haste!</p>`;
    fleeText += `<p>The room remains unexplored...</p>`;
    fleeText += `</div>`;
    
    if (gameState.hp <= 0) {
        gameOver("You died while fleeing!");
        return;
    }
    
    setGameText(fleeText);
    log("🏃 Fled from encounter with " + monster.name + ", took " + damage + " damage");
    
    renderMaps();
    updateDisplay();
    updateButtons();
}

function addCombatButtons() {
    // Look for actions container in combat overlay first, then fallback to main game
    let actionsContainer = document.querySelector('#combatOverlay #gameActions');
    if (!actionsContainer) {
        actionsContainer = document.getElementById('gameActions');
    }
    
    if (!actionsContainer) return;
    
    // Clear existing buttons
    actionsContainer.innerHTML = '';
    
    // Add basic combat buttons
    const basicButtons = [
        { name: 'Attack', id: 'attackBtn', onclick: "attack()", icon: '⚔️' },
        { name: 'Flee', id: 'fleeBtn', onclick: "flee()", icon: '🏃' }
    ];
    
    // Add potion button if available
    if (gameState.inventory.includes('Potion') && gameState.hp < gameState.maxHp) {
        basicButtons.splice(1, 0, { name: 'Use Potion', id: 'usePotionBtn', onclick: "usePotion()", icon: '🧪' });
    }
    
    basicButtons.forEach(btn => {
        const button = document.createElement('button');
        button.id = btn.id;
        button.innerHTML = `${btn.icon} ${btn.name}`;
        button.setAttribute('onclick', btn.onclick);
        button.className = 'combat-basic-btn';
        actionsContainer.appendChild(button);
    });
    
    // Add special ability buttons
    const abilities = [
        { name: 'Charge Attack', id: 'chargeBtn', onclick: "useAbility('charge')", cooldown: gameState.specialAbilities.charge.cooldown },
        { name: 'Parry', id: 'parryBtn', onclick: "useAbility('parry')", cooldown: gameState.specialAbilities.parry.cooldown },
        { name: 'Magic Burst', id: 'magicBtn', onclick: "useAbility('magicBurst')", cooldown: gameState.specialAbilities.magicBurst.cooldown }
    ];
    
    abilities.forEach(ability => {
        const button = document.createElement('button');
        button.id = ability.id;
        button.innerHTML = ability.cooldown > 0 ? `${ability.name} (${ability.cooldown})` : `✨ ${ability.name}`;
        button.setAttribute('onclick', ability.onclick);
        button.className = 'ability-btn';
        button.disabled = ability.cooldown > 0;
        actionsContainer.appendChild(button);
    });
}

function removeCombatButtons() {
    document.querySelectorAll('.ability-btn, .combat-basic-btn').forEach(btn => btn.remove());
}

function useAbility(abilityName) {
    const ability = gameState.specialAbilities[abilityName];
    if (ability.cooldown > 0) return;
    
    let bonusDamage = 0;
    let abilityDisplayName = '';
    
    switch(abilityName) {
        case 'charge':
            bonusDamage = 3;
            abilityDisplayName = 'Charge Attack (+3 damage)';
            ability.cooldown = ability.maxCooldown;
            break;
        case 'parry':
            abilityDisplayName = 'Parry (defensive stance)';
            ability.cooldown = ability.maxCooldown;
            gameState.statusEffects.push({ type: 'parry', duration: 1 });
            addCombatLog(`🛡️ Kargunt prepares a defensive parry!`, 'player');
            updateCombatDisplay();
            
            // For parry, we don't attack, just wait for monster
            setTimeout(() => {
                monsterAttack();
            }, 1000);
            return;
        case 'magicBurst':
            bonusDamage = rollDie(6);
            abilityDisplayName = `Magic Burst (+${bonusDamage} magic damage)`;
            ability.cooldown = ability.maxCooldown;
            break;
    }
    
    // Apply special attack
    attackWithBonus(bonusDamage, abilityDisplayName);
}

function attackWithBonus(bonusDamage = 0, abilityName = '') {
    const monster = gameState.currentMonster;
    const attackRoll = rollDie(6);
    
    // Get weapon bonus
    let attackBonus = 0;
    let weaponDamage = 'd4';
    let weaponName = 'Fists';
    
    for (let item of gameState.inventory) {
        if (weapons[item]) {
            attackBonus = weapons[item].bonus;
            weaponDamage = weapons[item].damage;
            weaponName = item;
            break;
        }
    }
    
    // Check for level up bonus
    if (!gameState.levelUpBonuses.includes(2)) {
        attackBonus += 1;
    }
    
    const finalAttack = attackRoll + attackBonus;
    
    // Add ability effect to log
    if (abilityName) {
        addCombatLog(`✨ Kargunt uses ${abilityName}!`, 'player');
    }
    
    // Add attack roll to log
    addCombatLog(`🎲 Kargunt attacks with ${weaponName}: rolled ${attackRoll} + ${attackBonus} = ${finalAttack} (need ${monster.difficulty})`, 'player');
    
    if (finalAttack >= monster.difficulty) {
        const damage = rollDamage(weaponDamage) + bonusDamage;
        monster.currentHp = Math.max(0, monster.currentHp - damage);
        
        let damageText = `🎯 HIT! Dealt ${formatDamage(damage)} damage`;
        if (bonusDamage > 0) {
            damageText += ` (${rollDamage(weaponDamage)} base + ${bonusDamage} bonus)`;
        }
        addCombatLog(damageText, 'player');
        
        log("🎯 Hit " + monster.name + " for " + damage + " damage");
        
        if (monster.currentHp <= 0) {
            addCombatLog(`💀 ${monster.name} defeated!`, 'player');
            // Monster defeated
            updateStatWithHighlight('monstersKilled', gameState.monstersKilled + 1, 'increase');
            handleMonsterDefeat();
            return;
        } else {
            // Update display and continue to monster turn
            updateCombatDisplay();
            
            // Small delay before monster attacks for better flow
            setTimeout(() => {
                monsterAttack();
            }, 1000);
            return;
        }
    } else {
        addCombatLog(`❌ MISS! ${formatDamage('MISS', 'miss')}`, 'player');
        log("❌ Missed attack on " + monster.name);
        
        // Update display and continue to monster turn
        updateCombatDisplay();
        
        // Small delay before monster attacks
        setTimeout(() => {
            monsterAttack();
        }, 1000);
        return;
    }
}

function handleMonsterDefeat() {
    const monster = gameState.currentMonster;
    let points = monster.points;
    if (monster.killPoints && monster.currentHp <= 0) {
        points = monster.killPoints;
    }
    
    updateStatWithHighlight('points', gameState.points + points, 'increase');
    addCombatLog(`🏆 Victory! Gained ${points} points!`, 'neutral');
    log("🏆 Defeated " + monster.name + " for " + points + " points");
    
    // Handle achievements
    if (gameState.monstersKilled === 1) {
        addAchievement('First Blood: Defeat your first monster');
    }
    if (gameState.monstersKilled === 10) {
        addAchievement('Monster Slayer: Defeat 10 monsters');
    }
    
    // Handle loot
    if (monster.loot) {
        if (monster.loot.chance && rollDie(6) <= monster.loot.chance) {
            gameState.inventory.push(monster.loot.item);
            addCombatLog(`🎁 Looted: ${monster.loot.item}`, 'neutral');
            log("🎁 Looted: " + monster.loot.item);
        }
        if (monster.loot.silver) {
            let silverGained = 0;
            if (monster.loot.silver === '3d6') {
                silverGained = rollDie(6) + rollDie(6) + rollDie(6);
            } else if (monster.loot.silver === 'd4*d6') {
                silverGained = rollDie(4) * rollDie(6);
            }
            updateStatWithHighlight('silver', gameState.silver + silverGained, 'increase');
            addCombatLog(`🪙 Found ${silverGained} silver!`, 'neutral');
            log("🪙 Found " + silverGained + " silver");
        }
    }
    
    // Handle special effects
    if (monster.special) {
        const specialRoll = rollDie(6);
        if (monster.special === 'maggot' && specialRoll === 1) {
            addCombatLog(`🐛 Dark magic transforms you into a maggot!`, 'monster');
            showCombatResults(true);
            setTimeout(() => {
                gameOver("You were transformed into a maggot by the Necro-Sorcerer!");
            }, 2000);
            return;
        } else if (monster.special === 'petrify' && specialRoll === 1) {
            addCombatLog(`🗿 Medusa's gaze turns you to stone!`, 'monster');
            showCombatResults(true);
            setTimeout(() => {
                gameOver("You were petrified by the Medusa's gaze!");
            }, 2000);
            return;
        } else if (monster.special === 'levelup' && specialRoll <= 2) {
            addCombatLog(`✨ The Ruin Basilisk's death energy empowers you! LEVEL UP!`, 'neutral');
            showCombatResults(false, true);
            return;
        }
    }
    
    // Show combat results with continue button
    showCombatResults();
}

function showCombatResults(autoClose = false, levelUp = false) {
    // Update the combat display one final time
    updateCombatDisplay();
    
    // Add a continue button to the combat interface
    const combatOverlay = document.getElementById('combatOverlay');
    if (combatOverlay) {
        const combatDiv = combatOverlay.querySelector('.combat');
        if (combatDiv) {
            const resultsSection = document.createElement('div');
            resultsSection.className = 'combat-results';
            resultsSection.innerHTML = `
                <div class="round-header" style="margin-top: 20px;">Combat Complete!</div>
                <div style="text-align: center; margin: 15px 0;">
                    ${levelUp ? 
                        '<button onclick="continueCombat(true)" class="continue-btn">Continue to Level Up</button>' :
                        '<button onclick="continueCombat()" class="continue-btn">Continue Adventure</button>'
                    }
                </div>
            `;
            combatDiv.appendChild(resultsSection);
        }
    }
    
    // Remove combat action buttons
    removeCombatButtons();
    updateDisplay();
    
    // Auto-close if specified (for death scenarios)
    if (autoClose) {
        // Don't add continue button for death scenarios
        const resultsSection = document.querySelector('.combat-results');
        if (resultsSection) {
            resultsSection.remove();
        }
    }
}

function continueCombat(levelUp = false) {
    endCombat();
    
    if (levelUp) {
        checkLevelUp();
    }
}

function endCombat() {
    gameState.inCombat = false;
    gameState.currentMonster = null;
    gameState.currentRoom = 'empty';
    gameState.combatLog = [];
    gameState.combatRound = 1;
    
    // Remove fullscreen combat overlay
    const combatOverlay = document.getElementById('combatOverlay');
    if (combatOverlay) {
        combatOverlay.remove();
    }
    
    // Remove combat mode from body
    document.body.classList.remove('combat-mode');
    
    setGameText(`<div class="room-info"><h3>🏛️ VICTORY!</h3><p class="success">✅ Combat won! Room explored! You may continue your journey.</p></div>`);
    
    removeCombatButtons();
    updateDisplay();
    updateButtons();
}

function attack() {
    attackWithBonus();
}

function monsterAttack() {
    const monster = gameState.currentMonster;
    let baseDamage = rollDamage(monster.damage);
    let damage = baseDamage;
    let damageReductions = [];
    
    addCombatLog(`💥 ${monster.name} attacks!`, 'monster');
    
    // Check for armor
    if (gameState.inventory.includes('Armor')) {
        const armorReduction = rollDie(4);
        damage = Math.max(0, damage - armorReduction);
        damageReductions.push(`🛡️ Armor: -${armorReduction}`);
    }
    
    // Check for parry status effect
    const parryEffect = gameState.statusEffects.find(effect => effect.type === 'parry');
    if (parryEffect) {
        const parryReduction = Math.floor(damage / 2);
        damage = Math.floor(damage / 2);
        damageReductions.push(`🛡️ Parry: -${parryReduction}`);
        gameState.statusEffects = gameState.statusEffects.filter(effect => effect.type !== 'parry');
    }
    
    updateStatWithHighlight('hp', Math.max(0, gameState.hp - damage), 'decrease');
    
    // Add detailed damage log
    let damageLogText = `💀 Dealt ${formatDamage(damage)} damage`;
    if (damageReductions.length > 0) {
        damageLogText += ` (${baseDamage} base damage, reduced by: ${damageReductions.join(', ')})`;
    }
    addCombatLog(damageLogText, 'monster');
    
    // Reduce ability cooldowns
    Object.values(gameState.specialAbilities).forEach(ability => {
        if (ability.cooldown > 0) ability.cooldown--;
    });
    
    log("💀 Took " + damage + " damage from " + monster.name);
    
    if (gameState.hp <= 0) {
        addCombatLog(`💀 Kargunt has been defeated!`, 'monster');
        updateCombatDisplay();
        setTimeout(() => {
            gameOver("You were slain by " + monster.name + "!");
        }, 1500);
        return;
    }
    
    // Increment round and update display
    gameState.combatRound++;
    updateCombatDisplay();
    
    // Update ability buttons for next turn
    removeCombatButtons();
    addCombatButtons();
    
    updateDisplay();
}

function flee() {
    const damage = rollDie(4);
    updateStatWithHighlight('hp', gameState.hp - damage, 'decrease');
    gameState.inCombat = false;
    gameState.currentMonster = null;
    gameState.rooms--; // Don't count this room as explored
    
    // Remove the room from map since we fled
    const key = `${gameState.playerX},${gameState.playerY}`;
    if (gameState.map[key]) {
        delete gameState.map[key];
    }
    
    // Remove fullscreen combat overlay
    const combatOverlay = document.getElementById('combatOverlay');
    if (combatOverlay) {
        combatOverlay.remove();
    }
    
    // Remove combat mode from body
    document.body.classList.remove('combat-mode');
    
    let fleeText = `<div class="room-info">`;
    fleeText += `<h3>🏃 FLED FROM COMBAT</h3>`;
    fleeText += `<p class="warning">You flee from the monster, taking ${damage} damage in your haste!</p>`;
    fleeText += `<p>The room remains unexplored...</p>`;
    fleeText += `</div>`;
    
    if (gameState.hp <= 0) {
        gameOver("You died while fleeing!");
        return;
    }
    
    setGameText(fleeText);
    log("🏃 Fled from combat, took " + damage + " damage");
    
    removeCombatButtons();
    renderMaps();
    updateDisplay();
    updateButtons();
}

function usePotion() {
    if (!gameState.inventory.includes('Potion')) return;
    
    const healing = rollDie(6);
    updateStatWithHighlight('hp', Math.min(gameState.maxHp, gameState.hp + healing), 'increase');
    
    // Remove one potion
    const potionIndex = gameState.inventory.indexOf('Potion');
    gameState.inventory.splice(potionIndex, 1);
    
    log("🧪 Used potion, healed " + healing + " HP");
    updateButtons();
}

function openShop() {
    gameState.shopOpen = true;

    document.getElementById('mapView').style.display = 'none';
    const shopView = document.getElementById('shopView');

    let shopHTML = `
        <div class="shop-container">
            <h4>🛒 Peddler's Wares</h4>
            <p>"Blood-soaked coins for trinkets and steel..."</p>
            <div id="shopItems">
    `;

    for (let item of shopItems) {
        shopHTML += `
            <div class="shop-item">
                <span>${item.name} - ${item.price}s</span>
                <button onclick="buyItem('${item.name}', ${item.price})" ${gameState.silver < item.price ? 'disabled' : ''}>Buy</button>
            </div>
        `;
    }

    shopHTML += '</div><button onclick="closeShop()" class="close-shop-btn">Return to Map</button></div>';
    shopView.innerHTML = shopHTML;
    shopView.style.display = 'block';

    updateButtons();
}

function closeShop() {
    gameState.shopOpen = false;
    document.getElementById('shopView').style.display = 'none';
    document.getElementById('mapView').style.display = 'block';
    if(gameState.currentRoom === 'shop') {
        setGameText(`<div class="room-info"><h3>🛒 SHOP</h3><p class="success">You are in a room with a mysterious peddler. You can open the shop again or move on.</p></div>`);
    }
    updateButtons();
}

function buyItem(itemName, price) {
    if (gameState.silver >= price) {
        updateStatWithHighlight('silver', gameState.silver - price, 'decrease');
        
        if (itemName === 'Random Scroll') {
            const scroll = scrolls[rollDie(4) - 1];
            gameState.inventory.push('Scroll: ' + scroll);
            log("🛒 Bought scroll: " + scroll);
        } else {
            gameState.inventory.push(itemName);
            log("🛒 Bought: " + itemName);
        }
        
        updateDisplay();
        openShop(); // Refresh shop
    }
}

function checkLevelUp() {
    if ((gameState.rooms >= 12 && gameState.points >= 15) || gameState.silver >= 40) {
        levelUp();
    }
}

function levelUp() {
    const bonus = rollDie(6);
    const bonusIndex = gameState.levelUpBonuses.indexOf(bonus);
    if (bonusIndex !== -1) {
        gameState.levelUpBonuses.splice(bonusIndex, 1);
    }
    
    updateStatWithHighlight('level', gameState.level + 1, 'increase');
    gameState.points = 0;
    gameState.rooms = 0;
    
    let levelText = `<div class="success">`;
    levelText += `<h3>🏆 LEVEL UP! You are now level ${gameState.level}!</h3>`;
    
    switch(bonus) {
        case 1:
            levelText += `<p>🎖️ You are knighted! You may call yourself Sir or Lady Kargunt!</p>`;
            break;
        case 2:
            levelText += `<p>⚔️ You gain +1 attack bonus against all monsters!</p>`;
            break;
        case 3:
            updateStatWithHighlight('maxHp', gameState.maxHp + 5, 'increase');
            updateStatWithHighlight('hp', gameState.hp + 5, 'increase');
            levelText += `<p>❤️ Your maximum hit points increase by +5 to ${gameState.maxHp}!</p>`;
            break;
        case 4:
            for (let i = 0; i < 5; i++) {
                gameState.inventory.push('Potion');
            }
            levelText += `<p>🧪 A herbmaster gives you 5 potions!</p>`;
            break;
        case 5:
            gameState.inventory.push('Mighty Zweihänder');
            levelText += `<p>🗡️ You find a MIGHTY ZWEIHÄNDER (d6+2 damage)!</p>`;
            break;
        case 6:
            levelText += `<p>🛡️ Choose one weak and one tough monster - their damage against you is halved forever!</p>`;
            break;
    }
    
    levelText += `<p>Continue exploring or start a new catacomb!</p>`;
    levelText += `</div>`;
    
    setGameText(levelText);
    log("🏆 LEVEL UP! Gained bonus: " + bonus);
    
    if (gameState.levelUpBonuses.length === 0) {
        gameWin();
    }
    
    updateDisplay();
    updateButtons();
}

function gameOver(reason) {
    // Make sure combat overlay is removed if present
    const combatOverlay = document.getElementById('combatOverlay');
    if (combatOverlay) {
        combatOverlay.remove();
    }
    document.body.classList.remove('combat-mode');
    
    let gameOverText = `<div class="warning game-over-screen">`;
    gameOverText += `<h3>💀 GAME OVER</h3>`;
    gameOverText += `<p class="death-reason">${reason}</p>`;
    gameOverText += `<p>Your adventure ends here, brave Kargunt.</p>`;
    gameOverText += `<div class="final-stats">`;
    gameOverText += `<h4>📊 Final Stats:</h4>`;
    gameOverText += `<p>🏆 Level: ${gameState.level}</p>`;
    gameOverText += `<p>⭐ Points: ${gameState.points}</p>`;
    gameOverText += `<p>🪙 Silver: ${gameState.silver}</p>`;
    gameOverText += `<p>🏛️ Rooms Explored: ${gameState.rooms}</p>`;
    gameOverText += `<p>💀 Monsters Defeated: ${gameState.monstersKilled}</p>`;
    gameOverText += `</div>`;
    gameOverText += `<div class="game-over-options">`;
    gameOverText += `<button onclick="resetGame()" class="restart-btn">🔄 Start New Adventure</button>`;
    gameOverText += `<button onclick="returnToMainMenu()" class="menu-btn">🏠 Return to Main Menu</button>`;
    gameOverText += `</div>`;
    gameOverText += `</div>`;
    
    setGameText(gameOverText);
    log("💀 GAME OVER: " + reason);
    
    // Clean up game state
    gameState.gameStarted = false;
    gameState.inCombat = false;
    gameState.inEncounter = false;
    gameState.currentMonster = null;
    
    // Remove any combat buttons or movement controls
    removeCombatButtons();
    removeMovementButtons();
    
    // Hide all main action buttons except for the game over options
    hideMainActionButtons();
}

function gameWin() {
    let winText = `<div class="success game-win-screen">`;
    winText += `<h3>🏆 VICTORY!</h3>`;
    winText += `<p>Congratulations! You have completed all level-up bonuses!</p>`;
    winText += `<p>You retire to your cottage or castle until the 7th Misery occurs and everything you know blackens and burns.</p>`;
    winText += `<p>You have mastered the Dark Fort!</p>`;
    winText += `<div class="game-over-options">`;
    winText += `<button onclick="resetGame()" class="restart-btn">🔄 Start New Adventure</button>`;
    winText += `<button onclick="returnToMainMenu()" class="menu-btn">🏠 Return to Main Menu</button>`;
    winText += `</div>`;
    winText += `</div>`;
    
    setGameText(winText);
    log("🏆 VICTORY! Adventure completed!");
    
    // Clean up game state
    gameState.gameStarted = false;
    gameState.inCombat = false;
    gameState.inEncounter = false;
    gameState.currentMonster = null;
    
    // Remove any combat buttons or movement controls
    removeCombatButtons();
    removeMovementButtons();
    
    // Hide all main action buttons
    hideMainActionButtons();
}

function returnToMainMenu() {
    // Reset everything to initial state
    resetGameState();
    
    // Show main menu screen
    setGameText(`
        <div class="main-menu">
            <h2>🏰 Welcome to Dark Fort 🏰</h2>
            <p>A solo dungeon crawler based on the precursor to MÖRK BORG</p>
            <p>You are Kargunt, a catacomb rogue seeking treasure and glory in the cursed depths.</p>
            <br>
            <p>🎯 <strong>How to Play:</strong></p>
            <ul>
                <li>🚪 Start your adventure and explore the cursed catacomb</li>
                <li>⚔️ Fight monsters using dice rolls and special abilities</li>
                <li>🛒 Visit shops to buy equipment and supplies</li>
                <li>🏆 Level up by gaining points and exploring rooms</li>
                <li>🗺️ Use the map to track your exploration</li>
            </ul>
            <br>
            <p>Ready to begin your perilous journey?</p>
        </div>
    `);
    
    updateDisplay();
    updateButtons();
}

function resetGame() {
    // Reset everything to initial state
    resetGameState();
    
    setGameText(`
        <p>Welcome to the Dark Fort, brave Kargunt!</p>
        <p>You stand before the entrance to a cursed catacomb. Ancient evil lurks within, but so does treasure and glory.</p>
        <p>Click "Start Adventure" to begin your perilous journey...</p>
    `);
    
    updateDisplay();
    updateButtons();
}

function resetGameState() {
    gameState = {
        hp: 15,
        maxHp: 15,
        silver: 0,
        points: 0,
        rooms: 0,
        level: 1,
        inventory: [],
        currentMonster: null,
        inCombat: false,
        inEncounter: false,
        gameStarted: false,
        levelUpBonuses: [1, 2, 3, 4, 5, 6],
        shopOpen: false,
        currentRoom: 'entrance',
        // Map system
        playerX: 4,
        playerY: 4,
        map: {},
        monstersKilled: 0,
        achievements: [],
        currentTab: 'game',
        // Combat enhancements
        statusEffects: [],
        specialAbilities: {
            charge: { cooldown: 0, maxCooldown: 3 },
            parry: { cooldown: 0, maxCooldown: 2 },
            magicBurst: { cooldown: 0, maxCooldown: 4 }
        },
        combatLog: [],
        combatRound: 1
    };
    
    const logElement = document.getElementById('log2');
    if (logElement) logElement.innerHTML = '';
    
    // Hide shop, show map
    closeShop();
    
    // Clear any extra buttons
    removeMovementButtons();
    removeCombatButtons();
    
    // Remove combat overlay if present
    const combatOverlay = document.getElementById('combatOverlay');
    if (combatOverlay) {
        combatOverlay.remove();
    }
    document.body.classList.remove('combat-mode');
    
    // Reset maps
    document.getElementById('miniMap').innerHTML = '';
    document.getElementById('fullMap').innerHTML = '';
}

// Initialize the game when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    updateDisplay();
    updateButtons();
    
    // Initialize empty maps
    renderMaps();
});