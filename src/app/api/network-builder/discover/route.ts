import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { NetworkBuilderAgent } from '@/lib/agents/network-builder';
import { db } from '@/lib/db';

// POST /api/network-builder/discover — Découvrir de nouvelles cibles de connexion
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const activity = await db.agentActivity.create({
      data: {
        userId: authUser.id,
        agentType: 'network_builder',
        status: 'executing',
        title: 'Découverte de cibles en cours',
        description: 'Recherche de profils pertinents à connecter dans votre réseau...',
      },
    });

    try {
      const targets = await NetworkBuilderAgent.discoverTargets(authUser.id);

      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'completed',
          title: `${targets.length} cibles de connexion identifiées`,
          description: `${targets.length} profils pertinents découverts pour développer votre réseau professionnel.`,
          result: JSON.stringify({
            targetsFound: targets.length,
            topScore: targets.length > 0 ? Math.max(...targets.map((t) => t.relevanceScore)) : 0,
            avgScore: targets.length > 0
              ? Math.round(targets.reduce((a, b) => a + b.relevanceScore, 0) / targets.length)
              : 0,
          }),
        },
      });

      return NextResponse.json({ targets });
    } catch (error) {
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'failed',
          title: 'Échec de la découverte de cibles',
          result: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('[NetworkBuilder] Discover error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
