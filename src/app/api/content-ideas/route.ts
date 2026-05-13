import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const where: Record<string, string | undefined> = { userId: authUser.id };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [ideas, total] = await Promise.all([
      db.contentIdea.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.contentIdea.count({ where }),
    ]);

    return NextResponse.json({
      ideas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await req.json();
    const { title, description, suggestedFormat, suggestedAngle, priority, source, relatedPostIds } = body;

    if (!title) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    }

    const idea = await db.contentIdea.create({
      data: {
        userId: authUser.id,
        title,
        description: description || null,
        suggestedFormat: suggestedFormat || null,
        suggestedAngle: suggestedAngle || null,
        priority: priority || 'medium',
        source: source || 'manual',
        relatedPostIds: relatedPostIds ? JSON.stringify(relatedPostIds) : null,
      },
    });

    return NextResponse.json({ idea }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
