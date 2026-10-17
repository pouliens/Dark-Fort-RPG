// =============================================================================
// DARK FORT: MOON DEVILS — SOUND
// Small WebAudio synth: no samples, no network. Plus a low ambient drone.
// =============================================================================

const Sfx = (() => {
    let ctx = null;
    let master = null;
    let enabled = true;
    let ambienceOn = true;
    let drone = null;

    function ensure() {
        if (ctx) return ctx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
        return ctx;
    }

    // Browsers only allow audio after a user gesture.
    function unlock() {
        const c = ensure();
        if (c && c.state === 'suspended') c.resume();
        if (ambienceOn && enabled) startDrone();
    }

    function tone({ freq = 440, to = null, type = 'square', dur = 0.12, vol = 0.2, delay = 0, attack = 0.005 }) {
        if (!enabled || !ensure()) return;
        const t0 = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain).connect(master);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
    }

    function noise({ dur = 0.15, vol = 0.25, delay = 0, filter = 1200, q = 1, sweepTo = null }) {
        if (!enabled || !ensure()) return;
        const t0 = ctx.currentTime + delay;
        const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(filter, t0);
        if (sweepTo) bp.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
        bp.Q.value = q;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(bp).connect(gain).connect(master);
        src.start(t0);
    }

    const sounds = {
        tap: () => tone({ freq: 520, to: 380, type: 'triangle', dur: 0.05, vol: 0.08 }),
        door: () => { noise({ dur: 0.35, vol: 0.3, filter: 300, sweepTo: 90 }); tone({ freq: 70, to: 45, type: 'sine', dur: 0.3, vol: 0.3 }); },
        dice: () => { for (let i = 0; i < 4; i++) noise({ dur: 0.04, vol: 0.18, filter: 2500 + i * 400, q: 4, delay: i * 0.055 }); },
        success: () => { tone({ freq: 660, type: 'square', dur: 0.08, vol: 0.09 }); tone({ freq: 990, type: 'square', dur: 0.12, vol: 0.09, delay: 0.07 }); },
        fail: () => { tone({ freq: 220, to: 140, type: 'sawtooth', dur: 0.25, vol: 0.12 }); },
        hit: () => { noise({ dur: 0.12, vol: 0.4, filter: 900, sweepTo: 200 }); tone({ freq: 180, to: 60, type: 'square', dur: 0.12, vol: 0.15 }); },
        crit: () => { noise({ dur: 0.18, vol: 0.45, filter: 1400, sweepTo: 150 }); tone({ freq: 880, to: 1320, type: 'square', dur: 0.12, vol: 0.12, delay: 0.05 }); },
        miss: () => noise({ dur: 0.2, vol: 0.15, filter: 3000, sweepTo: 800, q: 2 }),
        hurt: () => { tone({ freq: 140, to: 50, type: 'sawtooth', dur: 0.3, vol: 0.22 }); noise({ dur: 0.2, vol: 0.25, filter: 500 }); },
        block: () => { tone({ freq: 1200, to: 900, type: 'triangle', dur: 0.08, vol: 0.12 }); noise({ dur: 0.06, vol: 0.2, filter: 4000, q: 6 }); },
        kill: () => { tone({ freq: 300, to: 40, type: 'sawtooth', dur: 0.6, vol: 0.2 }); noise({ dur: 0.5, vol: 0.3, filter: 600, sweepTo: 80 }); },
        coin: () => { tone({ freq: 1320, type: 'square', dur: 0.05, vol: 0.07 }); tone({ freq: 1760, type: 'square', dur: 0.09, vol: 0.07, delay: 0.05 }); },
        item: () => { [523, 659, 784].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.1, vol: 0.1, delay: i * 0.05 })); },
        heal: () => tone({ freq: 300, to: 600, type: 'sine', dur: 0.3, vol: 0.15 }),
        relic: () => { [392, 523, 659, 1046].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.25, vol: 0.1, delay: i * 0.08 })); },
        levelup: () => { [262, 330, 392, 523, 659].forEach((f, i) => tone({ freq: f, type: 'square', dur: 0.14, vol: 0.08, delay: i * 0.07 })); },
        descend: () => { tone({ freq: 220, to: 55, type: 'sine', dur: 1.2, vol: 0.25 }); noise({ dur: 1, vol: 0.12, filter: 200, sweepTo: 60 }); },
        death: () => { tone({ freq: 110, to: 30, type: 'sawtooth', dur: 1.6, vol: 0.25 }); tone({ freq: 116, to: 31, type: 'sawtooth', dur: 1.6, vol: 0.2 }); },
        win: () => { [392, 523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'square', dur: 0.2, vol: 0.09, delay: i * 0.1 })); }
    };

    function startDrone() {
        if (drone || !ensure() || !enabled || !ambienceOn) return;
        const out = ctx.createGain();
        out.gain.value = 0.0001;
        out.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 3);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 260;
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.07;
        lfoGain.gain.value = 120;
        lfo.connect(lfoGain).connect(lp.frequency);
        const oscs = [55, 55.4, 82.4].map((f, i) => {
            const o = ctx.createOscillator();
            o.type = i === 2 ? 'triangle' : 'sawtooth';
            o.frequency.value = f;
            o.connect(lp);
            o.start();
            return o;
        });
        lp.connect(out).connect(master);
        lfo.start();
        drone = { out, oscs, lfo };
    }

    function stopDrone() {
        if (!drone) return;
        const d = drone;
        drone = null;
        d.out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        setTimeout(() => { d.oscs.forEach(o => o.stop()); d.lfo.stop(); }, 600);
    }

    // Deeper depths pitch the drone down.
    function setDepth(depth) {
        if (!drone) return;
        const base = [55, 49, 41.2][Math.max(0, Math.min(2, depth - 1))];
        drone.oscs[0].frequency.setTargetAtTime(base, ctx.currentTime, 2);
        drone.oscs[1].frequency.setTargetAtTime(base * 1.007, ctx.currentTime, 2);
        drone.oscs[2].frequency.setTargetAtTime(base * 1.498, ctx.currentTime, 2);
    }

    return {
        unlock,
        play(name) {
            try { sounds[name]?.(); } catch (e) { /* audio is optional */ }
        },
        setEnabled(on) {
            enabled = on;
            if (!on) stopDrone();
            else if (ambienceOn && ctx) startDrone();
        },
        setAmbience(on) {
            ambienceOn = on;
            if (!on) stopDrone();
            else if (enabled && ctx) startDrone();
        },
        setDepth
    };
})();
