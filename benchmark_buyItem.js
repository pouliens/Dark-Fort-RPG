const { performance } = require('perf_hooks');

const SHOP_ITEMS = Array.from({length: 100}, (_, i) => ({
    name: `Item ${i}`,
    price: 10,
    description: `Description for item ${i}`,
    type: 'weapon',
    value: 'd6'
}));

const ITEM_LOOKUP = {};
SHOP_ITEMS.forEach(item => ITEM_LOOKUP[item.name] = item);

const gameState = {
    silver: 100000000,
    inventory: []
};

// Simulate sound and logging to keep benchmark realistic
function playBuySound() {}
function log(msg) {}
function openShop(refresh, tab) {}

function buyItemOld(itemName) {
    const item = SHOP_ITEMS.find(i => i.name === itemName);
    if (item && gameState.silver >= item.price) {
        playBuySound();
        gameState.silver -= item.price;
        gameState.inventory.push(itemName);
        log(`Nusipirkai ${itemName}.`);
        openShop(false, 'buy');
    }
}

function buyItemNew(itemName) {
    const item = ITEM_LOOKUP[itemName];
    if (item && gameState.silver >= item.price) {
        playBuySound();
        gameState.silver -= item.price;
        gameState.inventory.push(itemName);
        log(`Nusipirkai ${itemName}.`);
        openShop(false, 'buy');
    }
}

const ITERATIONS = 100000;
const itemNameToBuy = 'Item 99'; // Worst case for find()

console.log(`Running benchmark with ${ITERATIONS} iterations...`);

const startOld = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    buyItemOld(itemNameToBuy);
}
const endOld = performance.now();
const timeOld = endOld - startOld;

console.log(`Array.find() approach: ${timeOld.toFixed(2)}ms`);

const startNew = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    buyItemNew(itemNameToBuy);
}
const endNew = performance.now();
const timeNew = endNew - startNew;

console.log(`O(1) Map approach:     ${timeNew.toFixed(2)}ms`);

console.log(`Improvement: ${((timeOld - timeNew) / timeOld * 100).toFixed(2)}%`);
