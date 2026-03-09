
const { performance } = require('perf_hooks');

const SHOP_ITEMS = Array.from({length: 20}, (_, i) => ({
    name: `Item ${i}`,
    price: 10,
    description: `Description for item ${i}`,
    type: 'weapon',
    value: 'd6'
}));

const ITEM_LOOKUP = {};
SHOP_ITEMS.forEach(item => ITEM_LOOKUP[item.name] = item);

const gameState = {
    silver: 100,
    inventory: SHOP_ITEMS.map(item => item.name)
};

const createShopItemHTML = (item, isBuying, count = 1) => {
    return `<div class="shop-item">${item.name}</div>`;
};

function benchmarkCurrent(iterations) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const isFirstTime = i % 10 === 0;
        const tab = (i % 2 === 0) ? 'buy' : 'sell';

        let shopText = isFirstTime ? "<p class='success'>Atsiranda paslaptingas prekeivis, siūlantis savo prekes.</p>" : "";

        shopText += `
            <div class="shop-tabs">
                <button class="${tab === 'buy' ? 'active' : ''}" onclick="openShop(false, 'buy')">Pirkti</button>
                <button class="${tab === 'sell' ? 'active' : ''}" onclick="openShop(false, 'sell')">Parduoti</button>
            </div>
        `;

        let shopItems = [];
        if (tab === 'buy') {
            shopItems.push("<h4><span class=\"material-symbols-outlined\">storefront</span> Prekeivio Prekės</h4>");
            SHOP_ITEMS.forEach(item => {
                shopItems.push(createShopItemHTML(item, true));
            });
        } else {
            shopItems.push("<h4><span class=\"material-symbols-outlined\">backpack</span> Tavo Prekės</h4>");
            const sellableInventory = [...new Set(gameState.inventory)];
            sellableInventory.forEach(itemName => {
                let itemDetails = ITEM_LOOKUP[itemName] || { name: itemName, type: 'misc', description: 'Paprastas daiktas.', price: 2 };
                const count = 1;
                shopItems.push(createShopItemHTML(itemDetails, false, count));
            });
        }

        shopText += shopItems.join('');
        shopText += `<button onclick="closeShop()">Išeiti iš Parduotuvės</button>`;
    }
    return performance.now() - start;
}

function benchmarkMapJoin(iterations) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const isFirstTime = i % 10 === 0;
        const tab = (i % 2 === 0) ? 'buy' : 'sell';

        const intro = isFirstTime ? "<p class='success'>Atsiranda paslaptingas prekeivis, siūlantis savo prekes.</p>" : "";

        const tabs = `
            <div class="shop-tabs">
                <button class="${tab === 'buy' ? 'active' : ''}" onclick="openShop(false, 'buy')">Pirkti</button>
                <button class="${tab === 'sell' ? 'active' : ''}" onclick="openShop(false, 'sell')">Parduoti</button>
            </div>
        `;

        let content = "";
        if (tab === 'buy') {
            content = "<h4><span class=\"material-symbols-outlined\">storefront</span> Prekeivio Prekės</h4>" +
                      SHOP_ITEMS.map(item => createShopItemHTML(item, true)).join('');
        } else {
            const sellableInventory = [...new Set(gameState.inventory)];
            content = "<h4><span class=\"material-symbols-outlined\">backpack</span> Tavo Prekės</h4>" +
                      (sellableInventory.length === 0 ? "<p>Neturi nieko parduoti.</p>" :
                      sellableInventory.map(itemName => {
                          let itemDetails = ITEM_LOOKUP[itemName] || { name: itemName, type: 'misc', description: 'Paprastas daiktas.', price: 2 };
                          return createShopItemHTML(itemDetails, false, 1);
                      }).join(''));
        }

        const footer = `<button onclick="closeShop()">Išeiti iš Parduotuvės</button>`;
        const shopText = intro + tabs + content + footer;
    }
    return performance.now() - start;
}

const ITERATIONS = 1000000;
console.log(`Running benchmark with ${ITERATIONS} iterations...`);

const tCurrent = benchmarkCurrent(ITERATIONS);
console.log(`Current approach:  ${tCurrent.toFixed(2)}ms`);

const tMapJoin = benchmarkMapJoin(ITERATIONS);
console.log(`Map/Join approach: ${tMapJoin.toFixed(2)}ms`);

console.log(`Improvement: ${((tCurrent - tMapJoin) / tCurrent * 100).toFixed(2)}%`);
