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
    const { status, notes, relevanceScore } = body;

    const existing = await db.connectionTarget.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Cible non trouvée' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (relevanceScore !== undefined) updateData.relevanceScore = relevanceScore;

    if (status === 'connection_sent' && !existing.connectionDate) {
      updateData.connectionDate = new Date();
    }
    if (status === 'replied' && !existing.responseDate) {
      updateData.responseDate = new Date();
    }

    const updated = await db.connectionTarget.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ target: updated });
  } catch (error) {
    console.error('Target PATCH error:', error);
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

    const existing = await db.connectionTarget.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Cible non trouvée' }, { status: 404 });
    }

    await db.connectionTarget.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Target DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
