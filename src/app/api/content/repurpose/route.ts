import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { callAI } from '@/lib/ai-providers';

const TARGET_FORMATS = {
  carousel: 'Carrousel LinkedIn (5-10 slides, texte court par slide)',
  thread: 'Thread LinkedIn (série de 3-5 posts connectés)',
  newsletter: 'Newsletter (sujet email + contenu structuré)',
  hook: 'Hook reformulé (accroche puissante, 1-2 phrases)',
  short: 'Version courte (50-100 mots, punchy)',
  long: 'Version longue (article approfondi, 500+ mots)',
  twitter_thread: 'Thread Twitter/X (série de tweets < 280 car.)',
  email: 'Email prospect (objet + corps avec CTA)',
};

// POST /api/content/repurpose — repurpose a post into multiple formats
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { sourcePostId, sourceContent, targetTypes } = body;

    const content = sourceContent || '';
    if (!content && !sourcePostId) {
      return NextResponse.json({ error: 'Contenu source requis' }, { status: 400 });
    }

    if (!targetTypes || !Array.isArray(targetTypes) || targetTypes.length === 0) {
      return NextResponse.json({ error: 'Au moins un format cible est requis' }, { status: 400 });
    }

    // Fetch source post if sourcePostId is provided
    let finalContent = content;
    let sourceType = 'post';
    if (sourcePostId && !content) {
      const post = await db.post.findUnique({
        where: { id: sourcePostId, authorId: authUser.id },
        select: { finalContent: true, subject: true, status: true },
      });
      if (!post) {
        return NextResponse.json({ error: 'Post non trouvé' }, { status: 404 });
      }
      finalContent = post.finalContent || post.subject || '';
      sourceType = 'post';
    }

    const results = await Promise.allSettled(
      targetTypes.map(async (targetType: string) => {
        const formatDesc = TARGET_FORMATS[targetType as keyof typeof TARGET_FORMATS];
        if (!formatDesc) return null;

        const systemPrompt = `Tu es un expert en recyclage de contenu LinkedIn B2B. Tu transformes du contenu existant en nouveaux formats optimisés, en conservant le message clé mais en adaptant le style et la structure.

Règles :
- Tout le contenu doit être en français
- Conserver le message principal et la valeur ajoutée
- Adapter le ton et la structure au format cible
- Optimiser pour l'engagement du format cible

Tu DOIS répondre UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks) :
{
  "title": "titre suggéré pour ce format",
  "content": "le contenu généré complet",
  "qualityScore": <number 0-100>,
  "tips": ["conseil1", "conseil2"]
}`;

        const userPrompt = `Transforme le contenu suivant en format "${formatDesc}" :

Contenu source :
${finalContent}

Génère la version optimisée en français.`;

        const aiResult = await callAI(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          { temperature: 0.7, maxTokens: 1000 }
        );

        let parsed;
        try {
          const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResult);
        } catch {
          parsed = { title: '', content: aiResult, qualityScore: 50, tips: [] };
        }

        return db.repurposedContent.create({
          data: {
            userId: authUser.id,
            sourcePostId: sourcePostId || null,
            sourceContent: finalContent,
            sourceType,
            targetType,
            generatedContent: parsed.content || aiResult,
            title: parsed.title || null,
            qualityScore: parsed.qualityScore || 50,
          },
        });
      })
    );

    const repurposed = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !!r.value)
      .map((r) => r.value);

    return NextResponse.json({ repurposed }, { status: 201 });
  } catch (error) {
    console.error('Content repurpose error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
