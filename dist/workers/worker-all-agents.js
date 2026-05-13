"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// worker-all-agents.ts
var worker_all_agents_exports = {};
__export(worker_all_agents_exports, {
  runWorker: () => runWorker
});
module.exports = __toCommonJS(worker_all_agents_exports);

// src/lib/db.ts
var import_client = require("@prisma/client");
var globalForPrisma = globalThis;
var db = globalForPrisma.prisma ?? new import_client.PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// node_modules/z-ai-web-dev-sdk/dist/index.js
var import_promises = __toESM(require("fs/promises"), 1);
var import_path = __toESM(require("path"), 1);
var import_os = __toESM(require("os"), 1);
var loadConfig = async () => {
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
var ZAI = class _ZAI {
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
var dist_default = ZAI;

// src/lib/ai-providers.ts
var PROVIDER_DEFINITIONS = {
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    description: "Acc\xE8s multi-mod\xE8les (Claude, GPT-4, Gemini, etc.)",
    defaultModel: "anthropic/claude-3.5-sonnet",
    models: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o-mini", "google/gemini-pro-1.5", "meta-llama/llama-3.1-70b-instruct"],
    maxTokensDefault: 800,
    icon: "Globe"
  },
  groq: {
    id: "groq",
    name: "Groq",
    description: "Inf\xE9rence ultra-rapide (Llama, Mixtral)",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "llama-3.1-8b-instant"],
    maxTokensDefault: 800,
    icon: "Zap"
  },
  glm: {
    id: "glm",
    name: "GLM-4",
    description: "Mod\xE8le chinois haute performance",
    defaultModel: "glm-4-plus",
    models: ["glm-4-plus", "glm-4-flash"],
    maxTokensDefault: 800,
    icon: "Brain"
  },
  zai: {
    id: "zai",
    name: "ZAI (SDK interne)",
    description: "Fallback int\xE9gr\xE9, toujours disponible",
    defaultModel: "default",
    models: ["default"],
    maxTokensDefault: 800,
    icon: "Cpu"
  }
};
var PLACEHOLDER_PATTERNS = [
  /placeholder/i,
  /your.*key/i,
  /sk-or-v1-placeholder/i,
  /^sk-test-/i,
  /^demo$/i,
  /^$/
];
function isPlaceholderKey(key) {
  if (!key) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(key));
}
async function getEffectiveApiKey(provider) {
  try {
    const settingKey = `ai_${provider}_key`;
    const setting = await db.settings.findUnique({
      where: { key: settingKey }
    });
    if (setting && !isPlaceholderKey(setting.value)) {
      return setting.value;
    }
  } catch {
  }
  const envKey = process.env[`${provider.toUpperCase()}_API_KEY`];
  if (!isPlaceholderKey(envKey)) {
    return envKey || null;
  }
  return null;
}
async function callAI(messages, options = {}, preferredProvider) {
  const { temperature = 0.7, maxTokens = 800, model } = options;
  const providerOrder = ["openrouter", "groq", "glm", "zai"];
  if (preferredProvider && providerOrder.includes(preferredProvider)) {
    const idx = providerOrder.indexOf(preferredProvider);
    if (idx > -1) {
      providerOrder.splice(idx, 1);
      providerOrder.unshift(preferredProvider);
    }
  }
  const errors = [];
  for (const provider of providerOrder) {
    try {
      const result = await callProvider(provider, messages, { temperature, maxTokens, model });
      if (result) {
        return result;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push({ provider, error: errorMsg });
      console.warn(`[AI] Provider "${provider}" failed: ${errorMsg}`);
    }
  }
  const errorSummary = errors.map((e) => `${e.provider}: ${e.error}`).join("; ");
  throw new Error(`Tous les fournisseurs IA ont \xE9chou\xE9. ${errorSummary}`);
}
async function callProvider(provider, messages, options) {
  const { temperature = 0.7, maxTokens = 800, model } = options;
  switch (provider) {
    case "openrouter": {
      const apiKey = await getEffectiveApiKey("openrouter");
      if (!apiKey) {
        throw new Error("Cl\xE9 API OpenRouter non configur\xE9e");
      }
      const usedModel = model || PROVIDER_DEFINITIONS.openrouter.defaultModel;
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://linkedin-saas.internal"
        },
        body: JSON.stringify({
          model: usedModel,
          messages,
          temperature,
          max_tokens: maxTokens
        })
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenRouter a retourn\xE9 une r\xE9ponse vide");
      }
      return content;
    }
    case "groq": {
      const apiKey = await getEffectiveApiKey("groq");
      if (!apiKey) {
        throw new Error("Cl\xE9 API Groq non configur\xE9e");
      }
      const usedModel = model || PROVIDER_DEFINITIONS.groq.defaultModel;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: usedModel,
          messages,
          temperature,
          max_tokens: maxTokens
        })
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Groq HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Groq a retourn\xE9 une r\xE9ponse vide");
      }
      return content;
    }
    case "glm": {
      const apiKey = await getEffectiveApiKey("glm");
      if (!apiKey) {
        throw new Error("Cl\xE9 API GLM non configur\xE9e");
      }
      const usedModel = model || PROVIDER_DEFINITIONS.glm.defaultModel;
      const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: usedModel,
          messages,
          temperature,
          max_tokens: maxTokens
        })
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`GLM HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("GLM a retourn\xE9 une r\xE9ponse vide");
      }
      return content;
    }
    case "zai": {
      const zai = await dist_default.create();
      const completion = await zai.chat.completions.create({
        messages,
        temperature,
        max_tokens: maxTokens
      });
      const content = completion.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("ZAI a retourn\xE9 une r\xE9ponse vide");
      }
      return content;
    }
    default:
      throw new Error(`Fournisseur inconnu: ${provider}`);
  }
}

// src/lib/agents/profile-optimizer.ts
var DEFAULT_CONFIG = {
  targetIndustry: "",
  targetRole: "",
  tone: "professionnel",
  keywords: [],
  autoOptimize: false
};
var ProfileOptimizerAgent = class {
  /**
   * Get user-specific Profile Optimizer config from Settings table.
   */
  static async getConfig(userId) {
    try {
      const settings = await db.settings.findMany({
        where: {
          key: {
            startsWith: `profile_optimizer_${userId}_`
          }
        }
      });
      const config = { ...DEFAULT_CONFIG };
      for (const s of settings) {
        const key = s.key.replace(`profile_optimizer_${userId}_`, "");
        switch (key) {
          case "targetIndustry":
            config.targetIndustry = s.value || "";
            break;
          case "targetRole":
            config.targetRole = s.value || "";
            break;
          case "tone":
            config.tone = s.value || "professionnel";
            break;
          case "keywords":
            config.keywords = JSON.parse(s.value || "[]");
            break;
          case "autoOptimize":
            config.autoOptimize = s.value === "true";
            break;
        }
      }
      return config;
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  /**
   * Save user-specific Profile Optimizer config.
   */
  static async saveConfig(userId, config) {
    const entries = [];
    if (config.targetIndustry !== void 0) entries.push({ key: `profile_optimizer_${userId}_targetIndustry`, value: config.targetIndustry });
    if (config.targetRole !== void 0) entries.push({ key: `profile_optimizer_${userId}_targetRole`, value: config.targetRole });
    if (config.tone !== void 0) entries.push({ key: `profile_optimizer_${userId}_tone`, value: config.tone });
    if (config.keywords !== void 0) entries.push({ key: `profile_optimizer_${userId}_keywords`, value: JSON.stringify(config.keywords) });
    if (config.autoOptimize !== void 0) entries.push({ key: `profile_optimizer_${userId}_autoOptimize`, value: String(config.autoOptimize) });
    await Promise.all(
      entries.map(
        (e) => db.settings.upsert({
          where: { key: e.key },
          update: { value: e.value },
          create: { key: e.key, value: e.value }
        })
      )
    );
    return this.getConfig(userId);
  }
  // ----------------------------------------------------------------
  // 1. PROFILE ANALYSIS
  // ----------------------------------------------------------------
  /**
   * Uses AI to create a comprehensive ProfileAnalysis with scores for each section.
   * Stores in ProfileAnalysis table and creates AgentActivity.
   */
  static async analyzeProfile(userId) {
    const config = await this.getConfig(userId);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });
    const previousAnalyses = await db.profileAnalysis.findMany({
      where: { userId },
      orderBy: { analyzedAt: "desc" },
      take: 3
    });
    const industry = config.targetIndustry || "Technologie";
    const role = config.targetRole || "Professionnel";
    const tone = config.tone || "professionnel";
    const keywords = config.keywords.join(", ") || "LinkedIn, B2B, croissance";
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en optimisation de profil LinkedIn. Tu analyses les profils professionnels et fournis des scores d\xE9taill\xE9s et des recommandations d'am\xE9lioration.
R\xE9ponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: {
  "headline": "titre actuel ou suggestion",
  "about": "r\xE9sum\xE9 actuel ou suggestion",
  "headlineScore": 75,
  "aboutScore": 60,
  "experienceScore": 80,
  "skillsScore": 70,
  "recommendationsScore": 65,
  "overallScore": 70,
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}
Les scores sont entre 0 et 100. Sois exigeant mais juste dans ton \xE9valuation.`
      },
      {
        role: "user",
        content: `Analyse le profil LinkedIn suivant :
- Nom : ${user?.name || "Utilisateur"}
- Industrie cible : ${industry}
- R\xF4le cible : ${role}
- Ton souhait\xE9 : ${tone}
- Mots-cl\xE9s strat\xE9giques : ${keywords}
${previousAnalyses.length > 0 ? `- Dernier score global : ${previousAnalyses[0].score}/100 (analys\xE9 le ${previousAnalyses[0].analyzedAt.toLocaleDateString("fr-FR")})` : ""}

\xC9value chaque section (headline, about, exp\xE9rience, comp\xE9tences, recommandations) sur 100.
Propose au moins 5 suggestions d'am\xE9lioration concr\xE8tes et actionnables.
Date d'analyse : ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR")}`
      }
    ];
    try {
      const result = await callAI(messages, { temperature: 0.4, maxTokens: 1500 }, "zai");
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const analysis = JSON.parse(cleaned);
      analysis.headlineScore = Math.max(0, Math.min(100, analysis.headlineScore || 0));
      analysis.aboutScore = Math.max(0, Math.min(100, analysis.aboutScore || 0));
      analysis.experienceScore = Math.max(0, Math.min(100, analysis.experienceScore || 0));
      analysis.skillsScore = Math.max(0, Math.min(100, analysis.skillsScore || 0));
      analysis.recommendationsScore = Math.max(0, Math.min(100, analysis.recommendationsScore || 0));
      analysis.overallScore = Math.max(0, Math.min(100, analysis.overallScore || 0));
      await db.profileAnalysis.create({
        data: {
          userId,
          headline: analysis.headline,
          about: analysis.about,
          score: analysis.overallScore,
          headlineScore: analysis.headlineScore,
          aboutScore: analysis.aboutScore,
          experienceScore: analysis.experienceScore,
          skillsScore: analysis.skillsScore,
          recommendationsScore: analysis.recommendationsScore,
          suggestions: JSON.stringify(analysis.suggestions)
        }
      });
      await db.agentActivity.create({
        data: {
          userId,
          agentType: "profile_optimizer",
          status: "completed",
          title: `Analyse de profil \u2014 Score : ${analysis.overallScore}/100`,
          description: `Analyse compl\xE8te du profil LinkedIn. Scores : Titre ${analysis.headlineScore}, R\xE9sum\xE9 ${analysis.aboutScore}, Exp\xE9rience ${analysis.experienceScore}, Comp\xE9tences ${analysis.skillsScore}, Recommandations ${analysis.recommendationsScore}.`,
          metadata: JSON.stringify({
            scores: {
              headline: analysis.headlineScore,
              about: analysis.aboutScore,
              experience: analysis.experienceScore,
              skills: analysis.skillsScore,
              recommendations: analysis.recommendationsScore,
              overall: analysis.overallScore
            }
          })
        }
      });
      if (analysis.overallScore < 50) {
        await db.notification.create({
          data: {
            userId,
            type: "system",
            title: "Profil n\xE9cessite une optimisation",
            message: `Votre score de profil est de ${analysis.overallScore}/100. Plusieurs am\xE9liorations sont recommand\xE9es pour augmenter votre visibilit\xE9 sur LinkedIn.`,
            metadata: JSON.stringify({ score: analysis.overallScore })
          }
        });
      }
      return analysis;
    } catch (error) {
      console.error("[ProfileOptimizer] Analysis error:", error);
      return this.getFallbackAnalysis(config);
    }
  }
  static getFallbackAnalysis(config) {
    const industry = config.targetIndustry || "Technologie";
    return {
      headline: `Expert ${industry} | Accompagnement strat\xE9gique`,
      about: `Professionnel passionn\xE9 par l'${config.targetIndustry || "innovation technologique"}. ${config.targetRole || "Expert"} avec une approche orient\xE9e r\xE9sultats.`,
      headlineScore: 55,
      aboutScore: 45,
      experienceScore: 60,
      skillsScore: 50,
      recommendationsScore: 40,
      overallScore: 50,
      suggestions: [
        "Ajoutez des mots-cl\xE9s strat\xE9giques dans votre titre",
        "Structurez votre r\xE9sum\xE9 avec des bullet points",
        "Ajoutez une photo de profil professionnelle",
        "Sollicitez des recommandations de coll\xE8gues",
        "Mettez \xE0 jour vos comp\xE9tences principales"
      ]
    };
  }
  // ----------------------------------------------------------------
  // 2. OPTIMIZATION SUGGESTIONS
  // ----------------------------------------------------------------
  /**
   * Gets latest ProfileAnalysis, uses AI to suggest optimizedHeadline and optimizedAbout.
   * Updates the ProfileAnalysis and creates AgentActivity + Notification.
   */
  static async generateOptimizations(userId) {
    const config = await this.getConfig(userId);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });
    let latestAnalysis = await db.profileAnalysis.findFirst({
      where: { userId },
      orderBy: { analyzedAt: "desc" }
    });
    if (!latestAnalysis) {
      const analysis = await this.analyzeProfile(userId);
      latestAnalysis = await db.profileAnalysis.findFirst({
        where: { userId },
        orderBy: { analyzedAt: "desc" }
      });
      if (!latestAnalysis) {
        throw new Error("Impossible de g\xE9n\xE9rer une analyse de profil");
      }
    }
    const industry = config.targetIndustry || "Technologie";
    const role = config.targetRole || "Professionnel";
    const tone = config.tone || "professionnel";
    const keywords = config.keywords.join(", ") || "LinkedIn, B2B, croissance";
    const previousSuggestions = latestAnalysis.suggestions ? JSON.parse(latestAnalysis.suggestions) : [];
    const messages = [
      {
        role: "system",
        content: `Tu es un copywriter LinkedIn expert. Tu optimises les titres et r\xE9sum\xE9s de profil pour maximiser l'impact professionnel et la visibilit\xE9.
R\xE9ponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: {
  "optimizedHeadline": "titre optimis\xE9 (max 120 caract\xE8res)",
  "optimizedAbout": "r\xE9sum\xE9 optimis\xE9 (max 2600 caract\xE8res)",
  "changesExplained": "explication des changements en 2-3 phrases"
}
Le ton doit \xEAtre : ${tone}. Inclus naturellement les mots-cl\xE9s strat\xE9giques fournis.`
      },
      {
        role: "user",
        content: `Optimise le profil LinkedIn suivant :
- Nom : ${user?.name || "Utilisateur"}
- Industrie : ${industry}
- R\xF4le cible : ${role}
- Mots-cl\xE9s strat\xE9giques : ${keywords}
- Titre actuel : "${latestAnalysis.headline || "Non d\xE9fini"}"
- R\xE9sum\xE9 actuel : "${(latestAnalysis.about || "Non d\xE9fini").substring(0, 500)}"
- Scores actuels : Titre ${latestAnalysis.headlineScore}/100, R\xE9sum\xE9 ${latestAnalysis.aboutScore}/100
${previousSuggestions.length > 0 ? `- Suggestions d'am\xE9lioration : ${previousSuggestions.slice(0, 5).join(", ")}` : ""}

G\xE9n\xE8re un titre accrocheur et optimis\xE9 SEO LinkedIn ainsi qu'un r\xE9sum\xE9 percutant qui met en valeur l'expertise.`
      }
    ];
    try {
      const result = await callAI(messages, { temperature: 0.7, maxTokens: 1500 }, "zai");
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const optimizations = JSON.parse(cleaned);
      await db.profileAnalysis.update({
        where: { id: latestAnalysis.id },
        data: {
          optimizedHeadline: optimizations.optimizedHeadline,
          optimizedAbout: optimizations.optimizedAbout
        }
      });
      await db.agentActivity.create({
        data: {
          userId,
          agentType: "profile_optimizer",
          status: "completed",
          title: "Optimisations de profil g\xE9n\xE9r\xE9es",
          description: `Nouveau titre et r\xE9sum\xE9 optimis\xE9s pour l'industrie "${industry}" et le r\xF4le "${role}". ${optimizations.changesExplained}`,
          metadata: JSON.stringify({
            optimizedHeadline: optimizations.optimizedHeadline,
            changes: optimizations.changesExplained
          })
        }
      });
      await db.notification.create({
        data: {
          userId,
          type: "system",
          title: "Nouvelles optimisations disponibles",
          message: `Votre titre et r\xE9sum\xE9 LinkedIn ont \xE9t\xE9 optimis\xE9s pour "${role}" dans "${industry}". Consultez les suggestions et appliquez-les \xE0 votre profil.`,
          metadata: JSON.stringify({ type: "optimization" })
        }
      });
      return optimizations;
    } catch (error) {
      console.error("[ProfileOptimizer] Optimization error:", error);
      return {
        optimizedHeadline: `${role} ${industry} | Strat\xE8ge & Expert`,
        optimizedAbout: `Professionnel sp\xE9cialis\xE9 en ${industry} avec une expertise confirm\xE9e en tant que ${role}. Passionn\xE9 par la cr\xE9ation de valeur et l'innovation. Contactez-moi pour discuter de vos projets.`,
        changesExplained: "Optimisations de base g\xE9n\xE9r\xE9es. Veuillez r\xE9essayer pour des suggestions plus personnalis\xE9es."
      };
    }
  }
  // ----------------------------------------------------------------
  // 3. BENCHMARKING
  // ----------------------------------------------------------------
  /**
   * AI compares user profile to top profiles in their industry.
   * Returns insights and stores in ProfileAnalysis.topProfiles.
   */
  static async benchmarkAgainstProfiles(userId, topProfileNames) {
    const config = await this.getConfig(userId);
    const latestAnalysis = await db.profileAnalysis.findFirst({
      where: { userId },
      orderBy: { analyzedAt: "desc" }
    });
    const industry = config.targetIndustry || "Technologie";
    const role = config.targetRole || "Professionnel";
    const keywords = config.keywords.join(", ") || "";
    const profileNamesHint = topProfileNames && topProfileNames.length > 0 ? `
Profils de r\xE9f\xE9rence souhait\xE9s : ${topProfileNames.join(", ")}` : "";
    const messages = [
      {
        role: "system",
        content: `Tu es un analyste de profil LinkedIn expert. Tu compares un profil \xE0 ceux des leaders d'opinion dans son industrie.
R\xE9ponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: {
  "topProfiles": [
    {"name": "Nom Expert", "headline": "Son titre LinkedIn", "strengths": ["force 1", "force 2"]}
  ],
  "gaps": ["\xE9cart identifi\xE9 1", "\xE9cart identifi\xE9 2"],
  "opportunities": ["opportunit\xE9 1", "opportunit\xE9 2"]
}
G\xE9n\xE8re 5 profils de r\xE9f\xE9rence r\xE9alistes, 5 \xE9carts et 5 opportunit\xE9s.`
      },
      {
        role: "user",
        content: `Compare le profil suivant aux meilleurs profils de l'industrie :
- Industrie : ${industry}
- R\xF4le cible : ${role}
- Mots-cl\xE9s : ${keywords || "Non d\xE9finis"}
- Score global actuel : ${latestAnalysis?.score || "Non analys\xE9"}/100
- Titre actuel : "${latestAnalysis?.headline || "Non d\xE9fini"}"
- R\xE9sum\xE9 actuel : "${(latestAnalysis?.about || "Non d\xE9fini").substring(0, 300)}"
${profileNamesHint}

Identifie les profils de r\xE9f\xE9rence dans le domaine "${industry}" pour un "${role}".
Mets en \xE9vidence les \xE9carts entre le profil analys\xE9 et les meilleures pratiques.
Propose des opportunit\xE9s concr\xE8tes d'am\xE9lioration.
Date : ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR")}`
      }
    ];
    try {
      const result = await callAI(messages, { temperature: 0.6, maxTokens: 2e3 }, "zai");
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const benchmark = JSON.parse(cleaned);
      if (latestAnalysis) {
        await db.profileAnalysis.update({
          where: { id: latestAnalysis.id },
          data: {
            topProfiles: JSON.stringify(benchmark.topProfiles)
          }
        });
      }
      await db.agentActivity.create({
        data: {
          userId,
          agentType: "profile_optimizer",
          status: "completed",
          title: `Benchmark de profil \u2014 ${industry}`,
          description: `Comparaison avec ${benchmark.topProfiles?.length || 0} profils de r\xE9f\xE9rence. ${benchmark.gaps?.length || 0} \xE9carts identifi\xE9s, ${benchmark.opportunities?.length || 0} opportunit\xE9s d\xE9tect\xE9es.`,
          metadata: JSON.stringify({ benchmark, industry })
        }
      });
      return benchmark;
    } catch (error) {
      console.error("[ProfileOptimizer] Benchmark error:", error);
      return {
        topProfiles: [
          { name: "Expert A", headline: `VP ${industry} | Speaker | Auteur`, strengths: ["Branding fort", "Contenu r\xE9gulier"] },
          { name: "Expert B", headline: `CEO @Startup${industry} | Top Voice`, strengths: ["Thought leadership", "Network \xE9tendu"] },
          { name: "Expert C", headline: `Directeur ${industry} | Mentor`, strengths: ["Mentorat actif", "Partages fr\xE9quents"] },
          { name: "Expert D", headline: `Consultant ${industry} | Formateur`, strengths: ["Contenu \xE9ducatif", "Haute engagement"] },
          { name: "Expert E", headline: `Fondateur ${industry} | Innovateur`, strengths: ["Vision strat\xE9gique", "Storytelling"] }
        ],
        gaps: [
          "Le titre manque de mots-cl\xE9s sp\xE9cifiques",
          "Le r\xE9sum\xE9 ne montre pas de r\xE9sultats chiffr\xE9s",
          "Absence de contenu publi\xE9 r\xE9guli\xE8rement",
          "Peu de t\xE9moignages visibles",
          "Faible activit\xE9 de networking r\xE9cent"
        ],
        opportunities: [
          "Ajouter des publications r\xE9guli\xE8res sur le sujet",
          "Obtenir des recommandations de leaders du secteur",
          "Publier des \xE9tudes de cas chiffr\xE9es",
          "Participer activement \xE0 des groupes LinkedIn",
          "Cr\xE9er du contenu carrousel \xE9ducatif"
        ]
      };
    }
  }
  // ----------------------------------------------------------------
  // 4. WORKER METHODS
  // ----------------------------------------------------------------
  /**
   * Main cycle: analyzeProfile + generateOptimizations + benchmarkAgainstProfiles.
   * Returns stats.
   */
  static async runWorkerCycle(userId) {
    const config = await this.getConfig(userId);
    const result = {
      analyzed: false,
      optimized: false,
      benchmarked: false,
      score: 0
    };
    try {
      const analysis = await this.analyzeProfile(userId);
      result.analyzed = true;
      result.score = analysis.overallScore;
    } catch (error) {
      console.error(`[ProfileOptimizer Worker] Analysis error for user ${userId}:`, error);
    }
    if (config.autoOptimize) {
      try {
        await this.generateOptimizations(userId);
        result.optimized = true;
      } catch (error) {
        console.error(`[ProfileOptimizer Worker] Optimization error for user ${userId}:`, error);
      }
    }
    try {
      const lastBenchmarkActivity = await db.agentActivity.findFirst({
        where: {
          userId,
          agentType: "profile_optimizer",
          title: { contains: "Benchmark" }
        },
        orderBy: { createdAt: "desc" }
      });
      const sevenDaysAgo = /* @__PURE__ */ new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (!lastBenchmarkActivity || lastBenchmarkActivity.createdAt < sevenDaysAgo) {
        await this.benchmarkAgainstProfiles(userId);
        result.benchmarked = true;
      }
    } catch (error) {
      console.error(`[ProfileOptimizer Worker] Benchmark error for user ${userId}:`, error);
    }
    try {
      await db.agentConfig.update({
        where: { userId_agentType: { userId, agentType: "profile_optimizer" } },
        data: { lastExecutedAt: /* @__PURE__ */ new Date() }
      });
    } catch {
    }
    return result;
  }
  /**
   * Get dashboard stats for a user.
   * Returns last analysis, score history count, etc.
   */
  static async getDashboardStats(userId) {
    const [
      totalAnalyses,
      latestAnalysis,
      recentActivities,
      totalOptimizations
    ] = await Promise.all([
      db.profileAnalysis.count({ where: { userId } }),
      db.profileAnalysis.findFirst({
        where: { userId },
        orderBy: { analyzedAt: "desc" }
      }),
      db.agentActivity.findMany({
        where: { userId, agentType: "profile_optimizer" },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      db.profileAnalysis.count({
        where: {
          userId,
          optimizedHeadline: { not: null }
        }
      })
    ]);
    const scoreHistory = await db.profileAnalysis.findMany({
      where: { userId },
      orderBy: { analyzedAt: "asc" },
      take: 10,
      select: { score: true, analyzedAt: true }
    });
    let scoreTrend = "stable";
    if (scoreHistory.length >= 2) {
      const recent = scoreHistory[scoreHistory.length - 1].score;
      const previous = scoreHistory[scoreHistory.length - 2].score;
      if (recent > previous + 5) scoreTrend = "up";
      else if (recent < previous - 5) scoreTrend = "down";
    }
    return {
      totalAnalyses,
      latestScore: latestAnalysis?.score || 0,
      latestHeadlineScore: latestAnalysis?.headlineScore || 0,
      latestAboutScore: latestAnalysis?.aboutScore || 0,
      latestExperienceScore: latestAnalysis?.experienceScore || 0,
      latestSkillsScore: latestAnalysis?.skillsScore || 0,
      latestRecommendationsScore: latestAnalysis?.recommendationsScore || 0,
      optimizedHeadline: latestAnalysis?.optimizedHeadline || null,
      optimizedAbout: latestAnalysis?.optimizedAbout || null,
      hasOptimizations: !!latestAnalysis?.optimizedHeadline,
      totalOptimizations,
      scoreHistory,
      scoreTrend,
      suggestions: latestAnalysis?.suggestions ? JSON.parse(latestAnalysis.suggestions) : [],
      recentActivities
    };
  }
};

// src/lib/agents/network-builder.ts
var DEFAULT_CONFIG2 = {
  targetIndustries: [],
  targetRoles: [],
  maxConnectionsPerWeek: 20,
  autoConnect: false,
  connectionMessage: ""
};
var NetworkBuilderAgent = class {
  /**
   * Get user-specific Network Builder config from Settings table.
   */
  static async getConfig(userId) {
    try {
      const settings = await db.settings.findMany({
        where: {
          key: {
            startsWith: `network_builder_${userId}_`
          }
        }
      });
      const config = { ...DEFAULT_CONFIG2 };
      for (const s of settings) {
        const key = s.key.replace(`network_builder_${userId}_`, "");
        switch (key) {
          case "targetIndustries":
            config.targetIndustries = JSON.parse(s.value || "[]");
            break;
          case "targetRoles":
            config.targetRoles = JSON.parse(s.value || "[]");
            break;
          case "maxConnectionsPerWeek":
            config.maxConnectionsPerWeek = parseInt(s.value, 10) || 20;
            break;
          case "autoConnect":
            config.autoConnect = s.value === "true";
            break;
          case "connectionMessage":
            config.connectionMessage = s.value || "";
            break;
        }
      }
      return config;
    } catch {
      return DEFAULT_CONFIG2;
    }
  }
  /**
   * Save user-specific Network Builder config.
   */
  static async saveConfig(userId, config) {
    const entries = [];
    if (config.targetIndustries !== void 0) entries.push({ key: `network_builder_${userId}_targetIndustries`, value: JSON.stringify(config.targetIndustries) });
    if (config.targetRoles !== void 0) entries.push({ key: `network_builder_${userId}_targetRoles`, value: JSON.stringify(config.targetRoles) });
    if (config.maxConnectionsPerWeek !== void 0) entries.push({ key: `network_builder_${userId}_maxConnectionsPerWeek`, value: String(config.maxConnectionsPerWeek) });
    if (config.autoConnect !== void 0) entries.push({ key: `network_builder_${userId}_autoConnect`, value: String(config.autoConnect) });
    if (config.connectionMessage !== void 0) entries.push({ key: `network_builder_${userId}_connectionMessage`, value: config.connectionMessage });
    await Promise.all(
      entries.map(
        (e) => db.settings.upsert({
          where: { key: e.key },
          update: { value: e.value },
          create: { key: e.key, value: e.value }
        })
      )
    );
    return this.getConfig(userId);
  }
  // ----------------------------------------------------------------
  // 1. TARGET DISCOVERY
  // ----------------------------------------------------------------
  /**
   * AI generates 8-15 relevant people to connect with.
   * Creates ConnectionTarget records with status 'identified'.
   * Creates AgentActivity.
   */
  static async discoverTargets(userId) {
    const config = await this.getConfig(userId);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });
    const industries = config.targetIndustries.join(", ") || "Tech, Marketing, Consulting";
    const roles = config.targetRoles.join(", ") || "CTO, VP Marketing, Head of Sales";
    const existingTargets = await db.connectionTarget.findMany({
      where: { userId },
      select: { targetName: true, targetCompany: true },
      take: 100
    });
    const existingKeys = new Set(existingTargets.map((t) => `${t.targetName}|${t.targetCompany}`));
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en networking LinkedIn B2B. Tu identifies les personnes les plus pertinentes \xE0 connecter pour d\xE9velopper un r\xE9seau professionnel strat\xE9gique.
R\xE9ponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: [{"targetName":"Pr\xE9nom Nom","targetHeadline":"Titre LinkedIn","targetCompany":"Entreprise","targetSector":"Secteur","relevanceScore":85,"reason":"Raison de la connexion"}]
G\xE9n\xE8re 8-15 profils r\xE9alistes et vari\xE9s. Inclus des d\xE9cideurs, des influenceurs et des pairs.
Les scores de pertinence sont entre 0 et 100.`
      },
      {
        role: "user",
        content: `Trouve les personnes id\xE9ales \xE0 connecter pour le profil suivant :
- Utilisateur : ${user?.name || "Professionnel"}
- Industries cibles : ${industries}
- R\xF4les cibles : ${roles}
${config.connectionMessage ? `- Note additionnelle de l'utilisateur : ${config.connectionMessage}` : ""}

Cherche des profils qui pourraient \xEAtre des partenaires, clients potentiels, mentors ou collaborateurs.
Inclus une diversit\xE9 d'entreprises (grandes, startups, agences).
Date : ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR")}`
      }
    ];
    try {
      const result = await callAI(messages, { temperature: 0.7, maxTokens: 2e3 }, "zai");
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const targets = JSON.parse(cleaned);
      if (!Array.isArray(targets)) return [];
      const unique = targets.filter(
        (t) => !existingKeys.has(`${t.targetName}|${t.targetCompany}`)
      );
      for (const target of unique) {
        await db.connectionTarget.create({
          data: {
            userId,
            targetName: target.targetName,
            targetHeadline: target.targetHeadline,
            targetCompany: target.targetCompany,
            targetSector: target.targetSector,
            relevanceScore: target.relevanceScore || 50,
            status: "identified",
            notes: target.reason
          }
        });
      }
      await db.agentActivity.create({
        data: {
          userId,
          agentType: "network_builder",
          status: "completed",
          title: `${unique.length} nouvelles cibles de connexion identifi\xE9es`,
          description: `D\xE9couverte de ${unique.length} profils pertinents dans les secteurs : ${industries}. ${unique.length > 0 ? `Score moyen : ${Math.round(unique.reduce((a, b) => a + b.relevanceScore, 0) / unique.length)}/100.` : ""}`,
          metadata: JSON.stringify({
            totalFound: unique.length,
            topScore: unique.length > 0 ? Math.max(...unique.map((t) => t.relevanceScore)) : 0,
            industries
          })
        }
      });
      return unique.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error("[NetworkBuilder] Target discovery error:", error);
      return [];
    }
  }
  // ----------------------------------------------------------------
  // 2. CONNECTION MESSAGE GENERATION
  // ----------------------------------------------------------------
  /**
   * AI generates a personalized LinkedIn connection note (max 300 chars).
   * Returns the message.
   */
  static async generateConnectionMessage(userId, targetName, targetCompany, targetRole) {
    const config = await this.getConfig(userId);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });
    const industries = config.targetIndustries.join(", ") || "";
    const roles = config.targetRoles.join(", ") || "";
    const messages = [
      {
        role: "system",
        content: `Tu r\xE9diges des messages de connexion LinkedIn personnalis\xE9s et engageants.
Le message doit \xEAtre court (max 300 caract\xE8res), chaleureux et donner envie de r\xE9pondre.
Il ne doit PAS \xEAtre g\xE9n\xE9rique \u2014 il doit mentionner la personne et son entreprise sp\xE9cifiquement.
\xC9vite les formulations trop commerciales ou agressives.
R\xE9ponds UNIQUEMENT en JSON valide, sans markdown.
Format: {"message":"message de connexion","approach":"approche utilis\xE9e (ex: valorisation expertise, int\xE9r\xEAt commun, etc.)"}`
      },
      {
        role: "user",
        content: `R\xE9dige un message de connexion LinkedIn pour :
- De la part de : ${user?.name || "Professionnel"}
- Destinataire : ${targetName}
- Entreprise du destinataire : ${targetCompany}
- R\xF4le du destinataire : ${targetRole}
${industries ? `- Industries d'int\xE9r\xEAt commun : ${industries}` : ""}
${roles ? `- R\xF4les d'int\xE9r\xEAt : ${roles}` : ""}
${config.connectionMessage ? `- Note additionnelle de l'utilisateur : ${config.connectionMessage}` : ""}

Le message doit cr\xE9er une connexion authentique et ouvrir la possibilit\xE9 d'un \xE9change professionnel.`
      }
    ];
    try {
      const result = await callAI(messages, { temperature: 0.7, maxTokens: 400 }, "zai");
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.message.length > 300) {
        parsed.message = parsed.message.substring(0, 297) + "...";
      }
      return parsed;
    } catch {
      const firstName = targetName.split(" ")[0] || targetName;
      return {
        message: `Bonjour ${firstName}, votre parcours chez ${targetCompany} en tant que ${targetRole} est particuli\xE8rement inspirant. Je serais ravi(e) d'\xE9changer avec vous sur nos secteurs d'activit\xE9 communs.`,
        approach: "Valorisation du parcours professionnel"
      };
    }
  }
  // ----------------------------------------------------------------
  // 3. PENDING CONNECTION PROCESSING
  // ----------------------------------------------------------------
  /**
   * Finds targets with status 'identified', generates connection messages,
   * updates status to 'connection_sent'. Respects weekly limit.
   * Creates AgentActivity.
   */
  static async processPendingConnections(userId) {
    const config = await this.getConfig(userId);
    const result = {
      processed: 0,
      sent: 0,
      skipped: 0,
      details: []
    };
    const weekStart = /* @__PURE__ */ new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weeklyConnections = await db.connectionTarget.count({
      where: {
        userId,
        status: "connection_sent",
        connectionDate: { gte: weekStart }
      }
    });
    const remaining = config.maxConnectionsPerWeek - weeklyConnections;
    if (remaining <= 0) {
      return result;
    }
    const pendingTargets = await db.connectionTarget.findMany({
      where: {
        userId,
        status: "identified"
      },
      orderBy: { relevanceScore: "desc" },
      take: remaining
    });
    for (const target of pendingTargets) {
      try {
        const msgResult = await this.generateConnectionMessage(
          userId,
          target.targetName || "Contact",
          target.targetCompany || "Entreprise",
          target.targetHeadline || "Professionnel"
        );
        await db.connectionTarget.update({
          where: { id: target.id },
          data: {
            status: "connection_sent",
            messageSent: msgResult.message,
            connectionDate: /* @__PURE__ */ new Date()
          }
        });
        await db.agentActivity.create({
          data: {
            userId,
            agentType: "network_builder",
            status: "completed",
            title: `Connexion envoy\xE9e \u2014 ${target.targetName}`,
            description: `Demande de connexion envoy\xE9e \xE0 ${target.targetName} (${target.targetCompany || "Entreprise"}). Approche : ${msgResult.approach}.`,
            metadata: JSON.stringify({
              targetId: target.id,
              targetName: target.targetName,
              targetCompany: target.targetCompany,
              approach: msgResult.approach
            })
          }
        });
        result.processed++;
        result.sent++;
        result.details.push({
          targetId: target.id,
          targetName: target.targetName,
          message: msgResult.message,
          approach: msgResult.approach
        });
      } catch (error) {
        console.error(`[NetworkBuilder] Error processing target ${target.id}:`, error);
        result.skipped++;
      }
    }
    if (result.sent > 0) {
      await db.notification.create({
        data: {
          userId,
          type: "system",
          title: `${result.sent} connexion(s) envoy\xE9e(s)`,
          message: `${result.sent} demande(s) de connexion ont \xE9t\xE9 envoy\xE9e(s) automatiquement. Il vous reste ${remaining - result.sent} connexion(s) disponible(s) cette semaine.`,
          metadata: JSON.stringify({ sent: result.sent, remaining: remaining - result.sent })
        }
      });
    }
    return result;
  }
  // ----------------------------------------------------------------
  // 4. WORKER METHODS
  // ----------------------------------------------------------------
  /**
   * Main cycle: discoverTargets + processPendingConnections.
   * Returns stats.
   */
  static async runWorkerCycle(userId) {
    const config = await this.getConfig(userId);
    const result = {
      targetsDiscovered: 0,
      connectionsSent: 0,
      connectionsProcessed: 0,
      weeklyLimitUsed: 0,
      weeklyLimitTotal: config.maxConnectionsPerWeek
    };
    const weekStart = /* @__PURE__ */ new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weeklyCount = await db.connectionTarget.count({
      where: {
        userId,
        status: "connection_sent",
        connectionDate: { gte: weekStart }
      }
    });
    result.weeklyLimitUsed = weeklyCount;
    try {
      const targets = await this.discoverTargets(userId);
      result.targetsDiscovered = targets.length;
    } catch (error) {
      console.error(`[NetworkBuilder Worker] Discovery error for user ${userId}:`, error);
    }
    if (config.autoConnect) {
      try {
        const processResult = await this.processPendingConnections(userId);
        result.connectionsSent = processResult.sent;
        result.connectionsProcessed = processResult.processed;
        result.weeklyLimitUsed = weeklyCount + processResult.sent;
      } catch (error) {
        console.error(`[NetworkBuilder Worker] Processing error for user ${userId}:`, error);
      }
    }
    try {
      await db.agentConfig.update({
        where: { userId_agentType: { userId, agentType: "network_builder" } },
        data: { lastExecutedAt: /* @__PURE__ */ new Date() }
      });
    } catch {
    }
    return result;
  }
  /**
   * Get dashboard stats for a user.
   * Returns counts by status, weekly connection count, etc.
   */
  static async getDashboardStats(userId) {
    const [
      totalTargets,
      identifiedTargets,
      connectedTargets,
      repliedTargets,
      convertedTargets,
      recentActivities
    ] = await Promise.all([
      db.connectionTarget.count({ where: { userId } }),
      db.connectionTarget.count({ where: { userId, status: "identified" } }),
      db.connectionTarget.count({ where: { userId, status: "connected" } }),
      db.connectionTarget.count({ where: { userId, status: "replied" } }),
      db.connectionTarget.count({ where: { userId, status: "converted" } }),
      db.agentActivity.findMany({
        where: { userId, agentType: "network_builder" },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ]);
    const weekStart = /* @__PURE__ */ new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weeklySent = await db.connectionTarget.count({
      where: {
        userId,
        status: "connection_sent",
        connectionDate: { gte: weekStart }
      }
    });
    const weeklyConnected = await db.connectionTarget.count({
      where: {
        userId,
        status: { in: ["connected", "replied", "converted"] },
        connectionDate: { gte: weekStart }
      }
    });
    const totalSent = await db.connectionTarget.count({
      where: { userId, status: { in: ["connection_sent", "connected", "replied", "converted"] } }
    });
    const connected = await db.connectionTarget.count({
      where: { userId, status: { in: ["connected", "replied", "converted"] } }
    });
    const connectionRate = totalSent > 0 ? Math.round(connected / totalSent * 100) : 0;
    const topTargets = await db.connectionTarget.findMany({
      where: { userId },
      orderBy: { relevanceScore: "desc" },
      take: 5,
      select: {
        targetName: true,
        targetCompany: true,
        targetHeadline: true,
        relevanceScore: true,
        status: true
      }
    });
    return {
      totalTargets,
      identifiedTargets,
      connectedTargets,
      repliedTargets,
      convertedTargets,
      weeklySent,
      weeklyConnected,
      connectionRate,
      topTargets,
      recentActivities
    };
  }
};

// src/lib/agents/content-recycler.ts
var DEFAULT_CONFIG3 = {
  minDaysOld: 30,
  minEngagementScore: 60,
  maxRecycles: 3,
  autoRecycle: false,
  recycleFrequency: "monthly",
  targetFormats: ["carousel", "thread", "article"]
};
var ContentRecyclerAgent = class {
  /**
   * Get user-specific Content Recycler config from Settings table.
   */
  static async getConfig(userId) {
    try {
      const settings = await db.settings.findMany({
        where: {
          key: {
            startsWith: `content_recycler_${userId}_`
          }
        }
      });
      const config = { ...DEFAULT_CONFIG3 };
      for (const s of settings) {
        const key = s.key.replace(`content_recycler_${userId}_`, "");
        switch (key) {
          case "minDaysOld":
            config.minDaysOld = parseInt(s.value, 10) || 30;
            break;
          case "minEngagementScore":
            config.minEngagementScore = parseInt(s.value, 10) || 60;
            break;
          case "maxRecycles":
            config.maxRecycles = parseInt(s.value, 10) || 3;
            break;
          case "autoRecycle":
            config.autoRecycle = s.value === "true";
            break;
          case "recycleFrequency":
            config.recycleFrequency = s.value || "monthly";
            break;
          case "targetFormats":
            config.targetFormats = JSON.parse(s.value || '["carousel", "thread", "article"]');
            break;
        }
      }
      return config;
    } catch {
      return DEFAULT_CONFIG3;
    }
  }
  /**
   * Save user-specific Content Recycler config.
   */
  static async saveConfig(userId, config) {
    const entries = [];
    if (config.minDaysOld !== void 0) entries.push({ key: `content_recycler_${userId}_minDaysOld`, value: String(config.minDaysOld) });
    if (config.minEngagementScore !== void 0) entries.push({ key: `content_recycler_${userId}_minEngagementScore`, value: String(config.minEngagementScore) });
    if (config.maxRecycles !== void 0) entries.push({ key: `content_recycler_${userId}_maxRecycles`, value: String(config.maxRecycles) });
    if (config.autoRecycle !== void 0) entries.push({ key: `content_recycler_${userId}_autoRecycle`, value: String(config.autoRecycle) });
    if (config.recycleFrequency !== void 0) entries.push({ key: `content_recycler_${userId}_recycleFrequency`, value: config.recycleFrequency });
    if (config.targetFormats !== void 0) entries.push({ key: `content_recycler_${userId}_targetFormats`, value: JSON.stringify(config.targetFormats) });
    await Promise.all(
      entries.map(
        (e) => db.settings.upsert({
          where: { key: e.key },
          update: { value: e.value },
          create: { key: e.key, value: e.value }
        })
      )
    );
    return this.getConfig(userId);
  }
  // ----------------------------------------------------------------
  // 1. FIND RECYCLABLE CONTENT
  // ----------------------------------------------------------------
  /**
   * Finds old high-performing posts (published > minDaysOld, with good metrics).
   * Returns them.
   */
  static async findRecyclableContent(userId) {
    const config = await this.getConfig(userId);
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.minDaysOld);
    const posts = await db.post.findMany({
      where: {
        authorId: userId,
        status: "posted",
        createdAt: { lte: cutoffDate },
        contentScore: { gte: config.minEngagementScore }
      },
      orderBy: { contentScore: "desc" },
      take: 20
    });
    const recyclable = [];
    for (const post of posts) {
      const recycleCount = await db.repurposedContent.count({
        where: { userId, sourcePostId: post.id }
      });
      if (recycleCount >= config.maxRecycles) continue;
      const metrics = await db.postMetric.findFirst({
        where: { postId: post.id },
        orderBy: { collectedAt: "desc" }
      });
      const lastRecycled = await db.repurposedContent.findFirst({
        where: { userId, sourcePostId: post.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true }
      });
      recyclable.push({
        id: post.id,
        subject: post.subject,
        finalContent: post.finalContent || "",
        contentScore: post.contentScore || 0,
        createdAt: post.createdAt,
        metrics: metrics ? {
          likes: metrics.likes,
          comments: metrics.comments,
          reposts: metrics.reposts,
          engagementRate: metrics.engagementRate
        } : null,
        recycleCount,
        lastRecycledAt: lastRecycled?.createdAt || null
      });
    }
    recyclable.sort((a, b) => b.contentScore - a.contentScore);
    if (recyclable.length > 0) {
      await db.agentActivity.create({
        data: {
          userId,
          agentType: "content_recycler",
          status: "completed",
          title: `${recyclable.length} contenus recyclables identifi\xE9s`,
          description: `${recyclable.length} posts publi\xE9s depuis plus de ${config.minDaysOld} jours avec un score >= ${config.minEngagementScore} peuvent \xEAtre recycl\xE9s. Meilleur score : ${recyclable[0]?.contentScore || 0}.`,
          metadata: JSON.stringify({
            count: recyclable.length,
            minDaysOld: config.minDaysOld,
            minScore: config.minEngagementScore,
            topScore: recyclable[0]?.contentScore || 0
          })
        }
      });
    }
    return recyclable;
  }
  // ----------------------------------------------------------------
  // 2. CONTENT REPURPOSING
  // ----------------------------------------------------------------
  /**
   * Takes a source post, uses AI to repurpose it into a new format.
   * Creates RepurposedContent record and AgentActivity.
   */
  static async generateRepurposedContent(userId, sourcePostId) {
    const config = await this.getConfig(userId);
    const post = await db.post.findUnique({
      where: { id: sourcePostId, authorId: userId }
    });
    if (!post) {
      throw new Error("Post introuvable ou n'appartient pas \xE0 l'utilisateur");
    }
    const recycleCount = await db.repurposedContent.count({
      where: { userId, sourcePostId: post.id }
    });
    const metrics = await db.postMetric.findFirst({
      where: { postId: post.id },
      orderBy: { collectedAt: "desc" }
    });
    const recyclablePost = {
      id: post.id,
      subject: post.subject,
      finalContent: post.finalContent || "",
      contentScore: post.contentScore || 0,
      createdAt: post.createdAt,
      metrics: metrics ? {
        likes: metrics.likes,
        comments: metrics.comments,
        reposts: metrics.reposts,
        engagementRate: metrics.engagementRate
      } : null,
      recycleCount,
      lastRecycledAt: null
    };
    const formats = config.targetFormats.length > 0 ? config.targetFormats : ["carousel", "thread", "article"];
    const formatIndex = recycleCount % formats.length;
    const targetType = formats[formatIndex];
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en recyclage de contenu LinkedIn. Tu transformes du contenu existant en nouveaux formats tout en conservant le message central et la valeur.
Le contenu recycl\xE9 doit \xEAtre frais, original et adapt\xE9 au nouveau format cible.
R\xE9ponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: {
  "generatedContent": "contenu recycl\xE9 complet",
  "title": "titre accrocheur du contenu recycl\xE9",
  "qualityScore": 80
}
Le score de qualit\xE9 est entre 0 et 100. Sois exigeant sur la qualit\xE9.`
      },
      {
        role: "user",
        content: `Transforme le contenu LinkedIn suivant en format "${targetType}" :

Titre original : "${recyclablePost.subject}"
Contenu original :
"""
${recyclablePost.finalContent.substring(0, 1500)}
"""
${recyclablePost.metrics ? `- Engagement original : ${(recyclablePost.metrics.engagementRate * 100).toFixed(1)}%, ${recyclablePost.metrics.likes} likes, ${recyclablePost.metrics.comments} commentaires` : ""}
- Nombre de recyclages pr\xE9c\xE9dents : ${recyclablePost.recycleCount}

G\xE9n\xE8re un contenu de haute qualit\xE9 adapt\xE9 au format "${targetType}".
Le contenu doit apporter une perspective nouvelle tout en restant fid\xE8le au message original.
Date : ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR")}`
      }
    ];
    try {
      const result = await callAI(messages, { temperature: 0.8, maxTokens: 2e3 }, "zai");
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const repurposed = JSON.parse(cleaned);
      const qualityScore = Math.max(0, Math.min(100, repurposed.qualityScore || 0));
      const fullResult = {
        sourcePostId: recyclablePost.id,
        sourceContent: recyclablePost.finalContent,
        sourceType: "post",
        targetType,
        generatedContent: repurposed.generatedContent,
        title: repurposed.title,
        qualityScore
      };
      await db.repurposedContent.create({
        data: {
          userId,
          sourcePostId: recyclablePost.id,
          sourceContent: recyclablePost.finalContent,
          sourceType: "post",
          targetType,
          generatedContent: repurposed.generatedContent,
          title: repurposed.title,
          qualityScore
        }
      });
      await db.agentActivity.create({
        data: {
          userId,
          agentType: "content_recycler",
          status: "completed",
          title: `Contenu recycl\xE9 \u2014 ${targetType}`,
          description: `"${recyclablePost.subject.substring(0, 60)}..." transform\xE9 en ${targetType}. Score de qualit\xE9 : ${qualityScore}/100.`,
          metadata: JSON.stringify({
            sourcePostId: recyclablePost.id,
            targetType,
            qualityScore
          })
        }
      });
      return fullResult;
    } catch (error) {
      console.error("[ContentRecycler] Repurposing error:", error);
      return {
        sourcePostId: recyclablePost.id,
        sourceContent: recyclablePost.finalContent,
        sourceType: "post",
        targetType,
        generatedContent: recyclablePost.finalContent,
        title: recyclablePost.subject,
        qualityScore: 40
      };
    }
  }
  // ----------------------------------------------------------------
  // 3. SCHEDULE RECYCLED CONTENT
  // ----------------------------------------------------------------
  /**
   * Finds RepurposedContent with isUsed=false, creates ContentPlanItem for each.
   * Marks as used. Creates AgentActivity.
   */
  static async scheduleRecycledContent(userId) {
    const config = await this.getConfig(userId);
    const unusedContent = await db.repurposedContent.findMany({
      where: {
        userId,
        isUsed: false,
        qualityScore: { gte: 60 }
      },
      orderBy: { qualityScore: "desc" },
      take: 5
    });
    const scheduled = [];
    for (const content of unusedContent) {
      try {
        const scheduledDate = /* @__PURE__ */ new Date();
        switch (config.recycleFrequency) {
          case "weekly":
            scheduledDate.setDate(scheduledDate.getDate() + scheduled.length * 3);
            break;
          case "biweekly":
            scheduledDate.setDate(scheduledDate.getDate() + scheduled.length * 7);
            break;
          case "monthly":
          default:
            scheduledDate.setDate(scheduledDate.getDate() + scheduled.length * 14);
            break;
        }
        scheduledDate.setHours(9, 0, 0, 0);
        const contentPlanItem = await db.contentPlanItem.create({
          data: {
            userId,
            plannedDate: scheduledDate,
            topic: content.title || "Contenu recycl\xE9",
            format: content.targetType || "text",
            priority: content.qualityScore >= 80 ? "high" : content.qualityScore >= 60 ? "medium" : "low",
            status: "planned",
            aiSuggestion: content.generatedContent,
            notes: `Contenu recycl\xE9 \xE0 partir du post original (score: ${content.qualityScore})`
          }
        });
        await db.repurposedContent.update({
          where: { id: content.id },
          data: { isUsed: true }
        });
        scheduled.push({
          id: contentPlanItem.id,
          title: content.title || "Contenu recycl\xE9",
          targetType: content.targetType,
          generatedContent: content.generatedContent,
          qualityScore: content.qualityScore,
          plannedDate: scheduledDate
        });
      } catch (error) {
        console.error(`[ContentRecycler] Error scheduling content ${content.id}:`, error);
      }
    }
    if (scheduled.length > 0) {
      await db.agentActivity.create({
        data: {
          userId,
          agentType: "content_recycler",
          status: "completed",
          title: `${scheduled.length} contenus recycl\xE9s planifi\xE9s`,
          description: `${scheduled.length} contenus recycl\xE9s ont \xE9t\xE9 planifi\xE9s pour publication. Fr\xE9quence : ${config.recycleFrequency}.`,
          metadata: JSON.stringify({
            scheduled: scheduled.map((s) => ({ id: s.id, title: s.title, type: s.targetType }))
          })
        }
      });
      await db.notification.create({
        data: {
          userId,
          type: "system",
          title: "Contenus recycl\xE9s planifi\xE9s",
          message: `${scheduled.length} contenus recycl\xE9s ont \xE9t\xE9 automatiquement planifi\xE9s dans votre calendrier de publication.`,
          metadata: JSON.stringify({ count: scheduled.length })
        }
      });
    }
    return scheduled;
  }
  // ----------------------------------------------------------------
  // 4. WORKER METHODS
  // ----------------------------------------------------------------
  /**
   * Main cycle: findRecyclableContent + generateRepurposedContent + scheduleRecycledContent.
   * Returns stats.
   */
  static async runWorkerCycle(userId) {
    const config = await this.getConfig(userId);
    const result = {
      recyclableFound: 0,
      contentGenerated: 0,
      contentScheduled: 0,
      avgQualityScore: 0
    };
    let recyclablePosts = [];
    try {
      recyclablePosts = await this.findRecyclableContent(userId);
      result.recyclableFound = recyclablePosts.length;
    } catch (error) {
      console.error(`[ContentRecycler Worker] Find error for user ${userId}:`, error);
    }
    const qualityScores = [];
    if (config.autoRecycle && recyclablePosts.length > 0) {
      try {
        const postsToRecycle = recyclablePosts.slice(0, 3);
        for (const post of postsToRecycle) {
          try {
            const repurposed = await this.generateRepurposedContent(userId, post.id);
            result.contentGenerated++;
            qualityScores.push(repurposed.qualityScore);
          } catch (error) {
            console.error(`[ContentRecycler Worker] Repurpose error for post ${post.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`[ContentRecycler Worker] Repurpose error for user ${userId}:`, error);
      }
    }
    try {
      const scheduled = await this.scheduleRecycledContent(userId);
      result.contentScheduled = scheduled.length;
    } catch (error) {
      console.error(`[ContentRecycler Worker] Schedule error for user ${userId}:`, error);
    }
    result.avgQualityScore = qualityScores.length > 0 ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) : 0;
    try {
      await db.agentConfig.update({
        where: { userId_agentType: { userId, agentType: "content_recycler" } },
        data: { lastExecutedAt: /* @__PURE__ */ new Date() }
      });
    } catch {
    }
    return result;
  }
  /**
   * Get dashboard stats for a user.
   * Returns recyclable count, repurposed count, scheduled count, etc.
   */
  static async getDashboardStats(userId) {
    const [
      totalRepurposed,
      scheduledRepurposed,
      usedRepurposed,
      recyclingRules,
      recentActivities
    ] = await Promise.all([
      db.repurposedContent.count({ where: { userId } }),
      db.repurposedContent.count({ where: { userId, isUsed: false } }),
      db.repurposedContent.count({ where: { userId, isUsed: true } }),
      db.contentRecyclingRule.count({ where: { userId } }),
      db.agentActivity.findMany({
        where: { userId, agentType: "content_recycler" },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ]);
    const avgQualityResult = await db.repurposedContent.aggregate({
      where: { userId },
      _avg: { qualityScore: true }
    });
    const avgQuality = Math.round(avgQualityResult._avg.qualityScore || 0);
    const config = await this.getConfig(userId);
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.minDaysOld);
    const recyclablePosts = await db.post.count({
      where: {
        authorId: userId,
        status: "posted",
        createdAt: { lte: cutoffDate },
        contentScore: { gte: config.minEngagementScore }
      }
    });
    const plannedItems = await db.contentPlanItem.count({
      where: {
        userId,
        status: "planned",
        aiSuggestion: { not: null }
      }
    });
    const targetTypeStats = await db.repurposedContent.groupBy({
      by: ["targetType"],
      where: { userId },
      _count: { id: true },
      _avg: { qualityScore: true },
      orderBy: { _count: { id: "desc" } },
      take: 5
    });
    const recentRepurposed = await db.repurposedContent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        targetType: true,
        qualityScore: true,
        isUsed: true,
        createdAt: true
      }
    });
    return {
      totalRepurposed,
      scheduledRepurposed,
      usedRepurposed,
      recyclablePosts,
      plannedItems,
      avgQuality,
      recyclingRules,
      targetTypeStats,
      recentRepurposed,
      recentActivities
    };
  }
};

// src/lib/agents/competitor-spy.ts
var DEFAULT_CONFIG4 = {
  trackedCompetitorIds: [],
  alertOnNewPost: true,
  alertOnHighEngagement: true,
  highEngagementThreshold: 5,
  analysisFrequency: "weekly"
};
var CompetitorSpyAgent = class {
  /**
   * Get user-specific Competitor Spy config from Settings table.
   */
  static async getConfig(userId) {
    try {
      const settings = await db.settings.findMany({
        where: {
          key: {
            startsWith: `competitor_spy_${userId}_`
          }
        }
      });
      const config = { ...DEFAULT_CONFIG4 };
      for (const s of settings) {
        const key = s.key.replace(`competitor_spy_${userId}_`, "");
        switch (key) {
          case "trackedCompetitorIds":
            config.trackedCompetitorIds = JSON.parse(s.value || "[]");
            break;
          case "alertOnNewPost":
            config.alertOnNewPost = s.value !== "false";
            break;
          case "alertOnHighEngagement":
            config.alertOnHighEngagement = s.value !== "false";
            break;
          case "highEngagementThreshold":
            config.highEngagementThreshold = parseFloat(s.value) || 5;
            break;
          case "analysisFrequency":
            config.analysisFrequency = s.value || "weekly";
            break;
        }
      }
      return config;
    } catch {
      return DEFAULT_CONFIG4;
    }
  }
  /**
   * Save user-specific Competitor Spy config.
   */
  static async saveConfig(userId, config) {
    const entries = [];
    if (config.trackedCompetitorIds !== void 0) entries.push({ key: `competitor_spy_${userId}_trackedCompetitorIds`, value: JSON.stringify(config.trackedCompetitorIds) });
    if (config.alertOnNewPost !== void 0) entries.push({ key: `competitor_spy_${userId}_alertOnNewPost`, value: String(config.alertOnNewPost) });
    if (config.alertOnHighEngagement !== void 0) entries.push({ key: `competitor_spy_${userId}_alertOnHighEngagement`, value: String(config.alertOnHighEngagement) });
    if (config.highEngagementThreshold !== void 0) entries.push({ key: `competitor_spy_${userId}_highEngagementThreshold`, value: String(config.highEngagementThreshold) });
    if (config.analysisFrequency !== void 0) entries.push({ key: `competitor_spy_${userId}_analysisFrequency`, value: config.analysisFrequency });
    await Promise.all(
      entries.map(
        (e) => db.settings.upsert({
          where: { key: e.key },
          update: { value: e.value },
          create: { key: e.key, value: e.value }
        })
      )
    );
    return this.getConfig(userId);
  }
  // ----------------------------------------------------------------
  // 1. COMPETITOR ANALYSIS
  // ----------------------------------------------------------------
  /**
   * Gets competitor's recent posts from DB, uses AI to analyze patterns,
   * strategies, top content. Creates AgentActivity with analysis.
   */
  static async analyzeCompetitorActivity(userId, competitorId) {
    const config = await this.getConfig(userId);
    const competitor = await db.competitor.findUnique({
      where: { id: competitorId, userId }
    });
    if (!competitor) {
      throw new Error("Concurrent introuvable");
    }
    const recentPosts = await db.competitorPost.findMany({
      where: { competitorId },
      orderBy: { publishedAt: "desc" },
      take: 20
    });
    const postSummaries = recentPosts.map((p) => ({
      subject: p.subject,
      format: p.detectedFormat || "text",
      likes: p.likes,
      comments: p.comments,
      reposts: p.reposts,
      engagementRate: p.engagementRate,
      publishedAt: p.publishedAt?.toLocaleDateString("fr-FR") || "Date inconnue"
    }));
    const messages = [
      {
        role: "system",
        content: `Tu es un analyste concurrentiel sp\xE9cialis\xE9 LinkedIn B2B. Tu analyses la pr\xE9sence LinkedIn des concurrents et identifies leurs strat\xE9gies, forces et faiblesses.
R\xE9ponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: {
  "competitorId": "...",
  "competitorName": "...",
  "profileAnalysis": {
    "postFrequency": "X posts/semaine",
    "topContentTypes": ["type1", "type2"],
    "avgEngagement": 4.5,
    "contentThemes": ["th\xE8me1", "th\xE8me2"],
    "strengths": ["force1", "force2"],
    "weaknesses": ["faiblesse1", "faiblesse2"]
  },
  "recommendations": ["recommandation1"],
  "threatLevel": "low|medium|high"
}
Seuil d'engagement \xE9lev\xE9 : ${config.highEngagementThreshold}%.`
      },
      {
        role: "user",
        content: `Analyse la pr\xE9sence LinkedIn du concurrent suivant :
- Nom : ${competitor.name}
- Secteur : ${competitor.industry || "Non pr\xE9cis\xE9"}
- URL LinkedIn : ${competitor.linkedinUrl}
${competitor.notes ? `- Notes : ${competitor.notes}` : ""}

Posts r\xE9cents (${postSummaries.length} posts) :
${JSON.stringify(postSummaries, null, 2)}

Identifie les tendances de contenu, les formats qui performent le mieux,
les th\xE9matiques r\xE9currentes et les strat\xE9gies d'engagement.
Date d'analyse : ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR")}`
      }
    ];
    try {
      const result = await callAI(messages, { temperature: 0.5, maxTokens: 2e3 }, "zai");
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const analysis = JSON.parse(cleaned);
      await db.agentActivity.create({
        data: {
          userId,
          agentType: "competitor_spy",
          status: "completed",
          title: `Analyse concurrentielle \u2014 ${competitor.name}`,
          description: `Analyse de ${postSummaries.length} posts r\xE9cents. Niveau de menace : ${analysis.threatLevel}. Engagement moyen : ${analysis.profileAnalysis.avgEngagement}%.`,
          metadata: JSON.stringify({
            competitorId,
            competitorName: competitor.name,
            threatLevel: analysis.threatLevel,
            postCount: postSummaries.length
          })
        }
      });
      if (analysis.threatLevel === "high" && config.alertOnHighEngagement) {
        await db.notification.create({
          data: {
            userId,
            type: "system",
            title: `Alerte concurrentielle \u2014 ${competitor.name}`,
            message: `${competitor.name} repr\xE9sente une menace \xE9lev\xE9e. Fr\xE9quence : ${analysis.profileAnalysis.postFrequency}, engagement moyen : ${analysis.profileAnalysis.avgEngagement}%.`,
            metadata: JSON.stringify({ competitorId, competitorName: competitor.name, threatLevel: analysis.threatLevel })
          }
        });
      }
      return { ...analysis, competitorId, competitorName: competitor.name };
    } catch (error) {
      console.error("[CompetitorSpy] Analyze error:", error);
      return this.getFallbackAnalysis(competitorId, competitor.name);
    }
  }
  static getFallbackAnalysis(competitorId, competitorName) {
    return {
      competitorId,
      competitorName,
      profileAnalysis: {
        postFrequency: "3-5 posts/semaine",
        topContentTypes: ["Articles", "Carrousels", "Stories"],
        avgEngagement: 45,
        contentThemes: ["Leadership", "Innovation", "Culture entreprise"],
        strengths: ["Fr\xE9quence de publication \xE9lev\xE9e", "Bon engagement sur les carrousels"],
        weaknesses: ["Peu d'interaction avec les commentaires", "Absence de contenu vid\xE9o"]
      },
      recommendations: ["Augmenter la fr\xE9quence de publication", "Exploiter les faiblesses identifi\xE9es", "Cr\xE9er du contenu diff\xE9renciant"],
      threatLevel: "medium"
    };
  }
  // ----------------------------------------------------------------
  // 2. COMPETITIVE INSIGHTS
  // ----------------------------------------------------------------
  /**
   * Analyzes ALL tracked competitors, AI generates strategic insights
   * and recommendations. Creates AgentActivity + Notification.
   */
  static async generateCompetitiveInsights(userId) {
    const config = await this.getConfig(userId);
    const competitors = await db.competitor.findMany({
      where: {
        id: { in: config.trackedCompetitorIds },
        userId,
        isActive: true
      }
    });
    const competitorContexts = await Promise.all(
      competitors.map(async (c) => {
        const posts = await db.competitorPost.findMany({
          where: { competitorId: c.id },
          orderBy: { publishedAt: "desc" },
          take: 5,
          select: { subject: true, engagementRate: true, detectedFormat: true }
        });
        const avgEngagement = posts.length > 0 ? posts.reduce((sum, p) => sum + p.engagementRate, 0) / posts.length : 0;
        return {
          name: c.name,
          industry: c.industry || "Non pr\xE9cis\xE9",
          avgEngagement: Math.round(avgEngagement * 100) / 100,
          topFormats: [...new Set(posts.map((p) => p.detectedFormat).filter(Boolean))],
          recentTopics: posts.map((p) => p.subject)
        };
      })
    );
    const userPosts = await db.post.findMany({
      where: { authorId: userId, status: "posted" },
      select: { subject: true },
      take: 20,
      orderBy: { createdAt: "desc" }
    });
    const messages = [
      {
        role: "system",
        content: `Tu es un analyste concurrentiel LinkedIn. Tu g\xE9n\xE8res des insights strat\xE9giques bas\xE9s sur l'analyse des concurrents et du profil utilisateur.
R\xE9ponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: [{"title":"...","description":"...","impact":"positive|negative|neutral","actionItems":["..."],"trend":"rising|stable|declining"}]
G\xE9n\xE8re 6-10 insights pertinents et actionnables.`
      },
      {
        role: "user",
        content: `G\xE9n\xE8re des insights concurrentiels bas\xE9s sur les donn\xE9es suivantes :

Concurrents analys\xE9s :
${JSON.stringify(competitorContexts, null, 2)}

Sujets r\xE9cents de l'utilisateur :
${userPosts.map((p) => p.subject).join("; ") || "Aucun post r\xE9cent"}

Seuil d'engagement \xE9lev\xE9 : ${config.highEngagementThreshold}%
Analyse les tendances, les opportunit\xE9s et les menaces dans le paysage concurrentiel LinkedIn B2B actuel.
Date : ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR")}`
      }
    ];
    try {
      const result = await callAI(messages, { temperature: 0.6, maxTokens: 2500 }, "zai");
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const insights = JSON.parse(cleaned);
      const validInsights = Array.isArray(insights) ? insights : [];
      await db.agentActivity.create({
        data: {
          userId,
          agentType: "competitor_spy",
          status: "completed",
          title: `${validInsights.length} insights concurrentiels g\xE9n\xE9r\xE9s`,
          description: `Analyse de ${competitors.length} concurrents. ${validInsights.filter((i) => i.impact === "negative").length} menaces, ${validInsights.filter((i) => i.impact === "positive").length} opportunit\xE9s identifi\xE9es.`,
          metadata: JSON.stringify({
            competitorsAnalyzed: competitors.length,
            insightsCount: validInsights.length,
            insightsByImpact: {
              positive: validInsights.filter((i) => i.impact === "positive").length,
              negative: validInsights.filter((i) => i.impact === "negative").length,
              neutral: validInsights.filter((i) => i.impact === "neutral").length
            }
          })
        }
      });
      const highPriorityInsights = validInsights.filter(
        (i) => i.impact === "negative" && i.trend === "rising"
      );
      if (highPriorityInsights.length > 0) {
        await db.notification.create({
          data: {
            userId,
            type: "system",
            title: "Insights concurrentiels urgents",
            message: `${highPriorityInsights.length} tendance(s) concurrentielle(s) montante(s) n\xE9cessite(nt) votre attention. Consultez les insights pour des recommandations actionnables.`,
            metadata: JSON.stringify({
              count: highPriorityInsights.length,
              topInsight: highPriorityInsights[0]?.title
            })
          }
        });
      }
      return validInsights;
    } catch (error) {
      console.error("[CompetitorSpy] Insights error:", error);
      return [
        { title: "Mont\xE9e du contenu vid\xE9o", description: "Les concurrents investissent massivement dans le contenu vid\xE9o LinkedIn, avec des r\xE9sultats 2x sup\xE9rieurs en engagement.", impact: "negative", actionItems: ["D\xE9velopper une strat\xE9gie vid\xE9o", "Investir dans des outils de cr\xE9ation vid\xE9o"], trend: "rising" },
        { title: "Carrousels \xE9ducatifs performants", description: `Les carrousels de type "guide" et "checklist" dominent l'engagement dans le secteur B2B.`, impact: "positive", actionItems: ["Cr\xE9er des carrousels \xE9ducatifs", "Recycler les posts performants en carrousel"], trend: "stable" },
        { title: "Diminution des posts texte longs", description: "L'engagement sur les posts texte longs diminue depuis 3 mois.", impact: "neutral", actionItems: ["Raccourcir les posts", "Privil\xE9gier les formats visuels"], trend: "declining" }
      ];
    }
  }
  // ----------------------------------------------------------------
  // 3. CONTENT GAP DETECTION
  // ----------------------------------------------------------------
  /**
   * Compares user's content themes vs competitor content themes using AI.
   * Identifies topics competitors cover that user doesn't.
   * Creates AgentActivity + Notification.
   */
  static async detectContentGaps(userId) {
    const config = await this.getConfig(userId);
    const competitors = await db.competitor.findMany({
      where: {
        id: { in: config.trackedCompetitorIds },
        userId,
        isActive: true
      }
    });
    const competitorTopics = await Promise.all(
      competitors.map(async (c) => {
        const posts = await db.competitorPost.findMany({
          where: { competitorId: c.id },
          select: { subject: true },
          take: 20
        });
        return {
          name: c.name,
          industry: c.industry || "Non pr\xE9cis\xE9",
          topics: posts.map((p) => p.subject).filter(Boolean)
        };
      })
    );
    const userPosts = await db.post.findMany({
      where: { authorId: userId, status: "posted" },
      select: { subject: true, hashtags: true },
      take: 30,
      orderBy: { createdAt: "desc" }
    });
    const userTopics = userPosts.map((p) => p.subject || "").filter(Boolean).join("; ");
    const messages = [
      {
        role: "system",
        content: `Tu es un analyste de contenu LinkedIn. Tu identifies les lacunes de contenu entre un profil et ses concurrents.
R\xE9ponds UNIQUEMENT en JSON valide, sans explication ni markdown.
Format: [{"topic":"...","competitorCoverage":["..."],"userCoverage":"none|partial|covered","opportunityScore":85,"suggestedAngle":"..."}]
G\xE9n\xE8re 8-12 lacunes de contenu avec un score d'opportunit\xE9 (0-100). Seuls les scores >= 50 sont pertinents.`
      },
      {
        role: "user",
        content: `Identifie les lacunes de contenu entre le profil utilisateur et ses concurrents :

Th\xE9matiques couvertes par les concurrents :
${JSON.stringify(competitorTopics.map((c) => ({ name: c.name, industry: c.industry, topics: c.topics.slice(0, 10) })), null, 2)}

Sujets r\xE9cents de l'utilisateur :
${userTopics || "Aucun post r\xE9cent"}

Analyse les sujets couverts par les concurrents mais pas ou peu par l'utilisateur.
Sugg\xE8re des angles de contenu diff\xE9renciants pour combler ces lacunes.
Date : ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR")}`
      }
    ];
    try {
      const result = await callAI(messages, { temperature: 0.5, maxTokens: 2500 }, "zai");
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const gaps = JSON.parse(cleaned);
      const filteredGaps = Array.isArray(gaps) ? gaps.filter((g) => g.opportunityScore >= 50).sort((a, b) => b.opportunityScore - a.opportunityScore) : [];
      await db.agentActivity.create({
        data: {
          userId,
          agentType: "competitor_spy",
          status: "completed",
          title: `${filteredGaps.length} lacunes de contenu d\xE9tect\xE9es`,
          description: `${filteredGaps.length} sujets identifi\xE9s que vos concurrents couvrent mais que vous ne traitez pas encore. ${filteredGaps.filter((g) => g.userCoverage === "none").length} sujets totalement absents.`,
          metadata: JSON.stringify({
            gapsCount: filteredGaps.length,
            topGap: filteredGaps[0]?.topic,
            topGapScore: filteredGaps[0]?.opportunityScore,
            competitorsAnalyzed: competitors.length
          })
        }
      });
      const highOpportunityGaps = filteredGaps.filter((g) => g.opportunityScore >= 80);
      if (highOpportunityGaps.length > 0) {
        await db.notification.create({
          data: {
            userId,
            type: "system",
            title: `${highOpportunityGaps.length} opportunit\xE9(s) de contenu \xE0 fort potentiel`,
            message: `Des lacunes de contenu \xE0 haut potentiel ont \xE9t\xE9 d\xE9tect\xE9es. Le sujet le plus prometteur : "${highOpportunityGaps[0]?.topic}" (score : ${highOpportunityGaps[0]?.opportunityScore}).`,
            metadata: JSON.stringify({
              count: highOpportunityGaps.length,
              topics: highOpportunityGaps.map((g) => g.topic)
            })
          }
        });
      }
      return filteredGaps;
    } catch (error) {
      console.error("[CompetitorSpy] Gaps error:", error);
      return [
        { topic: "Guide de d\xE9marrage rapide", competitorCoverage: ["Concurrent A", "Concurrent B"], userCoverage: "none", opportunityScore: 88, suggestedAngle: "Cr\xE9er un guide pas-\xE0-pas pour votre domaine d'expertise" },
        { topic: "\xC9tudes de cas clients", competitorCoverage: ["Concurrent A"], userCoverage: "partial", opportunityScore: 75, suggestedAngle: "Transformer vos succ\xE8s clients en histoires engageantes" },
        { topic: "Tendances de l'industrie 2025", competitorCoverage: ["Concurrent B", "Concurrent C"], userCoverage: "none", opportunityScore: 82, suggestedAngle: "Positionnez-vous comme expert avec des pr\xE9visions sectorielles" }
      ];
    }
  }
  // ----------------------------------------------------------------
  // 4. WORKER METHODS
  // ----------------------------------------------------------------
  /**
   * Main cycle: analyzeCompetitorActivity for each tracked competitor
   * + generateCompetitiveInsights + detectContentGaps.
   * Returns stats.
   */
  static async runWorkerCycle(userId) {
    const config = await this.getConfig(userId);
    const result = {
      competitorsAnalyzed: 0,
      insightsGenerated: 0,
      contentGapsFound: 0,
      alertsSent: 0
    };
    try {
      for (const competitorId of config.trackedCompetitorIds) {
        try {
          await this.analyzeCompetitorActivity(userId, competitorId);
          result.competitorsAnalyzed++;
        } catch (error) {
          console.error(`[CompetitorSpy Worker] Error analyzing competitor ${competitorId}:`, error);
        }
      }
    } catch (error) {
      console.error(`[CompetitorSpy Worker] Analysis phase error for user ${userId}:`, error);
    }
    try {
      const insights = await this.generateCompetitiveInsights(userId);
      result.insightsGenerated = insights.length;
    } catch (error) {
      console.error(`[CompetitorSpy Worker] Insights error for user ${userId}:`, error);
    }
    try {
      const gaps = await this.detectContentGaps(userId);
      result.contentGapsFound = gaps.length;
    } catch (error) {
      console.error(`[CompetitorSpy Worker] Gaps error for user ${userId}:`, error);
    }
    try {
      const recentNotifications = await db.notification.count({
        where: {
          userId,
          type: "system",
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1e3)
          },
          title: { contains: "Alerte concurrentielle" }
        }
      });
      result.alertsSent = recentNotifications;
    } catch {
    }
    try {
      await db.agentConfig.update({
        where: { userId_agentType: { userId, agentType: "competitor_spy" } },
        data: { lastExecutedAt: /* @__PURE__ */ new Date() }
      });
    } catch {
    }
    return result;
  }
  /**
   * Get dashboard stats for a user.
   * Returns tracked competitor count, recent analyses count, etc.
   */
  static async getDashboardStats(userId) {
    const [
      totalCompetitors,
      activeCompetitors,
      recentActivities,
      totalCompetitorPosts
    ] = await Promise.all([
      db.competitor.count({ where: { userId } }),
      db.competitor.count({ where: { userId, isActive: true } }),
      db.agentActivity.findMany({
        where: { userId, agentType: "competitor_spy" },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      db.competitorPost.count({
        where: {
          competitor: { userId }
        }
      })
    ]);
    const totalAnalysisActivities = await db.agentActivity.count({
      where: {
        userId,
        agentType: "competitor_spy",
        title: { contains: "Analyse concurrentielle" }
      }
    });
    const totalInsightActivities = await db.agentActivity.count({
      where: {
        userId,
        agentType: "competitor_spy",
        title: { contains: "insights concurrentiels" }
      }
    });
    const totalGapActivities = await db.agentActivity.count({
      where: {
        userId,
        agentType: "competitor_spy",
        title: { contains: "lacunes de contenu" }
      }
    });
    const highEngagementPosts = await db.competitorPost.findMany({
      where: {
        competitor: { userId, isActive: true },
        engagementRate: { gte: 5 }
      },
      orderBy: { engagementRate: "desc" },
      take: 5,
      include: {
        competitor: {
          select: { name: true }
        }
      }
    });
    const topCompetitors = await db.competitor.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        industry: true,
        lastSyncedAt: true,
        posts: {
          select: { id: true }
        }
      }
    });
    const topCompetitorsWithCount = topCompetitors.map((c) => ({
      id: c.id,
      name: c.name,
      industry: c.industry,
      lastSyncedAt: c.lastSyncedAt,
      postCount: c.posts.length
    }));
    return {
      totalCompetitors,
      activeCompetitors,
      totalCompetitorPosts,
      totalAnalyses: totalAnalysisActivities,
      totalInsights: totalInsightActivities,
      totalGapAnalyses: totalGapActivities,
      highEngagementPosts: highEngagementPosts.map((p) => ({
        subject: p.subject,
        engagementRate: p.engagementRate,
        competitorName: p.competitor.name,
        publishedAt: p.publishedAt
      })),
      topCompetitors: topCompetitorsWithCount,
      recentActivities
    };
  }
};

// src/lib/agents/client-nurture.ts
var DEFAULT_CONFIG5 = {
  inactiveDaysThreshold: 30,
  touchFrequency: "weekly",
  channels: ["linkedin"],
  autoSendMessage: false,
  maxTouchesPerDay: 10
};
var ClientNurtureAgent = class {
  /**
   * Get user-specific Client Nurture config from Settings table.
   */
  static async getConfig(userId) {
    try {
      const settings = await db.settings.findMany({
        where: {
          key: {
            startsWith: `client_nurture_${userId}_`
          }
        }
      });
      const config = { ...DEFAULT_CONFIG5 };
      for (const s of settings) {
        const key = s.key.replace(`client_nurture_${userId}_`, "");
        switch (key) {
          case "inactiveDaysThreshold":
            config.inactiveDaysThreshold = parseInt(s.value, 10) || 30;
            break;
          case "touchFrequency":
            config.touchFrequency = s.value || "weekly";
            break;
          case "channels":
            config.channels = JSON.parse(s.value || '["linkedin"]');
            break;
          case "autoSendMessage":
            config.autoSendMessage = s.value === "true";
            break;
          case "maxTouchesPerDay":
            config.maxTouchesPerDay = parseInt(s.value, 10) || 10;
            break;
        }
      }
      return config;
    } catch {
      return DEFAULT_CONFIG5;
    }
  }
  /**
   * Save user-specific Client Nurture config.
   */
  static async saveConfig(userId, config) {
    const entries = [];
    if (config.inactiveDaysThreshold !== void 0) entries.push({ key: `client_nurture_${userId}_inactiveDaysThreshold`, value: String(config.inactiveDaysThreshold) });
    if (config.touchFrequency !== void 0) entries.push({ key: `client_nurture_${userId}_touchFrequency`, value: config.touchFrequency });
    if (config.channels !== void 0) entries.push({ key: `client_nurture_${userId}_channels`, value: JSON.stringify(config.channels) });
    if (config.autoSendMessage !== void 0) entries.push({ key: `client_nurture_${userId}_autoSendMessage`, value: String(config.autoSendMessage) });
    if (config.maxTouchesPerDay !== void 0) entries.push({ key: `client_nurture_${userId}_maxTouchesPerDay`, value: String(config.maxTouchesPerDay) });
    await Promise.all(
      entries.map(
        (e) => db.settings.upsert({
          where: { key: e.key },
          update: { value: e.value },
          create: { key: e.key, value: e.value }
        })
      )
    );
    return this.getConfig(userId);
  }
  // ----------------------------------------------------------------
  // 1. IDENTIFY COLD CLIENTS
  // ----------------------------------------------------------------
  /**
   * Finds prospects with lastContactedAt > inactiveDaysThreshold ago
   * and status not 'converted'/'not_interested'.
   * Returns them sorted by score descending.
   */
  static async identifyColdClients(userId) {
    const config = await this.getConfig(userId);
    const thresholdDate = /* @__PURE__ */ new Date();
    thresholdDate.setDate(thresholdDate.getDate() - config.inactiveDaysThreshold);
    const prospects = await db.prospect.findMany({
      where: {
        userId,
        status: { notIn: ["converted", "not_interested", "closed_won", "closed_lost", "archived"] },
        lastContactedAt: { lte: thresholdDate },
        isActive: true
      },
      orderBy: { score: "desc" },
      take: 30
    });
    if (prospects.length === 0) {
      return [];
    }
    const now = /* @__PURE__ */ new Date();
    const coldClients = prospects.map((p) => {
      const lastContacted = p.lastContactedAt || p.createdAt;
      const diffMs = now.getTime() - lastContacted.getTime();
      const daysInactive = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
      return {
        prospectId: p.id,
        name: p.fullName || "Sans nom",
        company: p.company || null,
        headline: p.headline || null,
        title: p.title || null,
        score: p.score || 0,
        lastContactedAt: lastContacted.toISOString(),
        daysInactive,
        tags: p.tags ? JSON.parse(p.tags) : []
      };
    });
    coldClients.sort((a, b) => b.score - a.score);
    if (coldClients.length > 0) {
      await db.agentActivity.create({
        data: {
          userId,
          agentType: "client_nurture",
          status: "completed",
          title: `${coldClients.length} clients froids identifi\xE9s`,
          description: `${coldClients.length} prospects inactifs depuis plus de ${config.inactiveDaysThreshold} jours. Score moyen : ${Math.round(coldClients.reduce((a, b) => a + b.score, 0) / coldClients.length)}/100.`,
          metadata: JSON.stringify({
            count: coldClients.length,
            thresholdDays: config.inactiveDaysThreshold,
            avgScore: Math.round(coldClients.reduce((a, b) => a + b.score, 0) / coldClients.length),
            topScore: coldClients[0]?.score || 0
          })
        }
      });
    }
    return coldClients;
  }
  // ----------------------------------------------------------------
  // 2. TOUCHPOINT MESSAGE GENERATION
  // ----------------------------------------------------------------
  /**
   * Gets prospect info, uses AI to generate a personalized re-engagement message.
   * Returns the message.
   */
  static async generateTouchpointMessage(userId, prospectId) {
    const config = await this.getConfig(userId);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });
    const prospect = await db.prospect.findUnique({
      where: { id: prospectId, userId }
    });
    if (!prospect) {
      throw new Error("Prospect introuvable");
    }
    const lastMessages = await db.outreachMessage.findMany({
      where: { prospectId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { content: true, channel: true, sentAt: true }
    });
    const channel = config.channels[0] || "linkedin";
    const lastMessageContext = lastMessages.length > 0 ? `Dernier message envoy\xE9 (${lastMessages[0].channel}, ${lastMessages[0].sentAt?.toLocaleDateString("fr-FR") || "date inconnue"}): "${lastMessages[0].content.substring(0, 200)}"` : "Aucun message pr\xE9c\xE9dent envoy\xE9";
    const messages = [
      {
        role: "system",
        content: `Tu es un expert en relance client B2B LinkedIn. Tu g\xE9n\xE8res des messages de r\xE9activation personnalis\xE9s, chaleureux et non intrusifs.
Le message doit \xEAtre court (max 300 mots), professionnel et donner envie de r\xE9pondre.
R\xE9ponds UNIQUEMENT en JSON valide, sans markdown.
Format: {"message":"message de r\xE9activation","channel":"linkedin|email","approach":"approche utilis\xE9e (ex: actualit\xE9 sectorielle, offre valeur, curiosit\xE9, etc.)"}`
      },
      {
        role: "user",
        content: `G\xE9n\xE8re un message de r\xE9activation personnalis\xE9 pour :
- De la part de : ${user?.name || "Professionnel"}
- Prospect : ${prospect.fullName}
${prospect.company ? `- Entreprise : ${prospect.company}` : ""}
${prospect.title ? `- Titre : ${prospect.title}` : ""}
${prospect.headline ? `- Headline LinkedIn : ${prospect.headline}` : ""}
${prospect.tags ? `- Tags : ${prospect.tags}` : ""}
- Canal pr\xE9f\xE9r\xE9 : ${channel}
- ${lastMessageContext}
- Fr\xE9quence de contact : ${config.touchFrequency}

Le message doit cr\xE9er une connexion authentique et ouvrir la possibilit\xE9 d'un \xE9change professionnel sans \xEAtre commercial.`
      }
    ];
    try {
      const result = await callAI(messages, { temperature: 0.7, maxTokens: 500 }, "zai");
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        prospectId,
        prospectName: prospect.fullName,
        message: parsed.message,
        channel: parsed.channel || channel,
        approach: parsed.approach || "Valorisation du parcours"
      };
    } catch {
      const firstName = (prospect.fullName || "").split(" ")[0] || prospect.fullName;
      return {
        prospectId,
        prospectName: prospect.fullName,
        message: `Bonjour ${firstName}, cela fait un moment que nous n'avons pas \xE9chang\xE9${prospect.company ? ` depuis notre \xE9change \xE0 propos de ${prospect.company}` : ""}. Je voulais prendre de vos nouvelles et voir si nos solutions pourraient vous \xEAtre utiles dans votre parcours actuel.`,
        channel,
        approach: "Relance chaleureuse"
      };
    }
  }
  // ----------------------------------------------------------------
  // 3. NURTURE QUEUE PROCESSING
  // ----------------------------------------------------------------
  /**
   * Identifies cold clients, generates touchpoint messages for each
   * (respecting maxTouchesPerDay), creates OutreachMessage records,
   * updates prospect's lastContactedAt and nextFollowUpAt.
   * Creates AgentActivity + Notifications.
   */
  static async processNurtureQueue(userId) {
    const config = await this.getConfig(userId);
    const result = { processed: 0, contacted: 0, skipped: 0, details: [] };
    const todayStart = /* @__PURE__ */ new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTouches = await db.outreachMessage.count({
      where: {
        prospect: { userId },
        direction: "outbound",
        createdAt: { gte: todayStart }
      }
    });
    const remaining = config.maxTouchesPerDay - todayTouches;
    if (remaining <= 0) {
      return { ...result, details: [{ message: "Limite quotidienne de touches atteinte" }] };
    }
    const coldClients = await this.identifyColdClients(userId);
    if (coldClients.length === 0) {
      return result;
    }
    const toProcess = coldClients.slice(0, remaining);
    for (const client of toProcess) {
      try {
        const touchpoint = await this.generateTouchpointMessage(userId, client.prospectId);
        const outreachMessage = await db.outreachMessage.create({
          data: {
            prospectId: client.prospectId,
            channel: touchpoint.channel,
            direction: "outbound",
            subject: `Relance \u2014 ${client.name}`,
            content: touchpoint.message,
            status: "sent",
            sentAt: /* @__PURE__ */ new Date()
          }
        });
        let nextFollowUpAt;
        switch (config.touchFrequency) {
          case "daily":
            nextFollowUpAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1e3);
            break;
          case "biweekly":
            nextFollowUpAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3);
            break;
          case "monthly":
            nextFollowUpAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
            break;
          case "weekly":
          default:
            nextFollowUpAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
            break;
        }
        await db.prospect.update({
          where: { id: client.prospectId },
          data: {
            lastContactedAt: /* @__PURE__ */ new Date(),
            nextFollowUpAt
          }
        });
        await db.agentActivity.create({
          data: {
            userId,
            agentType: "client_nurture",
            status: "completed",
            title: `Relance envoy\xE9e \u2014 ${client.name}`,
            description: `Message de r\xE9activation envoy\xE9 \xE0 ${client.name}${client.company ? ` (${client.company})` : ""} via ${touchpoint.channel}. Approche : ${touchpoint.approach}.`,
            metadata: JSON.stringify({
              prospectId: client.prospectId,
              outreachMessageId: outreachMessage.id,
              prospectName: client.name,
              prospectCompany: client.company,
              channel: touchpoint.channel,
              approach: touchpoint.approach,
              score: client.score
            })
          }
        });
        result.processed++;
        result.contacted++;
        result.details.push({
          prospectId: client.prospectId,
          name: client.name,
          company: client.company,
          channel: touchpoint.channel,
          approach: touchpoint.approach,
          score: client.score,
          status: "contacted"
        });
      } catch (error) {
        console.error(`[ClientNurture] Process error for prospect ${client.prospectId}:`, error);
        result.skipped++;
        result.details.push({
          prospectId: client.prospectId,
          name: client.name,
          status: "error"
        });
      }
    }
    if (result.contacted > 0) {
      await db.notification.create({
        data: {
          userId,
          type: "system",
          title: `${result.contacted} relance(s) client(s) envoy\xE9e(s)`,
          message: `${result.contacted} message(s) de r\xE9activation ont \xE9t\xE9 envoy\xE9s automatiquement \xE0 des prospects inactifs. ${remaining - result.contacted > 0 ? `Il reste ${remaining - result.contacted} touches disponibles aujourd'hui.` : "Limite quotidienne atteinte."}`,
          metadata: JSON.stringify({
            contacted: result.contacted,
            remaining: remaining - result.contacted
          })
        }
      });
    }
    return result;
  }
  // ----------------------------------------------------------------
  // 4. WORKER METHODS
  // ----------------------------------------------------------------
  /**
   * Main cycle: identifyColdClients + processNurtureQueue.
   * Returns stats.
   */
  static async runWorkerCycle(userId) {
    const config = await this.getConfig(userId);
    const result = {
      coldClientsIdentified: 0,
      messagesSent: 0,
      messagesSkipped: 0,
      dailyLimitUsed: 0,
      dailyLimitTotal: config.maxTouchesPerDay
    };
    const todayStart = /* @__PURE__ */ new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTouches = await db.outreachMessage.count({
      where: {
        prospect: { userId },
        direction: "outbound",
        createdAt: { gte: todayStart }
      }
    });
    result.dailyLimitUsed = todayTouches;
    try {
      const coldClients = await this.identifyColdClients(userId);
      result.coldClientsIdentified = coldClients.length;
    } catch (error) {
      console.error(`[ClientNurture Worker] Identify error for user ${userId}:`, error);
    }
    if (config.autoSendMessage) {
      try {
        const nurtureResult = await this.processNurtureQueue(userId);
        result.messagesSent = nurtureResult.contacted;
        result.messagesSkipped = nurtureResult.skipped;
        result.dailyLimitUsed = todayTouches + nurtureResult.contacted;
      } catch (error) {
        console.error(`[ClientNurture Worker] Nurture error for user ${userId}:`, error);
      }
    }
    try {
      await db.agentConfig.update({
        where: { userId_agentType: { userId, agentType: "client_nurture" } },
        data: { lastExecutedAt: /* @__PURE__ */ new Date() }
      });
    } catch {
    }
    return result;
  }
  /**
   * Get dashboard stats for a user.
   * Returns cold client count, messages sent this week, response rate, etc.
   */
  static async getDashboardStats(userId) {
    const config = await this.getConfig(userId);
    const [
      totalProspects,
      activeProspects,
      convertedProspects,
      recentActivities
    ] = await Promise.all([
      db.prospect.count({ where: { userId } }),
      db.prospect.count({ where: { userId, isActive: true } }),
      db.prospect.count({ where: { userId, status: "converted" } }),
      db.agentActivity.findMany({
        where: { userId, agentType: "client_nurture" },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ]);
    const thresholdDate = /* @__PURE__ */ new Date();
    thresholdDate.setDate(thresholdDate.getDate() - config.inactiveDaysThreshold);
    const coldClients = await db.prospect.count({
      where: {
        userId,
        status: { notIn: ["converted", "not_interested", "closed_won", "closed_lost", "archived"] },
        lastContactedAt: { lte: thresholdDate },
        isActive: true
      }
    });
    const weekStart = /* @__PURE__ */ new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const messagesSentThisWeek = await db.outreachMessage.count({
      where: {
        prospect: { userId },
        direction: "outbound",
        createdAt: { gte: weekStart }
      }
    });
    const repliesThisWeek = await db.outreachMessage.count({
      where: {
        prospect: { userId },
        direction: "inbound",
        createdAt: { gte: weekStart }
      }
    });
    const responseRate = messagesSentThisWeek > 0 ? Math.round(repliesThisWeek / messagesSentThisWeek * 100) : 0;
    const todayStart = /* @__PURE__ */ new Date();
    todayStart.setHours(0, 0, 0, 0);
    const touchesToday = await db.outreachMessage.count({
      where: {
        prospect: { userId },
        direction: "outbound",
        createdAt: { gte: todayStart }
      }
    });
    const topColdClients = await db.prospect.findMany({
      where: {
        userId,
        status: { notIn: ["converted", "not_interested", "closed_won", "closed_lost", "archived"] },
        lastContactedAt: { lte: thresholdDate },
        isActive: true
      },
      orderBy: { score: "desc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        company: true,
        title: true,
        score: true,
        lastContactedAt: true
      }
    });
    const monthlyStats = await db.outreachMessage.groupBy({
      by: ["channel"],
      where: {
        prospect: { userId },
        direction: "outbound",
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3) }
      },
      _count: { id: true }
    });
    return {
      totalProspects,
      activeProspects,
      coldClients,
      convertedProspects,
      messagesSentThisWeek,
      repliesThisWeek,
      responseRate,
      touchesToday,
      dailyLimit: config.maxTouchesPerDay,
      dailyRemaining: Math.max(0, config.maxTouchesPerDay - touchesToday),
      topColdClients,
      monthlyStatsByChannel: monthlyStats.map((s) => ({
        channel: s.channel,
        count: s._count.id
      })),
      recentActivities
    };
  }
};

// worker-all-agents.ts
var WORKER_INTERVAL_MS = 30 * 60 * 1e3;
var AGENTS = [
  {
    agentType: "profile_optimizer",
    label: "Profile Optimizer",
    run: (userId) => ProfileOptimizerAgent.runWorkerCycle(userId)
  },
  {
    agentType: "network_builder",
    label: "Network Builder",
    run: (userId) => NetworkBuilderAgent.runWorkerCycle(userId)
  },
  {
    agentType: "content_recycler",
    label: "Content Recycler",
    run: (userId) => ContentRecyclerAgent.runWorkerCycle(userId)
  },
  {
    agentType: "competitor_spy",
    label: "Competitor Spy",
    run: (userId) => CompetitorSpyAgent.runWorkerCycle(userId)
  },
  {
    agentType: "client_nurture",
    label: "Client Nurture",
    run: (userId) => ClientNurtureAgent.runWorkerCycle(userId)
  }
];
function hasActionableResult(result) {
  const numericFields = Object.values(result).filter(
    (v) => typeof v === "number" && v > 0
  );
  return numericFields.length > 0;
}
function buildResultSummary(result) {
  const parts = [];
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "number" && value > 0) {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
      parts.push(`${value} ${label.toLowerCase()}`);
    }
  }
  return parts.length > 0 ? parts.join(", ") + "." : "Aucune action.";
}
async function runWorker() {
  console.log(`[AllAgents Worker] Starting cycle at ${(/* @__PURE__ */ new Date()).toISOString()}`);
  try {
    for (const agent of AGENTS) {
      console.log(`[AllAgents Worker] Processing agent: ${agent.label} (${agent.agentType})`);
      try {
        const enabledConfigs = await db.agentConfig.findMany({
          where: {
            agentType: agent.agentType,
            enabled: true
          },
          select: { userId: true }
        });
        if (enabledConfigs.length === 0) {
          console.log(`[AllAgents Worker] No enabled users for ${agent.label}`);
          continue;
        }
        console.log(
          `[AllAgents Worker] Found ${enabledConfigs.length} enabled user(s) for ${agent.label}`
        );
        for (const config of enabledConfigs) {
          try {
            const result = await agent.run(config.userId);
            console.log(
              `[AllAgents Worker] ${agent.label} \u2014 User ${config.userId}:`,
              JSON.stringify(result)
            );
            if (hasActionableResult(result)) {
              await db.agentActivity.create({
                data: {
                  userId: config.userId,
                  agentType: agent.agentType,
                  status: "completed",
                  title: `Cycle worker ${agent.label} termin\xE9`,
                  description: buildResultSummary(result),
                  metadata: JSON.stringify(result)
                }
              });
            }
            await db.agentConfig.update({
              where: {
                userId_agentType: {
                  userId: config.userId,
                  agentType: agent.agentType
                }
              },
              data: { lastExecutedAt: /* @__PURE__ */ new Date() }
            }).catch(() => {
            });
          } catch (error) {
            console.error(
              `[AllAgents Worker] Error for ${agent.label} / user ${config.userId}:`,
              error
            );
            await db.agentActivity.create({
              data: {
                userId: config.userId,
                agentType: agent.agentType,
                status: "failed",
                title: `Erreur cycle worker ${agent.label}`,
                result: error instanceof Error ? error.message : "Erreur inconnue"
              }
            });
          }
        }
      } catch (error) {
        console.error(
          `[AllAgents Worker] Fatal error for agent ${agent.label}:`,
          error
        );
      }
    }
    console.log(`[AllAgents Worker] Cycle completed at ${(/* @__PURE__ */ new Date()).toISOString()}`);
  } catch (error) {
    console.error("[AllAgents Worker] Fatal error:", error);
  }
}
runWorker();
setInterval(runWorker, WORKER_INTERVAL_MS);
process.on("SIGTERM", () => {
  console.log("[AllAgents Worker] Shutting down...");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("[AllAgents Worker] Interrupted, shutting down...");
  process.exit(0);
});
process.on("unhandledRejection", (reason) => {
  console.error("[AllAgents Worker] Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[AllAgents Worker] Uncaught exception:", err);
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runWorker
});
