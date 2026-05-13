import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { ClientNurtureAgent } from '@/lib/agents/client-nurture';
import { db } from '@/lib/db';

// POST /api/client-nurture/identify — Identifier les clients froids
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const activity = await db.agentActivity.create({
      data: {
        userId: authUser.id,
        agentType: 'client_nurture',
        status: 'executing',
        title: 'Identification des clients froids en cours',
        description: 'Recherche de prospects inactifs nécessitant une relance...',
      },
    });

    try {
      const coldClients = await ClientNurtureAgent.identifyColdClients(authUser.id);

      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'completed',
          title: `${coldClients.length} clients froids identifiés`,
          description: `${coldClients.length} prospects inactifs identifiés pour relance.`,
          result: JSON.stringify({
            coldClientsCount: coldClients.length,
            avgScore: coldClients.length > 0
              ? Math.round(coldClients.reduce((a, b) => a + b.score, 0) / coldClients.length)
              : 0,
            topScore: coldClients.length > 0 ? coldClients[0].score : 0,
          }),
        },
      });

      return NextResponse.json({ coldClients });
    } catch (error) {
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'failed',
          title: 'Échec de l\'identification des clients froids',
          result: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('[ClientNurture] Identify error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
