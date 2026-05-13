import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const keywords = await db.trackedKeyword.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error('Keywords GET error:', error);
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
    const { keyword, category } = body;

    if (!keyword?.trim()) {
      return NextResponse.json({ error: 'Le mot-clé est requis' }, { status: 400 });
    }

    const trimmed = keyword.trim().toLowerCase();

    const existing = await db.trackedKeyword.findUnique({
      where: { userId_keyword: { userId: authUser.id, keyword: trimmed } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Ce mot-clé est déjà suivi' }, { status: 409 });
    }

    const trackedKeyword = await db.trackedKeyword.create({
      data: {
        userId: authUser.id,
        keyword: trimmed,
        category: category || 'brand',
      },
    });

    return NextResponse.json({ keyword: trackedKeyword }, { status: 201 });
  } catch (error) {
    console.error('Keywords POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
