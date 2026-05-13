import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';

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

    const template = await db.postTemplate.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template introuvable' }, { status: 404 });
    }

    // Check access: owner or public
    if (template.userId !== authUser.id && !template.isPublic) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Get template error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération du template' }, { status: 500 });
  }
}

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
    const { name, description, category, structure, example, tags, isPublic } = body;

    const existing = await db.postTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Template introuvable' }, { status: 404 });
    }
    if (existing.userId !== authUser.id) {
      return NextResponse.json({ error: 'Vous ne pouvez modifier que vos propres templates' }, { status: 403 });
    }

    const template = await db.postTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(structure !== undefined ? { structure: structure.trim() } : {}),
        ...(example !== undefined ? { example: example?.trim() || null } : {}),
        ...(tags !== undefined ? { tags: tags ? JSON.stringify(tags) : null } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du template' }, { status: 500 });
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

    const existing = await db.postTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Template introuvable' }, { status: 404 });
    }
    if (existing.userId !== authUser.id) {
      return NextResponse.json({ error: 'Vous ne pouvez supprimer que vos propres templates' }, { status: 403 });
    }

    await db.postTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression du template' }, { status: 500 });
  }
}
