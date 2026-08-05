# Déploiement sur Hostinger (GitHub)

---

## Comment ça fonctionne

Le backend (Express) sert à la fois l'API **et** le frontend compilé en production.
Un seul processus Node.js, un seul port.

```
GitHub repo ──pull──▶ Hostinger Node.js Hosting ──▶ node artifacts/api-server/dist/index.cjs
                                                            │
                                                   ┌────────┴────────┐
                                                   ▼                 ▼
                                              /api/*           tout le reste
                                            (backend)        (frontend React)
```

Les fichiers compilés (`dist/`) sont **inclus dans le repo** — Hostinger n'a donc pas besoin de lancer de build, il suffit de `npm start`.

---

## Étape 1 — Pousser le code compilé sur GitHub

Depuis votre machine (ou depuis ce Replit via SSH/Git) :

```bash
git add artifacts/api-server/dist artifacts/vitrine/dist
git commit -m "build: include compiled dist for Hostinger deployment"
git push
```

> Les fichiers `dist/` ne sont plus ignorés par `.gitignore` — ils sont inclus dans le repo exprès pour ce déploiement.

---

## Étape 2 — Variables d'environnement dans hPanel

hPanel → **Node.js** → **Environment Variables** :

| Clé | Valeur |
|-----|--------|
| `NODE_ENV` | `production` |
| `PG_URL` | votre connection string PostgreSQL |
| `TELEGRAM_BOT_TOKEN` | *(optionnel)* |
| `TELEGRAM_CHAT_ID` | *(optionnel)* |

> **Ne pas définir `PORT`** — Hostinger l'injecte automatiquement.

---

## Étape 3 — Paramètres de déploiement dans hPanel

hPanel → **Node.js** → configuration de l'application :

| Paramètre | Valeur |
|-----------|--------|
| **Node.js version** | `20.x` |
| **Start command** | `npm start` |
| **Build command** | *(laisser vide)* |

Si hPanel propose un champ **Entry file** à la place du start command :

| Paramètre | Valeur |
|-----------|--------|
| **Entry file** | `artifacts/api-server/dist/index.cjs` |

---

## Étape 4 — Schéma de base de données (1ère fois seulement)

Depuis votre machine locale ou via SSH Hostinger :

```bash
cd lib/db
PG_URL="postgresql://user:password@host:5432/dbname" pnpm run push
```

---

## Étape 5 — Déployer

Dans hPanel → **Node.js** → **Git** :
1. Connecter le dépôt GitHub
2. Choisir la branche (`main`)
3. Cliquer **Deploy**

Hostinger tire le repo, trouve `dist/index.cjs` directement, et lance `npm start`. ✅

---

## Mettre à jour l'application

À chaque modification du code, depuis Replit (ou votre machine) :

```bash
pnpm run build          # recompile frontend + backend
git add artifacts/api-server/dist artifacts/vitrine/dist
git commit -m "build: update dist"
git push
# puis cliquer "Redeploy" dans hPanel
```

---

## Dépannage

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| Démarre puis s'arrête | `dist/` absent du repo | Vérifier que les fichiers `dist/` sont bien pushés sur GitHub |
| `PG_URL must be set` | Variable manquante | Ajouter `PG_URL` dans hPanel → Environment Variables |
| Erreur base de données | Tables inexistantes | Lancer `pnpm run push` dans `lib/db/` |
| Page blanche | Mauvais `NODE_ENV` | Vérifier que `NODE_ENV=production` est bien défini dans hPanel |

---

## Déploiement sur VPS Hostinger (manuel)

Si vous utilisez un VPS plutôt que le Node.js Hosting géré :

```bash
git clone https://github.com/votre-repo/muzan-service.git && cd muzan-service
cp .env.example .env && nano .env    # remplir PG_URL, NODE_ENV=production
pnpm install --frozen-lockfile       # si vous voulez rebuilder localement
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

Voir `ecosystem.config.cjs` pour la config PM2 et adapter le chemin `cwd`.

> Pour Plesk, utilisez le fichier de démarrage `app.js` à la racine et
> consultez `DEPLOY.md`. Le fichier `index.cjs` reste le bundle lancé par
> `app.js`.
