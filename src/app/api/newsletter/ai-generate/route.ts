import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { callAI } from '@/lib/ai-providers';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { topic, newsletterId, tone, length } = body;

    if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
      return NextResponse.json(
        { error: 'Le sujet est requis (min. 3 caractères)' },
        { status: 400 }
      );
    }

    // Verify newsletter ownership if provided
    if (newsletterId) {
      const newsletter = await db.newsletter.findFirst({
        where: { id: newsletterId, userId: authUser.id },
      });
      if (!newsletter) {
        return NextResponse.json({ error: 'Newsletter introuvable' }, { status: 404 });
      }
    }

    const toneMap: Record<string, string> = {
      professionnel: 'professionnel et formel',
      inspirant: 'inspirant et motivant',
      educatif: 'éducatif et informatif',
      conversational: 'conversationnel et amical',
      humour: 'humoristique et décontracté',
      expert: 'expert et autoritaire',
    };

    const lengthMap: Record<string, string> = {
      court: '300-500 mots',
      moyen: '500-1000 mots',
      long: '1000-2000 mots',
    };

    const effectiveTone = toneMap[tone] || toneMap.professionnel;
    const effectiveLength = lengthMap[length] || lengthMap.moyen;

    const systemPrompt = `Tu es un expert en rédaction de newsletters LinkedIn. Tu crées des articles engageants, informatifs et optimisés pour fidéliser les abonnés.

Règles :
- Rédige en français
- Ton du contenu : ${effectiveTone}
- Longueur cible : ${effectiveLength}
- Commencer par un titre accrocheur
- Utiliser des sous-titres pour structurer l'article
- Inclure des paragraphes courts et aérés
- Terminer par une conclusion engageante avec un appel à l'action
- Format Markdown pour le contenu
- Suggère 5 hashtags pertinents à la fin`;

    const userPrompt = `Rédige un article de newsletter LinkedIn sur le sujet suivant : "${topic.trim()}".

Réponds au format JSON suivant (et uniquement du JSON valide, sans markdown autour) :
{
  "title": "Titre accrocheur de l'article",
  "content": "Contenu complet en Markdown",
  "excerpt": "Résumé de 2-3 phrases pour la prévisualisation",
  "suggestedHashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3", "#Hashtag4", "#Hashtag5"]
}`;

    const aiResponse = await callAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.75,
        maxTokens: length === 'long' ? 2500 : length === 'court' ? 1200 : 1800,
      }
    );

    // Parse the JSON response
    let parsed: {
      title?: string;
      content?: string;
      excerpt?: string;
      suggestedHashtags?: string[];
    };

    try {
      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      // Fallback: create structure from raw text
      const lines = aiResponse.split('\n').filter((l) => l.trim());
      parsed = {
        title: lines[0]?.replace(/^#+\s*/, '') || topic,
        content: aiResponse,
        excerpt: lines.slice(1, 4).join(' ').slice(0, 200),
        suggestedHashtags: ['#LinkedIn', '#Newsletter', '#Professional'],
      };
    }

    return NextResponse.json({
      title: parsed.title || topic,
      content: parsed.content || aiResponse,
      excerpt: parsed.excerpt || null,
      suggestedHashtags: parsed.suggestedHashtags || [],
    });
  } catch (error) {
    console.error('Newsletter AI generate error:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de la génération IA';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
