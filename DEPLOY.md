# Déploiement sur Hostinger Business Cloud

## Prérequis
- Hostinger Business Cloud Hosting (Node.js activé dans hPanel)
- Node.js ≥ 20 sélectionné dans hPanel
- Base de données PostgreSQL (Supabase, Neon, ou Hostinger DB)

---

## Étape 1 — Uploader les fichiers

### Via Git (recommandé)
1. Dans hPanel → **Git** → connecte ton dépôt GitHub
2. Branche : `main`
3. Répertoire de déploiement : `/` (racine)

### Via File Manager
1. Compresse tout le projet en `.zip`
2. Dans hPanel → **File Manager** → upload dans `public_html` (ou le dossier de ton domaine)
3. Décompresse le zip

---

## Étape 2 — Installer pnpm

Dans hPanel → **Terminal** (SSH) :

```bash
npm install -g pnpm
```

---

## Étape 3 — Installer les dépendances et builder

```bash
pnpm install
pnpm run build
```

Cela :
- Compile le frontend React → `artifacts/vitrine/dist/`
- Bundle le backend Express → `artifacts/api-server/dist/index.mjs`

---

## Étape 4 — Configurer les variables d'environnement

Dans hPanel → **Node.js** → **Environment Variables**, ajoute :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` *(Hostinger le gère automatiquement)* |
| `PG_URL` | URL de ta base PostgreSQL |
| `SESSION_SECRET` | Chaîne aléatoire longue (32+ caractères) |
| `SENDAVAPAY_API_KEY` | Clé API SendavaPay |
| `SENDAVAPAY_WEBHOOK_SECRET` | Secret webhook SendavaPay |
| `WEBHOOK_BASE_URL` | `https://tondomaine.com` *(sans slash final)* |
| `TELEGRAM_BOT_TOKEN` | *(optionnel)* |
| `TELEGRAM_CHAT_ID` | *(optionnel)* |

---

## Étape 5 — Configurer l'application Node.js dans hPanel

Dans hPanel → **Node.js** :

| Champ | Valeur |
|---|---|
| **Node.js version** | 20 (ou plus) |
| **Application mode** | Production |
| **Application root** | `/home/user/public_html` *(racine du projet)* |
| **Application startup file** | `artifacts/api-server/dist/index.mjs` |

Clique **Save** puis **Restart**.

---

## Étape 6 — Vérifier

- Ouvre `https://tondomaine.com` → l'app React doit s'afficher
- Ouvre `https://tondomaine.com/api/app-settings` → doit retourner du JSON

---

## En cas de problème

- **Erreur `Cannot find module`** → relance `pnpm install` depuis le SSH
- **Page blanche** → vérifie que `NODE_ENV=production` est bien défini
- **API 500** → vérifie `PG_URL` dans les variables d'environnement
- **Webhooks SendavaPay ne fonctionnent pas** → vérifie que `WEBHOOK_BASE_URL` est correct
