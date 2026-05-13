#!/usr/bin/env node
/**
 * @file quota-manager.js
 * @description CLI + module for managing daily action quotas for the
 *   LinkedIn/Instagram Client Acquisition Automation project.
 *
 * Connects to PostgreSQL to track and reset per-platform, per-action daily quotas.
 *
 * @usage
 *   # Report all current quotas
 *   node quota-manager.js report
 *
 *   # Reset all daily quotas (run as cron at midnight)
 *   node quota-manager.js reset
 *
 *   # Check a specific quota
 *   node quota-manager.js check --platform=linkedin --action=invite
 *
 * @requires Environment variables:
 *   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
 */

'use strict';

const { Client } = require('pg');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PG_CONFIG = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '',
  database: process.env.POSTGRES_DB || 'automation',
  // Connection timeout
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
};

// Default daily limits per platform / action
const DEFAULT_LIMITS = {
  linkedin: {
    invite: 100,
    message: 50,
    profileView: 200,
    connectionAccept: 150,
    endorse: 100,
  },
  instagram: {
    follow: 50,
    unfollow: 30,
    like: 300,
    comment: 50,
    message: 30,
    storyView: 100,
  },
};

// ---------------------------------------------------------------------------
// Database client
// ---------------------------------------------------------------------------
let _client = null;

/**
 * Get or create a PostgreSQL client connection.
 * @returns {Promise<Client>}
 */
async function getClient() {
  if (_client) return _client;

  _client = new Client(PG_CONFIG);
  await _client.connect();
  return _client;
}

/**
 * Gracefully close the database connection.
 * @returns {Promise<void>}
 */
async function closeClient() {
  if (_client) {
    await _client.end().catch(() => {});
    _client = null;
  }
}

// ---------------------------------------------------------------------------
// Schema initialisation (idempotent)
// ---------------------------------------------------------------------------
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS quota_tracking (
    id            SERIAL PRIMARY KEY,
    platform      VARCHAR(20)  NOT NULL,
    action_type   VARCHAR(50)  NOT NULL,
    date          DATE         NOT NULL DEFAULT CURRENT_DATE,
    used          INTEGER      NOT NULL DEFAULT 0,
    daily_limit   INTEGER      NOT NULL DEFAULT 50,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(platform, action_type, date)
  );

  CREATE INDEX IF NOT EXISTS idx_quota_platform_date
    ON quota_tracking (platform, date);

  CREATE OR REPLACE FUNCTION update_quota_timestamp()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_quota_updated_at ON quota_tracking;
  CREATE TRIGGER trg_quota_updated_at
    BEFORE UPDATE ON quota_tracking
    FOR EACH ROW EXECUTE FUNCTION update_quota_timestamp();
`;

/**
 * Ensure the quota_tracking table exists and is up to date.
 * @returns {Promise<void>}
 */
async function ensureSchema() {
  const client = await getClient();
  await client.query(SCHEMA_SQL);
}

// ---------------------------------------------------------------------------
// Core functions (exportable as module)
// ---------------------------------------------------------------------------

/**
 * Get the current quota status for a specific platform + action.
 *
 * @param {string} platform - 'linkedin' or 'instagram'.
 * @param {string} actionType - e.g. 'invite', 'follow'.
 * @returns {Promise<{platform: string, actionType: string, date: string, used: number, limit: number, remaining: number}>}
 */
async function getQuota(platform, actionType) {
  const client = await getClient();
  await ensureSchema();

  const today = new Date().toISOString().slice(0, 10);
  const limit =
    (DEFAULT_LIMITS[platform] && DEFAULT_LIMITS[platform][actionType]) || 50;

  const { rows } = await client.query(
    `INSERT INTO quota_tracking (platform, action_type, date, daily_limit)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (platform, action_type, date) DO NOTHING
     RETURNING *;`,
    [platform, actionType, today, limit],
  );

  const row = rows[0] || (await client.query(
    `SELECT * FROM quota_tracking WHERE platform=$1 AND action_type=$2 AND date=$3;`,
    [platform, actionType, today],
  )).rows[0];

  return {
    platform: row.platform,
    actionType: row.action_type,
    date: row.date.toISOString().slice(0, 10),
    used: row.used,
    limit: row.daily_limit,
    remaining: row.daily_limit - row.used,
  };
}

/**
 * Increment the quota usage for a specific platform + action.
 *
 * @param {string} platform
 * @param {string} actionType
 * @param {number} [amount=1] - How many to increment.
 * @returns {Promise<{allowed: boolean, remaining: number}>}
 */
async function incrementQuota(platform, actionType, amount = 1) {
  const client = await getClient();
  await ensureSchema();

  const today = new Date().toISOString().slice(0, 10);
  const limit =
    (DEFAULT_LIMITS[platform] && DEFAULT_LIMITS[platform][actionType]) || 50;

  const { rows } = await client.query(
    `INSERT INTO quota_tracking (platform, action_type, date, daily_limit, used)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (platform, action_type, date)
     DO UPDATE SET used = quota_tracking.used + $5
     RETURNING used, daily_limit;`,
    [platform, actionType, today, limit, amount],
  );

  const row = rows[0];
  return {
    allowed: row.used <= row.daily_limit,
    remaining: Math.max(0, row.daily_limit - row.used),
  };
}

/**
 * Reset all quotas for today (or a specific date).
 * Typically run as a cron job at midnight.
 *
 * @param {string} [date] - Date string (YYYY-MM-DD). Defaults to today.
 * @returns {Promise<{reset: number}>}
 */
async function resetQuotas(date) {
  const client = await getClient();
  await ensureSchema();

  const targetDate = date || new Date().toISOString().slice(0, 10);

  const { rowCount } = await client.query(
    `UPDATE quota_tracking SET used = 0, updated_at = NOW() WHERE date = $1;`,
    [targetDate],
  );

  return { reset: rowCount };
}

/**
 * Report all quota usage for a given date.
 *
 * @param {string} [date] - Date string (YYYY-MM-DD). Defaults to today.
 * @returns {Promise<Array<{platform: string, actionType: string, used: number, limit: number, remaining: number}>>}
 */
async function reportQuotas(date) {
  const client = await getClient();
  await ensureSchema();

  const targetDate = date || new Date().toISOString().slice(0, 10);

  const { rows } = await client.query(
    `SELECT
       platform,
       action_type  AS "actionType",
       used,
       daily_limit AS "limit",
       (daily_limit - used) AS remaining
     FROM quota_tracking
     WHERE date = $1
     ORDER BY platform, action_type;`,
    [targetDate],
  );

  return rows;
}

// ---------------------------------------------------------------------------
// CLI Interface
// ---------------------------------------------------------------------------

/**
 * Parse CLI arguments.
 * Supports `--key=value` and `--key value` styles.
 * @param {string[]} argv - process.argv.slice(2)
 */
function parseArgs(argv) {
  const args = {};
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        args[arg.slice(2, eqIndex)] = arg.slice(eqIndex + 1);
      } else {
        args[arg.slice(2)] = argv[++i] || '';
      }
    } else {
      positional.push(arg);
    }
  }

  return { command: positional[0] || 'report', args };
}

/**
 * Pretty-print a quota table to the console.
 * @param {Array} rows
 */
function printQuotaTable(rows) {
  if (rows.length === 0) {
    console.log('  No quota data found for today.');
    return;
  }

  console.log('');
  console.log('  ┌─────────────┬────────────────────┬───────┬───────┬───────────┐');
  console.log('  │ Platform    │ Action             │ Used  │ Limit │ Remaining │');
  console.log('  ├─────────────┼────────────────────┼───────┼───────┼───────────┤');

  for (const row of rows) {
    const pct = row.limit > 0 ? Math.round((row.used / row.limit) * 100) : 0;
    const warn = pct >= 90 ? ' ⚠️' : '';
    const platform = row.platform.padEnd(11);
    const action = row.actionType.padEnd(18);
    const used = String(row.used).padStart(5);
    const limit = String(row.limit).padStart(5);
    const remaining = String(row.remaining).padStart(9);

    console.log(`  │ ${platform} │ ${action} │ ${used} │ ${limit} │ ${remaining} │${warn}`);
  }

  console.log('  └─────────────┴────────────────────┴───────┴───────┴───────────┘');
  console.log('');
}

/**
 * Main CLI entry point.
 */
async function main() {
  const { command, args } = parseArgs(process.argv.slice(2));

  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║  📊  Quota Manager — Client Acquisition      ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');

  try {
    switch (command) {
      // -----------------------------------------------------------------------
      case 'report': {
        const date = args.date || null;
        console.log(`  Fetching quota report for ${date || 'today'}...`);
        const rows = await reportQuotas(date);
        printQuotaTable(rows);

        // Summary
        const totalUsed = rows.reduce((sum, r) => sum + r.used, 0);
        const totalLimit = rows.reduce((sum, r) => sum + r.limit, 0);
        console.log(`  Total actions used today: ${totalUsed} / ${totalLimit}`);
        break;
      }

      // -----------------------------------------------------------------------
      case 'reset': {
        const date = args.date || null;
        console.log(`  Resetting quotas for ${date || 'today'}...`);
        const result = await resetQuotas(date);
        console.log(`  ✅ Reset ${result.reset} quota record(s).`);
        break;
      }

      // -----------------------------------------------------------------------
      case 'check': {
        const platform = args.platform;
        const actionType = args.action;

        if (!platform || !actionType) {
          console.error('  ❌ Usage: node quota-manager.js check --platform=linkedin --action=invite');
          process.exit(1);
        }

        console.log(`  Checking quota: ${platform}/${actionType}`);
        const quota = await getQuota(platform, actionType);

        const pct = quota.limit > 0 ? Math.round((quota.used / quota.limit) * 100) : 0;
        const status = pct >= 100 ? '❌ EXHAUSTED' : pct >= 80 ? '⚠️  HIGH' : '✅ OK';

        console.log(`  Platform : ${quota.platform}`);
        console.log(`  Action   : ${quota.actionType}`);
        console.log(`  Date     : ${quota.date}`);
        console.log(`  Used     : ${quota.used} / ${quota.limit} (${pct}%)`);
        console.log(`  Remaining: ${quota.remaining}`);
        console.log(`  Status   : ${status}`);
        break;
      }

      // -----------------------------------------------------------------------
      case 'increment': {
        const platform = args.platform;
        const actionType = args.action;
        const amount = parseInt(args.amount, 10) || 1;

        if (!platform || !actionType) {
          console.error('  ❌ Usage: node quota-manager.js increment --platform=linkedin --action=invite [--amount=1]');
          process.exit(1);
        }

        console.log(`  Incrementing ${platform}/${actionType} by ${amount}...`);
        const result = await incrementQuota(platform, actionType, amount);
        console.log(`  Allowed  : ${result.allowed}`);
        console.log(`  Remaining: ${result.remaining}`);
        break;
      }

      // -----------------------------------------------------------------------
      default: {
        console.error(`  ❌ Unknown command: ${command}`);
        console.error('');
        console.error('  Available commands:');
        console.error('    report                                        Show all quotas');
        console.error('    reset [--date=YYYY-MM-DD]                    Reset quotas');
        console.error('    check --platform=X --action=Y                Check specific quota');
        console.error('    increment --platform=X --action=Y [--amount=N]  Increment quota');
        console.error('');
        process.exit(1);
      }
    }
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);

    if (err.code === 'ECONNREFUSED') {
      console.error('');
      console.error('  Could not connect to PostgreSQL.');
      console.error(`  Connection: ${PG_CONFIG.host}:${PG_CONFIG.port}/${PG_CONFIG.database}`);
      console.error('  Ensure the database is running and credentials are correct in .env');
    }

    process.exit(1);
  } finally {
    await closeClient();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// ---------------------------------------------------------------------------
// Module Exports (for use as a library)
// ---------------------------------------------------------------------------
module.exports = {
  getClient,
  closeClient,
  ensureSchema,
  getQuota,
  incrementQuota,
  resetQuotas,
  reportQuotas,
  DEFAULT_LIMITS,
};
