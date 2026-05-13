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
    const { isReplied, sentiment, suggestedReply } = body;

    const existing = await db.socialMention.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Mention non trouvée' }, { status: 404 });
    }

    const updated = await db.socialMention.update({
      where: { id },
      data: {
        ...(isReplied !== undefined ? { isReplied, repliedAt: isReplied ? new Date() : null } : {}),
        ...(sentiment ? { sentiment } : {}),
        ...(suggestedReply ? { suggestedReply } : {}),
      },
    });

    return NextResponse.json({ mention: updated });
  } catch (error) {
    console.error('Mention PATCH error:', error);
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

    const existing = await db.socialMention.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Mention non trouvée' }, { status: 404 });
    }

    await db.socialMention.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mention DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
