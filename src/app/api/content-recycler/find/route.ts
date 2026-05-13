import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { ContentRecyclerAgent } from '@/lib/agents/content-recycler';
import { db } from '@/lib/db';

// POST /api/content-recycler/find — Trouver les contenus recyclables
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const activity = await db.agentActivity.create({
      data: {
        userId: authUser.id,
        agentType: 'content_recycler',
        status: 'executing',
        title: 'Recherche de contenus recyclables en cours',
        description: 'Analyse de vos publications passées pour identifier les contenus à recycler...',
      },
    });

    try {
      const posts = await ContentRecyclerAgent.findRecyclableContent(authUser.id);

      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'completed',
          title: `${posts.length} contenus recyclables trouvés`,
          description: `${posts.length} posts publiés peuvent être recyclés dans de nouveaux formats.`,
          result: JSON.stringify({
            recyclableCount: posts.length,
            topScore: posts.length > 0 ? posts[0].contentScore : 0,
          }),
        },
      });

      return NextResponse.json({ posts });
    } catch (error) {
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'failed',
          title: 'Échec de la recherche de contenus recyclables',
          result: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('[ContentRecycler] Find error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
