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
| Version Node.js | `20.19+` ou `22.12+` (26 fonctionne également) |
| Type d'application | `Server-side (Vanilla Node.js)` |
| Mode d'application | `production` |
| Racine de l'application | `/httpdocs` si le projet complet est dans `/httpdocs` |
| Racine des documents | `artifacts/vitrine/dist` sous la racine de l'application |
| Fichier de démarrage de l'application | `app.js` |
| Gestionnaire de paquets | `pnpm` |

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
| `ASHTECHPAY_API_KEY` | clé Direct API AshTech Pay `ak_...`, réservée au serveur |
| `ASHTECHPAY_USER_ID` | identifiant de profil AshTech Pay associé à cette clé — non secret |
| `ALLOWED_ORIGIN` | `https://votre-domaine.tld` (optionnel) |
| `TELEGRAM_BOT_TOKEN` | optionnel |
| `TELEGRAM_CHAT_ID` | optionnel |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | optionnelles, pour activer les notifications push |
| `VAPID_CONTACT` | optionnel, adresse de contact VAPID (par défaut `mailto:admin@example.com`) |
| `LOG_LEVEL` | optionnel, niveau de journalisation (par défaut `info`) |

La clé AshTech Pay `ak_...` est réservée au serveur et ne doit jamais être mise
dans le navigateur, l'interface admin, GitHub ou un fichier `.env` versionné.
L'API de production utilisée par le serveur est
`https://www.ashtechpay.com`; ne configurez pas l'ancien domaine `.top` et
n'utilisez pas de sandbox. La documentation Direct API exige aussi le
`user_id` du profil AshTech lié à la clé. Il n'est pas secret et ne peut pas
être remplacé par l'ID d'un utilisateur Muzan. Pour respecter votre choix de ne
pas configurer de secret webhook, le serveur n'envoie pas de `notify_url` et
n'attend pas de callback. Il vérifie les transactions avec
`GET /v1/transaction/:id?user_id=...` et réconcilie automatiquement les
paiements en attente toutes les minutes. Un webhook AshTech nécessiterait bien
`ASHTECH_WEBHOOK_SECRET` selon la documentation actuelle; il n'est pas utilisé
dans cette configuration.
`PG_URL` doit pointer vers une base PostgreSQL déjà accessible depuis Plesk.

Le dépôt national manuel T-Money/Moov ne dépend pas de la clé Ashtechpay.

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
6. Avant le push Drizzle, exécutez une fois le script SQL fourni dans
   `lib/db/migrations/0002_payment_provider_ashtechpay.sql` sur la base de
   production. Il renomme les références historiques sans supprimer leurs
   données et marque les anciennes tentatives comme historiques.
7. Appliquez le schéma PostgreSQL après avoir configuré `PG_URL` :

   ```bash
   pnpm --filter @workspace/db run push
   ```

   Cette commande ajoute les champs utilisés par les parcours Ashtechpay et VIP.
   Examinez toute proposition de suppression ou de renommage avant de la
   confirmer; n'utilisez jamais `push-force`.

8. Vérifiez que `artifacts/api-server/uploads` est accessible en écriture par
   l'utilisateur du site, puis cliquez sur **Save** et **Restart App**.
9. Activez le certificat SSL Let's Encrypt dans **SSL/TLS Certificates** et
   forcez HTTPS pour le site.

## Vérifications

```bash
curl -I https://votre-domaine.tld/
curl https://votre-domaine.tld/api/healthz
```

La première commande doit retourner une page servie par l'application. La
seconde doit retourner `{"status":"ok","database":"ready","schema":"vip-expiry-v1","paymentSchema":"ashtechpay-v1"}`.
Cette réponse vérifie la connexion PostgreSQL ainsi que les colonnes nécessaires
aux comptes VIP, aux paramètres de l'application et aux parcours Ashtechpay
(dépôts internationaux et paiements VIP). Elle confirme que la version récente
du serveur est déployée. Si elle renvoie `503` avec `database_not_configured`,
configurez `PG_URL`. Si elle renvoie `database_schema_outdated`, exécutez la
commande de mise à jour du schéma ci-dessus, puis redémarrez l'application. Le
champ `check` précise quelle vérification a échoué (`accounts`, `app_settings`,
`vip_payments`, `international_deposits` ou `deposits`).
Consultez **Node.js → Logs** dans Plesk si l'application redémarre. Une erreur de
démarrage de paiement affiche aussi une référence de diagnostic : recherchez
cette référence dans les journaux Node.js, sans partager de clés ni de mots de
passe.

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
| API 500 / tables absentes | Vérifier `/api/healthz`, puis exécuter `pnpm --filter @workspace/db run push` après avoir vérifié la base cible |
| Paiement non vérifié | Contrôler la clé Direct API `ak_...`, `ASHTECHPAY_USER_ID`, puis `/api/healthz` et les journaux Node.js |

---

# Déploiement sur Hostinger Business Cloud

## Prérequis
- Hostinger Business Cloud Hosting (Node.js activé dans hPanel)
- Node.js `20.19+` ou `22.12+` sélectionné dans hPanel
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
pnpm run build:full
```

Cela :
- Compile le frontend React → `artifacts/vitrine/dist/`
- Bundle le backend Express → `artifacts/api-server/dist/index.cjs`

---

## Étape 4 — Configurer les variables d'environnement

Dans hPanel → **Node.js** → **Environment Variables**, ajoute :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` *(Hostinger le gère automatiquement)* |
| `PG_URL` | URL de ta base PostgreSQL |
| `ASHTECHPAY_API_KEY` | Clé Direct API `ak_...`, réservée au serveur |
| `ASHTECHPAY_USER_ID` | ID non secret du profil AshTech Pay associé à la clé |
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
| **Application startup file** | `app.js` |

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
- **Paiement non vérifié** → vérifier la clé Direct API et `ASHTECHPAY_USER_ID`; le serveur réinterroge les transactions en attente.
