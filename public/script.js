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

// Stats
let stats = {
    streak: 0,
    maxStreak: 0
};

const azertyKeys = [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['Enter', 'W', 'X', 'C', 'V', 'B', 'N', 'Backspace']
];

function loadStats() {
    const saved = localStorage.getItem('tusmo_stats');
    if (saved) {
        stats = JSON.parse(saved);
    }
}

function saveStats() {
    localStorage.setItem('tusmo_stats', JSON.stringify(stats));
}

function updateStats(won) {
    if (won) {
        stats.streak++;
        if (stats.streak > stats.maxStreak) {
            stats.maxStreak = stats.streak;
        }
    } else {
        stats.streak = 0;
    }
    saveStats();
}

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
                updateStats(true);
                showModal("Félicitations !", "Vous avez trouvé le mot !");
                isGameOver = true;
            } else if (currentRow === maxGuesses - 1) {
                updateStats(false);
                // On Server logic: if lost, we don't know the word. 
                // Let's cheat and define the last guess? No.
                // ideally server should return correctWord. 
                // Let's just show "Perdu".
                showModal("Perdu !", `Le mot était caché.`);
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

function showModal(title, msg) {
    modalTitle.textContent = title;
    modalMessage.textContent = msg;

    currentStreakSpan.textContent = stats.streak;
    maxStreakSpan.textContent = stats.maxStreak;
    statsContainer.classList.remove('hidden');

    modal.classList.remove('hidden');
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
