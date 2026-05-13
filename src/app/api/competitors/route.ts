import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const [competitors, total] = await Promise.all([
      db.competitor.findMany({
        where: { isActive: true, userId: authUser.id },
        include: {
          _count: { select: { posts: true } },
          posts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.competitor.count({
        where: { isActive: true, userId: authUser.id },
      }),
    ]);

    // Calculate avg engagement from the single latest post per competitor
    // (previously did N+1 queries fetching ALL posts per competitor)
    const competitorsWithStats = competitors.map((c) => {
      const latestPost = c.posts[0];
      return {
        id: c.id,
        name: c.name,
        linkedinUrl: c.linkedinUrl,
        industry: c.industry,
        notes: c.notes,
        isActive: c.isActive,
        lastSyncedAt: c.lastSyncedAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        avgEngagement: latestPost ? parseFloat(latestPost.engagementRate.toFixed(2)) : 0,
        postCount: c._count.posts,
      };
    });

    return NextResponse.json({
      competitors: competitorsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Competitors GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

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
    const { name, linkedinUrl, industry, notes } = body;

    if (!name || !linkedinUrl) {
      return NextResponse.json({ error: 'Nom et URL LinkedIn sont requis' }, { status: 400 });
    }

    const competitor = await db.competitor.create({
      data: {
        userId: authUser.id,
        name,
        linkedinUrl,
        industry: industry || null,
        notes: notes || null,
      },
    });

    await createAuditLog({
      entityType: 'Competitor',
      entityId: competitor.id,
      action: 'create',
      userId: authUser.id,
      metadata: { name, linkedinUrl },
    });

    return NextResponse.json({ competitor }, { status: 201 });
  } catch (error) {
    console.error('Competitors POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
