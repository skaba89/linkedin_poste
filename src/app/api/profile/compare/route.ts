import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { callAI } from '@/lib/ai-providers';

// POST /api/profile/compare — compare profile with top performers in sector
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { headline, about, sector, skills } = body;

    if (!sector) {
      return NextResponse.json(
        { error: 'Le secteur d\'activité est requis' },
        { status: 400 }
      );
    }

    const systemPrompt = `Tu es un expert en personal branding LinkedIn. Tu compares des profils avec les meilleurs performeurs de leur secteur.

Tu DOIS répondre UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks) :
{
  "sector": "nom du secteur",
  "benchmarkScore": <number 0-100>,
  "comparison": [
    {
      "metric": "nom de la métrique",
      "userScore": <number>,
      "averageScore": <number>,
      "gap": <number>,
      "advice": "conseil en français"
    }
  ],
  "topProfiles": [
    { "name": "Nom", "headline": "Headline", "strengths": ["force1"], "estimatedScore": 95 }
  ],
  "keyDifferentiators": ["différenciateur1", "différenciateur2"],
  "actionPlan": [
    { "step": 1, "action": "description", "priority": "high|medium|low", "expectedImpact": "description" }
  ]
}`;

    const userPrompt = `Compare le profil LinkedIn suivant avec les meilleurs performeurs du secteur "${sector}" :

${headline ? `Headline : ${headline}` : ''}
${about ? `Section About : ${about}` : ''}
${skills ? `Compétences : ${skills}` : ''}

Génère une comparaison détaillée avec un plan d'action concret en français.`;

    const aiResult = await callAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.5, maxTokens: 1500 }
    );

    let comparison;
    try {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      comparison = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResult);
    } catch {
      comparison = {
        sector,
        benchmarkScore: 0,
        comparison: [],
        topProfiles: [],
        keyDifferentiators: [],
        actionPlan: [],
      };
    }

    return NextResponse.json({ comparison });
  } catch (error) {
    console.error('Profile compare error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
