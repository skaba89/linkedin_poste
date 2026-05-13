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

    const rlResult = await rateLimitMiddleware(aiLimiter, request, `outreach:generate:${authUser.id}`);
    if (rlResult) return rlResult;

    const body = await request.json();
    const { prospectId, tone, goal } = body;

    if (!prospectId) {
      return NextResponse.json({ error: 'prospectId requis' }, { status: 400 });
    }

    // Fetch prospect data
    const prospect = await db.prospect.findFirst({
      where: { id: prospectId, userId: authUser.id },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 });
    }

    // Use z-ai-web-dev-sdk for AI message generation
    const ZAI = (await import('z-ai-web-dev-sdk')).default;

    const toneMap: Record<string, string> = {
      professional: 'professionnel et formel',
      friendly: 'amicable et chaleureux',
      casual: 'décontracté et naturel',
      persuasive: 'persuasif et orienté vers la conversion',
      empathetic: 'empathique et centré sur les besoins',
    };

    const goalMap: Record<string, string> = {
      connect: 'établir un premier contact et créer une relation professionnelle',
      meeting: 'obtenir un rendez-vous ou un appel découverte',
      demo: 'proposer une démonstration de notre solution',
      partnership: 'explorer une opportunité de partenariat',
      referral: 'demander une recommandation ou mise en relation',
    };

    const toneStr = tone && toneMap[tone] ? toneMap[tone] : 'professionnel et formel';
    const goalStr = goal && goalMap[goal] ? goalMap[goal] : "établir un premier contact professionnel";

    const prompt = `Tu es un expert en prospection B2B sur LinkedIn. Génère un message de prospection personnalisé en français avec les critères suivants:

PROSPECT:
- Nom: ${prospect.fullName}
- Titre/Poste: ${prospect.title || 'Non renseigné'}
- Entreprise: ${prospect.company || 'Non renseignée'}
- Résumé/Headline LinkedIn: ${prospect.headline || 'Non renseigné'}

TON REQUIS: ${toneStr}
OBJECTIF: ${goalStr}

CONSIGNES:
1. Le message doit être court (entre 50 et 150 mots)
2. Il doit être personnalisé en fonction du profil du prospect
3. Il doit inclure une phrase d'accroche pertinente liée à son poste ou entreprise
4. Il doit terminer par un appel à l'action clair mais non intrusif
5. N'utilise PAS de markdown, emoji excessifs ou formatage spécial
6. Écris uniquement le message, sans titre, sans guillemets, sans préfixe`;

    const zai = await ZAI.create();
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un assistant expert en prospection B2B sur LinkedIn. Tu génères des messages personnalisés et engageants en français.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.8,
    });

    const generatedMessage = response.choices?.[0]?.message?.content?.trim() || '';

    if (!generatedMessage) {
      return NextResponse.json({ error: 'Impossible de générer le message' }, { status: 500 });
    }

    return NextResponse.json({
      message: generatedMessage,
      prospectId,
      metadata: {
        tone: tone || 'professional',
        goal: goal || 'connect',
      },
    });
  } catch (error) {
    console.error('Outreach generate POST error:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération du message' }, { status: 500 });
  }
}
