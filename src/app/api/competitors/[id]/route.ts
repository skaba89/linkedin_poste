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
    const { name, linkedinUrl, industry, notes, isActive } = body;

    const existing = await db.competitor.findFirst({ where: { id, userId: authUser.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Concurrent introuvable' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl;
    if (industry !== undefined) updateData.industry = industry;
    if (notes !== undefined) updateData.notes = notes;
    if (isActive !== undefined) updateData.isActive = isActive;

    const competitor = await db.competitor.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ competitor });
  } catch (error) {
    console.error('Competitors PUT error:', error);
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

    if (!hasRole(authUser, 'admin')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const { id } = await params;

    const competitor = await db.competitor.findFirst({ where: { id, userId: authUser.id } });
    if (!competitor) {
      return NextResponse.json({ error: 'Concurrent introuvable' }, { status: 404 });
    }

    await db.competitor.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Competitors DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
