const express = require('express');
const axios = require('axios');
const path = require('path');

const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3000;

// Servir les fichiers statiques du dossier public
app.use(express.static('public'));
app.use(express.json());

let words = [];
let currentWord = '';

// Fonction pour nettoyer les mots (supprimer accents, majuscules)
function normalizeWord(word) {
    return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

// Récupération de la liste de mots au démarrage
async function fetchWords() {
    try {
        console.log("Fetching words...");
        const response = await axios.get('https://raw.githubusercontent.com/Taknok/French-Wordlist/master/francais.txt');
        const rawWords = response.data.split('\n');

        // Nettoyage et filtrage : mots de 5 lettres uniquement, valides
        words = rawWords
            .map(w => w.trim())
            .filter(w => w.length >= 5 && w.length <= 10) // Mots de 5 à 10 lettres
            .map(normalizeWord);

        console.log(`Loaded ${words.length} words.`);
        startNewGame();
    } catch (error) {
        console.error("Error fetching words:", error);
        // Fallback list au cas où
        words = ["POMME", "TERRE", "LIVRE", "MONDE", "SALUT"];
        startNewGame();
    }
}

function startNewGame() {
    if (words.length > 0) {
        const randomIndex = Math.floor(Math.random() * words.length);
        currentWord = words[randomIndex];
        console.log("New game started. Word to guess (hidden):", currentWord); // Pour debug
    }
}

// API pour récupérer la première lettre du mot
app.get('/api/word-info', (req, res) => {
    if (!currentWord) {
        return res.status(503).json({ error: "Game not ready" });
    }
    res.json({ firstLetter: currentWord[0], length: currentWord.length });
});

// API pour valider une tentative
app.post('/api/guess', (req, res) => {
    const guess = normalizeWord(req.body.guess || '');

    if (guess.length !== currentWord.length) {
        return res.status(400).json({ error: `Word must be ${currentWord.length} letters long` });
    }

    if (!words.includes(guess)) {
        return res.json({ valid: false, message: "Word not in dictionary" });
    }

    const result = [];
    const currentWordChars = currentWord.split('');
    const guessChars = guess.split('');

    // 0: Absent (Bleu), 1: Mal placé (Jaune), 2: Bien placé (Rouge)
    // On initialise tout à 0 (Absent)
    for (let i = 0; i < currentWord.length; i++) {
        result.push({ letter: guessChars[i], status: 'absent' });
    }

    // Première passe : Bien placé (Rouge)
    for (let i = 0; i < currentWord.length; i++) {
        if (guessChars[i] === currentWordChars[i]) {
            result[i].status = 'correct';
            currentWordChars[i] = null; // Marquer comme utilisé
            guessChars[i] = null;
        }
    }

    // Deuxième passe : Mal placé (Jaune)
    for (let i = 0; i < currentWord.length; i++) {
        if (guessChars[i] !== null) { // Si ce n'est pas déjà 'correct'
            const foundIndex = currentWordChars.indexOf(guessChars[i]);
            if (foundIndex !== -1) {
                result[i].status = 'present';
                currentWordChars[foundIndex] = null; // Marquer comme utilisé
            }
        }
    }

    const won = result.every(r => r.status === 'correct');

    // Si gagné, on peut relancer une partie pour la prochaine fois
    if (won) {
        setTimeout(startNewGame, 2000); // Wait a bit before resetting for everyone
    }

    res.json({ valid: true, result, won });
});

app.post('/api/new-game', (req, res) => {
    startNewGame();
    res.json({
        length: currentWord.length,
        firstLetter: currentWord[0]
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    fetchWords();
});
