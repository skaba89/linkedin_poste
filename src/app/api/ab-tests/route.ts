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

    const [tests, total] = await Promise.all([
      db.aBTest.findMany({
        include: {
          author: { select: { id: true, name: true, email: true } },
          postA: { select: { id: true, subject: true, contentScore: true, status: true } },
          postB: { select: { id: true, subject: true, contentScore: true, status: true } },
          readings: { orderBy: { recordedAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.aBTest.count(),
    ]);

    return NextResponse.json({
      tests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('ABTests GET error:', error);
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
    const { name, description, postAId, postBId, criteria } = body;

    if (!name || !postAId || !postBId) {
      return NextResponse.json({ error: 'Nom, Post A et Post B sont requis' }, { status: 400 });
    }

    if (postAId === postBId) {
      return NextResponse.json({ error: 'Les posts A et B doivent être différents' }, { status: 400 });
    }

    // Check posts exist
    const [postA, postB] = await Promise.all([
      db.post.findUnique({ where: { id: postAId } }),
      db.post.findUnique({ where: { id: postBId } }),
    ]);

    if (!postA || !postB) {
      return NextResponse.json({ error: 'Un des posts est introuvable' }, { status: 404 });
    }

    const test = await db.aBTest.create({
      data: {
        name,
        description: description || null,
        postAId,
        postBId,
        criteria: criteria || 'engagement',
        authorId: authUser.id,
      },
      include: {
        author: { select: { id: true, name: true } },
        postA: { select: { id: true, subject: true, contentScore: true } },
        postB: { select: { id: true, subject: true, contentScore: true } },
      },
    });

    await createAuditLog({
      entityType: 'ABTest',
      entityId: test.id,
      action: 'create',
      userId: authUser.id,
      metadata: { name, postAId, postBId, criteria },
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    console.error('ABTests POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
