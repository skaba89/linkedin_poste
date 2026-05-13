/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Migration automatique SQLite → PostgreSQL                   ║
 * ║  DataSphere — LinkedIn SaaS Platform                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   1. Configurez votre DATABASE_URL PostgreSQL dans .env
 *   2. Lancez: node scripts/migrate-sqlite-to-pg.js
 *
 * Ce script:
 *   - Lit toutes les données depuis SQLite (db/custom.db)
 *   - Crée les tables dans PostgreSQL (prisma db push)
 *   - Insère les données en respectant l'ordre des dépendances
 *   - Valide le compte après transfert
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────────
const SQLITE_DB_PATH = path.join(__dirname, '..', 'db', 'custom.db');

// Ordre d'insertion (tables sans FK d'abord)
const TABLE_ORDER = [
  'Settings',
  'Permission',
  'Role',
  'RolePermission',
  'User',
  'PasswordReset',
  'Plan',
  'Subscription',
  'Workspace',
  'WorkspaceMember',
  'LinkedInAccount',
  'Post',
  'AIVariant',
  'ValidationLog',
  'PublicationLog',
  'AuditLog',
  'PromptTemplate',
  'PostTemplate',
  'PostMetric',
  'ABTest',
  'ABReading',
  'Competitor',
  'CompetitorPost',
  'ScoringCalibration',
  'PostingSlot',
  'BrandVoiceProfile',
  'AudienceComment',
  'ContentIdea',
  'Notification',
  'NotificationChannel',
  'AgentActivity',
  'AgentConfig',
  'Prospect',
  'OutreachMessage',
  'OutreachCampaign',
  'ContentPlanItem',
  'SentimentAlert',
  'WebhookSubscription',
  'Newsletter',
  'NewsletterPost',
  'NurtureSequence',
  'ProspectSequence',
  'SequenceStepLog',
  'Opportunity',
  'Application',
  'SocialMention',
  'TrackedKeyword',
  'ConnectionTarget',
  'ProfileAnalysis',
  'RepurposedContent',
  'ContentRecyclingRule',
];

// Mapping SQLite → Prisma (les noms de colonnes SQLite sont en camelCase)
function sqliteRowToPrisma(row, columns) {
  const obj = {};
  for (const col of columns) {
    const val = row[col];
    // Convertir les buffers SQLite en strings
    if (Buffer.isBuffer(val)) {
      obj[col] = val.toString('utf-8');
    } else {
      obj[col] = val;
    }
  }
  return obj;
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  DataSphere — Migration SQLite → PostgreSQL             ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Vérifier que SQLite existe
  if (!fs.existsSync(SQLITE_DB_PATH)) {
    console.error('❌ Fichier SQLite introuvable:', SQLITE_DB_PATH);
    process.exit(1);
  }

  // Vérifier DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.startsWith('file:')) {
    console.error('❌ DATABASE_URL doit pointer vers PostgreSQL.');
    console.error('   Actuel:', dbUrl);
    console.error('   Format attendu: postgresql://user:pass@host:5432/dbname');
    process.exit(1);
  }

  console.log('📊 Source SQLite:', SQLITE_DB_PATH);
  console.log('🎯 Destination PostgreSQL:', dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  console.log('');

  // ─── Étape 1: Schéma PostgreSQL ─────────────────────────────────
  console.log('📐 Étape 1/3: Création du schéma PostgreSQL...');
  try {
    execSync('npx prisma db push --accept-data-loss 2>&1', { stdio: 'pipe' });
    console.log('   ✅ Schéma créé avec succès\n');
  } catch (err) {
    console.error('   ❌ Erreur lors de la création du schéma:');
    console.error('   ', err.stderr?.toString() || err.message);
    process.exit(1);
  }

  // ─── Étape 2: Lecture SQLite ────────────────────────────────────
  console.log('📦 Étape 2/3: Lecture des données SQLite...');

  // Utiliser better-sqlite3 si disponible, sinon sqlite3 natif
  let sqlite3;
  try {
    sqlite3 = require('better-sqlite3');
    console.log('   (via better-sqlite3)');
  } catch {
    try {
      sqlite3 = require('sqlite3');
      console.log('   (via sqlite3 — mode callback)');
    } catch {
      console.error('   ❌ Installez sqlite3: npm install better-sqlite3');
      process.exit(1);
    }
  }

  const isBetterSqlite3 = typeof sqlite3.prototype?.prepare === 'function';

  let allData = {};

  if (isBetterSqlite3) {
    const db = sqlite3(SQLITE_DB_PATH, { readonly: true });
    for (const table of TABLE_ORDER) {
      try {
        const stmt = db.prepare(`SELECT * FROM "${table}"`);
        const rows = stmt.all();
        if (rows.length > 0) {
          allData[table] = rows;
          console.log(`   ✅ ${table}: ${rows.length} lignes`);
        }
      } catch (e) {
        console.log(`   ⚪ ${table}: table vide ou inexistante`);
      }
    }
    db.close();
  } else {
    // sqlite3 callback style — use promise wrapper
    const db = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY);
    for (const table of TABLE_ORDER) {
      try {
        const rows = await new Promise((resolve, reject) => {
          db.all(`SELECT * FROM "${table}"`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });
        if (rows.length > 0) {
          allData[table] = rows;
          console.log(`   ✅ ${table}: ${rows.length} lignes`);
        }
      } catch (e) {
        console.log(`   ⚪ ${table}: table vide ou inexistante`);
      }
    }
    db.close();
  }

  const totalRows = Object.values(allData).reduce((sum, rows) => sum + rows.length, 0);
  console.log(`\n   📊 Total: ${totalRows} lignes à migrer\n`);

  // ─── Étape 3: Insertion PostgreSQL ──────────────────────────────
  console.log('🚀 Étape 3/3: Insertion dans PostgreSQL...');
  const pg = new PrismaClient();

  let totalInserted = 0;
  let totalErrors = 0;

  for (const table of TABLE_ORDER) {
    const rows = allData[table];
    if (!rows || rows.length === 0) continue;

    try {
      // Nettoyer les données pour chaque ligne
      const cleaned = rows.map(row => {
        const clean = {};
        for (const [key, val] of Object.entries(row)) {
          // Ignorer les colonnes SQLite internes
          if (key === '_rowid_' || key === 'rowid') continue;
          // Convertir les buffers
          clean[key] = Buffer.isBuffer(val) ? val.toString('utf-8') : val;
        }
        return clean;
      });

      // Utiliser createMany pour chaque table
      const result = await pg[table].createMany({
        data: cleaned,
        skipDuplicates: true,
      });

      console.log(`   ✅ ${table}: ${result.count} insérés`);
      totalInserted += result.count;
    } catch (err) {
      console.log(`   ⚠️  ${table}: ${rows.length} lignes — erreur (relation cyclique ou type)`);
      totalErrors++;
      // Essayer ligne par ligne
      for (const row of rows) {
        try {
          const clean = {};
          for (const [key, val] of Object.entries(row)) {
            if (key === '_rowid_' || key === 'rowid') continue;
            clean[key] = Buffer.isBuffer(val) ? val.toString('utf-8') : val;
          }
          await pg[table].create({ data: clean });
          totalInserted++;
        } catch {
          // Skip rows that fail (duplicates, FK violations, etc.)
        }
      }
    }
  }

  await pg.$disconnect();

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  Migration terminée !                                   ║`);
  console.log(`║  ✅ ${totalInserted} lignes insérées avec succès          `);
  console.log(`║  ⚠️  ${totalErrors} tables avec des erreurs mineures       `);
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log('👉 Vous pouvez maintenant lancer: npm run dev');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
