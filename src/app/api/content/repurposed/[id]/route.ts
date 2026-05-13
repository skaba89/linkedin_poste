import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

// GET /api/content/repurposed/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const item = await db.repurposedContent.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!item) {
      return NextResponse.json({ error: 'Contenu non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Repurposed content get error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH /api/content/repurposed/[id]
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
    const { isUsed, title, generatedContent, qualityScore } = body;

    const item = await db.repurposedContent.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!item) {
      return NextResponse.json({ error: 'Contenu non trouvé' }, { status: 404 });
    }

    const updated = await db.repurposedContent.update({
      where: { id },
      data: {
        ...(isUsed !== undefined && { isUsed }),
        ...(title !== undefined && { title }),
        ...(generatedContent !== undefined && { generatedContent }),
        ...(qualityScore !== undefined && { qualityScore }),
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error('Repurposed content patch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/content/repurposed/[id]
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
    const item = await db.repurposedContent.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!item) {
      return NextResponse.json({ error: 'Contenu non trouvé' }, { status: 404 });
    }

    await db.repurposedContent.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Repurposed content delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
