import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { ClientNurtureAgent } from '@/lib/agents/client-nurture';
import { db } from '@/lib/db';

// POST /api/client-nurture/process — Traiter la file de relance clients
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
        title: 'Traitement de la file de relance en cours',
        description: 'Envoi des messages de réactivation aux clients froids...',
      },
    });

    try {
      const result = await ClientNurtureAgent.processNurtureQueue(authUser.id);

      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'completed',
          title: `${result.contacted} relance(s) envoyée(s)`,
          description: `Traitement terminé : ${result.contacted} contacté(s), ${result.skipped} ignoré(s).`,
          result: JSON.stringify({
            processed: result.processed,
            contacted: result.contacted,
            skipped: result.skipped,
          }),
        },
      });

      return NextResponse.json({
        processed: result.processed,
        contacted: result.contacted,
        skipped: result.skipped,
        details: result.details,
      });
    } catch (error) {
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'failed',
          title: 'Échec du traitement de la file de relance',
          result: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('[ClientNurture] Process error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
