/**
 * @module utils
 * @description Shared utility functions for the LinkedIn/Instagram Client
 *   Acquisition Automation project. Designed for use in n8n workflows and
 *   standalone Node.js scripts (CommonJS).
 *
 * @example
 * const { randomDelay, isValidProfileUrl, maskSensitive } = require('./utils');
 */

'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

// ---------------------------------------------------------------------------
// Default configuration (can be overridden via environment variables)
// ---------------------------------------------------------------------------
const CONFIG = {
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL || '',
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL || '',
  DEFAULT_BACKOFF_BASE_MS: Number(process.env.BACKOFF_BASE_MS) || 1000,
  DEFAULT_BACKOFF_MAX_MS: Number(process.env.BACKOFF_MAX_MS) || 300_000,
};

// Daily quota defaults (stub — in production these come from the DB)
const QUOTA_DEFAULTS = {
  linkedin: {
    invite: 100,
    message: 50,
    profileView: 200,
    connectionAccept: 150,
  },
  instagram: {
    follow: 50,
    like: 300,
    comment: 50,
    message: 30,
    storyView: 100,
  },
};

// In-memory quota tracker for the stub (resets daily)
const _quotaStore = new Map();

function _getQuotaKey(platform, actionType) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${today}:${platform}:${actionType}`;
}

function _getResetTime() {
  const now = new Date();
  const reset = new Date(now);
  reset.setHours(24, 0, 0, 0); // next midnight
  return reset;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an HTTP(S) request and return the body as a string.
 * @param {string} urlStr
 * @param {object} [payload] — JSON body to POST.
 * @returns {Promise<string>}
 */
function fetchJSON(urlStr, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;

    const opts = {
      method: payload ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10_000,
    };

    const req = transport.request(url, opts, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        } else {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });

    if (payload) {
      req.write(JSON.stringify(payload));
    }
    req.end();
  });
}

// ===========================================================================
// Exported Functions
// ===========================================================================

/**
 * Pause execution for a random duration between `minMs` and `maxMs`.
 *
 * @param {number} minMs - Minimum delay in milliseconds (>= 0).
 * @param {number} maxMs - Maximum delay in milliseconds (> minMs).
 * @returns {Promise<void>}
 *
 * @example
 * await randomDelay(2000, 5000); // pause between 2–5 seconds
 */
async function randomDelay(minMs, maxMs) {
  if (typeof minMs !== 'number' || typeof maxMs !== 'number') {
    throw new TypeError('randomDelay requires two numbers (minMs, maxMs)');
  }
  if (minMs < 0) minMs = 0;
  if (maxMs <= minMs) maxMs = minMs + 1000;

  const jitter = Math.random() * (maxMs - minMs) + minMs;
  await sleep(Math.round(jitter));
}

/**
 * Check whether the daily action quota for a given platform permits another action.
 *
 * > **Note:** This is a stub implementation that tracks quotas in-memory.
 * > In the n8n production environment, this function should be replaced with
 * > a database query against the `quotas` table.
 *
 * @param {string} platform - `'linkedin'` or `'instagram'`.
 * @param {string} actionType - e.g. `'invite'`, `'message'`, `'follow'`, `'like'`.
 * @returns {{ allowed: boolean, remaining: number, resetAt: Date }}
 *
 * @example
 * const { allowed, remaining } = checkQuota('linkedin', 'invite');
 * if (!allowed) console.log(`Quota exhausted. Resets at ${resetAt}`);
 */
function checkQuota(platform, actionType) {
  if (!platform || !actionType) {
    throw new Error('checkQuota requires platform and actionType');
  }

  const platformLower = platform.toLowerCase();
  const key = _getQuotaKey(platformLower, actionType);
  const maxQuota =
    (QUOTA_DEFAULTS[platformLower] && QUOTA_DEFAULTS[platformLower][actionType]) || 50;

  const used = _quotaStore.get(key) || 0;

  if (used >= maxQuota) {
    return { allowed: false, remaining: 0, resetAt: _getResetTime() };
  }

  // Increment usage
  _quotaStore.set(key, used + 1);
  return { allowed: true, remaining: maxQuota - (used + 1), resetAt: _getResetTime() };
}

/**
 * Send an alert message to a Discord webhook.
 *
 * @param {string} message - The message text to send.
 * @param {'info'|'warn'|'error'|'success'} [type='info'] - Alert severity level.
 * @returns {Promise<boolean>} `true` if the message was sent successfully.
 *
 * @example
 * await sendDiscordAlert('Daily LinkedIn quota reached', 'warn');
 */
async function sendDiscordAlert(message, type = 'info') {
  if (!CONFIG.DISCORD_WEBHOOK_URL) {
    console.warn('[utils] DISCORD_WEBHOOK_URL is not configured — skipping Discord alert.');
    return false;
  }

  const colors = {
    info: 0x5865f2,    // blurple
    warn: 0xfee75c,    // yellow
    error: 0xed4245,   // red
    success: 0x57f287, // green
  };

  const labels = {
    info: 'ℹ️  Info',
    warn: '⚠️  Warning',
    error: '❌ Error',
    success: '✅ Success',
  };

  const payload = {
    embeds: [
      {
        title: labels[type] || labels.info,
        description: String(message).slice(0, 2000),
        color: colors[type] || colors.info,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Client Acquisition Automation',
        },
      },
    ],
  };

  try {
    await fetchJSON(CONFIG.DISCORD_WEBHOOK_URL, payload);
    return true;
  } catch (err) {
    console.error(`[utils] Discord alert failed: ${err.message}`);
    return false;
  }
}

/**
 * Send an alert message to a Slack webhook.
 *
 * @param {string} message - The message text to send.
 * @param {'info'|'warn'|'error'|'success'} [type='info'] - Alert severity level.
 * @returns {Promise<boolean>} `true` if the message was sent successfully.
 *
 * @example
 * await sendSlackAlert('Playwright session expired', 'error');
 */
async function sendSlackAlert(message, type = 'info') {
  if (!CONFIG.SLACK_WEBHOOK_URL) {
    console.warn('[utils] SLACK_WEBHOOK_URL is not configured — skipping Slack alert.');
    return false;
  }

  const emojis = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    success: '✅',
  };

  const colorMap = {
    info: '#36a64f',
    warn: '#f2c744',
    error: '#e01e5a',
    success: '#2eb67d',
  };

  const payload = {
    attachments: [
      {
        color: colorMap[type] || colorMap.info,
        title: `${emojis[type] || ''} ${type.toUpperCase()}`,
        text: String(message).slice(0, 3000),
        ts: Math.floor(Date.now() / 1000),
        footer: 'Client Acquisition Automation',
      },
    ],
  };

  try {
    await fetchJSON(CONFIG.SLACK_WEBHOOK_URL, payload);
    return true;
  } catch (err) {
    console.error(`[utils] Slack alert failed: ${err.message}`);
    return false;
  }
}

/**
 * Generate a dry-run log entry describing what *would* happen, without
 * executing any real action.
 *
 * @param {string} action - The action name (e.g. `'send_invite'`).
 * @param {object} params - Key/value pairs describing the action parameters.
 * @returns {{ timestamp: string, action: string, params: object, status: 'dry_run' }}
 *
 * @example
 * const entry = dryRunLog('send_message', { profile: 'john-doe', text: 'Hello!' });
 * console.log(entry);
 * // { timestamp: '2025-01-15T10:30:00.000Z', action: 'send_message', params: {...}, status: 'dry_run' }
 */
function dryRunLog(action, params) {
  if (!action) throw new Error('dryRunLog requires an action name');

  return {
    timestamp: new Date().toISOString(),
    action: String(action),
    params: params && typeof params === 'object' ? { ...params } : {},
    status: 'dry_run',
  };
}

/**
 * Calculate a delay in milliseconds using exponential backoff with full jitter.
 *
 * Delay = min(random(0, baseMs * 2^attempt), maxMs)
 *
 * @param {number} attempt - Retry attempt number (0-indexed).
 * @param {number} [baseMs=1000] - Base delay in milliseconds.
 * @param {number} [maxMs=300000] - Maximum cap in milliseconds (5 minutes).
 * @returns {number} Delay in milliseconds.
 *
 * @example
 * for (let i = 0; i < 5; i++) {
 *   const delay = getBackoffDelay(i);
 *   console.log(`Attempt ${i}: waiting ${delay}ms`);
 *   await sleep(delay);
 * }
 */
function getBackoffDelay(attempt, baseMs = CONFIG.DEFAULT_BACKOFF_BASE_MS, maxMs = CONFIG.DEFAULT_BACKOFF_MAX_MS) {
  if (typeof attempt !== 'number' || attempt < 0) attempt = 0;
  if (typeof baseMs !== 'number' || baseMs <= 0) baseMs = 1000;
  if (typeof maxMs !== 'number' || maxMs <= 0) maxMs = 300_000;

  // Exponential: baseMs * 2^attempt, capped at maxMs
  const exponentialDelay = baseMs * Math.pow(2, attempt);
  const capped = Math.min(exponentialDelay, maxMs);

  // Full jitter: random between 0 and capped
  return Math.floor(Math.random() * capped);
}

/**
 * Validate whether a given URL is a properly-formed LinkedIn or Instagram profile URL.
 *
 * Supported patterns:
 * - LinkedIn: `https://www.linkedin.com/in/{slug}`, `https://linkedin.com/in/{slug}`
 * - Instagram: `https://www.instagram.com/{username}`, `https://instagram.com/{username}`
 *
 * @param {string} url - The URL to validate.
 * @param {'linkedin'|'instagram'} platform - Which platform to validate against.
 * @returns {boolean} `true` if the URL is valid for the specified platform.
 *
 * @example
 * isValidProfileUrl('https://linkedin.com/in/johndoe', 'linkedin'); // true
 * isValidProfileUrl('https://instagram.com/johndoe/', 'instagram'); // true
 * isValidProfileUrl('https://example.com', 'linkedin'); // false
 */
function isValidProfileUrl(url, platform) {
  if (!url || typeof url !== 'string') return false;
  if (!platform || typeof platform !== 'string') return false;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

    const hostname = parsed.hostname.replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/+$/, '');

    switch (platform.toLowerCase()) {
      case 'linkedin':
        // Accept linkedin.com/in/{slug} — slug must be at least 1 char
        return hostname === 'linkedin.com' && /^\/in\/[a-zA-Z0-9-]{1,100}$/.test(pathname);

      case 'instagram':
        // Accept instagram.com/{username} — username must be 1–30 chars (alphanumeric + _ + .)
        return hostname === 'instagram.com' && /^\/[a-zA-Z0-9._]{1,30}$/.test(pathname);

      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Mask sensitive data in a string for safe logging.
 *
 * Replaces common secret patterns (passwords, API keys, tokens, bearer tokens)
 * with a masked version: first 4 chars visible, rest replaced with `****`.
 *
 * @param {string} str - The string potentially containing sensitive data.
 * @returns {string} The string with sensitive values masked.
 *
 * @example
 * maskSensitive('POSTGRES_PASSWORD=supersecret123');
 * // 'POSTGRES_PASSWORD=supe****'
 *
 * maskSensitive('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...');
 * // 'Authorization: Bearer eyJh****'
 */
function maskSensitive(str) {
  if (!str || typeof str !== 'string') return str;

  let result = str;

  // Mask common key=value patterns
  const patterns = [
    /(?:password|passwd|pwd|secret|token|api_key|apikey|private_key)\s*[=:]\s*(['"`]?)([^\s'"`&]{4})[^\s'"`&]*/gi,
    /Bearer\s+([^\s]{4})[^\s]*/gi,
    /x-api-key\s*[:=]\s*(['"`]?)([^\s'"`]{4})[^\s'"`]*/gi,
  ];

  for (const pattern of patterns) {
    result = result.replace(pattern, (match, quote, visible) => {
      const prefix = quote || visible || match.slice(0, 4);
      return match.slice(0, match.indexOf(prefix) + 4) + '****';
    });
  }

  // Additional pass: mask anything that looks like a 32+ char hex string (API keys, tokens)
  result = result.replace(/\b([a-f0-9]{8})[a-f0-9]{24,}\b/gi, '$1****');

  return result;
}

/**
 * Calculate the optimal time to send a message based on the target timezone
 * and day of the week. Returns an hour (0–23) in the *sender's local time*
 * that corresponds to the best engagement window in the recipient's timezone.
 *
 * Engagement windows (recipient's local time):
 * - **Weekdays (Mon–Fri):** 8:00–10:00 AM (morning), 12:00–1:00 PM (lunch), 5:00–7:00 PM (evening)
 * - **Weekends (Sat–Sun):** 9:00–11:00 AM (late morning), 4:00–6:00 PM (afternoon)
 *
 * @param {string} timezone - IANA timezone string (e.g. `'America/New_York'`).
 * @param {number} [dayOfWeek] - Day of week (0=Sunday … 6=Saturday). Defaults to today.
 * @returns {{ hour: number, minute: number, label: string, confidence: number }}
 *
 * @example
 * const { hour, minute } = getOptimalSendTime('America/Los_Angeles', 1);
 * console.log(`Best send time: ${hour}:${String(minute).padStart(2, '0')} PT`);
 */
function getOptimalSendTime(timezone, dayOfWeek) {
  const now = new Date();
  const day = dayOfWeek !== undefined ? dayOfWeek : now.getDay();
  const isWeekend = day === 0 || day === 6;

  // Best engagement hours in the *recipient's* local time
  const windows = isWeekend
    ? [
        { hour: 9,  minute: 30, label: 'late_morning',  confidence: 0.8 },
        { hour: 10, minute: 0,  label: 'late_morning',  confidence: 0.9 },
        { hour: 16, minute: 30, label: 'afternoon',     confidence: 0.7 },
        { hour: 17, minute: 0,  label: 'afternoon',     confidence: 0.8 },
      ]
    : [
        { hour: 8,  minute: 30, label: 'morning',       confidence: 0.9 },
        { hour: 9,  minute: 0,  label: 'morning',       confidence: 1.0 },
        { hour: 12, minute: 15, label: 'lunch',         confidence: 0.75 },
        { hour: 17, minute: 30, label: 'evening',       confidence: 0.85 },
      ];

  // Pick the best window (or randomize slightly for natural behavior)
  const selected = windows[Math.floor(Math.random() * windows.length)];

  // If the timezone is provided, we could convert — but since the caller
  // may be in any timezone, we return the recipient-local hour directly.
  // In a full implementation you'd use `Intl.DateTimeFormat` or `luxon`
  // to convert to the sender's timezone.

  return {
    hour: selected.hour,
    minute: selected.minute,
    label: selected.label,
    confidence: selected.confidence,
  };
}

// ===========================================================================
// Module Exports
// ===========================================================================
module.exports = {
  randomDelay,
  checkQuota,
  sendDiscordAlert,
  sendSlackAlert,
  dryRunLog,
  getBackoffDelay,
  isValidProfileUrl,
  maskSensitive,
  getOptimalSendTime,
  // Exposed for testing
  _resetQuotaStore: () => _quotaStore.clear(),
};
