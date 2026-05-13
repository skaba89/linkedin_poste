import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

// PATCH /api/content/recycling-rules/[id]
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
    const { name, description, minDaysOld, minScore, maxRecycles, autoRecycle, frequency, isActive } = body;

    const rule = await db.contentRecyclingRule.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!rule) {
      return NextResponse.json({ error: 'Règle non trouvée' }, { status: 404 });
    }

    const updated = await db.contentRecyclingRule.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(minDaysOld !== undefined && { minDaysOld }),
        ...(minScore !== undefined && { minScore }),
        ...(maxRecycles !== undefined && { maxRecycles }),
        ...(autoRecycle !== undefined && { autoRecycle }),
        ...(frequency !== undefined && { frequency }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ rule: updated });
  } catch (error) {
    console.error('Recycling rule patch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/content/recycling-rules/[id]
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
    const rule = await db.contentRecyclingRule.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!rule) {
      return NextResponse.json({ error: 'Règle non trouvée' }, { status: 404 });
    }

    await db.contentRecyclingRule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Recycling rule delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
