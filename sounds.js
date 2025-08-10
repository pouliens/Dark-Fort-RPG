// --- SOUND EFFECTS ---

// A utility function to play a sound based on jsfxr parameters
function playSound(params) {
    // Check if jsfxr is loaded
    if (typeof jsfxr !== 'undefined') {
        const sound = jsfxr(params);
        const audio = new Audio();
        audio.src = sound;
        audio.play();
    } else {
        console.warn("jsfxr library not found. Sound disabled.");
    }
}

// Sound presets for different game actions
const sounds = {
    start: [0,0,0.5,0.1,0.47,0.51,0.2,-0.4,0,0,0,0,0,0.1,0,0.4,0,0,1,0,0,0,0,0.5],
    explore: [0,,0.078,0.37,0.29,0.0801,,,,,,0.4284,,0.3229,,,1,,,,,0.5],
    attack: [0,,0.13,0.38,0.22,0.47,,,,,,0.25,-0.26,,,,1,,,,,0.5],
    miss: [3,,0.14,0.58,0.21,0.13,,0.11,,,,,,0.54,-0.57,,,,1,,,,,0.5],
    monsterHit: [0,,0.16,0.29,0.22,0.62,,,,,,0.54,0.13,,,,1,,,,,0.5],
    playerHit: [3,,0.24,0.43,0.4,0.03,,0.21,,,,,,,,1,,,,,0.5],
    winCombat: [0,,0.25,0.6,0.2,0.5,,0.15,,,,0.14,0.67,,,,1.2,,,,,0.5],
    flee: [3,,0.1,0.5,0.2,0.1,,-0.2,,,,,,,,,,1,,,,,0.5],
    potion: [2,,0.1,0.2,0.3,0.7,,-0.2,,,,,,,,,,1,,,,,0.5],
    shop: [1,,0.1,0.3,0.1,0.5,,-0.2,,,,,,,,,,1,,,,,0.5],
    buy: [0, , 0.2, , 0.2, 0.5, , -0.4, , , , , , 0.2, , 0.2, , , 1, , , , , 0.5],
    levelUp: [0,0.01,0.4,0.31,0.39,0.73,0.2,-0.21,0,0,0,0,0,0.1,0,0.6,0,0,1,0,0,0,0,0.5],
    winGame: [0,0,0.5,0.4,0.3,0.8,0.2,-0.2,0,0,0,0,0,0.2,0,0.7,0,0,1,0,0,0,0,0.5],
    gameOver: [3,0,0.5,0.5,0.5,0.1,0.2,-0.8,0,0,0,0,0,0.5,0,0.2,0,0,1,0,0,0,0,0.5]
};

// Functions to play specific sounds
function playStartGameSound() { playSound(sounds.start); }
function playExploreSound() { playSound(sounds.explore); }
function playAttackSound() { playSound(sounds.attack); }
function playMissSound() { playSound(sounds.miss); }
function playMonsterHitSound() { playSound(sounds.monsterHit); }
function playPlayerHitSound() { playSound(sounds.playerHit); }
function playWinCombatSound() { playSound(sounds.winCombat); }
function playFleeSound() { playSound(sounds.flee); }
function playPotionSound() { playSound(sounds.potion); }
function playShopSound() { playSound(sounds.shop); }
function playBuySound() { playSound(sounds.buy); }
function playLevelUpSound() { playSound(sounds.levelUp); }
function playWinGameSound() { playSound(sounds.winGame); }
function playGameOverSound() { playSound(sounds.gameOver); }
