Agis comme un développeur Senior Node.js Full Stack. Je veux créer un clone du jeu "Tusmo" (le Wordle français).

Voici la stack technique :
- Backend : Node.js avec Express.
- Frontend : HTML, CSS, JavaScript (Vanilla, pas de framework lourd).

## Objectif
Créer une application web fonctionnelle où le joueur doit deviner un mot français.

## Contraintes et API
Le serveur NE DOIT PAS avoir de liste de mots en dur (hardcoded).
Au démarrage (`app.listen`), le serveur doit récupérer une liste de mots français via une requête HTTP GET.
Utilise cette URL pour la liste de mots (fichier brut) qui servira d'API gratuite : 
"https://raw.githubusercontent.com/takemime/dico-fr/master/mots-5-lettres.txt" 
(Si cette URL ne fonctionne pas, cherche une liste de mots français raw text sur GitHub).

## Fonctionnalités requises
1. **Initialisation** : Le serveur charge les mots, les nettoie (enlève les accents si nécessaire) et en choisit un au hasard.
2. **Règle Tusmo** : La première lettre du mot caché est toujours affichée au joueur dans la grille au début.
3. **Validation** :
   - Créer une route `/api/guess` qui prend le mot du joueur en JSON.
   - Vérifier si le mot existe dans la liste.
   - Comparer les lettres avec cette logique précise :
     - Rouge : Bien placé.
     - Jaune : Mal placé (présent dans le mot mais pas ici).
     - Bleu : Absent.
   - Attention à la gestion des doublons de lettres (si le mot caché a un seul "E" et que le joueur en met deux, seul le premier doit être coloré, le second est bleu).
4. **Interface** :
   - Une grille propre centrée.
   - Un clavier virtuel en bas de page qui se met à jour (les touches changent de couleur).
   - Une notification si le mot n'existe pas ou si la partie est gagnée/perdue.

Génère la structure du projet, le fichier `server.js` complet et les fichiers `public/index.html`, `style.css`, et `script.js`.