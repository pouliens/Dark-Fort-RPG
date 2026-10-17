// =============================================================================
// DARK FORT: MOON DEVILS — GAME DATA
// Every table the engine (and the pen & paper reference) reads from.
// Effects use a tiny DSL interpreted by engine.js:
//   ['xp', n]            ['credits', dice]        ['o2', dice]
//   ['heal', pool, dice] ['dmg', pool, dice]      ['maxPool', pool, n]
//   ['item', id | tag]   ['relic']                ['loseItem']
//   ['status', name, on] ['fight', tier | enemyId] ['reveal']
//   ['flag', name]       (permanent run flags such as weapon charge)
// pool: body | mind | soul | o2 | all (Body, Mind and Soul) | lowest
// tag:  random | consumable | weapon | gear | armor | medical
// =============================================================================

const ENEMY_SPRITE_DIR = 'assets/enemies';

const GAME_RULES = {
    title: 'Dark Fort: Moon Devils',
    version: 2,
    depths: 3,
    liftMinRooms: 2,          // a lift may appear after this many rooms on a depth
    liftGuaranteedRooms: 4,   // ...and always appears from here
    packSlots: 8,
    xpBase: 8,               // XP needed for the first advancement
    xpStep: 3,                // each later advancement costs this much more
    extractionTarget: 4,      // d6 + modifiers needed per climb
    extractionO2: 2,          // Oxygen per climbed depth
    greedMultiplier: 2,       // credits found after recovering the target
    saveKey: 'darkFortMoonDevils.run.v2',
    metaKey: 'darkFortMoonDevils.meta.v2',
    settingsKey: 'darkFortMoonDevils.settings.v2'
};

const POOLS = ['body', 'mind', 'soul'];

const POOL_LABELS = { body: 'Body', mind: 'Mind', soul: 'Soul', o2: 'Oxygen' };
const POOL_SHORT = { body: 'Body', mind: 'Mind', soul: 'Soul', o2: 'O2' };

// d6 needed on a test, by the tested pool's *current* value.
const TEST_TARGETS = [
    { min: 13, need: 2, range: '13+' },
    { min: 9, need: 3, range: '9–12' },
    { min: 5, need: 4, range: '5–8' },
    { min: 1, need: 5, range: '1–4' },
    { min: 0, need: 7, range: '0' }
];

const DEPTHS = [
    { n: 1, name: 'The Upper Decks', blurb: 'Hab-rings and chapels. The lights still remember the colonists.' },
    { n: 2, name: 'The Works', blurb: 'Smelters, cable wells and machines that never got the order to stop.' },
    { n: 3, name: 'The Deep Core', blurb: 'Where the Moon Devils sleep. The rock here is warm and listening.' }
];

// -----------------------------------------------------------------------------
// DOORS — what each door telegraphs. Weights per depth (index 0 = depth 1).
// -----------------------------------------------------------------------------

const DOOR_TYPES = {
    threat:  { label: 'Threat',  icon: 'crossed-swords', hint: 'A fight. XP and scrap.',               weights: [30, 30, 30] },
    elite:   { label: 'Marked',  icon: 'crowned-skull',  hint: 'An elite threat guarding a relic.',     weights: [5, 9, 12] },
    salvage: { label: 'Salvage', icon: 'open-chest',     hint: 'Credits, maybe gear.',                  weights: [18, 16, 14] },
    strange: { label: 'Strange', icon: 'third-eye',      hint: 'Something impossible. Choices.',        weights: [24, 24, 24] },
    shrine:  { label: 'Shrine',  icon: 'candle-light',   hint: 'A quiet place to recover.',             weights: [10, 8, 6] },
    peddler: { label: 'Peddler', icon: 'shop',           hint: 'A Void Peddler. Buy and sell.',         weights: [7, 7, 6] },
    dark:    { label: 'Dark',    icon: 'perspective-dice-six-faces-random', hint: 'Unknown. +1 XP for the nerve.', weights: [6, 6, 8] },
    lift:    { label: 'Lift',    icon: 'stairs',         hint: 'Descend to the next depth.',            weights: [0, 0, 0] },
    vault:   { label: 'Vault',   icon: 'locked-door',    hint: 'The mission target — and its guardian.', weights: [0, 0, 0] }
};

// -----------------------------------------------------------------------------
// ENEMIES
// def = d6 roll needed to hit. Damage goes to `pool`.
// -----------------------------------------------------------------------------

const ENEMIES = [
    // ---- Weak --------------------------------------------------------------
    { id: 'goblin', name: 'Space Goblin', kind: 'Creature', tier: 'weak', def: 3, hp: 4, dmg: 'd3', pool: 'body',
      trait: 'thief', traitText: 'Sticky fingers: each hit also steals 2 credits.', sprite: 'weak-threat-1.png' },
    { id: 'possessedAi', name: 'Possessed AI', kind: 'Machine', tier: 'weak', def: 3, hp: 4, dmg: 'd3', pool: 'mind',
      trait: 'reboot', traitText: 'Reboot: when it Guards, it repairs 2 HP.', sprite: 'weak-threat-2.png' },
    { id: 'repairDrone', name: 'Repair Drone', kind: 'Machine', tier: 'weak', def: 4, hp: 3, dmg: 'd3', pool: 'body',
      trait: 'cutter', traitText: 'Cutter: a Body hit breaches your suit.', sprite: 'weak-threat-3.png' },
    { id: 'robotGhost', name: 'Robot Ghost', kind: 'Ghost', tier: 'weak', def: 3, hp: 5, dmg: 'd3', pool: 'soul',
      trait: 'restless', traitText: 'Restless: may be laid to rest with a Soul test instead of fought.', sprite: 'weak-threat-4.png' },
    { id: 'dustDevil', name: 'Dust Devil', kind: 'Devil', tier: 'weak', def: 4, hp: 4, dmg: 'd4', pool: 'o2',
      trait: 'breath', traitText: 'Breath thief: it drinks your Oxygen.', sprite: 'weak-threat-5.png' },
    { id: 'wireDevil', name: 'Wire Devil', kind: 'Devil', tier: 'weak', def: 4, hp: 4, dmg: 'd3', pool: 'soul',
      trait: 'static', traitText: 'Static: each of your misses costs 1 Mind.', sprite: 'weak-threat-6.png' },

    // ---- Tough -------------------------------------------------------------
    { id: 'rootDoctor', name: 'Root Doctor', kind: 'Creature', tier: 'tough', def: 4, hp: 7, dmg: 'd4', pool: 'soul',
      trait: 'leech', traitText: 'Leech: heals 1 whenever it hurts you. Carries 3d6 credits.', sprite: 'tough-threat-1.png' },
    { id: 'moonGolem', name: 'Moon Golem', kind: 'Machine', tier: 'tough', def: 5, hp: 7, dmg: 'd4+1', pool: 'body',
      trait: 'plated', traitText: 'Plated: takes 1 less damage. Crushing weapons ignore this.', sprite: 'tough-threat-2.png' },
    { id: 'warAi', name: 'War AI', kind: 'Machine', tier: 'tough', def: 4, hp: 7, dmg: 'd4', pool: 'mind',
      trait: 'targeting', traitText: 'Target lock: never Guards and Charges twice as often.', sprite: 'tough-threat-3.png' },
    { id: 'basilisk', name: 'Vacuum Basilisk', kind: 'Creature', tier: 'tough', def: 4, hp: 7, dmg: 'd4', pool: 'o2',
      trait: 'hide', traitText: 'Vacuum: drinks Oxygen. Its hide grants +2 max Oxygen when killed.', sprite: 'tough-threat-4.png' },
    { id: 'ghostCaptain', name: 'Ghost Captain', kind: 'Ghost', tier: 'tough', def: 4, hp: 7, dmg: 'd4+1', pool: 'soul',
      trait: 'salute', traitText: 'Old soldier: salute the dead (Soul test) and it starts at half HP.', sprite: 'tough-threat-5.png' },
    { id: 'moonDevil', name: 'Moon Devil', kind: 'Devil', tier: 'tough', def: 4, hp: 8, dmg: 'd4+1', pool: 'body',
      trait: 'claws', traitText: 'Claws: Body hits also cost 1 Oxygen.', sprite: 'tough-threat-6.png' },

    // ---- Bosses (the Vault) -------------------------------------------------
    { id: 'perkunasEngine', name: 'The Perkūnas Engine', kind: 'Machine', tier: 'boss', def: 3, hp: 13, dmg: 'd6', pool: 'body',
      trait: 'overcharge', traitText: 'Overcharge: every third round it Charges for +4 instead of +2.', sprite: 'tough-threat-2.png', tint: 'boss-gold' },
    { id: 'eclipseMother', name: 'Mother of the Long Eclipse', kind: 'Devil', tier: 'boss', def: 3, hp: 12, dmg: 'd4+1', pool: 'soul',
      trait: 'eclipse', traitText: 'Eclipse: when she Guards, she heals 3.', sprite: 'tough-threat-6.png', tint: 'boss-red' },
    { id: 'choir', name: 'The Choir', kind: 'Machine', tier: 'boss', def: 3, hp: 12, dmg: 'd4', pool: 'mind',
      trait: 'chorus', traitText: 'Chorus: +1 damage each round. Bracing breaks the song.', sprite: 'tough-threat-3.png', tint: 'boss-violet' },

    // ---- Special -----------------------------------------------------------
    { id: 'reflection', name: 'Your Reflection', kind: 'Ghost', tier: 'tough', def: 4, hp: 7, dmg: 'd6', pool: 'body',
      trait: 'mirror', traitText: 'Mirror: it fights with your weapon.', sprite: null, tint: 'mirror' }
];

// Elite affixes for Marked doors. One is rolled onto a weak or tough enemy.
const ELITE_AFFIXES = [
    { id: 'frenzied', name: 'Frenzied', text: '+1 damage on every hit.', dmgBonus: 1 },
    { id: 'armored', name: 'Armored', text: '+4 HP.', hpBonus: 4 },
    { id: 'swift', name: 'Swift', text: 'Harder to hit (+1 defence, max 5).', defBonus: 1 },
    { id: 'hungry', name: 'Hungry', text: 'Every hit also drinks 1 Oxygen.', hungry: true }
];

const ENEMY_XP = { weak: 2, tough: 4, boss: 8, eliteBonus: 2 };
const ENEMY_CREDITS = { weak: 'd4', tough: 'd6+2', boss: '2d6+6' };
const ENEMY_LOOT_CHANCE = { weak: 0.3, tough: 0.55, boss: 1 };

// Intent table: d6 → move. Some traits swap the table.
const INTENTS = {
    strike: { label: 'Strike', icon: 'sword-wound', hint: 'A plain blow. Trade hits or Brace to block it.' },
    charge: { label: 'Charge', icon: 'hypersonic-bolt', hint: '+2 damage, but you get +1 to hit. Brace turns it into 1 damage.' },
    guard:  { label: 'Guard',  icon: 'checked-shield', hint: 'No attack, but it soaks 2 of your damage. Push breaks the guard.' }
};

// -----------------------------------------------------------------------------
// ITEMS
// kind: weapon | armor | consumable | gear
// consumables: use = 'any' | 'combat' | 'explore'
// -----------------------------------------------------------------------------

const ITEMS = [
    // ---- Weapons -----------------------------------------------------------
    { id: 'fists', name: 'Bare hands', kind: 'weapon', dmg: 'd3', price: 0, hidden: true, text: 'd3 damage. Better than nothing.' },
    { id: 'wolfTooth', name: 'Wolf-tooth blade', kind: 'weapon', dmg: 'd4', hit: 1, price: 6,
      text: 'd4, +1 to hit. Kills restore 1 Soul.' },
    { id: 'pryHammer', name: 'Pry-hammer', kind: 'weapon', dmg: 'd6', price: 8, crushing: true,
      text: 'd6. Crushing: ignores plating. +1 to Body tests.' },
    { id: 'pistol', name: 'Perkūnas service pistol', kind: 'weapon', dmg: 'd6', price: 11, ranged: true,
      text: 'd6. Ranged: free shot as every fight opens.' },
    { id: 'shockBaton', name: 'Žaltys shock baton', kind: 'weapon', dmg: 'd6', price: 10, vsMachine: 2,
      text: 'd6. +2 damage against Machines.' },
    { id: 'rootSaw', name: 'Eglė root-saw', kind: 'weapon', dmg: 'd8', price: 12, missCost: 'body',
      text: 'd8. Brutal: each miss costs you 1 Body.' },
    { id: 'carbine', name: 'Moon-salt carbine', kind: 'weapon', dmg: 'd6', price: 13, ranged: true, hitVs: ['Ghost', 'Devil'],
      text: 'd6. Ranged. +1 to hit Ghosts and Devils.' },
    { id: 'thunderAxe', name: 'Perkūno kirvis', kind: 'weapon', dmg: 'd10', price: 24, rare: true, freePush: true,
      text: 'd10. Thunder: Push costs no Oxygen.' },
    { id: 'laumeNeedle', name: "Laumė's needle", kind: 'weapon', dmg: 'd4', hit: 1, price: 20, rare: true, twin: true,
      text: 'd4, +1 to hit. Twin: every hit strikes twice.' },
    { id: 'velniasFork', name: "Velnias' fork", kind: 'weapon', dmg: 'd8', hit: 1, price: 18, rare: true, killCost: 'soul',
      text: 'd8, +1 to hit. Hungry: each kill costs you 1 Soul.' },

    // ---- Suits (armor) -----------------------------------------------------
    { id: 'hardsuit', name: 'Hardsuit plating', kind: 'armor', price: 10, protects: 'body',
      text: 'Reduce every Body hit by 1.' },
    { id: 'mirrorVisor', name: 'Mirror visor', kind: 'armor', price: 9, protects: 'mind',
      text: 'Reduce every Mind hit by 1.' },
    { id: 'shroud', name: "Saint's shroud", kind: 'armor', price: 9, protects: 'soul',
      text: 'Reduce every Soul hit by 1.' },
    { id: 'sealant', name: 'Perkūnas sealant rig', kind: 'armor', price: 9, protects: 'o2', noBreach: true,
      text: 'Reduce every Oxygen hit by 1. Your suit cannot be breached.' },
    { id: 'phaseCloak', name: 'Laumė phase cloak', kind: 'armor', price: 12, phase: true,
      text: 'Once per depth, Flee for free: no damage, no Oxygen.' },

    // ---- Consumables -------------------------------------------------------
    { id: 'redStim', name: 'Red stim', kind: 'consumable', price: 4, use: 'any', medical: true,
      effects: [['heal', 'body', 'd6+1']], text: 'Restore d6+1 Body.' },
    { id: 'sedative', name: 'Dream sedative', kind: 'consumable', price: 4, use: 'any', medical: true,
      effects: [['heal', 'mind', 'd4+2']], text: 'Restore d4+2 Mind.' },
    { id: 'soilCharm', name: 'Mother-soil charm', kind: 'consumable', price: 4, use: 'any', medical: true,
      effects: [['heal', 'soul', 'd4+2']], text: 'Restore d4+2 Soul.' },
    { id: 'o2Canister', name: 'O2 canister', kind: 'consumable', price: 5, use: 'any',
      effects: [['o2', 'd4+2']], text: 'Restore d4+2 Oxygen.' },
    { id: 'ryeRation', name: 'Black rye ration', kind: 'consumable', price: 6, use: 'explore',
      effects: [['heal', 'all', '2']], text: 'Restore 2 Body, Mind and Soul. Not in combat.' },
    { id: 'patchKit', name: 'Suit patch kit', kind: 'consumable', price: 4, use: 'any',
      effects: [['status', 'breached', false], ['o2', '1']], text: 'Repair a breach and restore 1 Oxygen.' },
    { id: 'moonSalt', name: 'Moon-salt pouch', kind: 'consumable', price: 5, use: 'any', moonSalt: true,
      effects: [['status', 'cursed', false]], text: 'Lift a curse. In combat: deals 2d4 to Ghosts and Devils.' },
    { id: 'sunFlare', name: 'Brass sun-flare', kind: 'consumable', price: 5, use: 'combat', stun: true,
      text: 'Blind the enemy: it loses its next move.' },
    { id: 'gateCharge', name: 'Perkūnas gate charge', kind: 'consumable', price: 7, use: 'combat', blast: '2d4+1',
      text: 'Throw it: 2d4+1 damage, never misses.' },
    { id: 'aegisCoil', name: 'Žaltys aegis coil', kind: 'consumable', price: 6, use: 'combat', aegis: true,
      text: 'Raise a shield that fully blocks the next hit.' },
    { id: 'omenCassette', name: 'False omen cassette', kind: 'consumable', price: 4, use: 'doors', reroll: true,
      text: 'Play it at a junction: reroll the doors ahead.' },
    { id: 'chalk', name: 'Chalk of Laumė', kind: 'consumable', price: 3, use: 'doors', revealDoors: true,
      text: 'Mark the doors: see exactly what lies behind each.' },

    // ---- Gear (passive, takes a pack slot) ---------------------------------
    { id: 'climbingLine', name: 'Climbing line', kind: 'gear', price: 5,
      text: '+1 to Body tests and Extraction rolls.' },
    { id: 'tubeScanner', name: 'Tube scanner', kind: 'gear', price: 8,
      text: 'Dark doors are revealed, and you see which threat waits.' },
    { id: 'droneChip', name: 'Aitvaras drone-chip', kind: 'gear', price: 9,
      text: 'Drone: after each of your attacks, deal 1 damage.' },
    { id: 'mirrorScript', name: 'Laumė mirror script', kind: 'gear', price: 8, charges: 2,
      text: 'Twice per run, reroll a failed test.' },
    { id: 'graveBell', name: 'Grave-bell radio', kind: 'gear', price: 7, perDepth: true,
      effects: [['heal', 'soul', 'd4+1']], use: 'any',
      text: 'Once per depth, call the colony: restore d4+1 Soul.' },
    { id: 'prayerWire', name: 'Prayer wire', kind: 'gear', price: 7,
      text: 'Each extraction climb costs 1 less Oxygen.' }
];

const RELICS = [
    { id: 'devilTooth', name: 'Velnio dantis', text: '+1 damage on every hit. −2 max Soul.', onGain: [['maxPool', 'soul', -2]] },
    { id: 'aitvarasFeather', name: 'Aitvaras feather', text: '+2 credits whenever you find credits.' },
    { id: 'sauleMedallion', name: 'Saulė medallion', text: 'You cannot be Cursed. Shrines restore +2.' },
    { id: 'laumeThread', name: "Laumė's thread", text: 'Your first failed test on each depth succeeds instead.' },
    { id: 'zaltysCrown', name: 'Žaltys crown', text: 'Bracing restores 1 Body.' },
    { id: 'moonEye', name: 'Eye of the Moon', text: 'You see exactly what lies behind every door.' },
    { id: 'ryeSeed', name: 'Black rye seed', text: 'Each new depth restores 2 Body, Mind and Soul.' },
    { id: 'drownedBell', name: 'Bell of the drowned', text: 'Once, when you would die, restore that pool to 5.' },
    { id: 'ironHeart', name: 'Iron heart', text: '+4 max Body.', onGain: [['maxPool', 'body', 4]] },
    { id: 'choirChip', name: 'Choir chip', text: 'Kills restore 1 Mind.' }
];

// -----------------------------------------------------------------------------
// BACKGROUNDS — pick 1 of 3 at the start of a run.
// -----------------------------------------------------------------------------

const BACKGROUNDS = [
    { id: 'drift', name: 'Drift Salvager', faction: 'The Drift Syndicate', icon: 'swap-bag',
      blurb: 'You have stripped a hundred bases. This one owes you.',
      mods: { body: 0, mind: 0, soul: 0, o2: 0 }, credits: 12, weapon: 'pryHammer', armor: null, kit: ['patchKit', 'redStim'],
      perk: 'haggler', perkText: 'Haggler: Peddlers charge you 25% less.' },
    { id: 'scout', name: 'Base-born Scout', faction: 'Base-born', icon: 'footsteps',
      blurb: 'Born in these corridors. You know which doors breathe.',
      mods: { body: 0, mind: 1, soul: 0, o2: 2 }, credits: 4, weapon: 'wolfTooth', armor: null, kit: ['climbingLine', 'redStim'],
      perk: 'pathfinder', perkText: 'Pathfinder: Dark doors are revealed. Lifts appear a room sooner.' },
    { id: 'penitent', name: 'Eclipse Penitent', faction: 'The Cult of the Long Eclipse', icon: 'candles',
      blurb: 'You came down here to be closer to the dark. It noticed.',
      mods: { body: -2, mind: 0, soul: 3, o2: 0 }, credits: 6, weapon: 'carbine', armor: 'shroud', kit: ['soilCharm'],
      perk: 'faith', perkText: 'Faith: +1 to Soul tests. You start Blessed.' },
    { id: 'hauler', name: 'Void Hauler', faction: 'The Drift Syndicate', icon: 'lungs',
      blurb: 'Big lungs, bigger back. You carry what others leave behind.',
      mods: { body: 2, mind: -1, soul: 0, o2: 4 }, credits: 6, weapon: 'rootSaw', armor: null, kit: ['o2Canister'],
      perk: 'packMule', perkText: 'Pack mule: +3 pack slots.' },
    { id: 'hunter', name: 'Signal Hunter', faction: 'The Council', icon: 'radar-sweep',
      blurb: 'You chase the broadcasts nobody else will answer.',
      mods: { body: 0, mind: 2, soul: 0, o2: 0 }, credits: 6, weapon: 'pistol', armor: 'mirrorVisor', kit: ['tubeScanner'],
      perk: 'static', perkText: 'Static-reader: +1 to Mind tests. Strange rooms give +2 XP.' },
    { id: 'marshal', name: 'Council Marshal', faction: 'The Council', icon: 'checked-shield',
      blurb: 'Sent to restore order. The base does not recognise your badge.',
      mods: { body: 1, mind: 0, soul: -1, o2: 0 }, credits: 8, weapon: 'shockBaton', armor: 'hardsuit', kit: [],
      perk: 'drilled', perkText: 'Drilled: Bracing also deals 1 damage back.' }
];

const BASE_POOLS = { body: '7+d6', mind: '5+d6', soul: '5+d6', o2: '16+d4' };

const PLAYER_NAMES = [
    'Kargunt', 'Vesper', 'Austėja', 'Milda', 'Rook', 'Sable', 'Gintaras', 'Rūta',
    'Vytis', 'Jurga', 'Neris', 'Žydrė', 'Dovas', 'Ona', 'Kęstas', 'Ash'
];

const PLAYER_EPITHETS = [
    'the Unbreathing', 'Twice-Buried', 'of the Cold Ring', 'the Last Shift', 'Rust-Hand',
    'the Quiet', 'Who Came Back', 'the Penniless', 'Moon-Sick', 'of No Faction',
    'the Late', 'Salt-Eyed'
];

// -----------------------------------------------------------------------------
// MISSIONS — the target waits in the Depth 3 Vault, guarded by `boss`.
// twist applies while you carry the target.
// -----------------------------------------------------------------------------

const MISSIONS = [
    { id: 'prototype', briefing: 'Recover the prototype', target: 'Perkūnas capacitor in a sealed black case',
      boss: 'perkunasEngine', payout: 40, twist: 'heavy', twistText: 'Heavy: −1 to every Extraction roll.' },
    { id: 'body', briefing: 'Retrieve the body', target: 'A helmet still whispering folk prayers',
      boss: 'eclipseMother', payout: 35, twist: 'haunted', twistText: 'Haunted: each room, 2-in-6 to lose 1 Soul.' },
    { id: 'wakeAi', briefing: 'Wake the AI', target: 'A glassy datachip from the server vault',
      boss: 'choir', payout: 40, twist: 'chatty', twistText: 'Chatty: each room, 2-in-6 to lose 1 Mind.' },
    { id: 'transmitter', briefing: 'Silence the transmitter', target: 'The transmitter core, warm as a heart',
      boss: 'choir', payout: 45, twist: 'beacon', twistText: 'Beacon: every failed Extraction roll is an ambush.' },
    { id: 'rumor', briefing: 'Confirm the rumor', target: 'Proof of the thing that moves between craters',
      boss: 'eclipseMother', payout: 40, twist: 'hunted', twistText: 'Hunted: Threat doors appear twice as often.' },
    { id: 'reactor', briefing: 'Steal the reactor heart', target: 'A thumb-sized star in a lead jar',
      boss: 'perkunasEngine', payout: 50, twist: 'hot', twistText: 'Hot: each room costs +1 Oxygen to keep it cool.' }
];

// -----------------------------------------------------------------------------
// SALVAGE, SHRINES, PEDDLER
// -----------------------------------------------------------------------------

const SALVAGE_FLAVOR = [
    'A crew locker, door sprung, smelling of rye and ozone.',
    'A cargo sled tipped on its side, straps cut.',
    'A chapel donation box, still heavy.',
    'An emergency cache behind a cracked prayer-poster.',
    'A dead salvager’s satchel, buckles rusted shut.',
    'A pressure crate stencilled with a Council eagle.'
];

const SHRINE_TYPES = [
    { id: 'chapel', title: 'Chapel of Saulė', icon: 'candle-light',
      text: 'Sun-icons painted on steel. Someone kept the candles burning. Take a moment.' },
    { id: 'airlock', title: 'Circular airlock', icon: 'gas-mask',
      text: 'A working airlock. You can cycle fresh air, or just sit in the hum.' },
    { id: 'infirmary', title: 'Quiet infirmary', icon: 'first-aid-kit',
      text: 'Clean beds and a flickering diagnosis screen that still says WELCOME.' }
];

const PEDDLER_LINES = [
    'A Void Peddler unfolds from the pressure leak, prices already written in frost.',
    'A many-armed trader taps the glass of its suit: “Credits, salvager. Only credits.”',
    'A hooded figure with no breath-fog. Her wares hang from the ceiling on fishing line.'
];

// -----------------------------------------------------------------------------
// STRANGE ROOMS — 2–3 options each. A `test` names a pool (or 'luck' = d6 4+).
// `risk: [n, effects]` fires on a d6 roll of n or lower.
// -----------------------------------------------------------------------------

const EVENTS = [
    { id: 'helmet', title: 'The Whispering Helmet', icon: 'astronaut-helmet', minDepth: 1,
      text: 'A cracked helmet hums a lullaby your grandmother used to sing.',
      options: [
          { label: 'Put it on', test: 'mind', success: [['xp', 4], ['heal', 'mind', '2']], fail: [['dmg', 'mind', 'd4']],
            successText: 'The song carries a map of the base. You understand more than you should.',
            failText: 'The lullaby climbs into your skull and nests there.' },
          { label: 'Strip it for parts', effects: [['credits', 'd6+1']], text: 'Good copper in the visor rim.' },
          { label: 'Leave it singing', effects: [], text: 'You walk on. The song follows a while.' }
      ] },
    { id: 'laume', title: 'Laumė at the Loom', icon: 'spider-web', minDepth: 1,
      text: 'A pale woman weaves light from a bundle of severed fibre-optics. She looks at your hands.',
      options: [
          { label: 'Offer your blood', sub: '−2 max Body', effects: [['maxPool', 'body', -2], ['relic']],
            text: 'She draws a thread from your wrist and weaves something that hums.' },
          { label: 'Ask for a blessing', test: 'soul', success: [['status', 'blessed', true]], fail: [['status', 'cursed', true]],
            successText: 'She ties a knot of light around your finger. Blessed.',
            failText: 'She laughs, and the thread she ties is black. Cursed.' },
          { label: 'Back away slowly', effects: [], text: 'Her loom keeps clicking long after you leave.' }
      ] },
    { id: 'cryopod', title: 'The Sleeper', icon: 'cryo-chamber', minDepth: 1,
      text: 'A colonist sleeps behind frosted glass, heart still ticking on the monitor.',
      options: [
          { label: 'Pry the pod open', test: 'body', success: [['item', 'random'], ['heal', 'soul', '2'], ['xp', 2]], fail: [['dmg', 'body', 'd4']],
            successText: 'She wakes, presses her kit into your hands and runs for the airlock.',
            failText: 'The lid snaps back on your fingers. The sleeper never stirs.' },
          { label: 'Drain the pod’s air', sub: '+O2, costs Soul', effects: [['o2', 'd4+2'], ['dmg', 'soul', 'd4']],
            text: 'The monitor flatlines. You breathe easier and feel worse.' },
          { label: 'Let her dream', effects: [['heal', 'soul', '1']], text: 'You leave her to her better world.' }
      ] },
    { id: 'zaltys', title: 'Žaltys in the Vents', icon: 'snake', minDepth: 1,
      text: 'A silver grass-snake coils on a warm pipe. Grandmother said: never harm the žaltys.',
      options: [
          { label: 'Feed it', sub: 'Give a consumable', cost: { consumable: 1 }, effects: [['relic'], ['xp', 2]],
            text: 'It eats, and leaves something shining where it slept.' },
          { label: 'Kill it for the silver', effects: [['credits', 'd6+4'], ['status', 'cursed', true]],
            text: 'The scales are real silver. Somewhere a grandmother wakes up crying.' },
          { label: 'Let it be', effects: [['heal', 'soul', '1']], text: 'It watches you go. You feel watched over.' }
      ] },
    { id: 'cableWell', title: 'Cable Well', icon: 'hazard-sign', minDepth: 1,
      text: 'A shaft drops into the dark. The corridor continues on the far side, four metres away.',
      options: [
          { label: 'Jump it', test: 'body', success: [['xp', 2]], fail: [['dmg', 'body', 'd6'], ['status', 'breached', true]],
            successText: 'You land hard, but you land.',
            failText: 'You catch the far edge with your faceplate. Hiss of escaping air.' },
          { label: 'Rappel across', req: { item: 'climbingLine' }, effects: [['xp', 2]], text: 'Anchor, swing, done. Textbook.' },
          { label: 'Find a way around', sub: '−2 O2', effects: [['o2', '-2']], text: 'Twenty minutes of crawling through ducts.' }
      ] },
    { id: 'broadcast', title: 'Anomaly Broadcast', icon: 'radio-tower', minDepth: 1,
      text: 'Every screen in the room shows your own face, mouthing a string of numbers.',
      options: [
          { label: 'Decode it', test: 'mind', success: [['xp', 5], ['reveal']], fail: [['dmg', 'mind', 'd4']],
            successText: 'Coordinates. You know what waits behind the next doors.',
            failText: 'The numbers count down inside you. You lose your place.' },
          { label: 'Pray over the static', test: 'soul', success: [['heal', 'soul', 'd4'], ['xp', 2]], fail: [['dmg', 'soul', 'd4']],
            successText: 'The faces close their eyes and are at peace.',
            failText: 'Your face on the screens begins to laugh.' },
          { label: 'Cut the power', sub: '−1 O2', effects: [['o2', '-1'], ['xp', 1]], text: 'Darkness. Blessed, ordinary darkness.' }
      ] },
    { id: 'altar', title: 'Altar of Perkūnas', icon: 'lightning-helix', minDepth: 1,
      text: 'An altar of oak and steel crackles with captured lightning.',
      options: [
          { label: 'Offer credits', sub: '8 credits', cost: { credits: 8 }, effects: [['heal', 'body', 'd6'], ['heal', 'soul', 'd6']],
            text: 'Thunder rolls approvingly. Warmth floods your limbs.' },
          { label: 'Grip the lightning', test: 'body', success: [['flag', 'thunderblessed'], ['xp', 3]], fail: [['dmg', 'body', 'd6']],
            successText: 'The charge settles into your weapon. +1 damage for the rest of the run.',
            failText: 'The god does not care for your grip.' },
          { label: 'Pry off the silver', effects: [['credits', '3d6'], ['status', 'cursed', true]],
            text: 'Rich and damned. A fair trade, maybe.' }
      ] },
    { id: 'garden', title: 'Hydroponic Garden', icon: 'wheat', minDepth: 1,
      text: 'Moon-rye grows under a cracked UV lamp. The air here is thick and sweet.',
      options: [
          { label: 'Breathe deep', effects: [['o2', 'd4+1']], text: 'Real air, grown not canned.' },
          { label: 'Harvest the rye', effects: [['item', 'ryeRation']], text: 'Black rye. It tastes like home.' },
          { label: 'Linger for both', sub: '3-in-6: ambush', effects: [['o2', 'd4+1'], ['item', 'ryeRation']], risk: [3, [['fight', 'weak']]],
            text: 'You fill your tanks and your pockets.' }
      ] },
    { id: 'deadExplorer', title: 'Your Own Corpse', icon: 'tombstone', minDepth: 1,
      text: 'A salvager in a suit like yours. Your name is stencilled on the helmet.',
      options: [
          { label: 'Loot the body', sub: '2-in-6: rigged', effects: [['item', 'random']], risk: [2, [['dmg', 'body', 'd6']]],
            text: 'You take what you would have wanted you to take.' },
          { label: 'Bury yourself', effects: [['heal', 'soul', '2'], ['xp', 2]], text: 'You say the words. They fit.' }
      ] },
    { id: 'vending', title: 'Ration Dispenser', icon: 'vending-machine', minDepth: 1,
      text: 'A dispenser still glowing in the dark. A label reads: COIN ONLY. NO CREDIT. NO MERCY.',
      options: [
          { label: 'Pay', sub: '4 credits', cost: { credits: 4 }, effects: [['item', 'consumable']], text: 'Clunk. Something drops.' },
          { label: 'Kick it', test: 'body', success: [['item', 'consumable'], ['credits', 'd4']], fail: [['dmg', 'body', 'd4']],
            successText: 'It coughs up goods and change.',
            failText: 'It falls on you. NO MERCY indeed.' },
          { label: 'Walk away', effects: [], text: 'It hums a jingle as you leave.' }
      ] },
    { id: 'mirror', title: 'The Mirror Corridor', icon: 'two-shadows', minDepth: 2,
      text: 'Your reflection steps out of the polished wall and draws your weapon.',
      options: [
          { label: 'Fight yourself', effects: [['fight', 'reflection']], text: 'It knows all your moves.' },
          { label: 'Shut your eyes and walk', test: 'soul', success: [['xp', 4]], fail: [['dmg', 'mind', 'd4'], ['dmg', 'soul', '1']],
            successText: 'When you open them, the corridor is just a corridor.',
            failText: 'It whispers your secrets as you pass.' }
      ] },
    { id: 'ragana', title: "Ragana's Terminal", icon: 'cpu', minDepth: 1,
      text: 'A terminal with a crooked green cursor. POWER FOR A PRICE? Y/N',
      options: [
          { label: 'Y', effects: [['relic'], ['status', 'cursed', true]], text: 'The witch-code laughs. Something powerful downloads into your suit.' },
          { label: 'Hack the witch', test: 'mind', success: [['credits', 'd6+4'], ['xp', 3]], fail: [['dmg', 'mind', 'd4'], ['status', 'cursed', true]],
            successText: 'You drain her account before she notices.',
            failText: 'She notices.' },
          { label: 'N', effects: [], text: 'The cursor blinks, patient. It will wait.' }
      ] },
    { id: 'gravity', title: 'Gravity Failure', icon: 'astronaut-helmet', minDepth: 2,
      text: 'The floor lets go of you. Everything you carry begins to drift.',
      options: [
          { label: 'Grab your gear', test: 'body', success: [['xp', 2]], fail: [['loseItem']],
            successText: 'You snatch everything back before gravity returns.',
            failText: 'Something spins away into a vent, gone.' },
          { label: 'Kick off the walls', sub: '−1 O2', effects: [['o2', '-1']], text: 'You swim through the air like a seal.' }
      ] },
    { id: 'blastDoor', title: 'Sealed Blast Door', icon: 'padlock', minDepth: 1,
      text: 'A blast door, still locked. Something valuable hums on the other side.',
      options: [
          { label: 'Force it', test: 'body', success: [['item', 'random'], ['credits', 'd6']], fail: [['dmg', 'body', 'd4']],
            successText: 'It gives with a shriek. A stocked cache.',
            failText: 'Your back gives before the door does.' },
          { label: 'Hack it', test: 'mind', success: [['item', 'random'], ['credits', 'd6']], fail: [['fight', 'weak']],
            successText: 'Green light. Stocked cache.',
            failText: 'ALARM. Something comes to check.' },
          { label: 'Leave it', effects: [], text: 'Not everything is yours.' }
      ] },
    { id: 'sutartine', title: 'Song in the Dark', icon: 'sound-waves', minDepth: 1,
      text: 'Someone is singing a sutartinė in the dark: three voices, one throat.',
      options: [
          { label: 'Sing along', test: 'soul', success: [['heal', 'soul', 'd4+1'], ['xp', 3]], fail: [['dmg', 'soul', 'd4']],
            successText: 'Your voice fits the round. For a moment you are not alone.',
            failText: 'Your voice is the wrong one. The song turns on you.' },
          { label: 'Hurry past', sub: '−1 O2', effects: [['o2', '-1']], text: 'You run until the song is behind you.' }
      ] },
    { id: 'drone', title: 'Wounded Drone', icon: 'robot-antennas', minDepth: 1,
      text: 'A little Aitvaras drone limps toward you, sparking, holding out a tool.',
      options: [
          { label: 'Repair it', test: 'mind', success: [['item', 'droneChip']], fail: [['dmg', 'body', 'd4']],
            successText: 'It chirps and docks on your shoulder. It will fight for you.',
            failText: 'It shorts out in your hands. Ow.' },
          { label: 'Scrap it', effects: [['credits', 'd4+1']], text: 'Sorry, little one.' }
      ] },
    { id: 'nest', title: 'Aitvaras Nest', icon: 'fire-bowl', minDepth: 2,
      text: 'A fiery bird-thing nests in a coil of copper. Its eggs look a lot like coins.',
      options: [
          { label: 'Steal the eggs', sub: '3-in-6: burned', effects: [['credits', '2d6']], risk: [3, [['dmg', 'body', 'd6']]],
            text: 'Hot coins, literally.' },
          { label: 'Feed it a credit chip', sub: '5 credits', cost: { credits: 5 }, effects: [['xp', 3], ['credits', '2d6+4']],
            text: 'Aitvaras repay their keepers. It coughs up a hoard.' },
          { label: 'Leave it be', effects: [], text: 'It ruffles its burning feathers at you.' }
      ] },
    { id: 'checkpoint', title: 'Council Checkpoint', icon: 'radar-sweep', minDepth: 1,
      text: 'A turret swivels toward you. CLEARANCE REQUIRED.',
      options: [
          { label: 'Bluff', test: 'mind', success: [['item', 'o2Canister'], ['xp', 3]], fail: [['dmg', 'body', 'd6']],
            successText: 'CLEARANCE ACCEPTED. HAVE A PLEASANT SHIFT. It even issues supplies.',
            failText: 'It does not believe you.' },
          { label: 'Pay the toll', sub: '6 credits', cost: { credits: 6 }, effects: [['item', 'o2Canister']], text: 'Toll paid. Complimentary oxygen issued.' },
          { label: 'Detour', sub: '−2 O2', effects: [['o2', '-2']], text: 'The long way round.' }
      ] },
    { id: 'velnias', title: 'Velnias Deals Cards', icon: 'card-joker', minDepth: 1,
      text: 'A horned man in a pressure suit shuffles a deck. “Double or nothing, little salvager?”',
      options: [
          { label: 'Wager 10 credits', sub: 'Luck 4+', cost: { credits: 10 }, test: 'luck', success: [['credits', '20']], fail: [],
            successText: 'He pays up, grinning like he meant to lose.',
            failText: 'He pockets your credits without counting.' },
          { label: 'Wager your soul', sub: 'Soul test', test: 'soul', success: [['relic']], fail: [['maxPool', 'soul', -3]],
            successText: 'He curses, and slides a trinket across the table.',
            failText: 'He takes a little of you with him. −3 max Soul.' },
          { label: 'Decline', effects: [], text: '“Another time,” he says. He means it.' }
      ] },
    { id: 'medbay', title: 'Collapsed Med-bay', icon: 'medical-pack', minDepth: 1,
      text: 'Shattered cabinets. Some auto-injectors survived the collapse.',
      options: [
          { label: 'Search carefully', test: 'mind', success: [['item', 'medical'], ['item', 'medical']], fail: [['item', 'medical'], ['dmg', 'body', '1']],
            successText: 'Two intact injectors.',
            failText: 'One injector, and a glass splinter in your glove.' },
          { label: 'Grab what you see', effects: [['item', 'redStim']], text: 'A Red stim, right on top.' }
      ] }
];

// -----------------------------------------------------------------------------
// EXTRACTION COMPLICATIONS — on a failed climb roll (d6).
// -----------------------------------------------------------------------------

const EXTRACTION_COMPLICATIONS = [
    { roll: 1, label: 'Air leak', text: 'Lose d4 Oxygen.', effects: [['o2', '-d4']] },
    { roll: 2, label: 'Blocked route', text: 'A threat blocks the shaft. Fight it.', effects: [['fight', 'weak']] },
    { roll: 3, label: 'Hard crossing', text: 'Body test, or take d4 Body.', test: 'body', fail: [['dmg', 'body', 'd4']] },
    { roll: 4, label: 'Bad signal', text: 'Mind test, or lose 2 Oxygen correcting course.', test: 'mind', fail: [['o2', '-2']] },
    { roll: 5, label: 'Voices in the suit', text: 'Soul test, or take d4 Soul.', test: 'soul', fail: [['dmg', 'soul', 'd4']] },
    { roll: 6, label: 'Dropped salvage', text: 'Lose a random item from your pack.', effects: [['loseItem']] }
];

// -----------------------------------------------------------------------------
// ADVANCEMENTS — draft 1 of 3 whenever the XP bar fills.
// -----------------------------------------------------------------------------

const ADVANCEMENTS = [
    { id: 'ironBody', name: 'Iron Body', path: 'Vanguard', text: '+3 max Body and fully restore Body.' },
    { id: 'bulwark', name: 'Bulwark', path: 'Vanguard', text: '+2 max Body. Bracing blocks a Charge completely.' },
    { id: 'counter', name: 'Counterstrike', path: 'Vanguard', text: 'After you Brace, your next hit deals +3.' },
    { id: 'huntersHand', name: "Hunter's Hand", path: 'Duelist', text: '+1 to hit everything.' },
    { id: 'breaker', name: 'Breaker', path: 'Duelist', text: 'Push deals +2 more damage and a missed Push costs nothing extra.' },
    { id: 'adrenaline', name: 'Adrenal Surge', path: 'Duelist', text: 'First round of every fight: +1 to hit and +2 damage.' },
    { id: 'deadeye', name: 'Deadeye', path: 'Duelist', text: 'You crit on a 5 or 6.' },
    { id: 'butcher', name: 'Butcher', path: 'Duelist', text: 'Kills restore 2 Body.' },
    { id: 'coldMind', name: 'Cold Mind', path: 'Operator', text: '+3 max Mind and +1 to Mind tests.' },
    { id: 'oldSoul', name: 'Old Soul', path: 'Operator', text: '+3 max Soul and +1 to Soul tests.' },
    { id: 'longBreath', name: 'Long Breath', path: 'Operator', text: '+4 max Oxygen and restore 4 Oxygen.' },
    { id: 'exitSaint', name: 'Exit Saint', path: 'Operator', text: '+1 to Extraction rolls; each climb costs 1 less Oxygen.' },
    { id: 'lastBreath', name: 'Last Breath', path: 'Warden', text: 'Once per run, a killing blow leaves you at 1 instead.' },
    { id: 'scavenger', name: 'Scavenger', path: 'Warden', text: 'Enemies drop loot twice as often; Salvage finds +3 credits.' },
    { id: 'ghostwalker', name: 'Ghostwalker', path: 'Warden', text: 'Fleeing costs no Oxygen and you take half damage.' }
];

// -----------------------------------------------------------------------------
// RECORDS — persistent achievements.
// -----------------------------------------------------------------------------

const RECORDS = [
    { id: 'firstBlood', text: 'Kill your first threat', stat: 'kills', target: 1 },
    { id: 'depth2', text: 'Reach the Works (Depth 2)', stat: 'maxDepth', target: 2 },
    { id: 'depth3', text: 'Reach the Deep Core (Depth 3)', stat: 'maxDepth', target: 3 },
    { id: 'boss', text: 'Defeat a Vault guardian', stat: 'bossKills', target: 1 },
    { id: 'extract', text: 'Extract with the target', stat: 'wins', target: 1 },
    { id: 'greedy', text: 'Extract carrying 100+ credits', stat: 'bestCredits', target: 100 },
    { id: 'elite', text: 'Kill 5 Marked threats', stat: 'eliteKills', target: 5 },
    { id: 'relics', text: 'Hold 3 relics in one run', stat: 'bestRelics', target: 3 },
    { id: 'graveyard', text: 'Fill the graveyard with 10 names', stat: 'deaths', target: 10 },
    { id: 'allBackgrounds', text: 'Extract with 3 different backgrounds', stat: 'winBackgrounds', target: 3 }
];

if (typeof module !== 'undefined') {
    module.exports = {
        ENEMY_SPRITE_DIR, GAME_RULES, POOLS, POOL_LABELS, POOL_SHORT, TEST_TARGETS, DEPTHS, DOOR_TYPES,
        ENEMIES, ELITE_AFFIXES, ENEMY_XP, ENEMY_CREDITS, ENEMY_LOOT_CHANCE, INTENTS, ITEMS, RELICS,
        BACKGROUNDS, BASE_POOLS, PLAYER_NAMES, PLAYER_EPITHETS, MISSIONS, SALVAGE_FLAVOR, SHRINE_TYPES,
        PEDDLER_LINES, EVENTS, EXTRACTION_COMPLICATIONS, ADVANCEMENTS, RECORDS
    };
}
