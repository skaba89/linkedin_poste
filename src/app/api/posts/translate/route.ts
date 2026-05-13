import { NextResponse } from 'next/server';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { callAI } from '@/lib/ai-providers';
import { rateLimitMiddleware, aiLimiter } from '@/lib/rate-limit';

const SUPPORTED_LANGUAGES: Record<string, { code: string; language: string; culturalNotes: string }> = {
  EN: { code: 'EN', language: 'Anglais', culturalNotes: 'Adopter un ton direct et concis. Privilégier les verbes d\'action.' },
  ES: { code: 'ES', language: 'Espagnol', culturalNotes: 'Utiliser le tutoiement professionnel. Ajouter de la chaleur dans le ton.' },
  DE: { code: 'DE', language: 'Allemand', culturalNotes: 'Être précis et factuel. Éviter l\'hyperbole. Structure très organisée.' },
  IT: { code: 'IT', language: 'Italien', culturalNotes: 'Ton expressif et passionné. Utiliser des formulations élégantes.' },
  PT: { code: 'PT', language: 'Portugais', culturalNotes: 'Adapter au contexte brésilien ou européen. Ton amical et relationnel.' },
  NL: { code: 'NL', language: 'Néerlandais', culturalNotes: 'Direct mais poli. Privilégier la clarté et la simplicité.' },
  AR: { code: 'AR', language: 'Arabe', culturalNotes: 'Respecter les formulations formelles. Ton professionnel et respectueux.' },
  ZH: { code: 'ZH', language: 'Chinois', culturalNotes: 'Concis et structuré. Formules de politesse en début et fin.' },
  JA: { code: 'JA', language: 'Japonais', culturalNotes: 'Ton poli et respectueux (Keigo). Formules de salutation appropriées. Éviter l\'affirmation directe.' },
  KO: { code: 'KO', language: 'Coréen', culturalNotes: 'Ton professionnel et hiérarchique. Structure claire avec introduction et conclusion. Expressions de courtoisie.' },
};

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const rlResult = await rateLimitMiddleware(aiLimiter, request, `translate:${authUser.id}`);
    if (rlResult) return rlResult;

    const body = await request.json();
    const { content, targetLanguages, tone, translateHashtags } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Contenu requis pour la traduction' }, { status: 400 });
    }

    if (!targetLanguages || !Array.isArray(targetLanguages) || targetLanguages.length === 0) {
      return NextResponse.json({ error: 'Au moins une langue cible requise' }, { status: 400 });
    }

    const validLanguages = targetLanguages.filter((lang: string) => SUPPORTED_LANGUAGES[lang]);
    if (validLanguages.length === 0) {
      return NextResponse.json(
        { error: 'Aucune langue valide. Langues supportées : ' + Object.keys(SUPPORTED_LANGUAGES).join(', ') },
        { status: 400 }
      );
    }

    const toneNote = tone ? `Ton souhaité : ${tone}.` : 'Ton professionnel LinkedIn.';

    const translations = await Promise.all(
      validLanguages.map(async (lang: string) => {
        const langInfo = SUPPORTED_LANGUAGES[lang];

        const systemPrompt = `Tu es un expert en traduction et adaptation culturelle pour les posts LinkedIn B2B.

Règles strictes :
- Traduis le contenu en ${langInfo.language} (${langInfo.code}) en préservant le ton et l'intention
- Adapte culturellement, ne fais PAS une traduction littérale
- ${langInfo.culturalNotes}
- ${toneNote}
- Garde les sauts de ligne et la structure du post
- Conserve les émojis existants
- Si ${translateHashtags !== false ? 'traduis ET adapte les hashtags' : 'garde les hashtags originaux'}

Réponds UNIQUEMENT au format JSON suivant, sans markdown, sans backticks :
{
  "content": "contenu traduit et adapté",
  "hashtags": "hashtag1 hashtag2 hashtag3",
  "notes": "notes sur les adaptations culturelles effectuées"
}`;

        const userPrompt = `Traduis et adapte culturellement le post LinkedIn suivant en ${langInfo.language} :

${content}`;

        try {
          const result = await callAI(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            { temperature: 0.3, maxTokens: 1200 },
            'zai'
          );

          // Parse JSON from result
          const cleanedResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleanedResult);

          return {
            language: langInfo.language,
            code: langInfo.code,
            content: parsed.content || result,
            hashtags: parsed.hashtags || '',
            notes: parsed.notes || '',
          };
        } catch (error) {
          console.error(`Translation error for ${lang}:`, error);
          return {
            language: langInfo.language,
            code: langInfo.code,
            content: `[Erreur de traduction vers ${langInfo.language}]`,
            hashtags: '',
            notes: 'La traduction a échoué. Veuillez réessayer.',
          };
        }
      })
    );

    return NextResponse.json({ translations });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la traduction. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
