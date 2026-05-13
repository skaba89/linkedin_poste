import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { scoreContent } from '@/lib/content-scorer';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: 'ID du post requis' }, { status: 400 });
    }

    const post = await db.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 });
    }

    if (!post.finalContent) {
      return NextResponse.json({ error: 'Le post n\'a pas de contenu final' }, { status: 400 });
    }

    const { score, details } = scoreContent(post.finalContent);

    // Save score to post
    await db.post.update({
      where: { id: postId },
      data: {
        contentScore: score,
        scoreDetails: details,
      },
    });

    return NextResponse.json({ score, details });
  } catch (error) {
    console.error('Score error:', error);
    return NextResponse.json({ error: 'Erreur lors du scoring' }, { status: 500 });
  }
}
