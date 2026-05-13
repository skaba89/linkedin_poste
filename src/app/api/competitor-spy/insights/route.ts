import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { CompetitorSpyAgent } from '@/lib/agents/competitor-spy';
import { db } from '@/lib/db';

// POST /api/competitor-spy/insights — Générer des insights concurrentiels
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const activity = await db.agentActivity.create({
      data: {
        userId: authUser.id,
        agentType: 'competitor_spy',
        status: 'executing',
        title: 'Génération des insights concurrentiels en cours',
        description: 'Analyse croisée de tous les concurrents suivis...',
      },
    });

    try {
      const insights = await CompetitorSpyAgent.generateCompetitiveInsights(authUser.id);

      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'completed',
          title: `${insights.length} insights concurrentiels générés`,
          description: `${insights.filter((i) => i.impact === 'positive').length} opportunités, ${insights.filter((i) => i.impact === 'negative').length} menaces identifiées.`,
          result: JSON.stringify({
            insightsCount: insights.length,
            positive: insights.filter((i) => i.impact === 'positive').length,
            negative: insights.filter((i) => i.impact === 'negative').length,
            neutral: insights.filter((i) => i.impact === 'neutral').length,
          }),
        },
      });

      return NextResponse.json({ insights });
    } catch (error) {
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'failed',
          title: 'Échec de la génération des insights',
          result: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('[CompetitorSpy] Insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
