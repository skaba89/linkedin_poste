"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// worker-scheduled-publish.ts
var import_client = require("@prisma/client");
var import_promises = require("fs/promises");
var import_path = __toESM(require("path"));
var DATABASE_URL = process.env.DATABASE_URL || "file:/app/db/custom.db";
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DATABASE_URL;
}
var POLL_INTERVAL_MS = 5 * 60 * 1e3;
var LINKEDIN_API_URL = "https://api.linkedin.com/rest/posts";
var LINKEDIN_API_VERSION = "202510";
var prisma = new import_client.PrismaClient({
  log: ["error", "warn"]
});
function log(level, message, meta) {
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  const prefix = `[scheduled-publish-worker]`;
  const extra = meta ? " " + JSON.stringify(meta) : "";
  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](`${ts} ${prefix} ${level.toUpperCase()}: ${message}${extra}`);
}
function linkedinHeaders(accessToken) {
  return {
    "Authorization": `Bearer ${accessToken}`,
    "LinkedIn-Version": LINKEDIN_API_VERSION,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0"
  };
}
function getAuthorUrn(account) {
  if (account.publishAs === "person" && account.personId) {
    return { author: `urn:li:person:${account.personId}`, mode: "person" };
  }
  if (account.organizationId) {
    return { author: `urn:li:organization:${account.organizationId}`, mode: "organization" };
  }
  if (account.personId) {
    return { author: `urn:li:person:${account.personId}`, mode: "person" };
  }
  return { author: "", mode: "none" };
}
async function registerImageUpload(accessToken, owner) {
  const response = await fetch(
    `${LINKEDIN_API_URL.replace("/posts", "")}/images?action=initializeUpload`,
    {
      method: "POST",
      headers: linkedinHeaders(accessToken),
      body: JSON.stringify({
        initializeUploadRequest: { owner }
      })
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `LinkedIn image register failed: ${response.status}`);
  }
  const data = await response.json();
  const mechanism = data.value.uploadMechanism[0];
  return {
    uploadUrl: mechanism.uploadUrl,
    asset: data.value.asset,
    uploadHeaders: mechanism.uploadHeaders
  };
}
async function uploadImageBinary(uploadUrl, imageBuffer, headers) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body: new Uint8Array(imageBuffer)
  });
  if (!response.ok) {
    throw new Error(`LinkedIn image upload failed: ${response.status}`);
  }
}
async function resolveImageBuffer(imageUrl) {
  if (imageUrl.startsWith("data:")) {
    const base64Match = imageUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (!base64Match) throw new Error("Format de data URI invalide");
    return Buffer.from(base64Match[1], "base64");
  }
  if (imageUrl.startsWith("/images/") || imageUrl.startsWith("/uploads/")) {
    return (0, import_promises.readFile)(import_path.default.join(process.cwd(), "public", imageUrl));
  }
  if (imageUrl.startsWith("http")) {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Impossible de t\xE9l\xE9charger l'image distante: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Format d'URL d'image non support\xE9");
}
async function uploadImageToLinkedIn(accessToken, owner, imageUrl) {
  const imageBuffer = await resolveImageBuffer(imageUrl);
  if (imageBuffer.length === 0) throw new Error("L'image est vide");
  const { uploadUrl, asset, uploadHeaders } = await registerImageUpload(accessToken, owner);
  await uploadImageBinary(uploadUrl, imageBuffer, uploadHeaders);
  return asset;
}
async function publishToLinkedIn(accessToken, author, content, assetUrn) {
  try {
    const body = {
      author,
      commentary: content,
      visibility: "PUBLIC",
      lifecycleState: "PUBLISHED",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: []
      }
    };
    if (assetUrn) {
      body.content = {
        media: [
          {
            id: assetUrn,
            mediaType: "IMAGE",
            status: "READY",
            title: {
              text: "Post image"
            }
          }
        ]
      };
    }
    const response = await fetch(LINKEDIN_API_URL, {
      method: "POST",
      headers: linkedinHeaders(accessToken),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errMsg = errorData?.message || `LinkedIn API error: HTTP ${response.status}`;
      return { success: false, error: errMsg, hadImage: !!assetUrn, imageUploaded: !!assetUrn };
    }
    const rawBody = await response.text().catch(() => "");
    let linkedinPostId;
    try {
      const data = JSON.parse(rawBody);
      if (data?.id) {
        linkedinPostId = String(data.id);
      }
    } catch {
    }
    if (!linkedinPostId) {
      const restliId = response.headers.get("x-restli-id");
      if (restliId) {
        linkedinPostId = restliId;
      }
    }
    return {
      success: true,
      linkedinPostId,
      hadImage: !!assetUrn,
      imageUploaded: !!assetUrn
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown LinkedIn publish error"
    };
  }
}
async function processScheduledPosts() {
  const now = /* @__PURE__ */ new Date();
  log("info", "Polling for scheduled posts...", { now: now.toISOString() });
  const posts = await prisma.post.findMany({
    where: {
      status: "scheduled",
      scheduledDate: { lte: now }
    },
    include: {
      linkedinAccount: true
    }
  });
  if (posts.length === 0) {
    log("info", "No scheduled posts due for publishing.");
    return;
  }
  log("info", `Found ${posts.length} scheduled post(s) to publish.`);
  for (const post of posts) {
    await processPost(post);
  }
}
async function processPost(post) {
  const postLabel = `"${post.subject}" (${post.id.slice(0, 8)})`;
  try {
    if (!post.finalContent) {
      log("warn", `Skipping ${postLabel}: no finalContent.`, { postId: post.id });
      await markFailed(post.id, "Contenu final manquant. Impossible de publier.");
      return;
    }
    let account = post.linkedinAccount;
    if (!account) {
      log("warn", `No linked account on ${postLabel}, searching for an active one...`);
      account = await prisma.linkedInAccount.findFirst({
        where: { isActive: true }
      });
    }
    if (!account) {
      log("warn", `No active LinkedIn account found for ${postLabel}.`);
      await markFailed(post.id, "Aucun compte LinkedIn actif trouve. Configurez votre connexion LinkedIn.");
      return;
    }
    const { author, mode } = getAuthorUrn(account);
    if (!author) {
      log("warn", `Cannot determine author URN for ${postLabel}.`, { accountId: account.id });
      await markFailed(post.id, "Impossible de determiner l'auteur (personId ou organizationId manquant).");
      return;
    }
    log("info", `Publishing ${postLabel} as ${mode}...`, { author, hasImage: !!post.imageUrl });
    let assetUrn;
    let imageError;
    if (post.imageUrl) {
      try {
        log("info", `Uploading image for ${postLabel}...`, { imageUrl: post.imageUrl });
        assetUrn = await uploadImageToLinkedIn(account.accessToken, author, post.imageUrl);
        log("info", `Image uploaded for ${postLabel}, asset URN: ${assetUrn}`);
      } catch (imgErr) {
        imageError = imgErr instanceof Error ? imgErr.message : "Erreur upload image";
        log("warn", `Image upload failed for ${postLabel}, publishing as text-only: ${imageError}`);
      }
    }
    const result = await publishToLinkedIn(account.accessToken, author, post.finalContent, assetUrn);
    const pubLog = await prisma.publicationLog.create({
      data: {
        postId: post.id,
        status: result.success ? "success" : "failed",
        errorMessage: result.error ?? null,
        linkedinPostId: result.linkedinPostId ?? null,
        publishedAt: result.success ? /* @__PURE__ */ new Date() : null
      }
    });
    if (result.success) {
      log("info", `Successfully published ${postLabel}. LinkedIn Post ID: ${result.linkedinPostId ?? "(none from API)"}${assetUrn ? " (with image)" : ""}`);
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "posted",
          linkedinPostId: result.linkedinPostId ?? null,
          errorMessage: null,
          linkedinAccountId: account.id
        }
      });
      const withImage = assetUrn ? " avec image" : "";
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: "post_published",
          title: "Post publie automatiquement",
          message: `Votre post planifie \xAB ${post.subject} \xBB a ete publie sur LinkedIn${withImage} (${mode === "person" ? "profil personnel" : "page organisation"}).`,
          actionUrl: `/posts/${post.id}`,
          metadata: JSON.stringify({ linkedinPostId: result.linkedinPostId, mode, source: "worker", hadImage: !!assetUrn })
        }
      });
      await prisma.auditLog.create({
        data: {
          entityType: "Post",
          entityId: post.id,
          action: "auto_publish_success",
          userId: post.authorId,
          metadata: JSON.stringify({
            linkedinPostId: result.linkedinPostId,
            publishMode: mode,
            author,
            publicationLogId: pubLog.id,
            source: "scheduled_worker",
            hadImage: !!post.imageUrl,
            imageUploaded: !!assetUrn,
            imageError
          })
        }
      });
    } else {
      log("error", `Failed to publish ${postLabel}: ${result.error}`, { postId: post.id });
      await markFailed(post.id, result.error ?? "Erreur inconnue lors de la publication LinkedIn.");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inattendue du worker";
    log("error", `Unhandled error processing ${postLabel}: ${message}`, {
      postId: post.id,
      error: message
    });
    await markFailed(post.id, message).catch(() => {
      log("error", `Double-failure: could not mark post ${post.id} as failed.`);
    });
  }
}
async function markFailed(postId, errorMessage) {
  await prisma.post.update({
    where: { id: postId },
    data: {
      status: "failed",
      errorMessage
    }
  });
  await prisma.publicationLog.create({
    data: {
      postId,
      status: "failed",
      errorMessage
    }
  });
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, subject: true }
    });
    if (post) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: "post_failed",
          title: "Publication automatique echouee",
          message: `La publication automatique de \xAB ${post.subject} \xBB a echoue : ${errorMessage.slice(0, 200)}`,
          actionUrl: `/posts/${postId}`,
          metadata: JSON.stringify({ error: errorMessage, source: "worker" })
        }
      });
    }
  } catch {
  }
}
var shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("info", `Received ${signal}, shutting down gracefully...`);
  try {
    await prisma.$disconnect();
  } catch {
  }
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (err) => {
  log("error", `Uncaught exception: ${err instanceof Error ? err.message : String(err)}`);
});
process.on("unhandledRejection", (reason) => {
  log("error", `Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`);
});
async function main() {
  log("info", "Scheduled publish worker starting...");
  log("info", `Poll interval: ${POLL_INTERVAL_MS / 1e3}s | Database: ${DATABASE_URL}`);
  await processScheduledPosts();
  const timer = setInterval(async () => {
    if (shuttingDown) return;
    try {
      await processScheduledPosts();
    } catch (err) {
      log("error", `Poll cycle error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, POLL_INTERVAL_MS);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}
main().catch((err) => {
  log("error", `Fatal worker error: ${err instanceof Error ? err.message : String(err)}`);
  prisma.$disconnect().finally(() => process.exit(1));
});
