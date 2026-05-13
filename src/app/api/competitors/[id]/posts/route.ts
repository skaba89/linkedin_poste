import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      db.competitorPost.findMany({
        where: { competitorId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.competitorPost.count({ where: { competitorId: id } }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Competitor posts GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { subject, content, publishedAt, likes, comments, reposts, notes } = body;

    if (!subject) {
      return NextResponse.json({ error: 'Le sujet est requis' }, { status: 400 });
    }

    const totalEngagement = (Number(likes) || 0) + (Number(comments) || 0) + (Number(reposts) || 0);
    const estimatedImpressions = totalEngagement / 0.035 || 1;
    const engagementRate = parseFloat((totalEngagement / estimatedImpressions * 100).toFixed(2));

    const post = await db.competitorPost.create({
      data: {
        competitorId: id,
        subject,
        content: content || null,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        likes: Math.max(0, Number(likes) || 0),
        comments: Math.max(0, Number(comments) || 0),
        reposts: Math.max(0, Number(reposts) || 0),
        engagementRate,
        notes: notes || null,
      },
    });

    await createAuditLog({
      entityType: 'CompetitorPost',
      entityId: post.id,
      action: 'create',
      userId: authUser.id,
      metadata: { competitorId: id, subject },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Competitor posts POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
