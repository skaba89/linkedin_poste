import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isActive, category } = body;

    const existing = await db.trackedKeyword.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Mot-clé non trouvé' }, { status: 404 });
    }

    const updated = await db.trackedKeyword.update({
      where: { id },
      data: {
        ...(isActive !== undefined ? { isActive } : {}),
        ...(category ? { category } : {}),
      },
    });

    return NextResponse.json({ keyword: updated });
  } catch (error) {
    console.error('Keyword PATCH error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.trackedKeyword.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Mot-clé non trouvé' }, { status: 404 });
    }

    await db.trackedKeyword.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Keyword DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
