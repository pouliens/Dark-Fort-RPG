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

function openMapOriginal(currentStep) {
    const mapGridEl = document.getElementById('mapGrid');
    const mapModalEl = document.getElementById('mapModal');

    mapGridEl.innerHTML = ''; // Clear previous map

    const fragment = document.createDocumentFragment();

    const mapSlice = gameState.map.slice(0, currentStep);

    mapSlice.forEach(room => {
        const roomEl = document.createElement('div');
        roomEl.className = 'map-cell';
        roomEl.innerHTML = `
            <div class="map-cell-icon">${getRoomIcon(room.type)}</div>
            <div class="map-cell-room-number">${room.room}</div>
            <div class="map-cell-details">${room.details}</div>
        `;
        fragment.appendChild(roomEl);
    });

    mapGridEl.appendChild(fragment);

    mapModalEl.style.display = 'block';
}

function openMapOptimized(currentStep) {
    const mapGridEl = document.getElementById('mapGrid');
    const mapModalEl = document.getElementById('mapModal');

    const mapSlice = gameState.map.slice(0, currentStep);
    const currentRenderedCount = mapGridEl.children.length;

    // If the map has been reset (e.g. new game) or shrunk, clear the grid
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

// Generate test data
for (let i = 0; i < 500; i++) {
    gameState.map.push({ room: i, type: 'Priešas', details: 'Goblin' });
}

// Benchmark Original
document.getElementById('mapGrid').innerHTML = ''; // reset
let startOriginal = performance.now();
for (let step = 1; step <= 500; step++) {
    openMapOriginal(step);
}
let endOriginal = performance.now();
console.log(`Original openMap (O(N^2) DOM building): ${(endOriginal - startOriginal).toFixed(2)} ms`);

// Benchmark Optimized
document.getElementById('mapGrid').innerHTML = ''; // reset
let startOptimized = performance.now();
for (let step = 1; step <= 500; step++) {
    openMapOptimized(step);
}
let endOptimized = performance.now();
console.log(`Optimized openMap (O(N) incremental): ${(endOptimized - startOptimized).toFixed(2)} ms`);
