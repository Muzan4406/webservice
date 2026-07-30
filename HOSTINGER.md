# Déploiement sur Hostinger

---

## ⭐ Déploiement via GitHub (hPanel — méthode recommandée)

C'est la méthode que Hostinger propose sur les plans Business et supérieurs.
Elle tire automatiquement le code depuis GitHub et le lance.

### Étape 1 — Variables d'environnement dans hPanel

Dans hPanel → **Node.js** → **Environment Variables**, ajouter :

| Clé | Valeur |
|-----|--------|
| `NODE_ENV` | `production` |
| `PG_URL` | votre connection string PostgreSQL |
| `TELEGRAM_BOT_TOKEN` | *(optionnel)* |
| `TELEGRAM_CHAT_ID` | *(optionnel)* |

> Le `PORT` est injecté automatiquement par Hostinger — ne pas le définir manuellement.

---

### Étape 2 — Paramètres de déploiement dans hPanel

Dans hPanel → **Node.js** → **Setup** (ou lors de la création de l'app), configurer :

| Paramètre | Valeur à mettre |
|-----------|----------------|
| **Node.js version** | `20.x` ou supérieur |
| **Build command** | `npm run setup` |
| **Start command** | `npm start` |

> **`npm run setup`** installe pnpm (absent par défaut sur Hostinger), installe toutes les dépendances, puis compile le frontend et le backend.
>
> **`npm start`** lance simplement le fichier déjà compilé : `node artifacts/api-server/dist/index.cjs`

Si Hostinger propose un champ **Entry file** (mode "Other") à la place du start command :

| Paramètre | Valeur |
|-----------|--------|
| **Entry file** | `artifacts/api-server/dist/index.cjs` |

---

### Étape 3 — Pousser le schéma de base de données

À faire **une seule fois** depuis votre machine locale (ou via SSH Hostinger) :

```bash
cd lib/db
PG_URL="postgresql://..." pnpm run push
```

---

### Étape 4 — Connecter le repo GitHub et déployer

Dans hPanel → **Node.js** → **Git** :
1. Connecter votre dépôt GitHub
2. Choisir la branche (ex : `main`)
3. Cliquer **Deploy** — Hostinger exécute `npm run setup` puis `npm start`

---

### Dépannage — "tourne puis s'arrête"

| Symptôme | Cause | Solution |
|----------|-------|----------|
| Démarre puis s'arrête | `dist/` n'est pas dans le repo (gitignored) | Vérifier que **Build command** = `npm run setup` est bien configuré |
| `Cannot find module 'pnpm'` | pnpm non installé | La commande `npm run setup` l'installe — vérifier les logs de build |
| `PG_URL must be set` | Variable manquante | Ajouter `PG_URL` dans hPanel → Environment Variables |
| `PORT is invalid` | PORT non fourni | Hostinger l'injecte automatiquement — ne pas le définir |

---

## Déploiement manuel sur VPS Hostinger

Si vous utilisez un VPS (non géré) plutôt que le Node.js Hosting :

### Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | 20+ |
| pnpm | 8+ (`npm install -g pnpm`) |
| PM2 | (`npm install -g pm2`) |

### Commandes

```bash
# 1. Récupérer le code
git clone https://github.com/votre-repo/muzan-service.git && cd muzan-service

# 2. Configurer les variables
cp .env.example .env && nano .env

# 3. Installer, builder, pousser le schéma
pnpm install --frozen-lockfile
pnpm run build
cd lib/db && PG_URL="..." pnpm run push && cd ../..

# 4. Lancer avec PM2
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

### Configurer le reverse proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name votredomaine.com www.votredomaine.com;

    ssl_certificate     /etc/letsencrypt/live/votredomaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votredomaine.com/privkey.pem;

    client_max_body_size 30M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

### SSL gratuit (Let's Encrypt)

```bash
sudo certbot --nginx -d votredomaine.com -d www.votredomaine.com
```

---

## Variables d'environnement complètes

Voir `.env.example` pour la liste complète. Voir aussi la section hPanel ci-dessus.

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `NODE_ENV` | ✅ | Doit être `production` |
| `PORT` | Auto (hPanel) / Manuel (VPS) | Port Node.js — Hostinger l'injecte automatiquement |
| `PG_URL` | ✅ | Connexion string PostgreSQL |
| `ALLOWED_ORIGIN` | Non | Domaine autorisé pour CORS (clients externes) |
| `TELEGRAM_BOT_TOKEN` | Non | Alertes Telegram |
| `TELEGRAM_CHAT_ID` | Non | Chat ID Telegram |
