// --- SOUND EFFECTS ---

// A utility function to play a sound based on sfxr parameters
function playSound(preset) {
    // Check if sfxr is loaded
    if (typeof sfxr !== 'undefined') {
        const sound = sfxr.generate(preset);
        sfxr.play(sound);
    } else {
        console.warn("sfxr library not found. Sound disabled.");
    }
}

// Simplified sound presets for dark/spooky theme - essential sounds only
const sounds = {
    // Combat sounds - core gameplay
    attack: "hitHurt",        // Dark, impactful attack sound
    playerHit: "explosion",   // Heavy, threatening damage sound
    
    // Minimal UI sounds
    buy: "blipSelect",        // Subtle transaction sound
    sell: "click"             // Simple sell confirmation
};

// Functions to play specific sounds - only essential ones remain
function playAttackSound() { playSound(sounds.attack); }
function playPlayerHitSound() { playSound(sounds.playerHit); }
function playBuySound() { playSound(sounds.buy); }
function playSellSound() { playSound(sounds.sell); }
