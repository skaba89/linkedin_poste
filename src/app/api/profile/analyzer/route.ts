import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { callAI } from '@/lib/ai-providers';

// POST /api/profile/analyzer — trigger full profile analysis
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { headline, about, experience, skills, sector } = body;

    if (!headline && !about && !experience && !skills) {
      return NextResponse.json(
        { error: 'Au moins un champ est requis (headline, about, experience, skills)' },
        { status: 400 }
      );
    }

    const systemPrompt = `Tu es un expert en optimisation de profils LinkedIn B2B francophones. Tu analyses les profils avec rigueur et fournis des recommandations actionables.

Tu DOIS répondre UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks). La structure est :
{
  "headlineScore": <number 0-100>,
  "aboutScore": <number 0-100>,
  "experienceScore": <number 0-100>,
  "skillsScore": <number 0-100>,
  "recommendationsScore": <number 0-100>,
  "suggestions": [
    { "priority": "high|medium|low", "category": "headline|about|experience|skills|general", "text": "description", "impact": "high|medium|low" }
  ],
  "optimizedHeadline": "version optimisée du headline (max 120 caractères)",
  "optimizedAbout": "version optimisée de la section about (max 2600 caractères)",
  "topProfiles": [
    { "name": "Nom", "headline": "Headline exemple", "score": 95, "strengths": ["force1", "force2"] }
  ]
}

Critères d'évaluation :
- Headline (0-100) : mots-clés SEO, clarté, valeur ajoutée, longueur optimale (5-10 mots), différenciation
- About (0-100) : storytelling, structure (paragraphes courts), CTA, preuve sociale, longueur (150-2600 car.), pertinence
- Expérience (0-100) : impact mesurable, résultats chiffrés, progression logique, verbes d'action
- Skills (0-100) : pertinence, équilibre hard/soft skills, endorsement, tendance du secteur
- Recommendations (0-100) : diversité, crédibilité, récence, pertinence sectorielle

Si un champ n'est pas fourni, mets un score de 0 et des suggestions ciblées pour l'améliorer.`;

    const userPrompt = `Analyse le profil LinkedIn suivant :
${headline ? `Headline : ${headline}` : 'Headline : NON RENSEIGNÉ'}
${about ? `Section About : ${about}` : 'Section About : NON RENSEIGNÉE'}
${experience ? `Expérience : ${experience}` : 'Expérience : NON RENSEIGNÉE'}
${skills ? `Compétences : ${skills}` : 'Compétences : NON RENSEIGNÉES'}
${sector ? `Secteur d\\'activité : ${sector}` : 'Secteur : NON RENSEIGNÉ'}

Fournis une analyse complète et des recommandations en français.`;

    const aiResult = await callAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.4, maxTokens: 2000 }
    );

    let analysis;
    try {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResult);
    } catch {
      analysis = {
        headlineScore: 0,
        aboutScore: 0,
        experienceScore: 0,
        skillsScore: 0,
        recommendationsScore: 0,
        suggestions: [
          { priority: 'high', category: 'general', text: 'Erreur d\'analyse IA. Réessayez.', impact: 'high' }
        ],
        optimizedHeadline: headline || '',
        optimizedAbout: about || '',
        topProfiles: [],
      };
    }

    const score = Math.round(
      (analysis.headlineScore + analysis.aboutScore + analysis.experienceScore + analysis.skillsScore + analysis.recommendationsScore) / 5
    );

    const saved = await db.profileAnalysis.create({
      data: {
        userId: authUser.id,
        headline: headline || null,
        about: about || null,
        score,
        headlineScore: analysis.headlineScore || 0,
        aboutScore: analysis.aboutScore || 0,
        experienceScore: analysis.experienceScore || 0,
        skillsScore: analysis.skillsScore || 0,
        recommendationsScore: analysis.recommendationsScore || 0,
        suggestions: JSON.stringify(analysis.suggestions || []),
        optimizedHeadline: analysis.optimizedHeadline || null,
        optimizedAbout: analysis.optimizedAbout || null,
        topProfiles: analysis.topProfiles ? JSON.stringify(analysis.topProfiles) : null,
      },
    });

    return NextResponse.json({ analysis: saved });
  } catch (error) {
    console.error('Profile analyzer error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
