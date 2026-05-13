import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { db } from '@/lib/db';

// GET /api/mission-scout/opportunities/[id] — Single opportunity with application history
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
    const opportunity = await db.opportunity.findUnique({
      where: { id },
      include: {
        applications: {
          where: { userId: authUser.id },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!opportunity || opportunity.userId !== authUser.id) {
      return NextResponse.json({ error: 'Opportunité introuvable' }, { status: 404 });
    }

    return NextResponse.json({ opportunity });
  } catch (error) {
    console.error('[MissionScout] Opportunity detail error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH /api/mission-scout/opportunities/[id] — Update opportunity status
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
    const { status } = body;

    const opportunity = await db.opportunity.findUnique({ where: { id } });
    if (!opportunity || opportunity.userId !== authUser.id) {
      return NextResponse.json({ error: 'Opportunité introuvable' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (status === 'archived' || status === 'expired') updateData.closedAt = new Date();

    const updated = await db.opportunity.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ opportunity: updated });
  } catch (error) {
    console.error('[MissionScout] Opportunity update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/mission-scout/opportunities/[id] — Archive opportunity
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
    const opportunity = await db.opportunity.findUnique({ where: { id } });
    if (!opportunity || opportunity.userId !== authUser.id) {
      return NextResponse.json({ error: 'Opportunité introuvable' }, { status: 404 });
    }

    await db.opportunity.update({
      where: { id },
      data: { status: 'archived', closedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MissionScout] Opportunity archive error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
