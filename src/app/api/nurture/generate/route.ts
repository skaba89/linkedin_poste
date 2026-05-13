import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, aiLimiter } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(aiLimiter, request, `nurture:generate:${authUser.id}`);
    if (rlResult) return rlResult;

    const body = await request.json();
    const { prospectId, sequenceName, stepIndex, stepTemplate } = body;

    if (!stepTemplate) {
      return NextResponse.json({ error: 'stepTemplate requis' }, { status: 400 });
    }

    // Fetch prospect data if prospectId is provided
    let prospect = null;
    let conversationContext = '';

    if (prospectId) {
      prospect = await db.prospect.findFirst({
        where: { id: prospectId, userId: authUser.id },
      });

      if (!prospect) {
        return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 });
      }

      // Get previous messages for context
      const previousMessages = await db.outreachMessage.findMany({
        where: { prospectId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { content: true, direction: true },
      });

      conversationContext = previousMessages.length > 0
        ? `\n\nHISTORIQUE DES ÉCHANGES:\n${previousMessages.map((m, i) => `${m.direction === 'outbound' ? 'Vous' : 'Prospect'}: ${m.content}`).join('\n')}`
        : '';
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default;

    const prospectInfo = prospect
      ? `PROSPECT:
- Nom: ${prospect.fullName}
- Titre: ${prospect.title || 'Non renseigné'}
- Entreprise: ${prospect.company || 'Non renseignée'}
- Résumé: ${prospect.headline || 'Non renseigné'}
- Notes: ${prospect.notes || 'Aucune'}${conversationContext}`
      : 'PROSPECT: Non spécifié (génération de modèle générique)';

    const prompt = `Tu es un expert en nurturing de prospects B2B sur LinkedIn. Génère un message personnalisé pour une séquence de nurturing.

${prospectInfo}

SÉQUENCE: ${sequenceName || 'Séquence de nurturing'}
ÉTAPE: ${stepIndex !== undefined ? `Étape ${stepIndex + 1}` : 'Nouvelle étape'}

MODÈLE DE BASE (à personnaliser):
${stepTemplate}

CONSIGNES:
1. Personnalise le message en fonction du profil du prospect
2. Adapte le ton : professionnel et chaleureux
3. Si un historique existe, fais référence naturellement au contexte
4. Le message doit être en français
5. Ne dépasse pas 150 mots
6. N'utilise PAS de markdown, emoji excessifs ou formatage spécial
7. Écris uniquement le message, sans titre, sans guillemets`;

    const zai = await ZAI.create();
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un assistant expert en nurturing de prospects B2B. Tu génères des messages personnalisés et engageants en français.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.8,
    });

    const generatedMessage = response.choices?.[0]?.message?.content?.trim() || '';

    if (!generatedMessage) {
      return NextResponse.json({ error: 'Impossible de générer le message' }, { status: 500 });
    }

    return NextResponse.json({ message: generatedMessage });
  } catch (error) {
    console.error('Nurture generate POST error:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération du message' }, { status: 500 });
  }
}
