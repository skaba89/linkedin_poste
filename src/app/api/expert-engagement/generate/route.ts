import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { ExpertEngagementAgent } from '@/lib/agents/expert-engagement';

// POST /api/expert-engagement/generate — Générer un commentaire expert
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    // Batch mode: multiple posts
    if (body.posts && Array.isArray(body.posts) && body.posts.length > 0) {
      const comments = await ExpertEngagementAgent.generateBatchComments(
        authUser.id,
        body.posts.map((p: { content: string; author?: string; domain?: string }) => ({
          content: p.content,
          author: p.author,
          domain: p.domain,
        }))
      );
      return NextResponse.json({ comments });
    }

    // Single post mode
    const { postContent, postAuthor, domain } = body;

    if (!postContent || typeof postContent !== 'string') {
      return NextResponse.json({ error: 'Le contenu du post est requis' }, { status: 400 });
    }

    if (postContent.length > 5000) {
      return NextResponse.json({ error: 'Le contenu du post ne doit pas dépasser 5000 caractères' }, { status: 400 });
    }

    const result = await ExpertEngagementAgent.generateExpertComment(
      authUser.id,
      postContent,
      postAuthor,
      domain
    );

    // Save generation as an agent activity (pending = generated but not posted)
    await import('@/lib/db').then(({ db }) =>
      db.agentActivity.create({
        data: {
          userId: authUser.id,
          agentType: 'expert_engagement',
          status: 'pending',
          title: `Commentaire généré — ${result.domainLabel || result.domain}`,
          description: `Commentaire expert généré pour le domaine "${result.domainLabel || result.domain}". En attente de publication.`,
          result: result.comment,
          metadata: JSON.stringify({
            postContent: postContent.substring(0, 500),
            postAuthor: postAuthor || null,
            domain: result.domain,
            domainLabel: result.domainLabel,
          }),
        },
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ExpertEngagement] Generate error:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération du commentaire' }, { status: 500 });
  }
}
