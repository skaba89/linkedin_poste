import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const { id } = await params;

    const body = await request.json();
    const { name, description, category, prompt, variables, isDefault } = body;

    const existing = await db.promptTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Template introuvable' }, { status: 404 });
    }

    const template = await db.promptTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(category !== undefined && { category }),
        ...(prompt !== undefined && { prompt }),
        ...(variables !== undefined && { variables: variables ? JSON.stringify(variables) : null }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Prompts PUT error:', error);
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

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.promptTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Template introuvable' }, { status: 404 });
    }

    await db.promptTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Prompts DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
