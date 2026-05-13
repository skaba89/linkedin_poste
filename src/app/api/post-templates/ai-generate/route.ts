import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { callAI } from '@/lib/ai-providers';
import { rateLimitMiddleware, aiLimiter } from '@/lib/rate-limit';

const TEMPLATE_CATEGORIES = [
  'thought_leadership', 'storytelling', 'listicle', 'howto',
  'engagement', 'promotional', 'personal', 'general',
];

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const rlResult = await rateLimitMiddleware(aiLimiter, request, `ai-template:${authUser.id}`);
    if (rlResult) return rlResult;

    const body = await request.json();
    const { category, topic, tone } = body;

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'Le sujet est requis' }, { status: 400 });
    }

    const cat = category && TEMPLATE_CATEGORIES.includes(category) ? category : 'general';
    const toneNote = tone ? `Ton : ${tone}.` : 'Ton professionnel LinkedIn.';

    const systemPrompt = `Tu es un expert en stratégie de contenu LinkedIn. Tu crées des templates de posts réutilisables avec des placeholders.

Catégorie de template : ${cat}
${toneNote}

Règles :
- Le template doit contenir des placeholders entre accolades comme {sujet}, {leçon}, {chiffre}, {exemple}, etc.
- La structure doit être claire et facile à réutiliser
- Le template doit optimiser l'engagement LinkedIn (hook, corps, CTA)

Réponds UNIQUEMENT au format JSON suivant, sans markdown, sans backticks :
{
  "name": "Nom descriptif du template",
  "description": "Description courte en une phrase",
  "structure": "Structure complète du template avec placeholders",
  "example": "Exemple rempli avec le sujet fourni"
}`;

    const userPrompt = `Crée un template de post LinkedIn de catégorie "${cat}" sur le sujet : ${topic}`;

    const result = await callAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 1500 },
      'zai'
    );

    const cleanedResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanedResult);

    const template = await db.postTemplate.create({
      data: {
        userId: authUser.id,
        name: (parsed.name || `Template ${topic}`).trim().slice(0, 100),
        description: parsed.description?.trim() || null,
        category: cat,
        structure: parsed.structure?.trim() || cleanedResult,
        example: parsed.example?.trim() || null,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('AI Template generation error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du template IA. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
