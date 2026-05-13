/**
 * Scheduled Posts Auto-Publish Worker
 *
 * Runs as a separate PM2 process.
 * Polls the database every 5 minutes for posts with:
 *   status = 'scheduled' AND scheduledDate <= now()
 * and publishes them to LinkedIn via the REST API.
 *
 * Usage:
 *   bun run worker-scheduled-publish.ts
 *   pm2 start ecosystem.config.js    (manages both Next.js + worker)
 *
 * Environment:
 *   DATABASE_URL is hardcoded to the project SQLite file.
 *   PrismaClient is instantiated directly (no Next.js path aliases).
 */

import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import path from 'path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL || 'file:/app/db/custom.db';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DATABASE_URL;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const LINKEDIN_API_URL = 'https://api.linkedin.com/rest/posts';
const LINKEDIN_API_VERSION = '202510';

// ---------------------------------------------------------------------------
// Prisma client (standalone, not using db.ts path alias)
// ---------------------------------------------------------------------------

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const prefix = `[scheduled-publish-worker]`;
  const extra = meta ? ' ' + JSON.stringify(meta) : '';
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`${ts} ${prefix} ${level.toUpperCase()}: ${message}${extra}`);
}

function linkedinHeaders(accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'LinkedIn-Version': LINKEDIN_API_VERSION,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  };
}

interface AuthorResult {
  author: string;
  mode: string;
}

function getAuthorUrn(account: {
  publishAs: string;
  personId: string | null;
  organizationId: string | null;
}): AuthorResult {
  if (account.publishAs === 'person' && account.personId) {
    return { author: `urn:li:person:${account.personId}`, mode: 'person' };
  }
  if (account.organizationId) {
    return { author: `urn:li:organization:${account.organizationId}`, mode: 'organization' };
  }
  if (account.personId) {
    return { author: `urn:li:person:${account.personId}`, mode: 'person' };
  }
  return { author: '', mode: 'none' };
}

// ---------------------------------------------------------------------------
// LinkedIn image upload helpers (inline — no Next.js path alias)
// ---------------------------------------------------------------------------

interface RegisterUploadResult {
  uploadUrl: string;
  asset: string;
  uploadHeaders: Record<string, string>;
}

async function registerImageUpload(
  accessToken: string,
  owner: string
): Promise<RegisterUploadResult> {
  const response = await fetch(
    `${LINKEDIN_API_URL.replace('/posts', '')}/images?action=initializeUpload`,
    {
      method: 'POST',
      headers: linkedinHeaders(accessToken),
      body: JSON.stringify({
        initializeUploadRequest: { owner },
      }),
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Record<string, string>;
    throw new Error(errorData.message || `LinkedIn image register failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    value: {
      uploadMechanism: { uploadUrl: string; uploadHeaders: Record<string, string> }[];
      asset: string;
    };
  };

  const mechanism = data.value.uploadMechanism[0];
  return {
    uploadUrl: mechanism.uploadUrl,
    asset: data.value.asset,
    uploadHeaders: mechanism.uploadHeaders,
  };
}

async function uploadImageBinary(
  uploadUrl: string,
  imageBuffer: Buffer,
  headers: Record<string, string>
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: new Uint8Array(imageBuffer),
  });

  if (!response.ok) {
    throw new Error(`LinkedIn image upload failed: ${response.status}`);
  }
}

/**
 * Resolve an image URL to a Buffer.
 * Supports: local paths (/images/..., /uploads/...), remote URLs (http/https), base64 data URIs.
 */
async function resolveImageBuffer(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('data:')) {
    const base64Match = imageUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (!base64Match) throw new Error('Format de data URI invalide');
    return Buffer.from(base64Match[1], 'base64');
  }
  if (imageUrl.startsWith('/images/') || imageUrl.startsWith('/uploads/')) {
    return readFile(path.join(process.cwd(), 'public', imageUrl));
  }
  if (imageUrl.startsWith('http')) {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Impossible de télécharger l'image distante: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Format d'URL d'image non supporté");
}

/**
 * Full image upload pipeline: resolve → register → upload → return asset URN.
 */
async function uploadImageToLinkedIn(
  accessToken: string,
  owner: string,
  imageUrl: string
): Promise<string> {
  const imageBuffer = await resolveImageBuffer(imageUrl);
  if (imageBuffer.length === 0) throw new Error("L'image est vide");

  const { uploadUrl, asset, uploadHeaders } = await registerImageUpload(accessToken, owner);
  await uploadImageBinary(uploadUrl, imageBuffer, uploadHeaders);
  return asset;
}

// ---------------------------------------------------------------------------
// LinkedIn API call
// ---------------------------------------------------------------------------

interface PublishResult {
  success: boolean;
  linkedinPostId?: string;
  error?: string;
  hadImage?: boolean;
  imageUploaded?: boolean;
}

async function publishToLinkedIn(
  accessToken: string,
  author: string,
  content: string,
  assetUrn?: string,
): Promise<PublishResult> {
  try {
    const body: Record<string, unknown> = {
      author,
      commentary: content,
      visibility: 'PUBLIC',
      lifecycleState: 'PUBLISHED',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
    };

    // Include media if an image asset URN is available
    if (assetUrn) {
      body.content = {
        media: [
          {
            id: assetUrn,
            mediaType: 'IMAGE',
            status: 'READY',
            title: {
              text: 'Post image',
            },
          },
        ],
      };
    }

    const response = await fetch(LINKEDIN_API_URL, {
      method: 'POST',
      headers: linkedinHeaders(accessToken),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
      const errMsg =
        (errorData?.message as string) ||
        `LinkedIn API error: HTTP ${response.status}`;
      return { success: false, error: errMsg, hadImage: !!assetUrn, imageUploaded: !!assetUrn };
    }

    // LinkedIn 201 sometimes returns an empty body.
    // The created post ID may be in the `x-restli-id` response header.
    const rawBody = await response.text().catch(() => '');
    let linkedinPostId: string | undefined;

    // Try parsing the JSON body first
    try {
      const data = JSON.parse(rawBody);
      if (data?.id) {
        linkedinPostId = String(data.id);
      }
    } catch {
      // Not JSON / empty body -- fall through to header check
    }

    // Fallback: read x-restli-id header
    if (!linkedinPostId) {
      const restliId = response.headers.get('x-restli-id');
      if (restliId) {
        linkedinPostId = restliId;
      }
    }

    return {
      success: true,
      linkedinPostId,
      hadImage: !!assetUrn,
      imageUploaded: !!assetUrn,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown LinkedIn publish error',
    };
  }
}

// ---------------------------------------------------------------------------
// Core worker loop
// ---------------------------------------------------------------------------

async function processScheduledPosts(): Promise<void> {
  const now = new Date();

  log('info', 'Polling for scheduled posts...', { now: now.toISOString() });

  // 1. Find posts where status='scheduled' AND scheduledDate <= now
  const posts = await prisma.post.findMany({
    where: {
      status: 'scheduled',
      scheduledDate: { lte: now },
    },
    include: {
      linkedinAccount: true,
    },
  });

  if (posts.length === 0) {
    log('info', 'No scheduled posts due for publishing.');
    return;
  }

  log('info', `Found ${posts.length} scheduled post(s) to publish.`);

  for (const post of posts) {
    await processPost(post);
  }
}

async function processPost(
  post: {
    id: string;
    subject: string;
    finalContent: string | null;
    imageUrl: string | null;
    authorId: string;
    linkedinAccountId: string | null;
    linkedinAccount: {
      id: string;
      accessToken: string;
      publishAs: string;
      personId: string | null;
      organizationId: string | null;
    } | null;
  },
): Promise<void> {
  const postLabel = `"${post.subject}" (${post.id.slice(0, 8)})`;

  try {
    // Validate content
    if (!post.finalContent) {
      log('warn', `Skipping ${postLabel}: no finalContent.`, { postId: post.id });
      await markFailed(post.id, 'Contenu final manquant. Impossible de publier.');
      return;
    }

    // 2. Resolve LinkedIn account
    let account = post.linkedinAccount;
    if (!account) {
      log('warn', `No linked account on ${postLabel}, searching for an active one...`);
      account = await prisma.linkedInAccount.findFirst({
        where: { isActive: true },
      });
    }

    if (!account) {
      log('warn', `No active LinkedIn account found for ${postLabel}.`);
      await markFailed(post.id, 'Aucun compte LinkedIn actif trouve. Configurez votre connexion LinkedIn.');
      return;
    }

    // 3. Determine author URN
    const { author, mode } = getAuthorUrn(account);
    if (!author) {
      log('warn', `Cannot determine author URN for ${postLabel}.`, { accountId: account.id });
      await markFailed(post.id, 'Impossible de determiner l\'auteur (personId ou organizationId manquant).');
      return;
    }

    log('info', `Publishing ${postLabel} as ${mode}...`, { author, hasImage: !!post.imageUrl });

    // 4. Upload image if present
    let assetUrn: string | undefined;
    let imageError: string | undefined;

    if (post.imageUrl) {
      try {
        log('info', `Uploading image for ${postLabel}...`, { imageUrl: post.imageUrl });
        assetUrn = await uploadImageToLinkedIn(account.accessToken, author, post.imageUrl);
        log('info', `Image uploaded for ${postLabel}, asset URN: ${assetUrn}`);
      } catch (imgErr) {
        imageError = imgErr instanceof Error ? imgErr.message : 'Erreur upload image';
        log('warn', `Image upload failed for ${postLabel}, publishing as text-only: ${imageError}`);
        // Gracefully degrade: publish as text-only
      }
    }

    // 5. POST to LinkedIn
    const result = await publishToLinkedIn(account.accessToken, author, post.finalContent, assetUrn);

    // 6. Create publication log
    const pubLog = await prisma.publicationLog.create({
      data: {
        postId: post.id,
        status: result.success ? 'success' : 'failed',
        errorMessage: result.error ?? null,
        linkedinPostId: result.linkedinPostId ?? null,
        publishedAt: result.success ? new Date() : null,
      },
    });

    if (result.success) {
      // 7. On success: update post, create notification, create audit log
      log('info', `Successfully published ${postLabel}. LinkedIn Post ID: ${result.linkedinPostId ?? '(none from API)'}${assetUrn ? ' (with image)' : ''}`);

      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: 'posted',
          linkedinPostId: result.linkedinPostId ?? null,
          errorMessage: null,
          linkedinAccountId: account.id,
        },
      });

      // Create notification
      const withImage = assetUrn ? ' avec image' : '';
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: 'post_published',
          title: 'Post publie automatiquement',
          message: `Votre post planifie \u00ab ${post.subject} \u00bb a ete publie sur LinkedIn${withImage} (${mode === 'person' ? 'profil personnel' : 'page organisation'}).`,
          actionUrl: `/posts/${post.id}`,
          metadata: JSON.stringify({ linkedinPostId: result.linkedinPostId, mode, source: 'worker', hadImage: !!assetUrn }),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          entityType: 'Post',
          entityId: post.id,
          action: 'auto_publish_success',
          userId: post.authorId,
          metadata: JSON.stringify({
            linkedinPostId: result.linkedinPostId,
            publishMode: mode,
            author,
            publicationLogId: pubLog.id,
            source: 'scheduled_worker',
            hadImage: !!post.imageUrl,
            imageUploaded: !!assetUrn,
            imageError,
          }),
        },
      });
    } else {
      // 8. On failure: update post, set errorMessage
      log('error', `Failed to publish ${postLabel}: ${result.error}`, { postId: post.id });

      await markFailed(post.id, result.error ?? 'Erreur inconnue lors de la publication LinkedIn.');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue du worker';
    log('error', `Unhandled error processing ${postLabel}: ${message}`, {
      postId: post.id,
      error: message,
    });
    await markFailed(post.id, message).catch(() => {
      log('error', `Double-failure: could not mark post ${post.id} as failed.`);
    });
  }
}

/**
 * Mark a post as failed and create the associated publication log.
 */
async function markFailed(postId: string, errorMessage: string): Promise<void> {
  await prisma.post.update({
    where: { id: postId },
    data: {
      status: 'failed',
      errorMessage,
    },
  });

  await prisma.publicationLog.create({
    data: {
      postId,
      status: 'failed',
      errorMessage,
    },
  });

  // Best-effort notification
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, subject: true },
    });
    if (post) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: 'post_failed',
          title: 'Publication automatique echouee',
          message: `La publication automatique de \u00ab ${post.subject} \u00bb a echoue : ${errorMessage.slice(0, 200)}`,
          actionUrl: `/posts/${postId}`,
          metadata: JSON.stringify({ error: errorMessage, source: 'worker' }),
        },
      });
    }
  } catch {
    // Notification is best-effort, don't let it crash the worker
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log('info', `Received ${signal}, shutting down gracefully...`);
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  log('error', `Uncaught exception: ${err instanceof Error ? err.message : String(err)}`);
});
process.on('unhandledRejection', (reason) => {
  log('error', `Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`);
});

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log('info', 'Scheduled publish worker starting...');
  log('info', `Poll interval: ${POLL_INTERVAL_MS / 1000}s | Database: ${DATABASE_URL}`);

  // Run immediately on startup
  await processScheduledPosts();

  // Then poll on interval
  const timer = setInterval(async () => {
    if (shuttingDown) return;
    try {
      await processScheduledPosts();
    } catch (err) {
      log('error', `Poll cycle error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, POLL_INTERVAL_MS);

  // Keep the process alive (don't let the timer reference get GC'd)
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

main().catch((err) => {
  log('error', `Fatal worker error: ${err instanceof Error ? err.message : String(err)}`);
  prisma.$disconnect().finally(() => process.exit(1));
});
