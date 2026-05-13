import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { NetworkBuilderAgent } from '@/lib/agents/network-builder';
import { db } from '@/lib/db';

// POST /api/network-builder/process — Traiter les connexions en attente
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
        title: 'Traitement des connexions en attente',
        description: 'Envoi des demandes de connexion aux cibles identifiées...',
      },
    });

    try {
      const result = await NetworkBuilderAgent.processPendingConnections(authUser.id);

      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'completed',
          title: `${result.sent} connexion(s) envoyée(s)`,
          description: `Traitement terminé : ${result.sent} connexion(s) envoyée(s), ${result.skipped} ignorée(s).`,
          result: JSON.stringify({
            processed: result.processed,
            sent: result.sent,
            skipped: result.skipped,
          }),
        },
      });

      return NextResponse.json({
        processed: result.processed,
        sent: result.sent,
        skipped: result.skipped,
        details: result.details,
      });
    } catch (error) {
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'failed',
          title: 'Échec du traitement des connexions',
          result: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('[NetworkBuilder] Process error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
