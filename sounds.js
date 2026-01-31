// --- SOUND EFFECTS ---

const soundCache = {};

// A utility function to play a sound based on sfxr parameters
function playSound(preset) {
    // Check if sfxr is loaded
    if (typeof sfxr !== 'undefined') {
        if (!soundCache[preset]) {
            const params = sfxr.generate(preset);
            soundCache[preset] = sfxr.toAudio(params);
        }
        const player = soundCache[preset];
        // If it's a standard HTML5 Audio element (fallback), clone it to allow polyphony
        if (player.cloneNode) {
            player.cloneNode(true).play();
        } else {
            // Otherwise it's likely the WebAudio wrapper which handles polyphony internally
            player.play();
        }
    } else {
        console.warn("jsfxr library not found. Sound disabled.");
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
function playBuySound() { /* sound removed */ }
function playSellSound() { /* sound removed */ }
