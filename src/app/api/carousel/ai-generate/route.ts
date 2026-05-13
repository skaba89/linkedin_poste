import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { callAI } from '@/lib/ai-providers';
import { rateLimitMiddleware, aiLimiter } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(aiLimiter, request, `carousel-ai:${authUser.id}`);
    if (rlResult) return rlResult;

    const body = await request.json();
    const { topic, slideCount = 7, tone = 'professionnel', language = 'fr' } = body;

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Sujet requis' }, { status: 400 });
    }

    const count = Math.min(Math.max(Number(slideCount) || 7, 3), 15);

    const toneLabels: Record<string, string> = {
      professionnel: 'Professionnel et formel',
      inspirant: 'Inspirant et motivant',
      educatif: 'Educatif et informatif',
      humoristique: 'Humoristique et décontracté',
      provocateur: 'Provocateur et audacieux',
    };

    const toneLabel = toneLabels[tone] || toneLabels.professionnel;
    const langLabel = language === 'fr' ? 'français' : language === 'en' ? 'anglais' : language;

    const systemPrompt = `Tu es un expert en création de carrousels LinkedIn. Tu conçois des contenus visuels percutants pour des professionnels B2B.

Règles strictes :
- Chaque diapositive doit avoir un "heading" court (max 8 mots) et un "body" concis (max 40 mots)
- Le type peut être : "title", "content", "quote", "stat", "cta"
- La première diapositive doit être de type "title" (titre accrocheur)
- La dernière diapositive doit être de type "cta" (appel à l'action)
- Alterne entre les types pour créer un rythme visuel
- Les stats (type "stat") doivent avoir un chiffre clé dans le heading
- Les quotes doivent être inspirantes et attribuées
- Le ton général : ${toneLabel}
- Tout le contenu doit être en ${langLabel}
- Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks`;

    const userPrompt = `Crée un carrousel LinkedIn de ${count} diapositives sur le sujet : "${topic}".

Retourne un objet JSON avec cette structure exacte :
{
  "title": "Titre global du carrousel (max 10 mots)",
  "description": "Description courte du carrousel (max 20 mots)",
  "slides": [
    {
      "heading": "Titre de la diapositive",
      "body": "Contenu principal de la diapositive",
      "type": "title|content|quote|stat|cta"
    }
  ]
}

Contraintes :
- Exactement ${count} diapositives
- La première diapositive : type "title" avec un titre accrocheur
- La dernière diapositive : type "cta" avec un appel à l'action clair
- Alterne les types : title, content, stat, quote, content, stat, cta
- Chaque heading : max 8 mots
- Chaque body : max 40 mots
- Contenu original et engageant`;

    const result = await callAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.8,
        maxTokens: 2000,
      },
      'zai'
    );

    // Parse the JSON response
    let parsed: {
      title?: string;
      description?: string;
      slides?: Array<{ heading: string; body: string; type: string }>;
    };

    try {
      // Strip markdown code blocks if present
      const cleaned = result
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: "L'IA n'a pas pu générer un contenu structuré. Veuillez réessayer." },
          { status: 500 }
        );
      }
    }

    // Validate and normalize
    const validTypes = ['title', 'content', 'quote', 'stat', 'cta'];
    const slides = (parsed.slides || []).map((slide, index) => ({
      heading: (slide.heading || `Diapositive ${index + 1}`).substring(0, 100),
      body: (slide.body || '').substring(0, 200),
      type: validTypes.includes(slide.type) ? slide.type : 'content',
    }));

    // Ensure first is title and last is cta
    if (slides.length > 0) {
      slides[0].type = 'title';
      slides[slides.length - 1].type = 'cta';
    }

    return NextResponse.json({
      slides,
      title: parsed.title || topic,
      description: parsed.description || `Carrousel LinkedIn sur ${topic}`,
    });
  } catch (error) {
    console.error('Carousel AI generate error:', error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du contenu. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
