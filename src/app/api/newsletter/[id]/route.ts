import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

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

    const newsletter = await db.newsletter.findFirst({
      where: { id, userId: authUser.id },
      include: {
        newsletterPosts: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { newsletterPosts: true },
        },
      },
    });

    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter introuvable' }, { status: 404 });
    }

    return NextResponse.json({ newsletter });
  } catch (error) {
    console.error('Newsletter get error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
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
    const { name, description, frequency, status } = body;

    // Verify ownership
    const existing = await db.newsletter.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Newsletter introuvable' }, { status: 404 });
    }

    const validFrequencies = ['weekly', 'biweekly', 'monthly'];
    const validStatuses = ['draft', 'active', 'paused', 'archived'];

    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Fréquence invalide' },
        { status: 400 }
      );
    }

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (status !== undefined) updateData.status = status;

    const newsletter = await db.newsletter.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      entityType: 'Newsletter',
      entityId: id,
      action: 'update',
      userId: authUser.id,
      metadata: updateData,
    });

    return NextResponse.json({ newsletter });
  } catch (error) {
    console.error('Newsletter update error:', error);
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

    // Verify ownership
    const existing = await db.newsletter.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Newsletter introuvable' }, { status: 404 });
    }

    // Archive instead of delete
    await db.newsletter.update({
      where: { id },
      data: { status: 'archived' },
    });

    await createAuditLog({
      entityType: 'Newsletter',
      entityId: id,
      action: 'archive',
      userId: authUser.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Newsletter archive error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
