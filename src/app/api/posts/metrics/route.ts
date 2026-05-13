import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const body = await request.json();
    const { postId, impressions, reach, likes, comments, reposts, clicks } = body;

    if (!postId) {
      return NextResponse.json({ error: 'postId est requis' }, { status: 400 });
    }

    // Check post exists
    const post = await db.post.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 });
    }

    const impressionsVal = Math.max(0, Number(impressions) || 0);
    const engagementRate = impressionsVal > 0
      ? parseFloat((((Number(likes) || 0) + (Number(comments) || 0) + (Number(reposts) || 0) + (Number(clicks) || 0)) / impressionsVal * 100).toFixed(2))
      : 0;

    const metric = await db.postMetric.create({
      data: {
        postId,
        impressions: impressionsVal,
        reach: Math.max(0, Number(reach) || 0),
        likes: Math.max(0, Number(likes) || 0),
        comments: Math.max(0, Number(comments) || 0),
        reposts: Math.max(0, Number(reposts) || 0),
        clicks: Math.max(0, Number(clicks) || 0),
        engagementRate,
        source: 'manual',
      },
    });

    await createAuditLog({
      entityType: 'PostMetric',
      entityId: metric.id,
      action: 'create',
      userId: authUser.id,
      metadata: { postId, impressions: impressionsVal, engagementRate },
    });

    return NextResponse.json({ metric }, { status: 201 });
  } catch (error) {
    console.error('PostMetrics POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
