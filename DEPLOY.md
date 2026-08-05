# Déploiement sur Plesk (Node.js)

Ce projet est une application monorepo composée de React (frontend) et
d'Express (API). En production, le backend Express sert aussi les fichiers
statiques React : Plesk ne doit donc démarrer qu'un seul processus Node.js.

Le fichier de démarrage Plesk est `app.js`, à la racine du projet. Il lance le
bundle autonome `artifacts/api-server/dist/index.cjs`.

## Configuration Plesk exacte

Dans **Sites Web & Domaines → votre domaine → Node.js** :

| Champ Plesk | Valeur |
|---|---|
| Version Node.js | 20 ou plus récente (26 fonctionne également) |
| Mode d'application | `production` |
| Racine de l'application | `/httpdocs` si le projet complet est dans `/httpdocs` |
| Racine des documents | `artifacts/vitrine/dist` |
| Fichier de démarrage de l'application | `app.js` |
| Gestionnaire de paquets | `npm` ou `pnpm` selon celui installé sur le serveur |

La **racine de l'application** est le dossier qui contient `app.js`,
`package.json` et le dossier `artifacts`. Ne mettez pas
`artifacts/vitrine/dist` comme racine de l'application.

Si Plesk refuse la valeur relative de la racine des documents, indiquez le
chemin absolu correspondant, par exemple :

```text
/var/www/vhosts/example.com/httpdocs/artifacts/vitrine/dist
```

Le chemin exact dépend de l'hébergeur ; utilisez le chemin affiché par Plesk
dans le champ **Application root**.

## Variables d'environnement Plesk

Dans **Node.js → Custom environment variables**, ajoutez :

| Nom | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `PG_URL` | URL complète de PostgreSQL |
| `SESSION_SECRET` | chaîne aléatoire longue (au moins 32 caractères) |
| `WEBHOOK_BASE_URL` | `https://votre-domaine.tld` |
| `SENDAVAPAY_API_KEY` | clé API SendavaPay, si les dépôts sont activés |
| `SENDAVAPAY_WEBHOOK_SECRET` | secret webhook SendavaPay, si utilisé |
| `ALLOWED_ORIGIN` | `https://votre-domaine.tld` (optionnel) |
| `TELEGRAM_BOT_TOKEN` | optionnel |
| `TELEGRAM_CHAT_ID` | optionnel |

Ne mettez jamais ces valeurs dans `app.js`, GitHub ou un fichier `.env`
versionné. `PG_URL` doit pointer vers une base PostgreSQL déjà accessible
depuis le serveur Plesk.

## Installation et premier déploiement

1. Téléversez ou clonez le projet complet dans `/httpdocs`. Le dossier doit
   contenir `app.js`, `package.json`, `artifacts/` et `lib/`.
2. Ouvrez le terminal Plesk dans la racine de l'application.
3. Installez pnpm si votre hébergeur l'autorise :

   ```bash
   npm install --global pnpm
   ```

4. Installez les dépendances :

   ```bash
   pnpm install --frozen-lockfile
   ```

5. Recompilez après chaque mise à jour du code source :

   ```bash
   pnpm run build:full
   ```

   Les fichiers `dist` sont déjà présents dans l'import actuel. Cette étape
   est néanmoins nécessaire après une modification du frontend ou du backend.
6. Si les tables PostgreSQL n'existent pas encore, appliquez le schéma avec
   une URL configurée dans l'environnement :

   ```bash
   cd lib/db
   pnpm run push
   cd ../..
   ```

7. Revenez dans **Node.js**, cliquez sur **NPM install** si Plesk le propose,
   puis **Save** et **Restart App**.
8. Activez le certificat SSL Let's Encrypt dans **SSL/TLS Certificates** et
   forcez HTTPS. Utilisez ensuite l'URL HTTPS dans `WEBHOOK_BASE_URL`.

## Vérifications

```bash
curl -I https://votre-domaine.tld/
curl https://votre-domaine.tld/api/healthz
```

La première commande doit retourner une page servie par l'application. La
seconde doit retourner `{"status":"ok"}`. Consultez
**Node.js → Logs** dans Plesk si l'application redémarre.

## Mise à jour

Après chaque modification :

```bash
git pull origin main
pnpm install --frozen-lockfile
pnpm run build:full
```

Puis cliquez sur **Restart App** dans Plesk.

## Erreurs fréquentes

| Message | Correction |
|---|---|
| `startup file app.js is not found` | Vérifier que `app.js` est directement dans l'Application root |
| `Cannot find ... index.cjs` | Exécuter `pnpm run build:full` et vérifier `artifacts/api-server/dist` |
| Page blanche | Vérifier `NODE_ENV=production`, `Document Root` et la présence de `vitrine/dist/index.html` |
| `PG_URL is not set` | Ajouter `PG_URL` dans les variables Plesk puis redémarrer |
| API 500 / tables absentes | Exécuter `cd lib/db && pnpm run push` avec la bonne base |
| Webhook non reçu | Utiliser HTTPS et définir `WEBHOOK_BASE_URL` sans slash final |

---

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
