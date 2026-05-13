import ZAI from 'z-ai-web-dev-sdk';
import type { AIProvider, ContentTone, ContentLength } from '@/types';

interface GeneratePostOptions {
  subject: string;
  angle?: string;
  audience?: string;
  cta?: string;
  hashtags?: string;
  provider: AIProvider;
  tone?: ContentTone;
  length?: ContentLength;
}

const TONE_LABELS: Record<ContentTone, string> = {
  professionnel: 'Professionnel et formel',
  inspirant: 'Inspirant et motivant',
  educatif: 'Educatif et informatif',
  conversational: 'Conversationnel et amical',
  humour: 'Humour et décontracté',
  provocateur: 'Provocateur et audacieux',
  storytelling: 'Storytelling captivant',
  expert: 'Expert et autoritaire',
};

const LENGTH_TOKENS: Record<ContentLength, number> = {
  court: 300,
  moyen: 500,
  long: 800,
};

const LENGTH_WORD_GUIDE: Record<ContentLength, string> = {
  court: 'max 100 mots',
  moyen: '100-200 mots',
  long: '200-400 mots',
};

const BASE_SYSTEM_PROMPT = `Tu es un expert en copywriting LinkedIn B2B. Tu crées des posts engageants, professionnels et optimisés pour l'algorithme LinkedIn.

Règles :
- Commencer par un hook puissant (question, statistique, affirmation surprenante)
- Utiliser des paragraphes courts (1-2 lignes max)
- Insérer des sauts de ligne stratégiques
- Inclure un CTA clair à la fin
- Utiliser 3-5 hashtags pertinents
- NE JAMAIS utiliser d'émojis excessifs (max 2-3 par post)
- Adapté au public B2B francophone`;

function buildSystemPrompt(options: GeneratePostOptions): string {
  let prompt = BASE_SYSTEM_PROMPT;

  // Add tone instruction
  if (options.tone) {
    const toneLabel = TONE_LABELS[options.tone] || options.tone;
    prompt += `\n\nTon du contenu : ${toneLabel}. Adapte le style d'écriture en conséquence.`;
  } else {
    prompt += '\n\nTon du contenu : Professionnel et formel. Adapte le style d\'écriture en conséquence.';
  }

  // Add length instruction
  if (options.length) {
    const wordGuide = LENGTH_WORD_GUIDE[options.length];
    prompt += `\nLongueur cible : ${wordGuide}. Respecte cette contrainte strictement.`;
  } else {
    prompt += '\nLongueur idéale : 1200-1800 caractères.';
  }

  return prompt;
}

function getMaxTokens(options: GeneratePostOptions): number {
  if (options.length) {
    return LENGTH_TOKENS[options.length];
  }
  return 800;
}

function buildUserPrompt(options: GeneratePostOptions): string {
  let prompt = `Crée un post LinkedIn sur le sujet suivant : ${options.subject}`;
  if (options.angle) prompt += `\nAngle traité : ${options.angle}`;
  if (options.audience) prompt += `\nPublic cible : ${options.audience}`;
  if (options.cta) prompt += `\nCTA souhaité : ${options.cta}`;
  if (options.hashtags) prompt += `\nHashtags suggérés : ${options.hashtags}`;
  return prompt;
}

async function generateWithZAI(options: GeneratePostOptions): Promise<string[]> {
  const zai = await ZAI.create();
  const userPrompt = buildUserPrompt(options);
  const systemPrompt = buildSystemPrompt(options);
  const maxTokens = getMaxTokens(options);
  const approaches = ['storytelling inspirant', 'données & expertise', 'conversationnel & direct'];

  const results = await Promise.allSettled(
    approaches.map((approach, i) =>
      zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `${userPrompt}\n\nVariante ${i + 1} - Approche ${approach}`,
          },
        ],
        temperature: 0.7 + (i * 0.15),
        max_tokens: maxTokens,
      }).then((completion) => completion.choices[0]?.message?.content || '')
    )
  );

  return results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && !!r.value)
    .map((r) => r.value);
}

async function generateWithOpenRouter(options: GeneratePostOptions): Promise<string[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('OpenRouter API key not configured, falling back to ZAI');
    return generateWithZAI(options);
  }

  const userPrompt = buildUserPrompt(options);
  const systemPrompt = buildSystemPrompt(options);
  const maxTokens = getMaxTokens(options);
  const models = [
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o-mini',
    'google/gemini-pro-1.5',
  ];
  const approaches = ['storytelling inspirant', 'données & expertise', 'conversationnel & direct'];

  const results = await Promise.allSettled(
    approaches.map((approach, i) =>
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://linkedin-saas.internal',
        },
        body: JSON.stringify({
          model: models[i % models.length],
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${userPrompt}\n\nVariante ${i + 1} - Approche ${approach}` },
          ],
          temperature: 0.7 + (i * 0.15),
          max_tokens: maxTokens,
        }),
      })
        .then((res) => res.json())
        .then((data) => data.choices?.[0]?.message?.content || '')
        .then((content) => {
          if (!content) throw new Error('Empty content');
          return content;
        })
    )
  );

  const variants = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && !!r.value)
    .map((r) => r.value);

  // Log rejected variants
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`OpenRouter variant ${i + 1} failed:`, r.reason);
    }
  });

  return variants.length > 0 ? variants : generateWithZAI(options);
}

async function generateWithGroq(options: GeneratePostOptions): Promise<string[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('Groq API key not configured, falling back to ZAI');
    return generateWithZAI(options);
  }

  const userPrompt = buildUserPrompt(options);
  const systemPrompt = buildSystemPrompt(options);
  const maxTokens = getMaxTokens(options);
  const approaches = ['storytelling inspirant', 'données & expertise', 'conversationnel & direct'];

  const results = await Promise.allSettled(
    approaches.map((approach, i) =>
      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${userPrompt}\n\nVariante ${i + 1} - Approche ${approach}` },
          ],
          temperature: 0.7 + (i * 0.15),
          max_tokens: maxTokens,
        }),
      })
        .then((res) => res.json())
        .then((data) => data.choices?.[0]?.message?.content || '')
        .then((content) => {
          if (!content) throw new Error('Empty content');
          return content;
        })
    )
  );

  const variants = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && !!r.value)
    .map((r) => r.value);

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`Groq variant ${i + 1} failed:`, r.reason);
    }
  });

  return variants.length > 0 ? variants : generateWithZAI(options);
}

async function generateWithGLM(options: GeneratePostOptions): Promise<string[]> {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    console.warn('GLM API key not configured, falling back to ZAI');
    return generateWithZAI(options);
  }

  const userPrompt = buildUserPrompt(options);
  const systemPrompt = buildSystemPrompt(options);
  const maxTokens = getMaxTokens(options);
  const approaches = ['storytelling inspirant', 'données & expertise', 'conversationnel & direct'];

  const results = await Promise.allSettled(
    approaches.map((approach, i) =>
      fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'glm-4-plus',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${userPrompt}\n\nVariante ${i + 1} - Approche ${approach}` },
          ],
          temperature: 0.7 + (i * 0.15),
          max_tokens: maxTokens,
        }),
      })
        .then((res) => res.json())
        .then((data) => data.choices?.[0]?.message?.content || '')
        .then((content) => {
          if (!content) throw new Error('Empty content');
          return content;
        })
    )
  );

  const variants = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && !!r.value)
    .map((r) => r.value);

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`GLM variant ${i + 1} failed:`, r.reason);
    }
  });

  return variants.length > 0 ? variants : generateWithZAI(options);
}

export async function generatePostVariants(options: GeneratePostOptions): Promise<string[]> {
  switch (options.provider) {
    case 'openrouter':
      return generateWithOpenRouter(options);
    case 'groq':
      return generateWithGroq(options);
    case 'glm':
      return generateWithGLM(options);
    default:
      return generateWithZAI(options);
  }
}

export async function generateHashtags(subject: string, audience?: string): Promise<string[]> {
  const zai = await ZAI.create();
  let prompt = `Génère 8 hashtags pertinents en français pour un post LinkedIn sur le sujet : "${subject}"`;
  if (audience) {
    prompt += `\nPublic cible : ${audience}`;
  }
  prompt += `\n\nRéponds UNIQUEMENT avec les hashtags séparés par des espaces, sans explication, sans numérotation. Exemple : #Marketing #IA #B2B`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un expert en marketing LinkedIn. Tu génères des hashtags pertinents et tendance.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    const text = completion.choices[0]?.message?.content || '';
    const matches = text.match(/#[\wÀ-ÿ]+/g);
    return matches ? [...new Set<string>(matches)].slice(0, 10) : [];
  } catch (error) {
    console.error('Hashtag generation error:', error);
    return [];
  }
}
