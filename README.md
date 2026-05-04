# J.A.R.V.I.S — Assistant Personnel Intelligent

Interface holographique style Iron Man, alimentée par Claude AI.

## Fonctionnalités

- 🎤 **Reconnaissance vocale** — parlez à JARVIS (maintenez le bouton micro)
- 🔊 **Synthèse vocale** — JARVIS vous répond à voix haute
- 🧠 **Claude AI** — intelligence conversationnelle avancée
- 🌤️ **Météo en temps réel** — via OpenWeatherMap
- ⏰ **Rappels intelligents** — JARVIS crée des rappels automatiquement
- 📱 **PWA installable** — fonctionne comme une vraie app sur iOS/Android

---

## Déploiement sur Vercel (recommandé)

### Étape 1 — Préparer GitHub

1. Créez un nouveau repo sur github.com (ex: `jarvis-app`)
2. Uploadez tous ces fichiers dans le repo

### Étape 2 — Déployer sur Vercel

1. Allez sur [vercel.com](https://vercel.com) et connectez votre GitHub
2. Cliquez **"New Project"** → sélectionnez `jarvis-app`
3. Vercel détecte automatiquement Vite ✓
4. Cliquez **"Deploy"**
5. Attendez ~2 minutes → vous obtenez une URL `https://jarvis-app-xxx.vercel.app`

### Étape 3 — Installer sur téléphone

**iPhone (Safari) :**
1. Ouvrez l'URL dans Safari
2. Appuyez sur l'icône Partager (carré avec flèche)
3. "Sur l'écran d'accueil"
4. Nommez-la "JARVIS" → Ajouter

**Android (Chrome) :**
1. Ouvrez l'URL dans Chrome
2. Menu (3 points) → "Ajouter à l'écran d'accueil"
3. Nommez-la "JARVIS" → Ajouter

---

## Configuration des clés API

Au premier lancement, l'app vous demande vos clés (⚙ icône en haut à droite) :

### Clé Anthropic (obligatoire)
1. Allez sur [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create Key
3. Copiez la clé `sk-ant-...`

### Clé Météo (optionnel)
1. Allez sur [openweathermap.org](https://openweathermap.org/api)
2. Créez un compte gratuit
3. "API Keys" → copiez votre clé
4. ⚠️ Attendez ~10 minutes après création pour activation

Les clés sont stockées **uniquement sur votre appareil** (localStorage).

---

## Développement local

```bash
npm install
npm run dev
```

Puis ouvrez http://localhost:5173

---

## Stack technique

- **React 18** + Vite
- **Web Speech API** — micro et voix natifs du navigateur
- **Claude claude-sonnet-4-20250514** — intelligence artificielle
- **OpenWeatherMap API** — météo
- **PWA** (vite-plugin-pwa + Workbox) — installation mobile
- CSS animations pures — zéro dépendance UI

---

*"Just A Rather Very Intelligent System"*
