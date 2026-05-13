/**
 * claude-prompts.js
 * ─────────────────────────────────────────────────────────────
 * CommonJS module exporting all Claude AI prompts used in the
 * DataSphere Innovation LinkedIn automation system.
 *
 * Each prompt is an object with:
 *   - system       : Claude system prompt (string)
 *   - userTemplate : User-facing template with {{variable}} placeholders
 *
 * Exports
 * -------
 *   - OUTREACH_GENERATION
 *   - INCOMING_DM_ANALYSIS
 *   - CONTEXTUAL_AUTO_REPLY
 *   - LINKEDIN_POST_CREATION
 *   - PROSPECT_QUALIFICATION
 *   - DAILY_SUMMARY
 *   - ALL_PROMPTS                       (object keyed by name)
 *   - renderPrompt(promptKey, variables) (replaces {{vars}} in userTemplate)
 *   - buildClaudeRequest(promptKey, variables, extraOptions)
 * ─────────────────────────────────────────────────────────────
 */

// ─── Prompt A : Génération de message d'outreach ─────────────
const OUTREACH_GENERATION = {
  system: [
    "You are a professional B2B sales assistant.",
    "You write concise, personalized LinkedIn connection messages and DMs.",
    "Rules:",
    "- Never sound salesy or pushy",
    "- Reference something specific from the prospect's profile (company, role, recent activity)",
    "- Keep messages under 300 characters for connection notes, under 800 for DMs",
    "- Use a warm, professional tone in French",
    "- Include a soft call-to-action or open question",
    "- Never use emojis in first contact",
  ].join("\n"),

  userTemplate:
    "Génère un message de connexion LinkedIn personnalisé pour {{name}}, {{role}} chez {{company}}. " +
    "Son profil mentionne : {{headline}}. " +
    "Contexte additionnel : {{extra_context}}. " +
    "Le message doit suscurer sa curiosité sans paraître commercial.",
};

// ─── Prompt B : Analyse de DM entrant ────────────────────────
const INCOMING_DM_ANALYSIS = {
  system: [
    "You are an intelligent message analyzer for a B2B sales pipeline.",
    "Analyze incoming direct messages and classify them.",
    "Always respond in valid JSON format:",
    "{",
    '  "intent": "one of: interest, question, objection, schedule_call, not_interested, spam, unknown",',
    '  "urgency": "low|medium|high|critical",',
    "  \"score\": 0-10 (10 = hottest lead),",
    '  "summary": "brief summary in French",',
    '  "suggested_action": "one of: auto_reply, escalate_human, schedule_call, ignore",',
    '  "reply_reasoning": "why this action is recommended"',
    "}",
  ].join("\n"),

  userTemplate:
    'Analyse ce message reçu sur {{platform}} de {{sender_name}} ({{sender_role}} chez {{sender_company}} si disponible) :\n\n' +
    '"{{message}}"\n\n' +
    "Historique récent de la conversation :\n" +
    "{{conversation_history}}",
};

// ─── Prompt C : Réponse automatique contextuelle ──────────────
const CONTEXTUAL_AUTO_REPLY = {
  system: [
    "You are a helpful B2B sales representative responding to a prospect's message.",
    "Rules:",
    "- Be conversational, not corporate",
    "- Address their specific question or concern",
    "- Never over-sell or push for a meeting too early",
    "- If the lead is hot (score >= 7), suggest a brief call or demo",
    "- Keep response under 500 characters for DMs",
    "- Respond in the same language as the prospect",
    "- Add value with each response (insight, resource, answer)",
  ].join("\n"),

  userTemplate:
    "Réponds à ce message de {{sender_name}} sur {{platform}} :\n\n" +
    '"{{message}}"\n\n' +
    "Score du lead : {{score}}/10\n" +
    "Intent détecté : {{intent}}\n" +
    "Contexte : {{extra_context}}\n" +
    "Notre produit/service : DataSphere Innovation (solutions data & analytics)",
};

// ─── Prompt D : Création de post LinkedIn ─────────────────────
const LINKEDIN_POST_CREATION = {
  system: [
    "You are a LinkedIn content creator for DataSphere Innovation, a data & analytics consulting firm.",
    "Create engaging professional posts.",
    "Rules:",
    "- Write in French",
    "- Open with a hook (question, bold statement, or surprising statistic)",
    "- Use short paragraphs (1-2 lines max)",
    "- Include 2-3 relevant hashtags",
    "- End with a soft call-to-action or thought-provoking question",
    "- Target audience: CTO, CDO, data engineers, CMO",
    "- Tone: expert but accessible, data-driven, no jargon",
    "- Length: 800-1500 characters",
  ].join("\n"),

  userTemplate:
    "Crée un post LinkedIn sur le sujet : {{topic}}\n" +
    "Angle suggéré : {{angle}}\n" +
    "Type de post : {{post_type}} (thought_leadership|listicle|howto|storytelling|controversy)\n" +
    "Hashtags suggérés : {{suggested_hashtags}}",
};

// ─── Prompt E : Qualification de prospect ─────────────────────
const PROSPECT_QUALIFICATION = {
  system: [
    "You are a prospect qualification specialist.",
    "Analyze a LinkedIn profile and score the prospect's fit.",
    "Always respond in JSON:",
    "{",
    '  "score": 0-10,',
    '  "fit_category": "tier1|tier2|tier3",',
    '  "decision_maker": true/false,',
    '  "company_relevance": 0-10,',
    '  "engagement_likelihood": 0-10,',
    '  "suggested_approach": "connection_with_note|direct_dm|engage_first|skip",',
    '  "key_talking_points": ["point1", "point2"],',
    '  "rationale": "brief explanation"',
    "}",
  ].join("\n"),

  userTemplate:
    "Qualifie ce prospect LinkedIn :\n" +
    "Nom : {{name}}\n" +
    "Titre : {{headline}}\n" +
    "Entreprise : {{company}}\n" +
    "Secteur : {{industry}}\n" +
    "Taille entreprise : {{company_size}}\n" +
    "Localisation : {{location}}\n" +
    "À propos : {{about}}\n" +
    "Réseau : {{connections}} connexions",
};

// ─── Prompt F : Résumé quotidien (monitoring) ─────────────────
const DAILY_SUMMARY = {
  system:
    "You are a monitoring assistant. Summarize the day's automation activity in a concise report in French. " +
    "Format as a structured report with sections.",

  userTemplate:
    "Génère le résumé quotidien d'automatisation :\n" +
    "- Invitations envoyées : {{invitations_sent}}/{{invitations_limit}}\n" +
    "- Messages envoyés : {{messages_sent}}/{{messages_limit}}\n" +
    "- Réponses reçues : {{replies_received}}\n" +
    "- Leads chauds (score >= 7) : {{hot_leads}}\n" +
    "- Erreurs : {{errors}}\n" +
    "- Nouveaux prospects ajoutés : {{new_prospects}}\n" +
    "- Posts publiés : {{posts_published}}\n" +
    "- Temps d'activité : {{uptime}}",
};

// ─── ALL_PROMPTS registry ─────────────────────────────────────
const ALL_PROMPTS = {
  OUTREACH_GENERATION,
  INCOMING_DM_ANALYSIS,
  CONTEXTUAL_AUTO_REPLY,
  LINKEDIN_POST_CREATION,
  PROSPECT_QUALIFICATION,
  DAILY_SUMMARY,
};

// ─── Helper : renderPrompt ────────────────────────────────────
/**
 * Replace all {{variable}} placeholders in the userTemplate of the
 * given prompt with values from the `variables` object.
 *
 * @param {string}  promptKey  - Key in ALL_PROMPTS (e.g. "OUTREACH_GENERATION")
 * @param {Object}  variables  - Map of placeholder name → replacement value
 * @returns {string} The fully rendered user message
 *
 * @throws {Error} If the promptKey is unknown
 * @throws {Error} If a required placeholder has no matching variable
 */
function renderPrompt(promptKey, variables) {
  const prompt = ALL_PROMPTS[promptKey];

  if (!prompt) {
    const available = Object.keys(ALL_PROMPTS).join(", ");
    throw new Error(
      `Unknown prompt key "${promptKey}". Available keys: ${available}`
    );
  }

  if (!variables || typeof variables !== "object") {
    throw new Error("variables must be a non-null object");
  }

  let rendered = prompt.userTemplate;

  // Collect every {{placeholder}} from the template
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  let match;

  while ((match = placeholderRegex.exec(prompt.userTemplate)) !== null) {
    const key = match[1];
    if (!(key in variables)) {
      throw new Error(
        `Missing variable "${key}" for prompt "${promptKey}". ` +
        `Required variables: ${[...prompt.userTemplate.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).join(", ")}`
      );
    }
  }

  // Perform replacements
  Object.entries(variables).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, "g");
    rendered = rendered.replace(pattern, String(value));
  });

  return rendered;
}

/**
 * Escape special regex characters in a string.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Helper : buildClaudeRequest ──────────────────────────────
/**
 * Build a complete request body ready for the Anthropic Messages API.
 *
 * @param {string} promptKey     - Key in ALL_PROMPTS
 * @param {Object} variables     - Placeholder values for the user template
 * @param {Object} [extraOptions] - Optional overrides merged into the request
 *   Supported fields:
 *     model        {string}   Anthropic model id  (default: "claude-sonnet-4-20250514")
 *     maxTokens    {number}   max_tokens parameter  (default: 1024)
 *     temperature  {number}   temperature  (default: 0.7)
 *     system       {string}   Override system prompt (default: prompt's system)
 *     ...any other Anthropic API fields
 *
 * @returns {Object} Full request body for the Anthropic API
 */
function buildClaudeRequest(promptKey, variables, extraOptions = {}) {
  const prompt = ALL_PROMPTS[promptKey];

  if (!prompt) {
    const available = Object.keys(ALL_PROMPTS).join(", ");
    throw new Error(
      `Unknown prompt key "${promptKey}". Available keys: ${available}`
    );
  }

  const userMessage = renderPrompt(promptKey, variables);

  const defaults = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    temperature: 0.7,
  };

  const request = {
    ...defaults,
    system: prompt.system,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
    ...extraOptions,
  };

  return request;
}

// ─── Exports ──────────────────────────────────────────────────
module.exports = {
  // Individual prompts
  OUTREACH_GENERATION,
  INCOMING_DM_ANALYSIS,
  CONTEXTUAL_AUTO_REPLY,
  LINKEDIN_POST_CREATION,
  PROSPECT_QUALIFICATION,
  DAILY_SUMMARY,

  // Registry
  ALL_PROMPTS,

  // Utilities
  renderPrompt,
  buildClaudeRequest,
};
