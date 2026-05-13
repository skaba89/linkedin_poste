import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const status = searchParams.get('status');
    const sector = searchParams.get('sector');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const where: Record<string, unknown> = { userId: authUser.id };
    if (status) where.status = status;
    if (sector) where.targetSector = sector;

    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    const [targets, total] = await Promise.all([
      db.connectionTarget.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      db.connectionTarget.count({ where }),
    ]);

    return NextResponse.json({
      targets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Targets GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { targetName, targetHeadline, targetProfileUrl, targetCompany, targetSector, relevanceScore, notes } = body;

    const target = await db.connectionTarget.create({
      data: {
        userId: authUser.id,
        targetName: targetName || null,
        targetHeadline: targetHeadline || null,
        targetProfileUrl: targetProfileUrl || null,
        targetCompany: targetCompany || null,
        targetSector: targetSector || null,
        relevanceScore: relevanceScore || 0,
        notes: notes || null,
      },
    });

    return NextResponse.json({ target }, { status: 201 });
  } catch (error) {
    console.error('Targets POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
