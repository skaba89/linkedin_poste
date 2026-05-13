import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { name, description, headline, tagline, website, industries, staffCountRange, specialties } = await request.json();

    if (!name && !description) {
      return NextResponse.json({ error: 'Nom et description de la page requis pour l\'analyse' }, { status: 400 });
    }

    // Call Z-AI to generate improvement suggestions
    const zai = await ZAI.create();

    const prompt = `Tu es un expert en marketing LinkedIn et en personal branding B2B. Analyse cette page entreprise LinkedIn et propose des améliorations concrètes et professionnelles.

INFORMATIONS DE LA PAGE :
- Nom: ${name || 'Non renseigné'}
- Slogan/Headline: ${headline || 'Non renseigné'}
- Tagline: ${tagline || 'Non renseigné'}
- Description: ${description || 'Non renseignée'}
- Site web: ${website || 'Non renseigné'}
- Secteurs: ${Array.isArray(industries) ? industries.join(', ') : 'Non renseigné'}
- Taille équipe: ${staffCountRange ? `${staffCountRange.start || '?'}-${staffCountRange.end || '?'}` : 'Non renseigné'}
- Spécialités: ${Array.isArray(specialties) && specialties.length > 0 ? specialties.join(', ') : 'Non renseigné'}

Génère tes suggestions au format JSON valide (pas de markdown, pas de backticks) avec cette structure exacte :
{
  "score": <nombre 1-100>,
  "scoreLabel": "<label du score: Faible/Moyen/Bon/Excellent>",
  "summary": "<résumé de 2-3 phrases de l'état actuel>",
  "suggestions": [
    {
      "field": "<nom du champ: headline/tagline/description/website/specialties>",
      "priority": "<haute/moyenne/basse>",
      "currentValue": "<valeur actuelle ou 'Non renseigné'>",
      "suggestedValue": "<nouvelle valeur suggérée>",
      "explanation": "<pourquoi cette amélioration en 1-2 phrases>"
    }
  ],
  "seoTips": [
    "<conseil SEO/visibilité LinkedIn 1>",
    "<conseil SEO/visibilité LinkedIn 2>",
    "<conseil SEO/visibilité LinkedIn 3>"
  ],
  "contentIdeas": [
    "<idée de contenu à publier 1>",
    "<idée de contenu à publier 2>",
    "<idée de contenu à publier 3>"
  ]
}

Sois précis, professionnel et actionnable. Les suggestions doivent être réalistes et adaptées au secteur de l'entreprise. Réponds UNIQUEMENT en JSON valide.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un consultant expert LinkedIn B2B. Tu réponds uniquement en JSON valide, sans markdown ni backticks.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content || '';

    // Try to parse JSON from the response
    let analysis;
    try {
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(raw);
      }
    } catch {
      return NextResponse.json({
        error: 'Erreur lors de l\'analyse IA. Veuillez réessayer.',
        raw,
      }, { status: 500 });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('LinkedIn page-suggest error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de l\'analyse IA' }, { status: 500 });
  }
}
