import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { ContentRecyclerAgent } from '@/lib/agents/content-recycler';
import { db } from '@/lib/db';

// POST /api/content-recycler/recycle — Recycler un contenu existant
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { sourcePostId } = body;

    if (!sourcePostId) {
      return NextResponse.json({ error: 'sourcePostId est requis' }, { status: 400 });
    }

    const activity = await db.agentActivity.create({
      data: {
        userId: authUser.id,
        agentType: 'content_recycler',
        status: 'executing',
        title: 'Recyclage de contenu en cours',
        description: 'Transformation du contenu en un nouveau format...',
      },
    });

    try {
      const result = await ContentRecyclerAgent.generateRepurposedContent(authUser.id, sourcePostId);

      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'completed',
          title: `Contenu recyclé — ${result.targetType}`,
          description: `"${result.title}" généré avec un score de qualité de ${result.qualityScore}/100.`,
          result: JSON.stringify({
            sourcePostId: result.sourcePostId,
            targetType: result.targetType,
            qualityScore: result.qualityScore,
            title: result.title,
          }),
        },
      });

      return NextResponse.json({ repurposed: result });
    } catch (error) {
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'failed',
          title: 'Échec du recyclage du contenu',
          result: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('[ContentRecycler] Recycle error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
