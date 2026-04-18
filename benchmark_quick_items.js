const { performance } = require('perf_hooks');

const ITEM_LOOKUP = {
    'Mikstūra': { type: 'potion' },
    'Sword': { type: 'weapon' },
    'Axe': { type: 'weapon' },
    'Shield': { type: 'armor' },
    'Bow': { type: 'weapon' },
    'Dagger': { type: 'weapon' },
    'Trash': { type: 'misc' }
};

const gameState = {
    inventory: [
        'Mikstūra', 'Mikstūra', 'Sword', 'Shield', 'Axe', 'Mikstūra', 'Bow', 'Trash', 'Mikstūra', 'Sword', 'Trash', 'Dagger', 'Trash'
    ],
    equippedWeapon: 'Sword'
};

// Scale up inventory for benchmark
for (let i=0; i<10; i++) {
    gameState.inventory = gameState.inventory.concat(gameState.inventory);
}
console.log('Inventory size:', gameState.inventory.length);

function oldLogic() {
    let buttonsHtml = '';

    const potions = gameState.inventory.filter(i => i === 'Mikstūra');
    if (potions.length > 0) {
        buttonsHtml += `<button class="battle-item-btn" onclick="usePotion()">
            <span class="material-symbols-outlined icon-small">local_pharmacy</span> ${potions.length}
        </button>`;
    }

    const weapons = [...new Set(gameState.inventory)].filter(item => {
        const details = ITEM_LOOKUP[item];
        return details && details.type === 'weapon' && item !== gameState.equippedWeapon;
    });

    weapons.forEach(weapon => {
        buttonsHtml += `<button class="battle-item-btn" onclick="swapWeaponInBattle('${weapon}')">
           <span class="material-symbols-outlined icon-small">swap_horiz</span> ${weapon}
       </button>`;
    });
    return buttonsHtml;
}

function newLogic() {
    let buttonsHtml = '';
    let potionCount = 0;
    const uniqueWeapons = new Set();

    for (let i = 0; i < gameState.inventory.length; i++) {
        const item = gameState.inventory[i];
        if (item === 'Mikstūra') {
            potionCount++;
        } else {
            const details = ITEM_LOOKUP[item];
            if (details && details.type === 'weapon' && item !== gameState.equippedWeapon) {
                uniqueWeapons.add(item);
            }
        }
    }

    if (potionCount > 0) {
        buttonsHtml += `<button class="battle-item-btn" onclick="usePotion()">
            <span class="material-symbols-outlined icon-small">local_pharmacy</span> ${potionCount}
        </button>`;
    }

    uniqueWeapons.forEach(weapon => {
        buttonsHtml += `<button class="battle-item-btn" onclick="swapWeaponInBattle('${weapon}')">
           <span class="material-symbols-outlined icon-small">swap_horiz</span> ${weapon}
       </button>`;
    });

    return buttonsHtml;
}

// Warmup
for (let i=0; i<100; i++) {
    oldLogic();
    newLogic();
}

const iter = 1000;

let start = performance.now();
for (let i=0; i<iter; i++) {
    oldLogic();
}
let oldTime = performance.now() - start;

start = performance.now();
for (let i=0; i<iter; i++) {
    newLogic();
}
let newTime = performance.now() - start;

console.log(`Old logic: ${oldTime.toFixed(2)}ms`);
console.log(`New logic: ${newTime.toFixed(2)}ms`);
console.log(`Improvement: ${((oldTime - newTime) / oldTime * 100).toFixed(2)}%`);

const r1 = oldLogic();
const r2 = newLogic();
if (r1 !== r2) {
    console.error("Mismatch!");
    console.log("Old:");
    console.log(r1);
    console.log("New:");
    console.log(r2);
}
