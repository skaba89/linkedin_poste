import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { CompetitorSpyAgent } from '@/lib/agents/competitor-spy';
import { db } from '@/lib/db';

// POST /api/competitor-spy/gaps — Détecter les lacunes de contenu
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
        title: 'Détection des lacunes de contenu en cours',
        description: 'Comparaison de vos contenus avec ceux de vos concurrents...',
      },
    });

    try {
      const gaps = await CompetitorSpyAgent.detectContentGaps(authUser.id);

      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'completed',
          title: `${gaps.length} lacunes de contenu détectées`,
          description: `${gaps.filter((g) => g.userCoverage === 'none').length} sujets totalement absents de votre contenu. ${gaps.filter((g) => g.opportunityScore >= 80).length} opportunités à fort potentiel.`,
          result: JSON.stringify({
            gapsCount: gaps.length,
            noCoverage: gaps.filter((g) => g.userCoverage === 'none').length,
            highOpportunity: gaps.filter((g) => g.opportunityScore >= 80).length,
            topGap: gaps[0]?.topic,
          }),
        },
      });

      return NextResponse.json({ gaps });
    } catch (error) {
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'failed',
          title: 'Échec de la détection des lacunes de contenu',
          result: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('[CompetitorSpy] Gaps error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
