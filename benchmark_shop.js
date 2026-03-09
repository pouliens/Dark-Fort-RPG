
const { performance } = require('perf_hooks');

const SHOP_ITEMS = [
    { name: 'Mikstūra', price: 5, description: 'Gydo 2d6 gyvybių.', type: 'potion' },
    { name: 'Kardas', price: 10, description: 'Paprastas ginklas (d6 žala).', type: 'weapon', value: 'd6' },
    { name: 'Didysis Kardas', price: 25, description: 'Geresnis ginklas (d8 žala).', type: 'weapon', value: 'd8' },
    { name: 'Odiniai Šarvai', price: 15, description: 'Paprasti šarvai (1 gynyba).', type: 'armor', value: 1 },
    { name: 'Grandininiai Šarvai', price: 30, description: 'Geresni šarvai (2 gynyba).', type: 'armor', value: 2 },
    { name: 'Virvė', price: 5, description: 'Padeda išvengti spąstų duobių.', type: 'utility' }
];

const ITEM_LOOKUP = {};
SHOP_ITEMS.forEach(item => ITEM_LOOKUP[item.name] = item);

const gameState = {
    silver: 100,
    inventory: ['Kardas', 'Mikstūra', 'Mikstūra', 'Odiniai Šarvai', 'Virvė']
};

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

function benchmarkStringConcat(iterations) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        let shopText = "";
        const tab = (i % 2 === 0) ? 'buy' : 'sell';

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
                    if (!itemDetails) {
                        itemDetails = { name: itemName, type: 'misc', description: 'Paprastas daiktas.', price: 2 };
                    }
                    const count = gameState.inventory.filter(item => item === itemName).length;
                    shopText += createShopItemHTML(itemDetails, false, count);
                });
            }
        }
    }
    const end = performance.now();
    return end - start;
}

function benchmarkArrayPushJoin(iterations) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        let shopItems = [];
        let shopText = "";
        const tab = (i % 2 === 0) ? 'buy' : 'sell';

        if (tab === 'buy') {
            shopItems.push("<h4><span class=\"material-symbols-outlined\">storefront</span> Prekeivio Prekės</h4>");
            SHOP_ITEMS.forEach(item => {
                shopItems.push(createShopItemHTML(item, true));
            });
        } else { // Sell tab
            shopItems.push("<h4><span class=\"material-symbols-outlined\">backpack</span> Tavo Prekės</h4>");
            const sellableInventory = [...new Set(gameState.inventory)];

            if (sellableInventory.length === 0) {
                shopItems.push("<p>Neturi nieko parduoti.</p>");
            } else {
                sellableInventory.forEach(itemName => {
                    let itemDetails = ITEM_LOOKUP[itemName];
                    if (!itemDetails) {
                        itemDetails = { name: itemName, type: 'misc', description: 'Paprastas daiktas.', price: 2 };
                    }
                    const count = gameState.inventory.filter(item => item === itemName).length;
                    shopItems.push(createShopItemHTML(itemDetails, false, count));
                });
            }
        }
        shopText += shopItems.join('');
    }
    const end = performance.now();
    return end - start;
}

function benchmarkArrayMapJoin(iterations) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        let shopText = "";
        const tab = (i % 2 === 0) ? 'buy' : 'sell';

        if (tab === 'buy') {
            const header = "<h4><span class=\"material-symbols-outlined\">storefront</span> Prekeivio Prekės</h4>";
            const items = SHOP_ITEMS.map(item => createShopItemHTML(item, true)).join('');
            shopText += header + items;
        } else { // Sell tab
            const header = "<h4><span class=\"material-symbols-outlined\">backpack</span> Tavo Prekės</h4>";
            const sellableInventory = [...new Set(gameState.inventory)];

            let items = "";
            if (sellableInventory.length === 0) {
                items = "<p>Neturi nieko parduoti.</p>";
            } else {
                items = sellableInventory.map(itemName => {
                    let itemDetails = ITEM_LOOKUP[itemName];
                    if (!itemDetails) {
                        itemDetails = { name: itemName, type: 'misc', description: 'Paprastas daiktas.', price: 2 };
                    }
                    const count = gameState.inventory.filter(item => item === itemName).length;
                    return createShopItemHTML(itemDetails, false, count);
                }).join('');
            }
            shopText += header + items;
        }
    }
    const end = performance.now();
    return end - start;
}

const ITERATIONS = 100000;
console.log(`Running benchmark with ${ITERATIONS} iterations...`);

const time1 = benchmarkStringConcat(ITERATIONS);
console.log(`String Concatenation: ${time1.toFixed(2)}ms`);

const time2 = benchmarkArrayPushJoin(ITERATIONS);
console.log(`Array Push/Join:      ${time2.toFixed(2)}ms`);

const time3 = benchmarkArrayMapJoin(ITERATIONS);
console.log(`Array Map/Join:       ${time3.toFixed(2)}ms`);

console.log(`\nImprovement (Push/Join vs Concat): ${((time1 - time2) / time1 * 100).toFixed(2)}%`);
console.log(`Improvement (Map/Join vs Concat):  ${((time1 - time3) / time1 * 100).toFixed(2)}%`);
console.log(`Improvement (Map/Join vs Push/Join): ${((time2 - time3) / time2 * 100).toFixed(2)}%`);
