import { NextResponse } from 'next/server';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { callAI } from '@/lib/ai-providers';
import { rateLimitMiddleware, aiLimiter } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const rlResult = await rateLimitMiddleware(aiLimiter, request, `poll:${authUser.id}`);
    if (rlResult) return rlResult;

    const body = await request.json();
    const { topic, options, audience } = body;

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'Le sujet du sondage est requis' }, { status: 400 });
    }

    const existingOptionsNote = options && options.length >= 2
      ? `Options suggérées : ${options.join(', ')}. Adapte-les si nécessaire.`
      : 'Génère 2 à 4 options de réponse pertinentes.';

    const audienceNote = audience
      ? `Public cible : ${audience}.`
      : 'Public cible : professionnels B2B sur LinkedIn.';

    const systemPrompt = `Tu es un expert en création de sondages engageants pour LinkedIn.

Règles :
- La question doit être claire, concise et susciter l'engagement
- Les options doivent être mutuellement exclusives et couvrir les principales réponses
- Maximum 4 options, minimum 2
- Le sondage doit encourager les commentaires en plus du vote
- Suggère un créneau de publication optimal

${audienceNote}

Réponds UNIQUEMENT au format JSON suivant, sans markdown, sans backticks :
{
  "question": "Question du sondage",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "hashtags": "#Sondage #Hashtag1 #Hashtag2",
  "suggestedTime": "Mardi à 9h00 (créneau optimal)"
}`;

    const userPrompt = `Crée un sondage LinkedIn engageant sur le sujet : ${topic}

${existingOptionsNote}`;

    const result = await callAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 600 },
      'zai'
    );

    const cleanedResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanedResult);

    // Validate options count
    const pollOptions = Array.isArray(parsed.options)
      ? parsed.options.slice(0, 4).filter((o: string) => o?.trim())
      : [];

    if (pollOptions.length < 2) {
      return NextResponse.json(
        { error: 'L\'IA n\'a pas généré assez d\'options. Veuillez réessayer.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      question: parsed.question || topic,
      options: pollOptions,
      hashtags: parsed.hashtags || '#Sondage #LinkedIn',
      suggestedTime: parsed.suggestedTime || 'Mardi à 9h00',
    });
  } catch (error) {
    console.error('Poll generation error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du sondage. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
