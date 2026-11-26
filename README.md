# appart-3d

Marchez dans votre futur appartement en 3D, comme dans un jeu vidéo.

- **Web app** (Vite 8 / Rolldown + Oxc, TypeScript strict, Three.js) — aucune installation côté joueur
- **Contrôles** : clic pour aller à un endroit, glisser (clic gauche) pour regarder, clic droit glissé pour tourner, deux boutons pour avancer, ZQSD (avancer / tourner) + A/E (pas de côté) ; mobile : joystick virtuel, glisser pour regarder, toucher pour aller ici
- **Layout piloté par les données** : l'appartement est défini dans `src/data/apartment.ts`, pas dans le code de rendu
- **Outils Oxc** : `oxlint` (linter), `oxfmt` (formateur), bundler Rolldon/Oxc via Vite 8

Play (once deployed): https://thibautgeriz.github.io/appart-3d/

## Dev

```bash
npm install
npm run dev      # serveur de dev (testez sur votre téléphone via l'URL LAN)
npm test         # tests unitaires (Vitest)
npm run lint     # oxlint
npm run format   # oxfmt
npm run build    # build de production
```

## CI / Déploiement

GitHub Actions (`.github/workflows/ci.yml`) :

- à chaque PR / push sur `main` : lint, tests, build
- à chaque push sur `main` : déploiement du build sur GitHub Pages
  (repo Settings → Pages → Source : _GitHub Actions_)
