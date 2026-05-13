import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

// GET /api/profile/history — list analysis history
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const analyses = await db.profileAnalysis.findMany({
      where: { userId: authUser.id },
      orderBy: { analyzedAt: 'desc' },
      take: Math.min(limit, 50),
    });

    return NextResponse.json({ analyses });
  } catch (error) {
    console.error('Profile history error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
