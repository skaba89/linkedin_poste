import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await params;

    const item = await db.contentPlanItem.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!item) {
      return NextResponse.json({ error: 'Élément non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const existing = await db.contentPlanItem.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Élément non trouvé' }, { status: 404 });
    }

    const item = await db.contentPlanItem.update({
      where: { id },
      data: {
        ...(body.plannedDate !== undefined && { plannedDate: new Date(body.plannedDate) }),
        ...(body.plannedTime !== undefined && { plannedTime: body.plannedTime || null }),
        ...(body.topic !== undefined && { topic: body.topic }),
        ...(body.format !== undefined && { format: body.format }),
        ...(body.audience !== undefined && { audience: body.audience || null }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.suggestedHashtags !== undefined && { suggestedHashtags: body.suggestedHashtags || null }),
        ...(body.aiSuggestion !== undefined && { aiSuggestion: body.aiSuggestion || null }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        ...(body.postId !== undefined && { postId: body.postId || null }),
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await params;

    const existing = await db.contentPlanItem.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Élément non trouvé' }, { status: 404 });
    }

    await db.contentPlanItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
