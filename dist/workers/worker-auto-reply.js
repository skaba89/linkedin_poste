"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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

// node_modules/z-ai-web-dev-sdk/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  default: () => dist_default
});
var import_promises, import_path, import_os, loadConfig, ZAI, dist_default;
var init_dist = __esm({
  "node_modules/z-ai-web-dev-sdk/dist/index.js"() {
    import_promises = __toESM(require("fs/promises"), 1);
    import_path = __toESM(require("path"), 1);
    import_os = __toESM(require("os"), 1);
    loadConfig = async () => {
      const homeDir = import_os.default.homedir();
      const configPaths = [
        import_path.default.join(process.cwd(), ".z-ai-config"),
        import_path.default.join(homeDir, ".z-ai-config"),
        "/etc/.z-ai-config"
      ];
      for (const filePath of configPaths) {
        try {
          const configStr = await import_promises.default.readFile(filePath, "utf-8");
          const config = JSON.parse(configStr);
          if (config.baseUrl && config.apiKey) {
            return config;
          }
        } catch (error) {
          if (error.code !== "ENOENT") {
            console.error(`Error reading or parsing config file at ${filePath}:`, error);
          }
        }
      }
      throw new Error("Configuration file not found or invalid. Please create .z-ai-config in your project, home directory, or /etc.");
    };
    ZAI = class _ZAI {
      constructor(config) {
        this.config = config;
        this.chat = {
          completions: {
            create: this.createChatCompletion.bind(this),
            createVision: this.createChatCompletionVision.bind(this)
          }
        };
        this.audio = {
          tts: {
            create: this.createAudioTTS.bind(this)
          },
          asr: {
            create: this.createAudioASR.bind(this)
          }
        };
        this.images = {
          generations: {
            create: this.createImageGeneration.bind(this),
            edit: this.createImageEdit.bind(this)
          }
        };
        this.video = {
          generations: {
            create: this.createVideoGeneration.bind(this)
          }
        };
        this.async = {
          result: {
            query: this.queryAsyncResult.bind(this)
          }
        };
        this.functions = {
          invoke: this.invokeFunction.bind(this)
        };
      }
      static async create() {
        const config = await loadConfig();
        return new _ZAI(config);
      }
      async createChatCompletion(body) {
        const { baseUrl, chatId, userId, apiKey, token } = this.config;
        const url = `${baseUrl}/chat/completions`;
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Z-AI-From": "Z"
        };
        if (chatId) {
          headers["X-Chat-Id"] = chatId;
        }
        if (userId) {
          headers["X-User-Id"] = userId;
        }
        if (token) {
          headers["X-Token"] = token;
        }
        const requestBody = {
          ...body,
          thinking: body.thinking || { type: "disabled" }
        };
        try {
          const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody)
          });
          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
          }
          const contentType = response.headers.get("content-type") || "";
          if (requestBody.stream && (contentType.includes("text/event-stream") || contentType.includes("text/plain"))) {
            return response.body;
          }
          return await response.json();
        } catch (error) {
          console.error("Failed to make API request:", error);
          throw error;
        }
      }
      async createChatCompletionVision(body) {
        const { baseUrl, chatId, userId, apiKey, token } = this.config;
        const url = `${baseUrl}/chat/completions/vision`;
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Z-AI-From": "Z"
        };
        if (chatId) {
          headers["X-Chat-Id"] = chatId;
        }
        if (userId) {
          headers["X-User-Id"] = userId;
        }
        if (token) {
          headers["X-Token"] = token;
        }
        const requestBody = {
          ...body,
          thinking: body.thinking || { type: "disabled" }
        };
        try {
          const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody)
          });
          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
          }
          const contentType = response.headers.get("content-type") || "";
          if (requestBody.stream && (contentType.includes("text/event-stream") || contentType.includes("text/plain"))) {
            return response.body;
          }
          return await response.json();
        } catch (error) {
          console.error("Failed to make vision API request:", error);
          throw error;
        }
      }
      async createAudioTTS(body) {
        const { baseUrl, chatId, userId, apiKey, token } = this.config;
        const url = `${baseUrl}/audio/tts`;
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Z-AI-From": "Z"
        };
        if (chatId) {
          headers["X-Chat-Id"] = chatId;
        }
        if (userId) {
          headers["X-User-Id"] = userId;
        }
        if (token) {
          headers["X-Token"] = token;
        }
        try {
          const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body)
          });
          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
          }
          return response;
        } catch (error) {
          console.error("Failed to make TTS API request:", error);
          throw error;
        }
      }
      async createAudioASR(body) {
        const { baseUrl, chatId, userId, apiKey, token } = this.config;
        const url = `${baseUrl}/audio/asr`;
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Z-AI-From": "Z"
        };
        if (chatId) {
          headers["X-Chat-Id"] = chatId;
        }
        if (userId) {
          headers["X-User-Id"] = userId;
        }
        if (token) {
          headers["X-Token"] = token;
        }
        try {
          const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body)
          });
          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
          }
          return await response.json();
        } catch (error) {
          console.error("Failed to make ASR API request:", error);
          throw error;
        }
      }
      async createImageGeneration(body) {
        const { baseUrl, apiKey, chatId, userId, token } = this.config;
        const url = `${baseUrl}/images/generations`;
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Z-AI-From": "Z"
        };
        if (chatId) {
          headers["X-Chat-Id"] = chatId;
        }
        if (userId) {
          headers["X-User-Id"] = userId;
        }
        if (token) {
          headers["X-Token"] = token;
        }
        const requestBody = { ...body };
        try {
          const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody)
          });
          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
          }
          const result = await response.json();
          const processedData = await Promise.all(result.data.map(async (item) => {
            if (item.url) {
              const base64 = await this.downloadImageAsBase64(item.url);
              return { base64, format: "png" };
            }
            return item;
          }));
          return {
            ...result,
            data: processedData
          };
        } catch (error) {
          console.error("Failed to make image generation request:", error);
          throw error;
        }
      }
      async createImageEdit(body) {
        const { baseUrl, apiKey, chatId, userId, token } = this.config;
        const url = `${baseUrl}/images/generations/edit`;
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Z-AI-From": "Z"
        };
        if (chatId) {
          headers["X-Chat-Id"] = chatId;
        }
        if (userId) {
          headers["X-User-Id"] = userId;
        }
        if (token) {
          headers["X-Token"] = token;
        }
        const requestBody = { ...body };
        try {
          const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody)
          });
          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
          }
          const result = await response.json();
          const processedData = await Promise.all(result.data.map(async (item) => {
            if (item.url) {
              const base64 = await this.downloadImageAsBase64(item.url);
              return { base64, format: "png" };
            }
            return item;
          }));
          return {
            ...result,
            data: processedData
          };
        } catch (error) {
          console.error("Failed to make image edit request:", error);
          throw error;
        }
      }
      async downloadImageAsBase64(imageUrl) {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString("base64");
          return `${base64}`;
        } catch (error) {
          console.error("Failed to download and convert image to base64:", error);
          throw error;
        }
      }
      async createVideoGeneration(body) {
        const { baseUrl, apiKey, chatId, userId, token } = this.config;
        const url = `${baseUrl}/video/generation`;
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Z-AI-From": "Z"
        };
        if (chatId) {
          headers["X-Chat-Id"] = chatId;
        }
        if (userId) {
          headers["X-User-Id"] = userId;
        }
        if (token) {
          headers["X-Token"] = token;
        }
        try {
          const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body)
          });
          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
          }
          return await response.json();
        } catch (error) {
          console.error("Failed to make video generation request:", error);
          throw error;
        }
      }
      async queryAsyncResult(taskId) {
        const { baseUrl, apiKey, chatId, userId, token } = this.config;
        const url = `${baseUrl}/async-result?id=${encodeURIComponent(taskId)}`;
        const headers = {
          "Authorization": `Bearer ${apiKey}`,
          "X-Z-AI-From": "Z"
        };
        if (chatId) {
          headers["X-Chat-Id"] = chatId;
        }
        if (userId) {
          headers["X-User-Id"] = userId;
        }
        if (token) {
          headers["X-Token"] = token;
        }
        try {
          const response = await fetch(url, {
            method: "GET",
            headers
          });
          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
          }
          return await response.json();
        } catch (error) {
          console.error("Failed to query async result:", error);
          throw error;
        }
      }
      // 通用函数调用实现
      async invokeFunction(function_name, args) {
        const { baseUrl, apiKey, chatId, userId, token } = this.config;
        const url = `${baseUrl}/functions/invoke`;
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Z-AI-From": "Z"
        };
        if (chatId) {
          headers["X-Chat-Id"] = chatId;
        }
        if (userId) {
          headers["X-User-Id"] = userId;
        }
        if (token) {
          headers["X-Token"] = token;
        }
        const body = {
          function_name,
          arguments: args
        };
        try {
          const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body)
          });
          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Function invoke failed with status ${response.status}: ${errorBody}`);
          }
          const result = await response.json();
          return result.result;
        } catch (error) {
          console.error("Failed to invoke remote function:", error);
          throw error;
        }
      }
    };
    dist_default = ZAI;
  }
});

// worker-auto-reply.ts
var import_client = require("@prisma/client");
var DATABASE_URL = process.env.DATABASE_URL || "file:/app/db/custom.db";
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DATABASE_URL;
}
var POLL_INTERVAL_MS = 10 * 60 * 1e3;
var LINKEDIN_API_VERSION = "202510";
var LINKEDIN_BASE_URL = "https://api.linkedin.com/rest";
var MAX_REPLIES_PER_CYCLE = 10;
var POST_AGE_DAYS = 7;
var prisma = new import_client.PrismaClient({
  log: ["error", "warn"]
});
function log(level, message, meta) {
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  const prefix = `[auto-reply-worker]`;
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
function detectSentiment(text) {
  const lower = text.toLowerCase();
  if (lower.includes("?")) return "question";
  if (["merci", "super", "excellent", "g\xE9nial", "bravo", "int\xE9ressant", "top", "bien vu", "\u8D5E\u540C", "\u8C22\u8C22"].some((w) => lower.includes(w))) return "positive";
  if (["pas d'accord", "faux", "d\xE9cevant", "mauvais", "nul", "ridicule"].some((w) => lower.includes(w))) return "negative";
  return "neutral";
}
async function fetchLinkedInComments(accessToken, shareUrn) {
  const url = `${LINKEDIN_BASE_URL}/socialActions/${encodeURIComponent(shareUrn)}/comments?orderBy=RECENCY&count=50`;
  const response = await fetch(url, {
    method: "GET",
    headers: linkedinHeaders(accessToken)
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`LinkedIn API (fetch comments): HTTP ${response.status} \u2014 ${errorBody}`);
  }
  const data = await response.json();
  const elements = data.elements || [];
  return elements.map((el) => {
    const message = el.message || {};
    const text = message.text || "";
    const actor = el.actor || {};
    let authorName = null;
    const name = actor.name;
    if (typeof name === "string" && name) authorName = name;
    if (!authorName) {
      for (const key of ["localizedFirstName", "firstName"]) {
        const val = actor[key];
        if (typeof val === "string" && val) {
          const last = actor.localizedLastName || actor.lastName;
          authorName = typeof last === "string" && last ? `${val} ${last}` : val;
          break;
        }
      }
    }
    const socialMeta = el.socialMetadata || {};
    let likes = 0;
    const totalSocialActionCounts = socialMeta.totalSocialActionCounts;
    if (Array.isArray(totalSocialActionCounts)) {
      const likesEntry = totalSocialActionCounts.find(
        (a) => a["$type"] === "com.linkedin.common.SocialActionCounts"
      );
      likes = likesEntry?.["likes"] ?? 0;
    }
    return {
      commentUrn: el.commentUrn || el.$id || "",
      text,
      authorName,
      authorUrn: actor.urn || actor.actorUrn || null,
      likes: Number(likes) || 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  });
}
async function postReplyToLinkedIn(accessToken, shareUrn, personId, replyText) {
  const url = `${LINKEDIN_BASE_URL}/socialActions/${encodeURIComponent(shareUrn)}/comments`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: linkedinHeaders(accessToken),
      body: JSON.stringify({
        actor: `urn:li:person:${personId}`,
        message: { text: replyText },
        object: shareUrn
      })
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return { success: false, error: `LinkedIn ${response.status}: ${errorBody}` };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur r\xE9seau LinkedIn"
    };
  }
}
async function generateAIReply(postSubject, postContent, commentAuthor, commentText, sentiment) {
  const ZAI2 = (await Promise.resolve().then(() => (init_dist(), dist_exports))).default;
  const zai = await ZAI2.create();
  let systemPrompt = "Tu es un expert en engagement LinkedIn B2B. ";
  systemPrompt += "G\xE9n\xE8re une r\xE9ponse courte (1-3 phrases), professionnelle mais chaleureuse, ";
  systemPrompt += "qui encourage le dialogue. Max 200 caract\xE8res. R\xE9ponds uniquement avec le texte de la r\xE9ponse, sans guillemets.";
  const sentimentInstruction = {
    positive: " Le commentaire est tr\xE8s positif, remercie chaleureusement.",
    negative: " Le commentaire est n\xE9gatif ou critique. Reste diplomate et professionnel, valide le point de vue tout en apportant de la nuance.",
    question: " Le commentaire contient une question. R\xE9ponds de fa\xE7on pr\xE9cise et utile.",
    neutral: " Le commentaire est neutre, engage la conversation avec une question ou un compl\xE9ment."
  };
  systemPrompt += sentimentInstruction[sentiment] || sentimentInstruction.neutral;
  const userPrompt = `Sujet du post original : "${postSubject}"
${postContent ? `
Contenu du post :
${postContent.slice(0, 500)}` : ""}

Commentaire de ${commentAuthor || "un utilisateur"} : "${commentText}"

R\xE9ponds \xE0 ce commentaire.`;
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 150
  });
  let replyContent = completion.choices[0]?.message?.content?.trim() || "";
  replyContent = replyContent.replace(/^["']|["']$/g, "");
  if (replyContent.length > 200) {
    replyContent = replyContent.slice(0, 197).trim() + "...";
  }
  return replyContent;
}
async function processAutoReplies() {
  const now = /* @__PURE__ */ new Date();
  log("info", "D\xE9marrage du cycle de traitement auto-reply...");
  const enabledConfigs = await prisma.agentConfig.findMany({
    where: {
      agentType: "engagement_bot",
      enabled: true
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          linkedinAccounts: {
            where: { isActive: true },
            take: 1
          }
        }
      }
    }
  });
  if (enabledConfigs.length === 0) {
    log("info", "Aucun utilisateur avec auto-reply activ\xE9.");
    return;
  }
  log("info", `${enabledConfigs.length} utilisateur(s) avec auto-reply activ\xE9.`);
  for (const config of enabledConfigs) {
    const user = config.user;
    const account = user.linkedinAccounts[0];
    if (!account) {
      log("warn", `Aucun compte LinkedIn actif pour l'utilisateur ${user.name} (${user.id}).`);
      continue;
    }
    try {
      await processUserAutoReply(user.id, account.id, config.autoApprove);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      log("error", `Erreur de traitement pour ${user.name} (${user.id}): ${message}`);
    }
    await prisma.agentConfig.update({
      where: {
        userId_agentType: {
          userId: user.id,
          agentType: "engagement_bot"
        }
      },
      data: { lastExecutedAt: now }
    });
  }
}
async function processUserAutoReply(userId, linkedinAccountId, autoApprove) {
  const sevenDaysAgo = /* @__PURE__ */ new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - POST_AGE_DAYS);
  const posts = await prisma.post.findMany({
    where: {
      authorId: userId,
      status: "posted",
      linkedinPostId: { not: null },
      linkedinAccountId,
      updatedAt: { gte: sevenDaysAgo }
    },
    include: {
      linkedinAccount: {
        select: { accessToken: true, personId: true }
      },
      audienceComments: {
        select: { linkedinCommentId: true, content: true, authorName: true }
      }
    }
  });
  if (posts.length === 0) {
    log("info", `Aucun post r\xE9cent trouv\xE9 pour l'utilisateur ${userId}.`);
    return;
  }
  log("info", `${posts.length} post(s) r\xE9cent(s) \xE0 v\xE9rifier pour l'utilisateur ${userId}.`);
  let repliesGenerated = 0;
  for (const post of posts) {
    if (repliesGenerated >= MAX_REPLIES_PER_CYCLE) {
      log("info", `Limite de ${MAX_REPLIES_PER_CYCLE} r\xE9ponses atteinte pour ce cycle.`);
      break;
    }
    if (!post.linkedinPostId || !post.linkedinAccount?.accessToken || !post.linkedinAccount?.personId) {
      continue;
    }
    await processPostComments(post, autoApprove).then((count) => {
      repliesGenerated += count;
    });
  }
}
async function processPostComments(post, autoApprove) {
  const { accessToken, personId } = post.linkedinAccount;
  const shareUrn = post.linkedinPostId;
  let repliesCount = 0;
  try {
    const linkedinComments = await fetchLinkedInComments(accessToken, shareUrn);
    if (linkedinComments.length === 0) {
      return 0;
    }
    log("info", `${linkedinComments.length} commentaire(s) LinkedIn trouv\xE9(s) pour le post "${post.subject.slice(0, 40)}" (${post.id.slice(0, 8)}).`);
    const existingComments = /* @__PURE__ */ new Set();
    for (const existing of post.audienceComments) {
      const key = existing.linkedinCommentId || `${existing.content}::${existing.authorName || ""}`;
      existingComments.add(key);
    }
    for (const comment of linkedinComments) {
      const dedupKey = comment.commentUrn || `${comment.text}::${comment.authorName || ""}`;
      if (existingComments.has(dedupKey)) {
        continue;
      }
      existingComments.add(dedupKey);
      const sentiment = detectSentiment(comment.text);
      let replyContent;
      try {
        replyContent = await generateAIReply(
          post.subject,
          post.finalContent,
          comment.authorName,
          comment.text,
          sentiment
        );
      } catch (aiError) {
        const errMsg = aiError instanceof Error ? aiError.message : "Erreur IA inconnue";
        log("error", `Erreur de g\xE9n\xE9ration IA pour le commentaire de ${comment.authorName}: ${errMsg}`);
        continue;
      }
      if (!replyContent) {
        log("warn", "IA n'a pas g\xE9n\xE9r\xE9 de r\xE9ponse, commentaire ignor\xE9.");
        continue;
      }
      const savedComment = await prisma.audienceComment.create({
        data: {
          postId: post.id,
          authorName: comment.authorName,
          content: comment.text,
          likes: comment.likes,
          sentiment,
          linkedinCommentId: comment.commentUrn || null,
          suggestedReply: replyContent,
          replyPosted: false
        }
      });
      if (autoApprove) {
        log("info", `Auto-approbation activ\xE9e \u2014 Publication de la r\xE9ponse sur LinkedIn...`);
        const result = await postReplyToLinkedIn(accessToken, shareUrn, personId, replyContent);
        if (result.success) {
          await prisma.audienceComment.update({
            where: { id: savedComment.id },
            data: {
              replyPosted: true,
              repliedAt: /* @__PURE__ */ new Date()
            }
          });
          await prisma.agentActivity.create({
            data: {
              userId: post.authorId,
              agentType: "engagement_bot",
              status: "completed",
              title: `R\xE9ponse automatique publi\xE9e \u2014 ${post.subject.slice(0, 50)}`,
              description: `R\xE9ponse publi\xE9e au commentaire de ${comment.authorName || "utilisateur"}`,
              metadata: JSON.stringify({
                postId: post.id,
                audienceCommentId: savedComment.id,
                linkedinPostId: shareUrn,
                replyContent,
                autoApprove: true,
                trigger: "cron"
              })
            }
          });
          log("info", `R\xE9ponse publi\xE9e avec succ\xE8s pour le commentaire de ${comment.authorName}.`);
        } else {
          log("warn", `\xC9chec de publication LinkedIn: ${result.error}`);
          await prisma.agentActivity.create({
            data: {
              userId: post.authorId,
              agentType: "engagement_bot",
              status: "failed",
              title: `\xC9chec de r\xE9ponse automatique \u2014 ${post.subject.slice(0, 50)}`,
              description: `Impossible de publier la r\xE9ponse au commentaire de ${comment.authorName || "utilisateur"}: ${result.error}`,
              metadata: JSON.stringify({
                postId: post.id,
                audienceCommentId: savedComment.id,
                linkedinPostId: shareUrn,
                replyContent,
                error: result.error,
                trigger: "cron"
              })
            }
          });
        }
      } else {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            type: "comment_added",
            title: "Nouveau commentaire \u2014 R\xE9ponse IA sugg\xE9r\xE9e",
            message: `Un nouveau commentaire de ${comment.authorName || "un utilisateur"} sur "${post.subject.slice(0, 50)}" : "${comment.text.slice(0, 80)}${comment.text.length > 80 ? "..." : ""}". R\xE9ponse IA sugg\xE9r\xE9e: "${replyContent}"`,
            actionUrl: `/posts/${post.id}`,
            metadata: JSON.stringify({
              audienceCommentId: savedComment.id,
              suggestedReply: replyContent,
              sentiment,
              trigger: "cron"
            })
          }
        });
        await prisma.agentActivity.create({
          data: {
            userId: post.authorId,
            agentType: "engagement_bot",
            status: "pending",
            title: `R\xE9ponse en attente de validation \u2014 ${post.subject.slice(0, 50)}`,
            description: `Nouveau commentaire de ${comment.authorName || "utilisateur"} n\xE9cessite une validation`,
            metadata: JSON.stringify({
              postId: post.id,
              audienceCommentId: savedComment.id,
              linkedinPostId: shareUrn,
              replyContent,
              autoApprove: false,
              trigger: "cron"
            })
          }
        });
        log("info", `Notification cr\xE9\xE9e pour validation manuelle du commentaire de ${comment.authorName}.`);
      }
      repliesCount++;
      try {
        await prisma.auditLog.create({
          data: {
            entityType: "AudienceComment",
            entityId: savedComment.id,
            action: "auto_reply_generated",
            userId: post.authorId,
            metadata: JSON.stringify({
              postId: post.id,
              commentAuthor: comment.authorName,
              sentiment,
              replyContent,
              autoApprove,
              trigger: "cron",
              source: "auto_reply_worker"
            })
          }
        });
      } catch {
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    log("error", `Erreur de traitement des commentaires pour le post ${post.id}: ${message}`);
  }
  return repliesCount;
}
async function processPendingActivities() {
  const pendingActivities = await prisma.agentActivity.findMany({
    where: {
      agentType: "engagement_bot",
      status: "pending"
    },
    include: {
      user: {
        select: {
          id: true,
          linkedinAccounts: {
            where: { isActive: true },
            take: 1
          }
        }
      }
    },
    take: 20
  });
  if (pendingActivities.length === 0) return;
  log("info", `${pendingActivities.length} activit\xE9(s) en attente \xE0 traiter.`);
  for (const activity of pendingActivities) {
    try {
      const metadata = JSON.parse(activity.metadata || "{}");
      const autoApprove = metadata.autoApprove ?? false;
      if (autoApprove) {
        const audienceCommentId = metadata.audienceCommentId;
        const postId = metadata.postId;
        const replyContent = metadata.replyContent;
        const linkedinPostId = metadata.linkedinPostId;
        if (!audienceCommentId || !postId || !replyContent || !linkedinPostId) {
          log("warn", `Activit\xE9 ${activity.id} \u2014 m\xE9tadonn\xE9es incompl\xE8tes, passage en \xE9chec.`);
          await prisma.agentActivity.update({
            where: { id: activity.id },
            data: { status: "failed", description: "M\xE9tadonn\xE9es incompl\xE8tes" }
          });
          continue;
        }
        const account = activity.user.linkedinAccounts[0];
        if (!account) {
          log("warn", `Activit\xE9 ${activity.id} \u2014 pas de compte LinkedIn.`);
          await prisma.agentActivity.update({
            where: { id: activity.id },
            data: { status: "failed", description: "Compte LinkedIn non trouv\xE9" }
          });
          continue;
        }
        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { subject: true, linkedinPostId: true }
        });
        if (!post) {
          await prisma.agentActivity.update({
            where: { id: activity.id },
            data: { status: "failed", description: "Post non trouv\xE9" }
          });
          continue;
        }
        let finalReply = replyContent;
        if (!finalReply) {
          const comment = await prisma.audienceComment.findUnique({
            where: { id: audienceCommentId }
          });
          if (comment && post) {
            finalReply = await generateAIReply(
              post.subject,
              null,
              // Pas besoin de recharger le contenu complet
              comment.authorName,
              comment.content,
              comment.sentiment || "neutral"
            );
          }
        }
        if (!finalReply) {
          await prisma.agentActivity.update({
            where: { id: activity.id },
            data: { status: "failed", description: "Impossible de g\xE9n\xE9rer une r\xE9ponse" }
          });
          continue;
        }
        const result = await postReplyToLinkedIn(
          account.accessToken,
          linkedinPostId,
          account.personId || "",
          finalReply
        );
        if (result.success) {
          await prisma.agentActivity.update({
            where: { id: activity.id },
            data: {
              status: "completed",
              description: `R\xE9ponse publi\xE9e automatiquement.`,
              result: JSON.stringify({ replyContent: finalReply })
            }
          });
          await prisma.audienceComment.update({
            where: { id: audienceCommentId },
            data: {
              suggestedReply: finalReply,
              replyPosted: true,
              repliedAt: /* @__PURE__ */ new Date()
            }
          });
          log("info", `Activit\xE9 ${activity.id} \u2014 r\xE9ponse publi\xE9e avec succ\xE8s.`);
        } else {
          await prisma.agentActivity.update({
            where: { id: activity.id },
            data: {
              status: "failed",
              description: `Erreur LinkedIn: ${result.error}`
            }
          });
        }
      } else {
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: activity.userId,
            type: "comment_added",
            metadata: { contains: activity.id }
          }
        });
        if (!existingNotification) {
          await prisma.notification.create({
            data: {
              userId: activity.userId,
              type: "comment_added",
              title: "R\xE9ponse IA en attente de validation",
              message: activity.description || "Un commentaire n\xE9cessite votre validation.",
              metadata: JSON.stringify({ agentActivityId: activity.id })
            }
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      log("error", `Erreur traitement activit\xE9 ${activity.id}: ${message}`);
      await prisma.agentActivity.update({
        where: { id: activity.id },
        data: { status: "failed", description: message.slice(0, 200) }
      }).catch(() => {
      });
    }
  }
}
async function runCycle() {
  const now = /* @__PURE__ */ new Date();
  log("info", "=== Nouveau cycle de traitement ===", { time: now.toISOString() });
  try {
    await processPendingActivities();
  } catch (err) {
    log("error", `Erreur lors du traitement des activit\xE9s en attente: ${err instanceof Error ? err.message : String(err)}`);
  }
  try {
    await processAutoReplies();
  } catch (err) {
    log("error", `Erreur lors du traitement auto-reply: ${err instanceof Error ? err.message : String(err)}`);
  }
}
var shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("info", `Signal ${signal} re\xE7u, arr\xEAt gracieux en cours...`);
  try {
    await prisma.$disconnect();
  } catch {
  }
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (err) => {
  log("error", `Exception non intercept\xE9e : ${err instanceof Error ? err.message : String(err)}`);
});
process.on("unhandledRejection", (reason) => {
  log("error", `Promesse rejet\xE9e non g\xE9r\xE9e : ${reason instanceof Error ? reason.message : String(reason)}`);
});
async function main() {
  log("info", "Worker auto-reply d\xE9marr\xE9.");
  log("info", `Intervalle : ${POLL_INTERVAL_MS / 1e3}s | Base de donn\xE9es : ${DATABASE_URL}`);
  log("info", `Limite r\xE9ponses/cycle : ${MAX_REPLIES_PER_CYCLE} | Fen\xEAtre posts : ${POST_AGE_DAYS} jours`);
  await runCycle();
  const timer = setInterval(async () => {
    if (shuttingDown) return;
    try {
      await runCycle();
    } catch (err) {
      log("error", `Erreur du cycle: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, POLL_INTERVAL_MS);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}
main().catch((err) => {
  log("error", `Erreur fatale du worker: ${err instanceof Error ? err.message : String(err)}`);
  prisma.$disconnect().finally(() => process.exit(1));
});
