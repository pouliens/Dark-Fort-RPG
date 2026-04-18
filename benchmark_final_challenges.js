const { performance } = require('perf_hooks');

const gameState = {
    challenges: {
        'collectGold': { description: 'Surinkti 100 sidabro', progress: 10, targetValue: 100 },
        'slayGoblins': { description: 'Nužudyti 3 goblinus', progress: 1, targetValue: 3 },
        'slayBoss': { description: 'Nužudyti Tvirtovės Valdovą', progress: 0, targetValue: 1 }
    }
};

const gameStateEmpty = {
    challenges: {}
};

function benchmarkCurrent(state, iterations) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        if (state.challenges && Object.keys(state.challenges).length > 0) {
            const result = Object.values(state.challenges).map(challenge => {
                const progress = Math.min(challenge.progress, challenge.targetValue);
                const isComplete = progress >= challenge.targetValue;
                const progressText = isComplete ? 'Įvykdyta!' : `${progress} / ${challenge.targetValue}`;
                return `
                    <div class="challenge ${isComplete ? 'complete' : ''}">
                        <span class="challenge-desc">${challenge.description}</span>
                        <span class="challenge-progress">${progressText}</span>
                    </div>
                `;
            }).join('');
        } else {
            const result = 'Nėra iššūkių.';
        }
    }
    return performance.now() - start;
}

function benchmarkNew(state, iterations) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        let hasChallenges = false;
        if (state.challenges) {
            for (const _ in state.challenges) {
                hasChallenges = true;
                break;
            }
        }

        if (hasChallenges) {
            let html = '';
            for (const key in state.challenges) {
                const challenge = state.challenges[key];
                const progress = Math.min(challenge.progress, challenge.targetValue);
                const isComplete = progress >= challenge.targetValue;
                const progressText = isComplete ? 'Įvykdyta!' : `${progress} / ${challenge.targetValue}`;
                html += `
                    <div class="challenge ${isComplete ? 'complete' : ''}">
                        <span class="challenge-desc">${challenge.description}</span>
                        <span class="challenge-progress">${progressText}</span>
                    </div>
                `;
            }
            const result = html;
        } else {
            const result = 'Nėra iššūkių.';
        }
    }
    return performance.now() - start;
}

const ITERATIONS = 1000000;
console.log(`Running with full object:`);
let t1 = benchmarkCurrent(gameState, ITERATIONS);
let t2 = benchmarkNew(gameState, ITERATIONS);
console.log(`Current: ${t1.toFixed(2)}ms`);
console.log(`New (for-in all): ${t2.toFixed(2)}ms`);
console.log(`Improvement: ${((t1 - t2) / t1 * 100).toFixed(2)}%`);

console.log(`\nRunning with empty object:`);
t1 = benchmarkCurrent(gameStateEmpty, ITERATIONS);
t2 = benchmarkNew(gameStateEmpty, ITERATIONS);
console.log(`Current: ${t1.toFixed(2)}ms`);
console.log(`New (for-in all): ${t2.toFixed(2)}ms`);
console.log(`Improvement: ${((t1 - t2) / t1 * 100).toFixed(2)}%`);
