const gameBoard = document.getElementById('game-board');
const keyboard = document.getElementById('keyboard');
// const alphabetGrid = document.getElementById('alphabet-grid'); // Removed
const messageElement = document.getElementById('message');
const modal = document.getElementById('game-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const replayBtn = document.getElementById('replay-btn');
const statsContainer = document.getElementById('stats-container');
const currentStreakSpan = document.getElementById('current-streak');
const maxStreakSpan = document.getElementById('max-streak');

let currentGuess = []; // Array of characters/nulls
let currentRow = 0;
const maxGuesses = 6;
let wordLength = 5;
let isGameOver = false;
let knownHints = []; // Array of confirmed letters placed correctly
let currentWord = ""; // Store current word for definition

// Stats & XP
let stats = {
    // Legacy mapping or new structure
    streak: 0,
    maxStreak: 0,
    // New fields
    totalXP: 0,
    level: 1,
    gamesPlayed: 0,
    gamesWon: 0,
    guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    dailyWins: {}, // New field: "YYYY-MM-DD": count
    titles: ["Novice des Lettres"],
    currentTitleIndex: 0
};

// ... XP functions ...

function getFormattedDate() {
    const d = new Date();
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
}

// XP curve: Level L requires 500 * L XP (cumulative? or per level?)
// Spec: L1=500, L2=1000, L10=5000. Looks linear per level or cumulative?
// "Niveau 1 = 500 XP" -> To reach Level 2?
// Let's assume simpler: Threshold for Level N = 500 * N * (exponent? "Exponentielle douce")
// Let's use: XP req for Next Level = 500 * (1.1 ^ (Level - 1))
function getXPForNextLevel(level) {
    return Math.floor(500 * Math.pow(1.1, level - 1));
}

function getTitleForLevel(level) {
    if (level >= 50) return "Dieu du Tusmo";
    if (level >= 30) return "Lexicologue Fou";
    if (level >= 20) return "Maître du Dico";
    if (level >= 10) return "Expert des Mots";
    if (level >= 5) return "Apprenti Scribe";
    return "Novice des Lettres";
}

function loadStats() {
    const saved = localStorage.getItem('tusmo_stats_v2');
    if (saved) {
        stats = JSON.parse(saved);
        // Migration if needed
        if (!stats.guessDistribution) stats.guessDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        if (!stats.dailyWins) stats.dailyWins = {};
    } else {
        // Try legacy
        const legacy = localStorage.getItem('tusmo_stats');
        if (legacy) {
            const old = JSON.parse(legacy);
            stats.streak = old.streak || 0;
            stats.maxStreak = old.maxStreak || 0;
        }
    }
    updateHeaderUI();
}

function saveStats() {
    localStorage.setItem('tusmo_stats_v2', JSON.stringify(stats));
}

function updateStats(won, guessesCount) {
    stats.gamesPlayed++;

    let xpGain = 0;

    if (won) {
        stats.gamesWon++;
        stats.streak++;
        if (stats.streak > stats.maxStreak) stats.maxStreak = stats.streak;

        // Distribution
        if (stats.guessDistribution[guessesCount]) {
            stats.guessDistribution[guessesCount]++;
        } else {
            stats.guessDistribution[guessesCount] = 1;
        }

        // XP Calc
        // Base: 100
        xpGain += 100;
        // Speed: 10 * queries remaining (maxGuesses - guessesCount) ? 
        // Spec: "3 essais sur 6 = 3 essais restants" => (6 - 3) = 3 ?
        // Usually "Found in 3 tries" means you used 3. Remaining = 6 - 3 = 3?
        // Let's say: (maxGuesses - guessesCount) * 10.
        // If found in 1: (6-1)*10 = 50 XP bonus? Or (6+1 - 1)?
        // If found in 6: (6-6)*10 = 0 XP bonus.
        const speedBonus = (maxGuesses - guessesCount) * 10;
        xpGain += Math.max(0, speedBonus);

        // Streak Bonus: 5 * Streak
        xpGain += 5 * stats.streak;

        // Daily Wins
        const today = getFormattedDate();
        if (!stats.dailyWins[today]) stats.dailyWins[today] = 0;
        stats.dailyWins[today]++;

    } else {
        stats.streak = 0;
        // Malus/Consolation
        xpGain += 10;
    }

    // Add XP
    let oldLevel = stats.level;
    stats.totalXP += xpGain;



    if (stats.currentXP === undefined) stats.currentXP = 0; // Migration

    stats.currentXP += xpGain;
    let leveledUp = false;

    let nextLevelReq = getXPForNextLevel(stats.level);
    while (stats.currentXP >= nextLevelReq) {
        stats.currentXP -= nextLevelReq;
        stats.level++;
        leveledUp = true;
        nextLevelReq = getXPForNextLevel(stats.level);
    }

    saveStats();
    updateHeaderUI();

    return { xpGain, leveledUp };
}

function updateHeaderUI() {
    const title = getTitleForLevel(stats.level);
    document.getElementById('player-title').textContent = title;
    document.getElementById('player-level').textContent = `Niveau ${stats.level}`;

    const req = getXPForNextLevel(stats.level);
    const pct = Math.min(100, (stats.currentXP / req) * 100);

    document.getElementById('xp-bar').style.width = `${pct}%`;
    document.getElementById('xp-text').textContent = `${Math.floor(stats.currentXP)} / ${req} XP`;
}

function updateDashboard() {
    document.getElementById('stat-played').textContent = stats.gamesPlayed;
    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
    document.getElementById('stat-winrate').textContent = `${winRate}%`;
    document.getElementById('stat-streak').textContent = stats.streak;
    document.getElementById('stat-maxstreak').textContent = stats.maxStreak;

    // Distribution
    const distContainer = document.getElementById('guess-distribution');
    distContainer.innerHTML = '';

    // Find max frequency for scaling
    let maxFreq = 0;
    for (let i = 1; i <= maxGuesses; i++) {
        if (stats.guessDistribution[i] > maxFreq) maxFreq = stats.guessDistribution[i];
    }

    for (let i = 1; i <= maxGuesses; i++) {
        const count = stats.guessDistribution[i] || 0;
        const nounours = maxFreq > 0 ? (count / maxFreq) * 100 : 0; // Percentage of MAX

        const row = document.createElement('div');
        row.classList.add('dist-row');

        row.innerHTML = `
            <span class="dist-label">${i}</span>
            <div class="dist-bar-container">
                <div class="dist-bar" style="width: ${Math.max(nounours, 5)}%">${count}</div>
            </div>
        `;
        distContainer.appendChild(row);
    }

    // Activity Graph
    const activityContainer = document.getElementById('activity-graph');
    activityContainer.innerHTML = '';

    const last7Days = getLast7Days();
    // Find max for scaling
    let maxDaily = 0;
    last7Days.forEach(day => {
        if (stats.dailyWins[day] > maxDaily) maxDaily = stats.dailyWins[day];
    });

    last7Days.forEach(day => {
        const count = stats.dailyWins[day] || 0;
        // If maxDaily is 0, we avoid division by zero
        // Min height for visibility? No, if 0 it's 0.
        // But let's add min-height in CSS for nice look if 0? CSS has min-height 2px.
        const heightPct = maxDaily > 0 ? (count / maxDaily) * 100 : 0;

        // Format date to show Day/Month or just Day Name (e.g. "Lun", "13/02")
        // Simple: DD/MM
        const dateObj = new Date(day);
        const dayLabel = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;

        const col = document.createElement('div');
        col.classList.add('activity-day');
        col.innerHTML = `
            <span class="activity-count">${count > 0 ? count : ''}</span>
            <div class="activity-bar" style="height: ${Math.max(heightPct, 5)}%; opacity: ${count > 0 ? 1 : 0.3}"></div>
            <span class="activity-date">${dayLabel}</span>
        `;
        activityContainer.appendChild(col);
    });
}

function showModal(title, msg) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = msg;

    updateDashboard();

    document.getElementById('game-modal').classList.remove('hidden');
}

const azertyKeys = [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['Enter', 'W', 'X', 'C', 'V', 'B', 'N', 'Backspace']
];


function initKeyboard() {
    keyboard.innerHTML = '';
    azertyKeys.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.style.display = 'flex';
        rowDiv.style.width = '100%';
        rowDiv.style.justifyContent = 'center';
        rowDiv.style.gap = '5px';

        row.forEach(key => {
            const button = document.createElement('button');
            button.textContent = key === 'Backspace' ? '⌫' : key;
            button.classList.add('key');
            button.dataset.key = key;
            button.addEventListener('click', () => handleInput(key));
            rowDiv.appendChild(button);
        });
        keyboard.appendChild(rowDiv);
    });
}

function initGrid() {
    gameBoard.innerHTML = '';

    // Responsive adjustment
    if (wordLength > 7) {
        gameBoard.classList.add('long-word');
    } else {
        gameBoard.classList.remove('long-word');
    }

    gameBoard.style.gridTemplateColumns = `repeat(${wordLength}, 1fr)`;

    for (let i = 0; i < maxGuesses * wordLength; i++) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.id = `tile-${i}`;
        gameBoard.appendChild(tile);
    }
}

let currentInputIndex = 1; // Start at 2nd letter

function initTurn() {
    // Fill currentGuess with known hints
    currentGuess = [...knownHints];
    currentInputIndex = 1; // Always reset cursor to 2nd position
}

function handleInput(key) {
    if (isGameOver) return;

    if (key === 'Enter') {
        submitGuess();
    } else if (key === 'Backspace') {
        if (currentInputIndex > 1) { // Never delete first letter (index 0)
            currentInputIndex--;
            // Restore hint if exists, otherwise null
            currentGuess[currentInputIndex] = knownHints[currentInputIndex] || null;
            updateGrid();
        }
    } else if (/^[a-zA-Z]$/.test(key)) {
        if (currentInputIndex < wordLength) {
            currentGuess[currentInputIndex] = key.toUpperCase();
            currentInputIndex++;
            updateGrid();
        }
    }
}

document.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    let key = e.key;
    if (key === 'Enter' || key === 'Backspace') {
        handleInput(key);
    } else if (/^[a-zA-Z]$/.test(key)) {
        handleInput(key.toUpperCase());
    }
});

function updateGrid() {
    const startTileIndex = currentRow * wordLength;
    for (let i = 0; i < wordLength; i++) {
        const tile = document.getElementById(`tile-${startTileIndex + i}`);
        const letter = currentGuess[i];

        tile.textContent = letter || '';

        if (letter) {
            tile.dataset.status = "filled";
            tile.style.borderColor = "#565758";
        } else {
            delete tile.dataset.status;
            tile.style.borderColor = "rgba(255, 255, 255, 0.2)";
        }
    }
}

function spawnParticles(element) {
    const rect = element.getBoundingClientRect();
    const count = 8;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        document.body.appendChild(p);

        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        p.style.left = `${x}px`;
        p.style.top = `${y}px`;

        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 60 + 20;
        const mx = Math.cos(angle) * velocity + 'px';
        const my = Math.sin(angle) * velocity + 'px';

        p.style.setProperty('--mx', mx);
        p.style.setProperty('--my', my);

        p.style.animation = `particle-anim 0.6s ease-out forwards`;

        setTimeout(() => p.remove(), 600);
    }
}

async function submitGuess() {
    if (currentGuess.includes(null) || currentGuess.includes(undefined) || currentGuess.length !== wordLength) {
        showMessage("Mot incomplet !");
        shakeRow(currentRow);
        return;
    }

    const guessString = currentGuess.join('');

    try {
        const response = await fetch('/api/guess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guess: guessString })
        });

        const data = await response.json();

        if (!data.valid) {
            showMessage(data.message || "Mot invalide !");
            shakeRow(currentRow);
            return;
        }

        const startTileIndex = currentRow * wordLength;
        const result = data.result;

        // Save word for later
        if (data.won || currentRow === maxGuesses - 1) {
            // We don't have the word from server unless we win or lose, but mostly guessString is strictly equal if won
            currentWord = guessString;
            // If lost, we might need another call or server sends it. 
            // Currently server doesn't send "correctWord" on failure explicitly in /api/guess unless we assume logic
            // But let's fetch definition of OUR guess if won.
        }

        // Animation
        for (let i = 0; i < result.length; i++) {
            setTimeout(() => {
                const res = result[i];
                const tile = document.getElementById(`tile-${startTileIndex + i}`);
                tile.classList.add(res.status);

                if (res.status === 'correct') {
                    spawnParticles(tile);
                    knownHints[i] = res.letter; // Update hints
                }

                // Update Keyboard
                const keyButton = document.querySelector(`.key[data-key="${res.letter}"]`);
                if (keyButton) updateKeyColor(keyButton, res.status);

                // Update Alphabet Grid used to be here

            }, i * 200);
        }

        setTimeout(async () => {
            if (data.won) {
                if (typeof startConfetti === 'function') startConfetti();

                // Pass currentRow + 1 as guess count (1-based)
                const { xpGain, leveledUp } = updateStats(true, currentRow + 1);

                let msg = `Vous avez trouvé le mot ! (+${xpGain} XP)`;
                if (leveledUp) msg += "\nNIVEAU SUPÉRIEUR !";

                showModal("Félicitations !", msg);
                isGameOver = true;
            } else if (currentRow === maxGuesses - 1) {
                // Loss
                const { xpGain } = updateStats(false, 0);

                showModal("Perdu !", `Le mot était caché. (+${xpGain} XP consolation)`);
                isGameOver = true;
            } else {
                currentRow++;
                initTurn(); // Prepare next row with hints
                updateGrid(); // Show hints
            }
        }, result.length * 200 + 1000); // More delay for reading

    } catch (error) {
        console.error("Erreur:", error);
        showMessage("Erreur serveur !");
    }
}

function updateKeyColor(element, status) {
    if (status === 'correct') {
        element.classList.remove('present', 'absent');
        element.classList.add('correct');
    } else if (status === 'present' && !element.classList.contains('correct')) {
        element.classList.remove('absent');
        element.classList.add('present');
    } else if (status === 'absent' && !element.classList.contains('correct') && !element.classList.contains('present')) {
        element.classList.add('absent');
    }
}

function shakeRow(rowIndex) {
    const startTileIndex = rowIndex * wordLength;
    for (let i = 0; i < wordLength; i++) {
        const tile = document.getElementById(`tile-${startTileIndex + i}`);
        tile.classList.add('shake-row');
        setTimeout(() => {
            tile.classList.remove('shake-row');
        }, 500);
    }
}

function showMessage(msg) {
    messageElement.textContent = msg;
    setTimeout(() => { messageElement.textContent = ''; }, 2000);
}



replayBtn.addEventListener('click', () => {
    resetGame();
});

async function resetGame() {
    modal.classList.add('hidden');
    isGameOver = false;
    currentRow = 0;
    currentGuess = [];
    knownHints = [];

    // Clear Visuals
    gameBoard.innerHTML = '';
    keyboard.innerHTML = '';

    await startGame();
}

async function startGame() {
    try {
        const response = await fetch('/api/word-info'); // This gets a NEW word if we call logic right (or we need /api/reset?)
        // Wait, /api/word-info just returns info on CURRENT word.
        // We need to tell server to pick new word.
        // Server creates new word on START NEW GAME? 
        // Currently server logic: const targetWord = words[Math.floor...]. 
        // It's static global ? No, it's global variable "targetWord".
        // We need an endpoint to reset logic or just reload page?
        // Ah, the user asked for "Endless Mode (Just replay without reload)".
        // So I need a way to trigger "New Word" on server.
        // Let's assume hitting /api/new-game or modifying /api/word-info to support reset?
        // Actually looking at server.js: "startNewGame" is called at start.
        // We need to expose it.

        // I will add a call to /api/reset if it exists, otherwise I might have to add it to server.js
        // Let's modify server.js to add /api/reset endpoint.
        // For now let's try to proceed, I will update server.js in next step.

        const resetRes = await fetch('/api/new-game', { method: 'POST' }); // I will create this.
        const data = await resetRes.json();

        wordLength = data.length || 5;

        // Reset state
        currentGuess = new Array(wordLength).fill(null);
        knownHints = new Array(wordLength).fill(null);

        initGrid();
        initKeyboard();

        if (data.firstLetter) {
            knownHints[0] = data.firstLetter;
            initTurn();
            updateGrid();

            const firstTile = document.getElementById('tile-0');
            firstTile.classList.add('correct');
            const keyButton = document.querySelector(`.key[data-key="${data.firstLetter}"]`);
            if (keyButton) keyButton.classList.add('correct');
        }

    } catch (error) {
        console.error("Impossible de démarrer le jeu", error);
        showMessage("Erreur de chargement du jeu");
    }
}

// Initial load
loadStats();
// On initial load, we don't call /api/new-game because server already started one?
// Actually yes. But for consistency let's call it.
startGame();
