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
    const sentiment = searchParams.get('sentiment');
    const keyword = searchParams.get('keyword');
    const source = searchParams.get('source');
    const isReplied = searchParams.get('isReplied');

    const where: Record<string, unknown> = { userId: authUser.id };
    if (sentiment) where.sentiment = sentiment;
    if (keyword) where.keyword = keyword;
    if (source) where.source = source;
    if (isReplied !== null && isReplied !== undefined) where.isReplied = isReplied === 'true';

    const [mentions, total] = await Promise.all([
      db.socialMention.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.socialMention.count({ where }),
    ]);

    return NextResponse.json({
      mentions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Mentions GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
