const { JSDOM } = require('jsdom');
const { performance } = require('perf_hooks');

const dom = new JSDOM(`<!DOCTYPE html><div id="mapGrid"></div><div id="mapModal" style="display:none"></div>`);
global.document = dom.window.document;

const gameState = {
    map: []
};

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

function openMapOptimized(currentStep) {
    const mapGridEl = document.getElementById('mapGrid');
    const mapModalEl = document.getElementById('mapModal');

    const mapSlice = gameState.map.slice(0, currentStep);

    // Simulated safety clear if needed
    const currentRenderedCount = mapGridEl.children.length;
    if (currentRenderedCount > mapSlice.length) {
        mapGridEl.innerHTML = '';
    }

    const startIndex = mapGridEl.children.length;

    if (startIndex < mapSlice.length) {
        const fragment = document.createDocumentFragment();
        for (let i = startIndex; i < mapSlice.length; i++) {
            const room = mapSlice[i];
            const roomEl = document.createElement('div');
            roomEl.className = 'map-cell';
            roomEl.innerHTML = `
                <div class="map-cell-icon">${getRoomIcon(room.type)}</div>
                <div class="map-cell-room-number">${room.room}</div>
                <div class="map-cell-details">${room.details}</div>
            `;
            fragment.appendChild(roomEl);
        }
        mapGridEl.appendChild(fragment);
    }

    mapModalEl.style.display = 'block';
}

function openMapInsertAdjacent(currentStep) {
    const mapGridEl = document.getElementById('mapGrid');
    const mapModalEl = document.getElementById('mapModal');

    const mapSlice = gameState.map.slice(0, currentStep);
    const currentRenderedCount = mapGridEl.children.length;

    if (currentRenderedCount > mapSlice.length) {
        mapGridEl.innerHTML = '';
    }

    const startIndex = mapGridEl.children.length;

    if (startIndex < mapSlice.length) {
        let newRoomsHtml = '';
        for (let i = startIndex; i < mapSlice.length; i++) {
            const room = mapSlice[i];
            newRoomsHtml += `
        <div class="map-cell">
            <div class="map-cell-icon">${getRoomIcon(room.type)}</div>
            <div class="map-cell-room-number">${room.room}</div>
            <div class="map-cell-details">${room.details}</div>
        </div>`;
        }
        mapGridEl.insertAdjacentHTML('beforeend', newRoomsHtml);
    }

    mapModalEl.style.display = 'block';
}

// Generate test data
for (let i = 0; i < 500; i++) {
    gameState.map.push({ room: i, type: 'Priešas', details: 'Goblin' });
}

// Benchmark Optimized (Fragment)
document.getElementById('mapGrid').innerHTML = '';
let startOptimized = performance.now();
for (let step = 1; step <= 500; step++) {
    openMapOptimized(step);
}
let endOptimized = performance.now();
console.log(`Optimized openMap (Fragment O(N) incremental): ${(endOptimized - startOptimized).toFixed(2)} ms`);

// Benchmark InsertAdjacent
document.getElementById('mapGrid').innerHTML = '';
let startInsert = performance.now();
for (let step = 1; step <= 500; step++) {
    openMapInsertAdjacent(step);
}
let endInsert = performance.now();
console.log(`Optimized openMap (insertAdjacentHTML O(N) incremental): ${(endInsert - startInsert).toFixed(2)} ms`);
