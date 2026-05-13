import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

// GET /api/content/repurposed — list repurposed content with filters
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sourceType = searchParams.get('sourceType');
    const targetType = searchParams.get('targetType');
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!) : undefined;
    const isUsed = searchParams.get('isUsed');

    const where: Record<string, unknown> = { userId: authUser.id };
    if (sourceType) where.sourceType = sourceType;
    if (targetType) where.targetType = targetType;
    if (minScore !== undefined) where.qualityScore = { gte: minScore };
    if (isUsed !== null && isUsed !== undefined) where.isUsed = isUsed === 'true';

    const [items, total] = await Promise.all([
      db.repurposedContent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      db.repurposedContent.count({ where }),
    ]);

    return NextResponse.json({ items, total });
  } catch (error) {
    console.error('Repurposed content list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
