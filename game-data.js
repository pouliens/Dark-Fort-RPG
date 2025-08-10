const WEAK_MONSTERS = [
    { name: 'Kraujuotas Skeletas', points: 3, damage: 'd4', hp: 6, difficulty: 2 },
    { name: 'Katakombų Kultistas', points: 3, damage: 'd4', hp: 6, difficulty: 2 },
    { name: 'Goblinas', points: 3, damage: 'd4', hp: 5, difficulty: 2 },
    { name: 'Nemirėlių Šuo', points: 4, damage: 'd4', hp: 6, difficulty: 3 }
];

const TOUGH_MONSTERS = [
    { name: 'Nekromantas-Burtininkas', points: 4, damage: 'd6', hp: 8, difficulty: 3 },
    { name: 'Mažas Akmeninis Trolis', points: 5, damage: 'd6', hp: 9, difficulty: 4 },
    { name: 'Medūza', points: 4, damage: 'd6', hp: 10, difficulty: 3 },
    { name: 'Griuvėsių Baziliskas', points: 4, damage: 'd6', hp: 11, difficulty: 3 }
];

const FORTRESS_LORD = { name: 'Tvirtovės Valdovas', points: 20, damage: 'd6', hp: 25, difficulty: 4 };

const LOOT_DROPS = [
    { name: 'Kardas', type: 'weapon', value: 'd6' },
    { name: 'Odiniai Šarvai', type: 'armor', value: 1 },
    { name: 'Mikstūra', type: 'potion' }
];

const SHOP_ITEMS = [
    { name: 'Mikstūra', price: 5, description: 'Gydo 2d6 gyvybių.', type: 'potion' },
    { name: 'Kardas', price: 10, description: 'Paprastas ginklas (d6 žala).', type: 'weapon', value: 'd6' },
    { name: 'Didysis Kardas', price: 25, description: 'Geresnis ginklas (d8 žala).', type: 'weapon', value: 'd8' },
    { name: 'Odiniai Šarvai', price: 15, description: 'Paprasti šarvai (1 gynyba).', type: 'armor', value: 1 },
    { name: 'Grandininiai Šarvai', price: 30, description: 'Geresni šarvai (2 gynyba).', type: 'armor', value: 2 },
    { name: 'Virvė', price: 5, description: 'Padeda išvengti spąstų duobių.', type: 'utility' }
];

const PLAYER_NAMES = [
    'Vytautas',
    'Gediminas',
    'Algirdas',
    'Kęstutis',
    'Jogaila',
    'Mindaugas'
];

const PLAYER_PROFESSIONS = [
    'Kalvis',
    'Medžiotojas',
    'Gydytojas',
    'Pirklys',
    'Karys',
    'Žemdirbys'
];
