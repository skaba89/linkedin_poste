import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';

const VALID_STATUSES = ['draft', 'active', 'paused', 'completed'];

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

    const campaign = await db.outreachCampaign.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campagne non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Campaign GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `campaigns:update:${authUser.id}`);
    if (rlResult) return rlResult;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.outreachCampaign.findFirst({
      where: { id, userId: authUser.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Campagne non trouvée' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    const allowedFields = ['name', 'description', 'messageTemplate', 'targetAudience', 'status', 'totalSent', 'totalReplied', 'totalConverted', 'endDate'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'status' && !VALID_STATUSES.includes(body[field])) {
          return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
        }
        if (field === 'targetAudience' && body[field]) {
          data[field] = JSON.stringify(body[field]);
        } else if (field === 'endDate') {
          data[field] = body[field] ? new Date(body[field]) : null;
        } else {
          data[field] = body[field];
        }
      }
    }

    const campaign = await db.outreachCampaign.update({
      where: { id },
      data,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Campaign PUT error:', error);
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

    const existing = await db.outreachCampaign.findFirst({
      where: { id, userId: authUser.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Campagne non trouvée' }, { status: 404 });
    }

    await db.outreachCampaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Campaign DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
