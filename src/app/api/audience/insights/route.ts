import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { analyzeAudience } from '@/lib/audience-analyzer';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const comments = await db.audienceComment.findMany();
    if (comments.length === 0) {
      return NextResponse.json({ error: 'Aucun commentaire à analyser' }, { status: 400 });
    }

    const mapped = comments.map(c => ({
      postId: c.postId,
      authorName: c.authorName || undefined,
      content: c.content,
      likes: c.likes,
      sentiment: c.sentiment || 'neutral',
    }));

    const insight = analyzeAudience(mapped);

    // Generate content ideas from analysis
    for (const idea of insight.contentIdeas) {
      await db.contentIdea.create({
        data: {
          userId: authUser.id,
          source: idea.source,
          title: idea.title,
          description: idea.description,
          suggestedFormat: idea.suggestedFormat,
          suggestedAngle: idea.suggestedAngle,
          priority: idea.priority,
          relatedPostIds: idea.sourcePostId ? JSON.stringify([idea.sourcePostId]) : null,
        },
      });
    }

    return NextResponse.json(insight);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const comments = await db.audienceComment.findMany();
    if (comments.length === 0) {
      return NextResponse.json({ insights: null });
    }

    const mapped = comments.map(c => ({
      postId: c.postId,
      authorName: c.authorName || undefined,
      content: c.content,
      likes: c.likes,
      sentiment: c.sentiment || 'neutral',
    }));

    const insight = analyzeAudience(mapped);
    return NextResponse.json({ insights: insight });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
