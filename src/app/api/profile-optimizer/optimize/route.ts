import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { ProfileOptimizerAgent } from '@/lib/agents/profile-optimizer';
import { db } from '@/lib/db';

// POST /api/profile-optimizer/optimize — Générer des optimisations de profil
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const activity = await db.agentActivity.create({
      data: {
        userId: authUser.id,
        agentType: 'profile_optimizer',
        status: 'executing',
        title: 'Génération des optimisations en cours',
        description: 'Le système génère des optimisations personnalisées pour votre profil LinkedIn...',
      },
    });

    try {
      const result = await ProfileOptimizerAgent.generateOptimizations(authUser.id);

      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'completed',
          title: 'Optimisations de profil générées',
          description: `Titre et résumé optimisés. ${result.changesExplained}`,
          result: JSON.stringify({
            optimizedHeadline: result.optimizedHeadline,
            changesExplained: result.changesExplained,
          }),
        },
      });

      return NextResponse.json({ optimizations: result });
    } catch (error) {
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'failed',
          title: 'Échec de la génération des optimisations',
          result: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('[ProfileOptimizer] Optimize error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
