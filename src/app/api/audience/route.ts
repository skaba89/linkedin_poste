import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

function detectSentiment(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('?')) return 'question';
  if (['merci', 'super', 'excellent', 'génial', 'bravo', 'intéressant'].some(w => lower.includes(w))) return 'positive';
  if (['non', 'pas d\'accord', 'faux', 'décevant'].some(w => lower.includes(w))) return 'negative';
  return 'neutral';
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await req.json();
    const { postId, comments } = body;

    if (!postId || !comments || !Array.isArray(comments)) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const created: any[] = [];
    for (const c of comments) {
      const comment = await db.audienceComment.create({
        data: {
          postId,
          authorName: c.authorName || null,
          content: c.content,
          likes: c.likes || 0,
          sentiment: c.sentiment || detectSentiment(c.content),
        },
      });
      created.push(comment);
    }

    return NextResponse.json({ created: created.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'postId requis' }, { status: 400 });
    }

    const comments = await db.audienceComment.findMany({
      where: { postId },
      orderBy: { collectedAt: 'desc' },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
