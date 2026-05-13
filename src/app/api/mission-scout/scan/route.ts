import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { MissionScoutAgent } from '@/lib/agents/mission-scout';
import { db } from '@/lib/db';

// POST /api/mission-scout/scan — Trigger a full scan (trends + opportunities)
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Check if mission_scout agent is enabled
    const config = await db.agentConfig.findUnique({
      where: { userId_agentType: { userId: authUser.id, agentType: 'mission_scout' } },
    });

    if (config && !config.enabled) {
      return NextResponse.json(
        { error: 'Mission Scout est désactivé. Activez-le dans la configuration des agents.' },
        { status: 400 }
      );
    }

    // Create executing activity
    const activity = await db.agentActivity.create({
      data: {
        userId: authUser.id,
        agentType: 'mission_scout',
        status: 'executing',
        title: 'Scan d\'opportunités en cours',
        description: 'Recherche de nouvelles tendances et opportunités LinkedIn...',
      },
    });

    try {
      // Run scan in parallel
      const [trends, opportunities] = await Promise.all([
        MissionScoutAgent.scanTrends(authUser.id),
        MissionScoutAgent.findOpportunities(authUser.id),
      ]);

      // Update activity
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'completed',
          title: `Scan terminé — ${opportunities.length} opportunités trouvées`,
          result: JSON.stringify({
            trendsFound: trends.length,
            opportunitiesFound: opportunities.length,
            topTrends: trends.slice(0, 5).map((t) => t.topic),
          }),
          description: `Analyse des tendances: ${trends.length} sujets détectés. ${opportunities.length} nouvelles opportunités identifiées.`,
        },
      });

      return NextResponse.json({
        activityId: activity.id,
        trends,
        opportunities,
        summary: {
          trendsFound: trends.length,
          opportunitiesFound: opportunities.length,
        },
      });
    } catch (error) {
      // Update activity as failed
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'failed',
          title: 'Échec du scan',
          result: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });

      throw error;
    }
  } catch (error) {
    console.error('[MissionScout] Scan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
