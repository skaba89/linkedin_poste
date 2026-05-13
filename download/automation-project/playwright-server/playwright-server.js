/**
 * Playwright Automation Server
 *
 * A production-ready Express.js server that controls LinkedIn and Instagram
 * via Playwright. Provides RESTful endpoints for connection management,
 * messaging, scraping, and batch operations.
 *
 * @module playwright-server
 * @requires express
 * @requires playwright
 * @requires crypto
 * @requires fs
 * @requires path
 */

'use strict';

const express = require('express');
const { chromium } = require('playwright');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration & Environment Variables
// ---------------------------------------------------------------------------

const {
  NODE_ENV = 'production',
  PORT = 3000,
  PLAYWRIGHT_API_KEY = '',
  LINKEDIN_MIN_DELAY_MS = '2000',
  LINKEDIN_MAX_DELAY_MS = '8000',
  INSTAGRAM_MIN_DELAY_MS = '3000',
  INSTAGRAM_MAX_DELAY_MS = '10000',
  GLOBAL_ACTION_DELAY_MS = '1000',
  DRY_RUN = 'false',
  SESSIONS_DIR = './sessions',
  LINKEDIN_EMAIL = '',
  LINKEDIN_PASSWORD = '',
  INSTAGRAM_USERNAME = '',
  INSTAGRAM_PASSWORD = '',
  LINKEDIN_DAILY_INVITE_QUOTA = '100',
  LINKEDIN_DAILY_MESSAGE_QUOTA = '150',
  INSTAGRAM_DAILY_MESSAGE_QUOTA = '80',
  LINKEDIN_MAX_RETRIES = '3',
  INSTAGRAM_MAX_RETRIES = '3',
  BROWSER_TIMEOUT_MS = '60000',
  NAVIGATION_TIMEOUT_MS = '30000',
  LOG_LEVEL = 'info',
} = process.env;

// ---------------------------------------------------------------------------
// Parsed Configuration Constants
// ---------------------------------------------------------------------------

const CONFIG = Object.freeze({
  isDryRun: DRY_RUN === 'true' || DRY_RUN === '1',
  isProduction: NODE_ENV === 'production',
  port: parseInt(PORT, 10),
  apiKey: PLAYWRIGHT_API_KEY,
  linkedin: {
    minDelay: parseInt(LINKEDIN_MIN_DELAY_MS, 10),
    maxDelay: parseInt(LINKEDIN_MAX_DELAY_MS, 10),
    dailyInviteQuota: parseInt(LINKEDIN_DAILY_INVITE_QUOTA, 10),
    dailyMessageQuota: parseInt(LINKEDIN_DAILY_MESSAGE_QUOTA, 10),
    email: LINKEDIN_EMAIL,
    password: LINKEDIN_PASSWORD,
    maxRetries: parseInt(LINKEDIN_MAX_RETRIES, 10),
  },
  instagram: {
    minDelay: parseInt(INSTAGRAM_MIN_DELAY_MS, 10),
    maxDelay: parseInt(INSTAGRAM_MAX_DELAY_MS, 10),
    dailyMessageQuota: parseInt(INSTAGRAM_DAILY_MESSAGE_QUOTA, 10),
    username: INSTAGRAM_USERNAME,
    password: INSTAGRAM_PASSWORD,
    maxRetries: parseInt(INSTAGRAM_MAX_RETRIES, 10),
  },
  globalActionDelay: parseInt(GLOBAL_ACTION_DELAY_MS, 10),
  sessionsDir: SESSIONS_DIR,
  browserTimeout: parseInt(BROWSER_TIMEOUT_MS, 10),
  navigationTimeout: parseInt(NAVIGATION_TIMEOUT_MS, 10),
  logLevel: LOG_LEVEL,
});

// ---------------------------------------------------------------------------
// Daily Quota Tracker (in-memory)
// ---------------------------------------------------------------------------

/**
 * Tracks daily action counts per platform and action type.
 * Resets automatically when the date changes.
 * @type {Map<string, { count: number, date: string }>}
 */
const dailyQuotaTracker = new Map();

/**
 * Get today's date string in YYYY-MM-DD format.
 * @returns {string}
 */
function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Increment and check the daily quota for a given platform and action type.
 *
 * @param {string} platform - "linkedin" or "instagram"
 * @param {string} actionType - "invite" or "message"
 * @returns {{ allowed: boolean, remaining: number, limit: number }}
 */
function checkAndIncrementQuota(platform, actionType) {
  const key = `${platform}:${actionType}`;
  const today = getTodayDateString();

  let entry = dailyQuotaTracker.get(key);

  if (!entry || entry.date !== today) {
    entry = { count: 0, date: today };
    dailyQuotaTracker.set(key, entry);
  }

  let limit;
  switch (`${platform}:${actionType}`) {
    case 'linkedin:invite':
      limit = CONFIG.linkedin.dailyInviteQuota;
      break;
    case 'linkedin:message':
      limit = CONFIG.linkedin.dailyMessageQuota;
      break;
    case 'instagram:message':
      limit = CONFIG.instagram.dailyMessageQuota;
      break;
    default:
      limit = Infinity;
  }

  const allowed = entry.count < limit;
  if (allowed) {
    entry.count += 1;
  }

  return { allowed, remaining: Math.max(0, limit - entry.count), limit };
}

/**
 * Get current quota status without incrementing.
 *
 * @param {string} platform
 * @param {string} actionType
 * @returns {{ used: number, remaining: number, limit: number }}
 */
function getQuotaStatus(platform, actionType) {
  const key = `${platform}:${actionType}`;
  const today = getTodayDateString();
  const entry = dailyQuotaTracker.get(key);

  let limit;
  switch (`${platform}:${actionType}`) {
    case 'linkedin:invite':
      limit = CONFIG.linkedin.dailyInviteQuota;
      break;
    case 'linkedin:message':
      limit = CONFIG.linkedin.dailyMessageQuota;
      break;
    case 'instagram:message':
      limit = CONFIG.instagram.dailyMessageQuota;
      break;
    default:
      limit = Infinity;
  }

  const used = entry && entry.date === today ? entry.count : 0;
  return { used, remaining: Math.max(0, limit - used), limit };
}

// ---------------------------------------------------------------------------
// Structured Logger (JSON)
// ---------------------------------------------------------------------------

/** @type {('debug'|'info'|'warn'|'error')} */
const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

/** @type {number} */
const LOG_LEVEL_PRIORITY = { debug: 0, info: 1, warn: 2, error: 3 };

/**
 * Structured JSON logger that writes to stdout/stderr.
 */
const logger = {
  /**
   * Format and emit a structured log entry.
   * @param {'debug'|'info'|'warn'|'error'} level
   * @param {string} message
   * @param {Object} [meta={}]
   */
  _emit(level, message, meta = {}) {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[CONFIG.logLevel]) {
      return;
    }
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
    const line = JSON.stringify(entry);

    if (level === 'error') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  },

  /** @param {string} msg @param {Object} [meta] */
  debug(msg, meta) { this._emit('debug', msg, meta); },
  /** @param {string} msg @param {Object} [meta] */
  info(msg, meta) { this._emit('info', msg, meta); },
  /** @param {string} msg @param {Object} [meta] */
  warn(msg, meta) { this._emit('warn', msg, meta); },
  /** @param {string} msg @param {Object} [meta] */
  error(msg, meta) { this._emit('error', msg, meta); },
};

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Generate a unique action ID.
 * @returns {string} A random hex string of length 16.
 */
function generateActionId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Return a random integer between min and max (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Apply a random delay jitter for the given platform.
 *
 * @param {string} platform - "linkedin" or "instagram"
 * @returns {Promise<void>}
 */
async function randomDelay(platform) {
  const cfg = platform === 'linkedin' ? CONFIG.linkedin : CONFIG.instagram;
  const delay = randomInt(cfg.minDelay, cfg.maxDelay);
  logger.info('Applying random delay', { platform, delayMs: delay });
  await sleep(delay);
}

/**
 * Safely read a JSON file.
 * @param {string} filePath
 * @returns {Object|null} Parsed JSON or null on failure.
 */
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      logger.debug('Cookie file does not exist', { filePath });
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    logger.warn('Failed to read JSON file', { filePath, error: err.message });
    return null;
  }
}

/**
 * Safely write a JSON file.
 * @param {string} filePath
 * @param {Object} data
 * @returns {boolean} True on success.
 */
function writeJsonFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    logger.error('Failed to write JSON file', { filePath, error: err.message });
    return false;
  }
}

/**
 * Ensure the sessions directory exists.
 */
function ensureSessionsDir() {
  const dir = path.resolve(CONFIG.sessionsDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info('Created sessions directory', { dir });
  }
}

// ---------------------------------------------------------------------------
// Browser Manager
// ---------------------------------------------------------------------------

/**
 * Manages Playwright browser lifecycle with crash recovery.
 */
class BrowserManager {
  constructor() {
    /** @type {import('playwright').Browser|null} */
    this._browser = null;
    /** @type {boolean} */
    this._isLaunching = false;
    /** @type {NodeJS.Timeout|null} */
    this._cleanupTimer = null;
  }

  /**
   * Launch or return the existing browser instance.
   *
   * @param {Object} [options={}]
   * @param {boolean} [options.headless=true]
   * @returns {Promise<import('playwright').Browser>}
   */
  async getBrowser(options = {}) {
    const { headless = true } = options;

    if (this._browser && this._browser.isConnected()) {
      return this._browser;
    }

    if (this._isLaunching) {
      logger.debug('Browser launch already in progress, waiting...');
      // Wait for the in-progress launch to finish
      while (this._isLaunching) {
        await sleep(200);
      }
      if (this._browser && this._browser.isConnected()) {
        return this._browser;
      }
    }

    this._isLaunching = true;
    try {
      logger.info('Launching Chromium browser', { headless });
      this._browser = await chromium.launch({
        headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars',
          '--window-size=1920,1080',
        ],
      });
      logger.info('Browser launched successfully');
      this._scheduleCleanup();
      return this._browser;
    } catch (err) {
      logger.error('Failed to launch browser', { error: err.message });
      throw new Error(`Browser launch failed: ${err.message}`);
    } finally {
      this._isLaunching = false;
    }
  }

  /**
   * Create a new browser context with the given platform's cookies loaded.
   *
   * @param {string} platform - "linkedin" or "instagram"
   * @returns {Promise<{ context: import('playwright').BrowserContext, page: import('playwright').Page }>}
   */
  async createContext(platform) {
    const browser = await this.getBrowser();
    const cookieFile = path.resolve(
      CONFIG.sessionsDir,
      `${platform}_cookies.json`
    );

    const contextOptions = {
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    };

    const cookies = readJsonFile(cookieFile);
    if (cookies && Array.isArray(cookies)) {
      contextOptions.storageState = { cookies, origins: [] };
      logger.info('Loaded stored cookies', { platform, cookieCount: cookies.length });
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    page.setDefaultTimeout(CONFIG.browserTimeout);
    page.setDefaultNavigationTimeout(CONFIG.navigationTimeout);

    return { context, page };
  }

  /**
   * Save cookies from a browser context to disk.
   *
   * @param {string} platform
   * @param {import('playwright').BrowserContext} context
   */
  async saveCookies(platform, context) {
    try {
      const cookies = await context.cookies();
      const cookieFile = path.resolve(
        CONFIG.sessionsDir,
        `${platform}_cookies.json`
      );
      writeJsonFile(cookieFile, cookies);
      logger.info('Saved cookies to disk', { platform, cookieCount: cookies.length });
    } catch (err) {
      logger.warn('Failed to save cookies', { platform, error: err.message });
    }
  }

  /**
   * Schedule automatic browser cleanup after inactivity.
   */
  _scheduleCleanup() {
    if (this._cleanupTimer) {
      clearTimeout(this._cleanupTimer);
    }
    this._cleanupTimer = setTimeout(async () => {
      logger.info('Browser inactivity timeout, closing...');
      await this.close();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Close the browser and release resources.
   */
  async close() {
    if (this._cleanupTimer) {
      clearTimeout(this._cleanupTimer);
      this._cleanupTimer = null;
    }
    if (this._browser) {
      try {
        if (this._browser.isConnected()) {
          await this._browser.close();
          logger.info('Browser closed');
        }
      } catch (err) {
        logger.warn('Error closing browser', { error: err.message });
      }
      this._browser = null;
    }
  }
}

/** @type {BrowserManager} */
const browserManager = new BrowserManager();

// ---------------------------------------------------------------------------
// Platform Login Handlers
// ---------------------------------------------------------------------------

/**
 * Ensure the user is logged in to LinkedIn.
 * Uses stored cookies if available; otherwise attempts email/password login.
 *
 * @param {import('playwright').Page} page
 * @param {import('playwright').BrowserContext} context
 * @returns {Promise<boolean>} True if login was successful.
 */
async function ensureLinkedInLogin(page, context) {
  try {
    await page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'domcontentloaded',
    });
    await sleep(2000);

    // Check if already logged in (look for something that only appears when logged in)
    const currentUrl = page.url();
    if (
      !currentUrl.includes('login') &&
      !currentUrl.includes('authwall')
    ) {
      logger.info('LinkedIn session is valid (cookies authenticated)');
      return true;
    }

    // If we need to login, check credentials
    if (!CONFIG.linkedin.email || !CONFIG.linkedin.password) {
      throw new Error(
        'LinkedIn credentials not configured. Set LINKEDIN_EMAIL and LINKEDIN_PASSWORD environment variables.'
      );
    }

    logger.info('Attempting LinkedIn login with credentials');

    // Wait for email field
    const emailInput = await page.waitForSelector('#username', {
      timeout: 15000,
    });
    await emailInput.fill(CONFIG.linkedin.email);

    const passwordInput = await page.waitForSelector('#password', {
      timeout: 5000,
    });
    await passwordInput.fill(CONFIG.linkedin.password);

    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');
    await sleep(3000);

    // Handle potential 2FA or CAPTCHA
    const afterLoginUrl = page.url();
    if (afterLoginUrl.includes('login') || afterLoginUrl.includes('authwall')) {
      // Check if there's a security challenge
      const securityChallenge = await page
        .$('[data-id="challenge-submit"]')
        .catch(() => null);
      if (securityChallenge) {
        throw new Error(
          'LinkedIn security challenge detected (2FA/CAPTCHA). Manual intervention required.'
        );
      }
      throw new Error('LinkedIn login failed. Check credentials.');
    }

    // Save new cookies
    await browserManager.saveCookies('linkedin', context);
    logger.info('LinkedIn login successful, cookies saved');
    return true;
  } catch (err) {
    logger.error('LinkedIn login failed', { error: err.message });
    await browserManager.saveCookies('linkedin', context);
    return false;
  }
}

/**
 * Ensure the user is logged in to Instagram.
 * Uses stored cookies if available; otherwise attempts username/password login.
 *
 * @param {import('playwright').Page} page
 * @param {import('playwright').BrowserContext} context
 * @returns {Promise<boolean>} True if login was successful.
 */
async function ensureInstagramLogin(page, context) {
  try {
    await page.goto('https://www.instagram.com/', {
      waitUntil: 'domcontentloaded',
    });
    await sleep(2000);

    const currentUrl = page.url();
    if (
      !currentUrl.includes('accounts/login') &&
      !currentUrl.includes('accounts/login/')
    ) {
      logger.info('Instagram session is valid (cookies authenticated)');
      return true;
    }

    if (!CONFIG.instagram.username || !CONFIG.instagram.password) {
      throw new Error(
        'Instagram credentials not configured. Set INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD environment variables.'
      );
    }

    logger.info('Attempting Instagram login with credentials');

    const usernameInput = await page.waitForSelector(
      'input[name="username"]',
      { timeout: 15000 }
    );
    await usernameInput.fill(CONFIG.instagram.username);

    const passwordInput = await page.waitForSelector(
      'input[name="password"]',
      { timeout: 5000 }
    );
    await passwordInput.fill(CONFIG.instagram.password);

    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');
    await sleep(4000);

    // Handle "Turn on Notifications" dialog if present
    const notNowBtn = await page
      .$('button:has-text("Not Now")')
      .catch(() => null);
    if (notNowBtn) {
      await notNowBtn.click();
      await sleep(1000);
    }

    const afterLoginUrl = page.url();
    if (afterLoginUrl.includes('accounts/login')) {
      throw new Error('Instagram login failed. Check credentials.');
    }

    await browserManager.saveCookies('instagram', context);
    logger.info('Instagram login successful, cookies saved');
    return true;
  } catch (err) {
    logger.error('Instagram login failed', { error: err.message });
    await browserManager.saveCookies('instagram', context);
    return false;
  }
}

/**
 * Ensure the user is logged in for the given platform.
 *
 * @param {string} platform - "linkedin" or "instagram"
 * @param {import('playwright').Page} page
 * @param {import('playwright').BrowserContext} context
 * @returns {Promise<boolean>}
 */
async function ensureLogin(platform, page, context) {
  switch (platform) {
    case 'linkedin':
      return ensureLinkedInLogin(page, context);
    case 'instagram':
      return ensureInstagramLogin(page, context);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

// ---------------------------------------------------------------------------
// Action Executors
// ---------------------------------------------------------------------------

/**
 * Send a connection invite on LinkedIn.
 *
 * @param {Object} params
 * @param {string} params.profileUrl
 * @param {string} [params.message]
 * @returns {Promise<{ success: boolean, actionId: string, error?: string }>}
 */
async function executeLinkedInInvite({ profileUrl, message }) {
  const actionId = generateActionId();

  if (CONFIG.isDryRun) {
    logger.info('[DRY RUN] LinkedIn invite', { actionId, profileUrl, message });
    return { success: true, actionId, dryRun: true };
  }

  const { context, page } = await browserManager.createContext('linkedin');

  try {
    const loggedIn = await ensureLogin('linkedin', page, context);
    if (!loggedIn) {
      throw new Error('Could not authenticate to LinkedIn');
    }

    logger.info('Navigating to LinkedIn profile', { actionId, profileUrl });
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    // Click the "Connect" button
    const connectBtn = await page.waitForSelector(
      'button:has-text("Connect")',
      { timeout: 15000 }
    );

    if (!connectBtn) {
      throw new Error('Connect button not found on this profile');
    }

    await connectBtn.click();
    await sleep(1500);

    // If a message is provided, add a note
    if (message) {
      const addNoteBtn = await page
        .$(
          'button[aria-label="Add a note"], button:has-text("Add a note"), .artdeco-button--secondary:has-text("Add a note")'
        )
        .catch(() => null);

      if (addNoteBtn) {
        await addNoteBtn.click();
        await sleep(1000);

        const textarea = await page.waitForSelector(
          'textarea[name="message"], textarea[aria-label="Add a note"]',
          { timeout: 5000 }
        );

        if (textarea) {
          await textarea.fill(message);
          await sleep(500);
        }
      }
    }

    // Click the send button (the final Connect/Send button)
    const sendBtn = await page
      .$(
        'button[aria-label="Send now"], button:has-text("Send"), .artdeco-button--primary:has-text("Send")'
      )
      .catch(() => null);

    if (sendBtn) {
      await sendBtn.click();
    }

    await sleep(2000);

    // Save cookies after action
    await browserManager.saveCookies('linkedin', context);

    logger.info('LinkedIn invite sent successfully', {
      actionId,
      profileUrl,
      hasMessage: !!message,
    });

    return { success: true, actionId };
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Send a message on a given platform.
 *
 * @param {Object} params
 * @param {string} params.platform
 * @param {string} params.profileUrl
 * @param {string} params.message
 * @returns {Promise<{ success: boolean, actionId: string, error?: string }>}
 */
async function executeSendMessage({ platform, profileUrl, message }) {
  const actionId = generateActionId();

  if (CONFIG.isDryRun) {
    logger.info('[DRY RUN] Send message', {
      actionId,
      platform,
      profileUrl,
      message,
    });
    return { success: true, actionId, dryRun: true };
  }

  if (platform === 'linkedin') {
    return executeLinkedInMessage({ profileUrl, message, actionId });
  } else if (platform === 'instagram') {
    return executeInstagramMessage({ profileUrl, message, actionId });
  }

  throw new Error(`Unsupported platform for messaging: ${platform}`);
}

/**
 * Send a message on LinkedIn.
 *
 * @param {Object} params
 * @param {string} params.profileUrl
 * @param {string} params.message
 * @param {string} params.actionId
 * @returns {Promise<{ success: boolean, actionId: string, error?: string }>}
 */
async function executeLinkedInMessage({ profileUrl, message, actionId }) {
  const { context, page } = await browserManager.createContext('linkedin');

  try {
    const loggedIn = await ensureLogin('linkedin', page, context);
    if (!loggedIn) {
      throw new Error('Could not authenticate to LinkedIn');
    }

    logger.info('Navigating to LinkedIn profile for messaging', {
      actionId,
      profileUrl,
    });
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    // Click the "Message" button
    const messageBtn = await page.waitForSelector(
      'button[aria-label="Message"], button:has-text("Message"), a[href*="messaging"]',
      { timeout: 15000 }
    );

    if (!messageBtn) {
      throw new Error('Message button not found on this profile');
    }

    await messageBtn.click();
    await sleep(2000);

    // Handle potential new tab
    const pages = context.pages();
    const activePage = pages.length > 1 ? pages[pages.length - 1] : page;
    await activePage.waitForLoadState('domcontentloaded');
    await sleep(2000);

    // Find the message input
    const messageInput = await activePage.waitForSelector(
      'div[contenteditable="true"], textarea[name="message"], div[role="textbox"]',
      { timeout: 15000 }
    );

    if (!messageInput) {
      throw new Error('Message input field not found');
    }

    await messageInput.click();
    await messageInput.fill(message);
    await sleep(500);

    // Press Enter to send (LinkedIn messaging uses Enter)
    await messageInput.press('Enter');
    await sleep(2000);

    await browserManager.saveCookies('linkedin', context);

    logger.info('LinkedIn message sent successfully', {
      actionId,
      profileUrl,
      messageLength: message.length,
    });

    return { success: true, actionId };
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Send a message on Instagram.
 *
 * @param {Object} params
 * @param {string} params.profileUrl
 * @param {string} params.message
 * @param {string} params.actionId
 * @returns {Promise<{ success: boolean, actionId: string, error?: string }>}
 */
async function executeInstagramMessage({ profileUrl, message, actionId }) {
  const { context, page } = await browserManager.createContext('instagram');

  try {
    const loggedIn = await ensureLogin('instagram', page, context);
    if (!loggedIn) {
      throw new Error('Could not authenticate to Instagram');
    }

    logger.info('Navigating to Instagram profile for messaging', {
      actionId,
      profileUrl,
    });
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    // Click "Message" button on Instagram profile
    const messageBtn = await page.waitForSelector(
      'div[role="button"]:has-text("Message"), button:has-text("Message"), a[href*="/direct/"]',
      { timeout: 15000 }
    );

    if (!messageBtn) {
      throw new Error('Message button not found on this Instagram profile');
    }

    await messageBtn.click();
    await sleep(3000);

    // Find the message input in the DM modal/page
    const messageInput = await page.waitForSelector(
      'textarea[placeholder="Message..."], textarea[placeholder*="message"], textarea[name="message"], form textarea',
      { timeout: 15000 }
    );

    if (!messageInput) {
      throw new Error('Message input field not found in Instagram DM');
    }

    await messageInput.click();
    await messageInput.fill(message);
    await sleep(500);

    // Press Enter to send
    await messageInput.press('Enter');
    await sleep(2000);

    await browserManager.saveCookies('instagram', context);

    logger.info('Instagram message sent successfully', {
      actionId,
      profileUrl,
      messageLength: message.length,
    });

    return { success: true, actionId };
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Read recent messages from a platform's inbox.
 *
 * @param {Object} params
 * @param {string} params.platform
 * @param {number} [params.limit=20]
 * @returns {Promise<{ success: boolean, messages: Array<Object> }>}
 */
async function executeReadMessages({ platform, limit = 20 }) {
  const actionId = generateActionId();

  if (CONFIG.isDryRun) {
    logger.info('[DRY RUN] Read messages', { actionId, platform, limit });
    return {
      success: true,
      actionId,
      dryRun: true,
      messages: [
        {
          from: 'dry-run-user',
          message: 'This is a dry run placeholder message.',
          timestamp: new Date().toISOString(),
          conversationUrl: 'about:blank',
        },
      ],
    };
  }

  if (platform === 'linkedin') {
    return executeLinkedInReadMessages({ limit, actionId });
  } else if (platform === 'instagram') {
    return executeInstagramReadMessages({ limit, actionId });
  }

  throw new Error(`Unsupported platform for reading messages: ${platform}`);
}

/**
 * Read recent LinkedIn messages.
 *
 * @param {Object} params
 * @param {number} params.limit
 * @param {string} params.actionId
 * @returns {Promise<{ success: boolean, messages: Array<Object> }>}
 */
async function executeLinkedInReadMessages({ limit, actionId }) {
  const { context, page } = await browserManager.createContext('linkedin');

  try {
    const loggedIn = await ensureLogin('linkedin', page, context);
    if (!loggedIn) {
      throw new Error('Could not authenticate to LinkedIn');
    }

    logger.info('Navigating to LinkedIn messaging', { actionId });
    await page.goto('https://www.linkedin.com/messaging/', {
      waitUntil: 'domcontentloaded',
    });
    await sleep(3000);

    // Extract message previews from the messaging page
    const messages = await page.evaluate((maxCount) => {
      const items = [];
      // Try to find message list items
      const selectors = [
        'msg-thread',
        '.msg-conversation-listitem',
        '[data-testid="message-item"]',
        'li[data-id]',
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          for (let i = 0; i < Math.min(elements.length, maxCount); i++) {
            const el = elements[i];
            const nameEl =
              el.querySelector('.msg-conversation-listitem__name') ||
              el.querySelector('[data-testid="conversation-name"]') ||
              el.querySelector('h4, h5, .name');
            const previewEl =
              el.querySelector('.msg-conversation-listitem__last-message') ||
              el.querySelector('[data-testid="message-preview"]') ||
              el.querySelector('.preview');
            const linkEl =
              el.querySelector('a[href]') || el.closest('a[href]');
            const timeEl =
              el.querySelector('time') || el.querySelector('.time');

            items.push({
              from: nameEl ? nameEl.textContent.trim() : 'Unknown',
              message: previewEl ? previewEl.textContent.trim() : '',
              timestamp: timeEl
                ? timeEl.getAttribute('datetime') ||
                  timeEl.textContent.trim()
                : new Date().toISOString(),
              conversationUrl: linkEl
                ? linkEl.getAttribute('href')
                : '',
            });
          }
          break;
        }
      }

      return items;
    }, limit);

    logger.info('LinkedIn messages read', {
      actionId,
      count: messages.length,
    });

    return { success: true, actionId, messages };
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Read recent Instagram messages.
 *
 * @param {Object} params
 * @param {number} params.limit
 * @param {string} params.actionId
 * @returns {Promise<{ success: boolean, messages: Array<Object> }>}
 */
async function executeInstagramReadMessages({ limit, actionId }) {
  const { context, page } = await browserManager.createContext('instagram');

  try {
    const loggedIn = await ensureLogin('instagram', page, context);
    if (!loggedIn) {
      throw new Error('Could not authenticate to Instagram');
    }

    logger.info('Navigating to Instagram messaging', { actionId });
    await page.goto('https://www.instagram.com/direct/inbox/', {
      waitUntil: 'domcontentloaded',
    });
    await sleep(3000);

    const messages = await page.evaluate((maxCount) => {
      const items = [];
      const selectors = [
        'a[href*="/direct/t/"]',
        'div[role="row"]',
        '.x9f619',
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          for (let i = 0; i < Math.min(elements.length, maxCount); i++) {
            const el = elements[i];
            const textContent = el.textContent.trim();

            items.push({
              from: textContent.split('\n')[0] || 'Unknown',
              message:
                textContent.split('\n').slice(1).join(' ').substring(0, 200) ||
                '',
              timestamp: new Date().toISOString(),
              conversationUrl: el.getAttribute('href') || '',
            });
          }
          break;
        }
      }

      return items;
    }, limit);

    logger.info('Instagram messages read', {
      actionId,
      count: messages.length,
    });

    return { success: true, actionId, messages };
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Accept a LinkedIn invitation.
 *
 * @param {Object} params
 * @param {string} params.profileUrl
 * @returns {Promise<{ success: boolean, actionId: string, error?: string }>}
 */
async function executeAcceptInvite({ profileUrl }) {
  const actionId = generateActionId();

  if (CONFIG.isDryRun) {
    logger.info('[DRY RUN] Accept LinkedIn invite', {
      actionId,
      profileUrl,
    });
    return { success: true, actionId, dryRun: true };
  }

  const { context, page } = await browserManager.createContext('linkedin');

  try {
    const loggedIn = await ensureLogin('linkedin', page, context);
    if (!loggedIn) {
      throw new Error('Could not authenticate to LinkedIn');
    }

    // Navigate to invitations page
    logger.info('Navigating to LinkedIn invitations', { actionId });
    await page.goto(
      'https://www.linkedin.com/mynetwork/invitation-manager/',
      { waitUntil: 'domcontentloaded' }
    );
    await sleep(3000);

    // Try to find and click accept for the specific profile
    // First, try the direct approach — search for the profile in the invite list
    const accepted = await page.evaluate((targetUrl) => {
      const acceptButtons = document.querySelectorAll(
        'button[aria-label*="Accept"], button:has-text("Accept"), .artdeco-button--primary:has-text("Accept")'
      );

      // Find the parent row/element for each accept button to check the profile
      for (const btn of acceptButtons) {
        const container =
          btn.closest('tr') ||
          btn.closest('[data-id]') ||
          btn.closest('li') ||
          btn.parentElement?.parentElement;
        if (!container) continue;

        const links = container.querySelectorAll('a[href*="/in/"]');
        for (const link of links) {
          if (link.href.includes(targetUrl) || link.href.includes(targetUrl.replace('https://www.linkedin.com', ''))) {
            btn.click();
            return true;
          }
        }
      }
      return false;
    }, profileUrl);

    if (!accepted) {
      // Fallback: just accept the first pending invite if URL match fails
      logger.warn(
        'Could not find specific invite by URL, attempting to accept first pending invite',
        { actionId, profileUrl }
      );

      const firstAccept = await page.$(
        'button[aria-label*="Accept"], button:has-text("Accept")'
      );
      if (firstAccept) {
        await firstAccept.click();
        await sleep(2000);
      } else {
        throw new Error('No pending invitations found to accept');
      }
    }

    await sleep(2000);
    await browserManager.saveCookies('linkedin', context);

    logger.info('LinkedIn invite accepted', { actionId, profileUrl });
    return { success: true, actionId };
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Scrape a LinkedIn profile for public data.
 *
 * @param {Object} params
 * @param {string} params.profileUrl
 * @returns {Promise<{ success: boolean, actionId: string, data?: Object, error?: string }>}
 */
async function executeScrapeProfile({ profileUrl }) {
  const actionId = generateActionId();

  if (CONFIG.isDryRun) {
    logger.info('[DRY RUN] Scrape LinkedIn profile', {
      actionId,
      profileUrl,
    });
    return {
      success: true,
      actionId,
      dryRun: true,
      data: {
        name: 'Dry Run User',
        headline: 'Placeholder Headline',
        company: 'Dry Run Corp',
        location: 'Dry Run City',
        about: 'This is a dry run placeholder profile.',
      },
    };
  }

  const { context, page } = await browserManager.createContext('linkedin');

  try {
    const loggedIn = await ensureLogin('linkedin', page, context);
    if (!loggedIn) {
      throw new Error('Could not authenticate to LinkedIn');
    }

    logger.info('Scraping LinkedIn profile', { actionId, profileUrl });
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    const profileData = await page.evaluate(() => {
      /** @type {string} */
      let name = '';
      /** @type {string} */
      let headline = '';
      /** @type {string} */
      let company = '';
      /** @type {string} */
      let location = '';
      /** @type {string} */
      let about = '';

      // Name
      const nameEl =
        document.querySelector('h1') ||
        document.querySelector('[data-testid="profile-name"]') ||
        document.querySelector('.text-heading-xlarge');
      if (nameEl) name = nameEl.textContent.trim();

      // Headline
      const headlineEl =
        document.querySelector('div.text-body-medium') ||
        document.querySelector('[data-testid="profile-headline"]') ||
        document.querySelector('.text-body-medium.break-words');
      if (headlineEl) headline = headlineEl.textContent.trim();

      // Company / current position
      const companyEls = document.querySelectorAll(
        'button[aria-label*="Current company"], a[href*="/company/"], .inline-show-more-text'
      );
      if (companyEls.length > 0) {
        company = companyEls[0].textContent.trim();
      }

      // Location
      const locationEl =
        document.querySelector('button[aria-label*="Location"]') ||
        document.querySelector('.text-body-small.inline');
      if (locationEl) location = locationEl.textContent.trim();

      // About section
      const aboutEl =
        document.querySelector(
          '#about, div[id="about"] > div, section[id="about"]'
        ) ||
        document.querySelector('.pv-about__summary-text') ||
        document.querySelector('[data-testid="about-section"]');
      if (aboutEl) {
        about = aboutEl.textContent.trim().substring(0, 2000);
      }

      return {
        name,
        headline,
        company,
        location,
        about,
        scrapedAt: new Date().toISOString(),
      };
    });

    logger.info('LinkedIn profile scraped', {
      actionId,
      profileUrl,
      name: profileData.name,
    });

    return { success: true, actionId, data: profileData };
  } finally {
    await context.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Express App Setup
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// Middleware: API Key Authentication
// ---------------------------------------------------------------------------

/**
 * Middleware that validates the x-api-key header against the configured API key.
 * Returns 401 if missing or invalid.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function apiKeyAuth(req, res, next) {
  const providedKey = req.headers['x-api-key'];

  if (!providedKey) {
    logger.warn('Request missing API key', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({
      success: false,
      error: 'API key is required. Provide it via the x-api-key header.',
    });
  }

  if (!CONFIG.apiKey) {
    logger.error('Server API key not configured');
    return res.status(500).json({
      success: false,
      error: 'Server API key not configured.',
    });
  }

  if (providedKey !== CONFIG.apiKey) {
    logger.warn('Invalid API key provided', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(403).json({
      success: false,
      error: 'Invalid API key.',
    });
  }

  next();
}

// ---------------------------------------------------------------------------
// Middleware: Request Logging
// ---------------------------------------------------------------------------

/**
 * Middleware that logs every incoming request.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requestLogger(req, res, next) {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    contentType: req.headers['content-type'],
  });
  next();
}

// Apply global middleware
app.use(requestLogger);

// ---------------------------------------------------------------------------
// Health Check Endpoint
// ---------------------------------------------------------------------------

/**
 * GET /health
 * Returns server health status, uptime, and quota information.
 */
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();

  res.json({
    status: 'ok',
    uptime: Math.floor(uptime),
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    },
    dryRun: CONFIG.isDryRun,
    quotas: {
      linkedinInvites: getQuotaStatus('linkedin', 'invite'),
      linkedinMessages: getQuotaStatus('linkedin', 'message'),
      instagramMessages: getQuotaStatus('instagram', 'message'),
    },
    browserConnected:
      browserManager._browser !== null && browserManager._browser.isConnected(),
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// POST /send-invite
// ---------------------------------------------------------------------------

/**
 * POST /send-invite
 * Send a connection invite on a platform (currently LinkedIn only).
 *
 * @route POST /send-invite
 * @group Automation - Connection management
 * @param {Object} req.body - Request body
 * @param {string} req.body.platform - Platform name ("linkedin")
 * @param {string} req.body.profileUrl - URL of the profile to invite
 * @param {string} [req.body.message] - Optional connection note/message
 * @returns {{ success: boolean, actionId?: string, error?: string }}
 */
app.post('/send-invite', apiKeyAuth, async (req, res) => {
  const { platform, profileUrl, message } = req.body;

  // Validate inputs
  if (!platform || !profileUrl) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: platform, profileUrl',
    });
  }

  if (platform !== 'linkedin') {
    return res.status(400).json({
      success: false,
      error: `Platform "${platform}" is not supported for invites. Only "linkedin" is supported.`,
    });
  }

  if (typeof profileUrl !== 'string' || !profileUrl.startsWith('http')) {
    return res.status(400).json({
      success: false,
      error: 'profileUrl must be a valid URL starting with http(s)://',
    });
  }

  // Check quota
  const quota = checkAndIncrementQuota(platform, 'invite');
  if (!quota.allowed) {
    logger.warn('Daily invite quota exceeded', { platform, quota });
    return res.status(429).json({
      success: false,
      error: 'Daily invite quota exceeded',
      quota,
    });
  }

  try {
    // Apply global action delay
    await sleep(CONFIG.globalActionDelay);

    const result = await executeLinkedInInvite({ profileUrl, message });

    // Apply random delay after action
    await randomDelay(platform);

    return res.json(result);
  } catch (err) {
    logger.error('Failed to send invite', {
      platform,
      profileUrl,
      error: err.message,
      stack: CONFIG.logLevel === 'debug' ? err.stack : undefined,
    });

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /send-message
// ---------------------------------------------------------------------------

/**
 * POST /send-message
 * Send a direct message on LinkedIn or Instagram.
 *
 * @route POST /send-message
 * @group Automation - Messaging
 * @param {Object} req.body
 * @param {string} req.body.platform - "linkedin" or "instagram"
 * @param {string} req.body.profileUrl - URL of the profile to message
 * @param {string} req.body.message - The message to send
 * @returns {{ success: boolean, actionId?: string, error?: string }}
 */
app.post('/send-message', apiKeyAuth, async (req, res) => {
  const { platform, profileUrl, message } = req.body;

  if (!platform || !profileUrl || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: platform, profileUrl, message',
    });
  }

  if (!['linkedin', 'instagram'].includes(platform)) {
    return res.status(400).json({
      success: false,
      error: `Platform "${platform}" is not supported. Use "linkedin" or "instagram".`,
    });
  }

  if (typeof profileUrl !== 'string' || !profileUrl.startsWith('http')) {
    return res.status(400).json({
      success: false,
      error: 'profileUrl must be a valid URL starting with http(s)://',
    });
  }

  if (typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'message must be a non-empty string',
    });
  }

  // Check quota
  const quota = checkAndIncrementQuota(platform, 'message');
  if (!quota.allowed) {
    logger.warn('Daily message quota exceeded', { platform, quota });
    return res.status(429).json({
      success: false,
      error: 'Daily message quota exceeded',
      quota,
    });
  }

  try {
    await sleep(CONFIG.globalActionDelay);

    const result = await executeSendMessage({ platform, profileUrl, message });

    await randomDelay(platform);

    return res.json(result);
  } catch (err) {
    logger.error('Failed to send message', {
      platform,
      profileUrl,
      error: err.message,
      stack: CONFIG.logLevel === 'debug' ? err.stack : undefined,
    });

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /read-messages
// ---------------------------------------------------------------------------

/**
 * POST /read-messages
 * Read recent messages from a platform's inbox.
 *
 * @route POST /read-messages
 * @group Automation - Messaging
 * @param {Object} req.body
 * @param {string} req.body.platform - "linkedin" or "instagram"
 * @param {number} [req.body.limit=20] - Maximum number of messages to return
 * @returns {{ success: boolean, messages?: Array, error?: string }}
 */
app.post('/read-messages', apiKeyAuth, async (req, res) => {
  const { platform, limit = 20 } = req.body;

  if (!platform) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: platform',
    });
  }

  if (!['linkedin', 'instagram'].includes(platform)) {
    return res.status(400).json({
      success: false,
      error: `Platform "${platform}" is not supported. Use "linkedin" or "instagram".`,
    });
  }

  const parsedLimit = parseInt(limit, 10);
  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return res.status(400).json({
      success: false,
      error: 'limit must be a number between 1 and 100',
    });
  }

  try {
    await sleep(CONFIG.globalActionDelay);

    const result = await executeReadMessages({
      platform,
      limit: parsedLimit,
    });

    await randomDelay(platform);

    return res.json(result);
  } catch (err) {
    logger.error('Failed to read messages', {
      platform,
      error: err.message,
      stack: CONFIG.logLevel === 'debug' ? err.stack : undefined,
    });

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /accept-invite
// ---------------------------------------------------------------------------

/**
 * POST /accept-invite
 * Accept a pending connection invitation on LinkedIn.
 *
 * @route POST /accept-invite
 * @group Automation - Connection management
 * @param {Object} req.body
 * @param {string} req.body.platform - "linkedin"
 * @param {string} req.body.profileUrl - URL of the profile whose invite to accept
 * @returns {{ success: boolean, actionId?: string, error?: string }}
 */
app.post('/accept-invite', apiKeyAuth, async (req, res) => {
  const { platform, profileUrl } = req.body;

  if (!platform || !profileUrl) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: platform, profileUrl',
    });
  }

  if (platform !== 'linkedin') {
    return res.status(400).json({
      success: false,
      error: `Platform "${platform}" is not supported for accepting invites. Only "linkedin" is supported.`,
    });
  }

  if (typeof profileUrl !== 'string' || !profileUrl.startsWith('http')) {
    return res.status(400).json({
      success: false,
      error: 'profileUrl must be a valid URL starting with http(s)://',
    });
  }

  try {
    await sleep(CONFIG.globalActionDelay);

    const result = await executeAcceptInvite({ profileUrl });

    await randomDelay(platform);

    return res.json(result);
  } catch (err) {
    logger.error('Failed to accept invite', {
      platform,
      profileUrl,
      error: err.message,
      stack: CONFIG.logLevel === 'debug' ? err.stack : undefined,
    });

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /scrape-profile
// ---------------------------------------------------------------------------

/**
 * POST /scrape-profile
 * Scrape public profile data from LinkedIn.
 *
 * @route POST /scrape-profile
 * @group Automation - Data extraction
 * @param {Object} req.body
 * @param {string} req.body.platform - "linkedin"
 * @param {string} req.body.profileUrl - URL of the profile to scrape
 * @returns {{ success: boolean, data?: Object, error?: string }}
 */
app.post('/scrape-profile', apiKeyAuth, async (req, res) => {
  const { platform, profileUrl } = req.body;

  if (!platform || !profileUrl) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: platform, profileUrl',
    });
  }

  if (platform !== 'linkedin') {
    return res.status(400).json({
      success: false,
      error: `Platform "${platform}" is not supported for scraping. Only "linkedin" is supported.`,
    });
  }

  if (typeof profileUrl !== 'string' || !profileUrl.startsWith('http')) {
    return res.status(400).json({
      success: false,
      error: 'profileUrl must be a valid URL starting with http(s)://',
    });
  }

  try {
    await sleep(CONFIG.globalActionDelay);

    const result = await executeScrapeProfile({ profileUrl });

    await randomDelay(platform);

    return res.json(result);
  } catch (err) {
    logger.error('Failed to scrape profile', {
      platform,
      profileUrl,
      error: err.message,
      stack: CONFIG.logLevel === 'debug' ? err.stack : undefined,
    });

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /batch-action
// ---------------------------------------------------------------------------

/**
 * POST /batch-action
 * Execute multiple actions sequentially with rate limiting and quota checking.
 *
 * @route POST /batch-action
 * @group Automation - Batch operations
 * @param {Object} req.body
 * @param {Array<Object>} req.body.actions - Array of action objects
 * @returns {{ success: boolean, results: Array, quota: Object }}
 */
app.post('/batch-action', apiKeyAuth, async (req, res) => {
  const { actions } = req.body;

  if (!Array.isArray(actions) || actions.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'actions must be a non-empty array',
    });
  }

  if (actions.length > 50) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 50 actions per batch request',
    });
  }

  // Validate each action
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (!action.type || !action.platform) {
      return res.status(400).json({
        success: false,
        error: `Action at index ${i} is missing required fields: type, platform`,
      });
    }

    if (!['send-invite', 'send-message'].includes(action.type)) {
      return res.status(400).json({
        success: false,
        error: `Action at index ${i} has invalid type "${action.type}". Must be "send-invite" or "send-message".`,
      });
    }

    if (!action.profileUrl) {
      return res.status(400).json({
        success: false,
        error: `Action at index ${i} is missing required field: profileUrl`,
      });
    }

    if (action.type === 'send-message' && !action.message) {
      return res.status(400).json({
        success: false,
        error: `Action at index ${i} is of type "send-message" but missing required field: message`,
      });
    }
  }

  logger.info('Starting batch action', { totalActions: actions.length });

  /** @type {Array<{ success: boolean, actionId?: string, error?: string, index: number }>} */
  const results = [];
  let stoppedEarly = false;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];

    // Determine quota type
    const quotaType = action.type === 'send-invite' ? 'invite' : 'message';
    const quota = checkAndIncrementQuota(action.platform, quotaType);

    if (!quota.allowed) {
      logger.warn('Batch action stopped: quota exceeded', {
        index: i,
        platform: action.platform,
        quotaType,
        quota,
      });

      results.push({
        success: false,
        index: i,
        error: `Daily ${quotaType} quota exceeded for ${action.platform}`,
        quota,
      });

      stoppedEarly = true;
      break;
    }

    try {
      await sleep(CONFIG.globalActionDelay);

      let result;

      switch (action.type) {
        case 'send-invite':
          result = await executeLinkedInInvite({
            profileUrl: action.profileUrl,
            message: action.message,
          });
          break;

        case 'send-message':
          result = await executeSendMessage({
            platform: action.platform,
            profileUrl: action.profileUrl,
            message: action.message,
          });
          break;

        default:
          result = {
            success: false,
            index: i,
            error: `Unknown action type: ${action.type}`,
          };
      }

      results.push({ ...result, index: i });

      // Apply random delay between actions
      if (i < actions.length - 1) {
        await randomDelay(action.platform);
      }
    } catch (err) {
      logger.error('Batch action failed', {
        index: i,
        type: action.type,
        platform: action.platform,
        error: err.message,
      });

      results.push({
        success: false,
        index: i,
        error: err.message,
      });
    }
  }

  const finalQuota = {
    linkedinInvites: getQuotaStatus('linkedin', 'invite'),
    linkedinMessages: getQuotaStatus('linkedin', 'message'),
    instagramMessages: getQuotaStatus('instagram', 'message'),
  };

  logger.info('Batch action completed', {
    totalRequested: actions.length,
    totalExecuted: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    stoppedEarly,
  });

  return res.json({
    success: true,
    results,
    quota: finalQuota,
    stoppedEarly,
  });
});

// ---------------------------------------------------------------------------
// 404 Handler
// ---------------------------------------------------------------------------

/**
 * Catch-all for undefined routes.
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------

/**
 * Global error handling middleware.
 * @param {Error} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error('Unhandled server error', {
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: CONFIG.isProduction
      ? 'Internal server error'
      : err.message,
  });
});

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

/**
 * Clean up resources on server shutdown.
 * @param {string} signal - The signal that triggered the shutdown
 */
async function gracefulShutdown(signal) {
  logger.info('Shutting down server', { signal });

  // Close the browser
  await browserManager.close();

  // Allow a brief period for in-flight requests to complete
  setTimeout(() => {
    logger.info('Server shutdown complete');
    process.exit(0);
  }, 1000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', {
    error: err.message,
    stack: err.stack,
  });
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: typeof reason === 'object' ? reason.message : String(reason),
  });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

/**
 * Start the Express server.
 */
async function startServer() {
  try {
    ensureSessionsDir();

    // Warn if API key is not configured
    if (!CONFIG.apiKey && !CONFIG.isProduction) {
      logger.warn(
        'No PLAYWRIGHT_API_KEY configured. API authentication will reject all requests.'
      );
    }

    if (CONFIG.isDryRun) {
      logger.warn('Running in DRY_RUN mode — no actual browser actions will be performed');
    }

    app.listen(CONFIG.port, () => {
      logger.info('Playwright Automation Server started', {
        port: CONFIG.port,
        environment: NODE_ENV,
        dryRun: CONFIG.isDryRun,
        linkedinQuotas: {
          invites: CONFIG.linkedin.dailyInviteQuota,
          messages: CONFIG.linkedin.dailyMessageQuota,
        },
        instagramQuotas: {
          messages: CONFIG.instagram.dailyMessageQuota,
        },
        delayRanges: {
          linkedin: `${CONFIG.linkedin.minDelay}ms - ${CONFIG.linkedin.maxDelay}ms`,
          instagram: `${CONFIG.instagram.minDelay}ms - ${CONFIG.instagram.maxDelay}ms`,
        },
      });
    });
  } catch (err) {
    logger.error('Failed to start server', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

startServer();

// ---------------------------------------------------------------------------
// Exports (for testing purposes)
// ---------------------------------------------------------------------------

module.exports = {
  app,
  CONFIG,
  browserManager,
  checkAndIncrementQuota,
  getQuotaStatus,
  generateActionId,
  randomDelay,
  dailyQuotaTracker,
};
