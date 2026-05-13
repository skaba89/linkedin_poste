# Guide de Migration : SQLite vers PostgreSQL

Ce guide vous accompagne pas a pas dans la migration de la base de donnees du projet LinkedIn SaaS de **SQLite** vers **PostgreSQL**.

---

## Table des matieres

1. [Pourquoi migrer ?](#pourquoi-migrer)
2. [Prerequis](#prerequis)
3. [Option A : Installer PostgreSQL localement](#option-a--installer-postgresql-localement)
4. [Option B : Utiliser un fournisseur Cloud](#option-b--utiliser-un-fournisseur-cloud)
5. [Creer la base de donnees](#creer-la-base-de-donnees)
6. [Configurer la connexion](#configurer-la-connexion)
7. [Synchroniser le schema](#synchroniser-le-schema)
8. [Migrer les donnees existantes](#migrer-les-donnees-existantes)
9. [Verifier le fonctionnement](#verifier-le-fonctionnement)
10. [Deploiement en production](#deploiement-en-production)
11. [Resolution des problemes courants](#resolution-des-problemes-courants)

---

## Pourquoi migrer ?

- **Performances superieures** : PostgreSQL gere mieux les requetes concurrentes et les grands volumes de donnees.
- **Fonctionnalites avancees** : Recherche plein texte (full-text search), types JSON natifs, index partiel, etc.
- **Scalabilite** : PostgreSQL s'adapte mieux en production avec un trafic croissant.
- **Ecosysteme SaaS** : La plupart des fournisseurs cloud et outils d'orchestration sont optimises pour PostgreSQL.

---

## Prerequis

- **Node.js** >= 18.x installe
- **Prisma CLI** installe (`npm install -g prisma` ou utiliser `npx prisma`)
- Acces au terminal / ligne de commande
- Un editeur de texte pour modifier le fichier `.env`

---

## Option A : Installer PostgreSQL localement

### macOS (avec Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
```

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows

Telecharger et installer PostgreSQL depuis : https://www.postgresql.org/download/windows/

Ou utiliser **WSL2** avec les instructions Ubuntu ci-dessus.

---

## Option B : Utiliser un fournisseur Cloud

Voici les fournisseurs recommandes pour un projet SaaS :

### Supabase (Gratuit pour demarrer)

1. Creer un compte sur [supabase.com](https://supabase.com)
2. Creer un nouveau projet
3. Copier la chaine de connexion depuis **Settings > Database > Connection string**

Format :
```
postgresql://postgres.[projet-ref]:[mot-de-passe]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### Neon (Serverless PostgreSQL)

1. Creer un compte sur [neon.tech](https://neon.tech)
2. Creer un nouveau projet
3. Copier la chaine de connexion fournie

Format :
```
postgresql://[utilisateur]:[mot-de-passe]@[endpoint].neon.tech/[bdd]?sslmode=require
```

### Railway

1. Creer un compte sur [railway.app](https://railway.app)
2. Deployer un service PostgreSQL (un clic)
3. Copier la variable `DATABASE_URL` depuis les variables d'environnement du service

---

## Creer la base de donnees

### Si vous utilisez PostgreSQL localement :

```bash
# Se connecter a PostgreSQL
psql postgres

# Creer la base de donnees
CREATE DATABASE linkedin_saas;

# Quitter psql
\q
```

### Si vous utilisez un fournisseur Cloud :

La base de donnees est generalement creee automatiquement lors de la creation du projet. Suivez les instructions specifiques du fournisseur.

---

## Configurer la connexion

Ouvrez le fichier `.env` a la racine du projet et mettez a jour la variable `DATABASE_URL` :

### Format local :

```
DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/linkedin_saas
```

### Format cloud (exemple Supabase) :

```
DATABASE_URL=postgresql://postgres.[ref]:VOTRE_MOT_DE_PASSE@aws-0-[region].pooler.supabase.com:6543/postgres
```

> **Important** : Remplacez `VOTRE_MOT_DE_PASSE`, `[ref]`, `[region]` par vos vraies valeurs. Ne commettez jamais le fichier `.env` dans le depot Git.

---

## Synchroniser le schema

Une fois la connexion configuree, executez les commandes suivantes :

### Etape 1 : Generer le client Prisma

```bash
npx prisma generate
```

Cette commande genere le client Prisma adapte a PostgreSQL et verifie que le schema est valide.

### Etape 2 : Creer les tables dans la base de donnees

#### Option rapide (developpement) :

```bash
npx prisma db push
```

Cette commande cree directement les tables sans generer de fichiers de migration.

#### Option recommandee (production) :

```bash
# Creer la premiere migration
npx prisma migrate dev --name init_postgresql

# Ou en production :
npx prisma migrate deploy
```

Les fichiers de migration seront crees dans le dossier `prisma/migrations/`. Ils permettent de suivre l'historique des changements de schema et de les appliquer de maniere reproductible.

---

## Migrer les donnees existantes

Si vous avez des donnees dans la base SQLite actuelle (`db/custom.db`), vous pouvez les exporter puis les importer dans PostgreSQL.

### Exporter les donnees depuis SQLite

```bash
# Installer sqlite3 si ce n'est pas fait
# Sur macOS : brew install sqlite3
# Sur Ubuntu : sudo apt install sqlite3

# Exporter chaque table au format CSV
sqlite3 db/custom.db <<EOF
.headers on
.mode csv
.output exports/users.csv
SELECT * FROM User;
.output exports/posts.csv
SELECT * FROM Post;
.output exports/linked_in_accounts.csv
SELECT * FROM LinkedInAccount;
-- Repetez pour chaque table necessaire
.quit
EOF
```

### Importer dans PostgreSQL

```bash
# Creer le dossier d'exports
mkdir -p exports

# Importer les donnees
psql -d linkedin_saas -c "\copy \"User\" FROM 'exports/users.csv' WITH CSV HEADER"
psql -d linkedin_saas -c "\copy \"Post\" FROM 'exports/posts.csv' WITH CSV HEADER"
psql -d linkedin_saas -c "\copy \"LinkedInAccount\" FROM 'exports/linked_in_accounts.csv' WITH CSV HEADER"
```

> **Attention** : L'ordre d'importation est important. Importez d'abord les tables sans cle etrangeres (User, Settings), puis les tables qui dependent de celles-ci.

### Alternative avec un script de migration

Vous pouvez egalement creer un script Node.js utilisant Prisma pour lire depuis SQLite et ecrire dans PostgreSQL. Cette approche est plus robuste car elle gere automatiquement les relations.

---

## Verifier le fonctionnement

Apres la migration, verifiez que tout fonctionne correctement :

```bash
# 1. Verifier la connexion a la base
npx prisma db execute --stdin <<EOF
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
EOF

# 2. Lancer le serveur de developpement
npm run dev

# 3. Tester l'application dans le navigateur
# - Se connecter a l'application
# - Creer un post
# - Verifier que les donnees sont bien enregistrees
```

---

## Deploiement en production

Pour le deploiement, utilisez les migrations Prisma :

```bash
# Generer les fichiers de migration (si pas deja fait)
npx prisma migrate dev --name init_postgresql

# Appliquer les migrations en production
npx prisma migrate deploy
```

Assurez-vous que :
- La variable `DATABASE_URL` pointe vers la base de donnees de production
- Les secrets (JWT_SECRET, API keys) sont configures comme variables d'environnement dans votre hebergeur
- Le SSL est active pour la connexion PostgreSQL (`?sslmode=require` dans l'URL)

---

## Resolution des problemes courants

### Erreur : `P1001 : Can't reach database server`

- Verifiez que PostgreSQL est en cours d'execution
- Verifiez le nom d'hote et le port dans `DATABASE_URL`
- Pour les fournisseurs cloud, verifiez que votre adresse IP est autorisee

### Erreur : `P3003 : Some tables are not migrated`

- Executez `npx prisma db push` pour forcer la synchronisation
- Ou creez une migration avec `npx prisma migrate dev`

### Erreur : `relation already exists`

- La table existe deja dans la base. Vous pouvez supprimer et recreer :
  ```bash
  npx prisma migrate reset
  ```
  **Attention** : Cette commande supprime toutes les donnees.

### Erreur : `column type mismatch`

- SQLite est plus permissif sur les types. PostgreSQL est strict.
- Verifiez les types dans le schema Prisma et ajustez si necessaire.

### Les types `DateTime` ne fonctionnent pas correctement

- PostgreSQL utilise `timestamp(3)` pour les DateTime de Prisma, ce qui est equivalent et compatible.
- Aucune modification n'est necessaire dans le schema actuel.

---

## Changements effectues dans cette preparation

1. **`prisma/schema.prisma`** : Provider change de `sqlite` a `postgresql`
2. **`.env`** : `DATABASE_URL` mis a jour au format PostgreSQL + ajout de `RESEND_API_KEY` et `EMAIL_FROM`
3. **`src/lib/db.ts`** : Verifie - compatible PostgreSQL (utilise Prisma Client, agnostique de la base)
4. **Nouveau modele `PasswordReset`** : Ajoute pour la fonctionnalite de reinitialisation de mot de passe
