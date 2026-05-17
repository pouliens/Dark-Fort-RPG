const ENEMY_SPRITE_DIR = 'assets/enemies';

const GAME_RULES = {
    title: 'Dark Fort: Moon Devils',
    levelUpCost: 15,
    inventoryLimit: 8,
    quickStartPools: { body: 15, mind: 10, soul: 10, oxygen: 15 },
    challengeStorageKey: 'darkFortMoonDevilsChallengesV1'
};

const POOLS = ['body', 'mind', 'soul', 'oxygen'];

const POOL_LABELS = {
    body: 'Body',
    mind: 'Mind',
    soul: 'Soul',
    oxygen: 'Oxygen'
};

const WEAK_MONSTERS = [
    {
        name: 'Space Goblin',
        type: 'Creature',
        points: 3,
        damage: 'd4',
        damagePool: 'body',
        hp: 6,
        sprite: `${ENEMY_SPRITE_DIR}/weak-threat-1.png`,
        special: '2-in-6: loot random gear. If it wounds you, lose 1 Oxygen or one loose item.'
    },
    {
        name: 'Possessed AI',
        type: 'Machine',
        points: 3,
        damage: 'd4',
        damagePool: 'mind',
        hp: 5,
        sprite: `${ENEMY_SPRITE_DIR}/weak-threat-2.png`,
        special: 'If it wounds you, spend 1 Oxygen to cut comms and reduce Mind damage by 1.'
    },
    {
        name: 'Repair Drone',
        type: 'Machine',
        points: 3,
        damage: 'd4',
        damagePool: 'body',
        hp: 5,
        sprite: `${ENEMY_SPRITE_DIR}/weak-threat-3.png`,
        special: 'Hardsuit plating absorbs its cutter. If Body damage gets through, lose 1 Oxygen unless you spend a suit patch kit.'
    },
    {
        name: 'Robot Ghost',
        type: 'Ghost',
        points: 3,
        damage: 'd4',
        damagePool: 'soul',
        hp: 5,
        sprite: `${ENEMY_SPRITE_DIR}/weak-threat-4.png`,
        special: 'May be calmed with a Soul test instead of fought.'
    },
    {
        name: 'Dust Devil',
        type: 'Devil',
        points: 4,
        damage: 'd4',
        damagePool: 'oxygen',
        hp: 5,
        sprite: `${ENEMY_SPRITE_DIR}/weak-threat-5.png`,
        special: 'Hardsuit plating does not absorb its breath theft. Kill it to mark this room as a safe backtrack point.'
    },
    {
        name: 'Wire Devil',
        type: 'Devil',
        points: 4,
        damage: 'd4',
        damagePool: 'soul',
        hp: 5,
        sprite: `${ENEMY_SPRITE_DIR}/weak-threat-6.png`,
        special: 'If it wounds you, backtracking through this room costs +1 Oxygen.'
    }
];

const TOUGH_MONSTERS = [
    {
        name: 'Root Doctor',
        type: 'Creature',
        points: 4,
        damage: 'd6',
        damagePool: 'soul',
        hp: 8,
        sprite: `${ENEMY_SPRITE_DIR}/tough-threat-1.png`,
        special: 'Loot 3d6 credits. After fight: 1-in-6 the mission ends and your body becomes an artifact.'
    },
    {
        name: 'Moon Golem',
        type: 'Machine',
        points: 5,
        damage: 'd6+1',
        damagePool: 'body',
        hp: 9,
        sprite: `${ENEMY_SPRITE_DIR}/tough-threat-2.png`,
        special: 'Worth 7 threat points. Pry-hammer or Žaltys shock baton gets +1 attack against it.'
    },
    {
        name: 'War AI',
        type: 'Machine',
        points: 4,
        damage: 'd6',
        damagePool: 'mind',
        hp: 8,
        sprite: `${ENEMY_SPRITE_DIR}/tough-threat-3.png`,
        special: 'The first miss costs 1 Oxygen or makes this room unsafe.'
    },
    {
        name: 'Vacuum Basilisk',
        type: 'Creature',
        points: 4,
        damage: 'd6',
        damagePool: 'oxygen',
        hp: 11,
        sprite: `${ENEMY_SPRITE_DIR}/tough-threat-4.png`,
        special: 'After fight: 2-in-6 gain +10 threat points. Its hide can repair one suit breach.'
    },
    {
        name: 'Ghost Captain',
        type: 'Ghost',
        points: 5,
        damage: 'd6',
        damagePool: 'soul',
        hp: 8,
        sprite: `${ENEMY_SPRITE_DIR}/tough-threat-5.png`,
        special: 'Before combat, test Soul to salute the dead. Success: it starts at half HP.'
    },
    {
        name: 'Moon Devil',
        type: 'Devil',
        points: 5,
        damage: 'd6',
        damagePool: 'body',
        hp: 10,
        sprite: `${ENEMY_SPRITE_DIR}/tough-threat-6.png`,
        special: 'Hardsuit plating absorbs d4-1 Body. If Body damage gets through, also lose 1 Oxygen.'
    }
];

const MISSIONS = [
    {
        briefing: 'Recover the prototype',
        target: 'Perkūnas capacitor in a sealed black case',
        twist: 'Test Body to haul it without strain. On failure, each weapon miss while carrying it also costs 1 Oxygen.',
        payout: 30,
        pool: 'body'
    },
    {
        briefing: 'Retrieve the body',
        target: 'Helmet from a corpse still whispering folk prayers',
        twist: 'Test Soul when you first pick it up. On failure, lose d4 Soul unless you bury the body marker.',
        payout: 25,
        pool: 'soul'
    },
    {
        briefing: 'Wake the AI',
        target: 'Glassy datachip in a server vault',
        twist: 'Test Mind to wake it cleanly. On failure, the first later Mind damage deals +1.',
        payout: 35,
        pool: 'mind'
    },
    {
        briefing: 'Salvage run',
        target: 'Any 40 credits worth of scrap',
        twist: 'Test Body when extracting overloaded. On success, extra scrap counts double; on failure, it costs one extra item slot.',
        payout: 'scrap value',
        pool: 'body',
        scrapTarget: 40
    },
    {
        briefing: 'Silence a transmitter',
        target: 'Transmitter core, warm as a heart',
        twist: 'Test Soul to mute the song. On failure, each backtrack after finding it is 2-in-4 for a weak threat.',
        payout: 40,
        pool: 'soul'
    },
    {
        briefing: 'Confirm the rumor',
        target: 'Photo, sample, or proof of the moving thing',
        twist: 'Test Mind to capture usable proof. On failure, proof only counts if you also survive one tough threat.',
        payout: 50,
        pool: 'mind'
    }
];

const FACTIONS = [
    {
        name: 'The Council',
        edge: 'Once when the target costs a pool, Oxygen, slot, scrap, or credits, reduce that cost by 1 or d6 credits.',
        debt: 'Mark Council debt if you return without the target.'
    },
    {
        name: 'The Cult of the Long Eclipse',
        edge: 'Once when an anomaly, artifact, Ghost, or Devil deals Mind or Soul damage, reduce that damage by d4.',
        debt: 'Mark Cult debt if you sell the target without showing them.'
    },
    {
        name: 'The Drift Syndicate',
        edge: 'The first Quiet salvage or Void Peddler room also finds d6 credits. Peddlers buy your loot at full price.',
        debt: 'Mark Drift debt if you cheat or abandon a peddler.'
    },
    {
        name: 'Base-born',
        edge: 'Once, open one sealed door, case, terminal, valve, or blocked route without a test.',
        debt: 'That room becomes unsafe: backtracking is 2-in-4.'
    }
];

const ROOM_TABLE = [
    { roll: 1, label: 'Quiet salvage', description: 'Restore 1 Soul (or d6 credits if Soul is full). May rush the search with a Mind test for extra credits / a safe backtrack point — fail makes the room unsafe.' },
    { roll: 2, label: 'Pit / drop / cable well', description: 'Body test to cross. On failure: take d6 Body and breach your suit.' },
    { roll: 3, label: 'Anomaly broadcast', description: 'Mind or Soul test (whichever is higher). Success: restore d4 Mind, or +3 threat if Mind is full. Failure: take d4 to the tested pool.' },
    { roll: 4, label: 'Weak threat', description: 'Roll on the Weak Threats table. Standard combat.' },
    { roll: 5, label: 'Tough threat', description: 'Roll on the Tough Threats table. Standard combat.' },
    { roll: 6, label: 'Void Peddler', description: 'A trader appears. Open the shop and barter.' }
];

const DOORS_TABLE = [
    { roll: 1, doors: 0, description: 'Dead end — no further doors.' },
    { roll: 2, doors: 1, description: 'One door onward.' },
    { roll: 3, doors: 2, description: 'Two doors onward.' },
    { roll: 4, doors: 2, description: 'Two doors onward.' }
];

const EXTRACTION_COMPLICATIONS = [
    { roll: 1, label: 'Air leak', description: 'Lose d4 Oxygen (bypasses armor).' },
    { roll: 2, label: 'Blocked route', description: 'A weak threat blocks your retreat. Take its damage to the routed pool, no fight.' },
    { roll: 3, label: 'Hard crossing', description: 'Body test. On failure: take d4 Body.' },
    { roll: 4, label: 'Bad signal', description: 'Mind test. On failure: spend 1 Oxygen correcting course.' },
    { roll: 5, label: 'Voices in the suit', description: 'Soul test. On failure: take d4 Soul.' },
    { roll: 6, label: 'Drop salvage', description: 'Lose one loose item; if none, drop d6 credits.' }
];

const TEST_TARGETS = [
    { range: '13+ pool', threshold: 2 },
    { range: '9–12 pool', threshold: 3 },
    { range: '5–8 pool', threshold: 4 },
    { range: '1–4 pool', threshold: 5 },
    { range: '0 pool', threshold: 'Auto-fail' }
];

const ROOM_SHAPES = [
    { min: 2, max: 2, name: 'Collapsed dome', effect: 'first physical hit here breaches a suit', threatPoints: 1 },
    { min: 3, max: 3, name: 'Oval shrine-lab', effect: 'Soul damage is +1 here', threatPoints: 1 },
    { min: 4, max: 4, name: 'Cross-shaped service hub', effect: '+1 to find useful scrap', threatPoints: 1 },
    { min: 5, max: 5, name: 'Corridor / service shaft', effect: 'ranged weapons get +1 attack', threatPoints: 1 },
    { min: 6, max: 8, name: 'Square chamber', effect: 'no modifier', threatPoints: 1 },
    { min: 9, max: 9, name: 'Circular airlock-room', effect: 'restore d6 Oxygen if you spend 10 minutes cycling it', threatPoints: 1, airlock: true },
    { min: 10, max: 10, name: 'Rectangular hab-block', effect: 'first quiet salvage restores +1 extra Soul', threatPoints: 1 },
    { min: 11, max: 11, name: 'Triangular junction', effect: 'draw three doors instead of rolling doors', threatPoints: 1, fixedDoors: 3 },
    { min: 12, max: 12, name: 'Skull-shaped dome', effect: 'worth 3 threat points total when explored', threatPoints: 3 }
];

const WEAPONS = [
    { name: 'Pry-hammer', type: 'weapon', value: 'd6', price: 9, description: '+1 Body tests to force, haul, climb, or cross.', bodyTestBonus: 1 },
    { name: 'Wolf-tooth blade', type: 'weapon', value: 'd4', price: 6, description: 'd4, +1 attack. Kill weak threat: restore 1 Soul.', attackBonus: 1, restoreSoulOnWeakKill: 1 },
    { name: 'Perkūnas service pistol', type: 'weapon', value: 'd6', price: 12, description: 'd6, +1 attack. Loud: this room becomes unsafe after combat.', attackBonus: 1, loud: true },
    { name: 'Žaltys shock baton', type: 'weapon', value: 'd6', price: 14, description: 'd6, d6+1 vs machines. Miss: lose 1 Oxygen.', machineDamageBonus: 1, missCost: { pool: 'oxygen', amount: 1 } },
    { name: 'Eglė root-saw', type: 'weapon', value: 'd6+1', price: 15, description: 'd6+1. Miss: lose 1 Body unless you spend 1 Oxygen.', missCost: { pool: 'body', amount: 1, preventWithOxygen: true } },
    { name: 'Moon-salt carbine', type: 'weapon', value: 'd6', price: 13, description: 'd6, +1 attack vs Ghosts, Devils, and Soul-damage threats. Miss: lose 1 Soul.', attackBonusVs: ['Ghost', 'Devil'], attackBonusVsPool: 'soul', missCost: { pool: 'soul', amount: 1 } }
];

const CONSUMABLES = [
    { name: 'Red stim', type: 'consumable', price: 4, description: 'Restore d6 Body. On a 1, also lose 1 Mind.', restores: { pool: 'body', dice: 'd6' }, sideEffectOnOne: { pool: 'mind', amount: 1 } },
    { name: 'Dream sedative', type: 'consumable', price: 5, description: 'Restore d4 Mind. You cannot spend Oxygen for +1 on your next roll.', restores: { pool: 'mind', dice: 'd4' } },
    { name: 'Mother-soil charm', type: 'consumable', price: 5, description: 'Restore d4 Soul. If this fills Soul, gain 1 threat point.', restores: { pool: 'soul', dice: 'd4' }, threatPointOnFull: true },
    { name: 'O2 canister', type: 'consumable', price: 6, description: 'Restore d6 Oxygen. Empty canister still takes a slot until discarded.', restores: { pool: 'oxygen', dice: 'd6' } },
    { name: 'Black rye ration', type: 'consumable', price: 3, description: 'Restore 1 Body, 1 Mind, and 1 Soul during an airlock rest.', restoresAll: { body: 1, mind: 1, soul: 1 } },
    { name: 'Moon-salt pouch', type: 'consumable', price: 7, description: 'Cancel one curse, omen, or Soul damage roll. The room becomes unsafe.', cancelsSoulDamage: true }
];

const GEAR = [
    { name: 'Climbing line', type: 'gear', price: 5, description: '+1 Body tests for pits, drops, hauling, and extraction. Can anchor one safe backtrack point.', bodyTestBonus: 1, canMarkSafe: true },
    { name: 'Suit patch kit', type: 'consumable', price: 6, description: 'Repair one breach or cancel d4 Oxygen loss from a gas leak.', repairsBreach: true },
    { name: 'Brass sun-flare', type: 'consumable', price: 4, description: 'Reveal a dark room. Weak Soul-damage threats must be rerolled once.' },
    { name: 'Tube scanner', type: 'gear', price: 8, description: 'd4 uses. Peek at a room result after spending Oxygen.', uses: 'd4' },
    { name: 'Prayer wire', type: 'gear', price: 7, description: 'Once per mission, backtrack between two explored rooms without spending Oxygen.' },
    { name: 'Chalk of Laumė', type: 'consumable', price: 5, description: 'Mark a door as cursed. The next threat through it takes d4 damage before combat.' }
];

const SUITS = [
    { name: 'Hardsuit plating', type: 'armor', price: 10, description: 'Absorb d4 Body from each physical hit.', armorDie: 'd4' },
    { name: 'Laumė phase cloak', type: 'armor', price: 15, description: 'Skip d4 fights after they are revealed; keep the threat points.', skipFights: 'd4' },
    { name: 'Mirror visor', type: 'armor', price: 8, description: 'First Mind damage each mission is reduced by d4.', firstMindReduction: 'd4' },
    { name: 'Perkūnas sealant rig', type: 'armor', price: 9, description: 'First suit breach each mission is ignored.', ignoresFirstBreach: true },
    { name: 'Grave-bell radio', type: 'gear', price: 7, description: 'Once per mission, call the colony and restore d4 Soul. On 1-in-6, something else answers.' }
];

const DEVICES = [
    { name: 'Aitvaras drone-chip', type: 'device', price: 7, description: 'd4 fights. Drone deals d4 Body after your attack.', uses: 'd4', droneDamage: 'd4' },
    { name: 'Perkūnas Gate Protocol', type: 'device', price: 7, description: 'd4 uses. Deal d6+1 Body damage before your attack. Loud.', uses: 'd4', preAttackDamage: 'd6+1', loud: true },
    { name: 'Žaltys Aegis Coil', type: 'device', price: 7, description: 'd4 uses. Absorb d4 Body or Oxygen after it is rolled.', uses: 'd4' },
    { name: 'Laumė Mirror Script', type: 'device', price: 7, description: 'd4 uses. Reroll Mind or Soul damage affecting you; keep the second result.', uses: 'd4' },
    { name: 'False Omen Cassette', type: 'device', price: 7, description: 'd4 uses. Change a room roll by +1 or -1 after seeing it.', uses: 'd4' },
    { name: 'Ragana Debug Needle', type: 'device', price: 7, description: 'Single use. Repair a breach, un-burn a device, or unlock a sealed artifact case; take d4 Mind.', uses: 1 }
];

const SHOP_ITEMS = [
    ...CONSUMABLES,
    ...GEAR,
    ...WEAPONS,
    ...SUITS,
    { name: 'Random device', type: 'device', price: 7, description: 'Roll a random Moon Devils device when purchased.', randomTable: 'devices' }
];

const LOOT_DROPS = [
    ...WEAPONS,
    ...CONSUMABLES,
    ...GEAR,
    ...SUITS,
    ...DEVICES
];

const STARTING_WEAPONS = WEAPONS;

const STARTING_ITEMS = [
    SUITS[0],
    CONSUMABLES.find(item => item.name === 'O2 canister'),
    GEAR.find(item => item.name === 'Tube scanner'),
    GEAR.find(item => item.name === 'Suit patch kit'),
    CONSUMABLES.find(item => item.name === 'Moon-salt pouch'),
    DEVICES.find(item => item.name === 'Aitvaras drone-chip')
];

const PLAYER_NAMES = [
    'Kargunt',
    'Vesper',
    'Austėja',
    'Milda',
    'Rook',
    'Sable'
];

const PLAYER_PROFESSIONS = [
    'Council explorer',
    'base-born scout',
    'Drift salvager',
    'long-eclipse penitent',
    'void hauler',
    'signal hunter'
];

const ADVANCEMENTS = [
    {
        id: 'ironBody',
        name: 'Iron Body',
        pool: 'body',
        description: '+3 maximum Body. Once per mission, reduce one Body damage roll by 1 after armor.',
        maxPool: 'body',
        amount: 3
    },
    {
        id: 'coldMind',
        name: 'Cold Mind',
        pool: 'mind',
        description: '+3 maximum Mind. Once per mission, reroll one Mind test.',
        maxPool: 'mind',
        amount: 3
    },
    {
        id: 'oldSoul',
        name: 'Old Soul',
        pool: 'soul',
        description: '+3 maximum Soul. Once per mission, reroll one Soul test.',
        maxPool: 'soul',
        amount: 3
    },
    {
        id: 'longBreath',
        name: 'Long Breath',
        pool: 'oxygen',
        description: '+3 maximum Oxygen. Once per mission, one room entry or backtrack costs 0 Oxygen.',
        maxPool: 'oxygen',
        amount: 3
    },
    {
        id: 'huntersHand',
        name: "Hunter's Hand",
        pool: 'body',
        description: '+1 attack vs all threats. Once per mission, restore 1 pool after a kill.',
        attackBonus: 1
    },
    {
        id: 'exitSaint',
        name: 'Exit Saint',
        pool: 'mind',
        description: '+1 to Extraction Rolls. Once per mission, mark one explored room as a safe backtrack point.',
        extractionBonus: 1
    }
];

const CHALLENGES = [
    { id: 'firstTarget', description: 'Recover a mission target', type: 'target', targetName: 'mission', targetValue: 1, progress: 0 },
    { id: 'cleanExtract', description: 'Make a clean extraction', type: 'extract', targetName: 'clean', targetValue: 1, progress: 0 },
    { id: 'surviveTwelve', description: 'Explore 12 rooms in one base', type: 'explore', targetName: 'room', targetValue: 12, progress: 0 },
    { id: 'slayMoonDevil', description: 'Defeat a Moon Devil', type: 'slay', targetName: 'Moon Devil', targetValue: 1, progress: 0 },
    { id: 'reachLevelThree', description: 'Scratch three advancements', type: 'level', targetName: 'player', targetValue: 3, progress: 0 },
    { id: 'bringBackCredits', description: 'Bring back 50 credits', type: 'collect', targetName: 'credits', targetValue: 50, progress: 0 }
];
