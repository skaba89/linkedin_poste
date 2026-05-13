import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

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
    const { status, notes, name, description, startDate, endDate } = body;

    const existing = await db.aBTest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Test introuvable' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    const test = await db.aBTest.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, name: true } },
        postA: { select: { id: true, subject: true, contentScore: true } },
        postB: { select: { id: true, subject: true, contentScore: true } },
        readings: { orderBy: { recordedAt: 'desc' } },
      },
    });

    await createAuditLog({
      entityType: 'ABTest',
      entityId: id,
      action: 'update',
      userId: authUser.id,
      metadata: { status, notes },
    });

    return NextResponse.json({ test });
  } catch (error) {
    console.error('ABTests PUT error:', error);
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

    const existing = await db.aBTest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Test introuvable' }, { status: 404 });
    }

    await db.aBTest.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    await createAuditLog({
      entityType: 'ABTest',
      entityId: id,
      action: 'delete',
      userId: authUser.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ABTests DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
