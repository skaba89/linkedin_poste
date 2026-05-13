import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';

const VALID_STATUSES = ['new', 'contacted', 'replied', 'interested', 'not_interested', 'converted'];

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

    const prospect = await db.prospect.findFirst({
      where: { id, userId: authUser.id, isActive: true },
      include: {
        outreachMessages: {
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { outreachMessages: true } },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ prospect });
  } catch (error) {
    console.error('Prospect GET error:', error);
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

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `prospects:update:${authUser.id}`);
    if (rlResult) return rlResult;

    const { id } = await params;
    const body = await request.json();

    // Check ownership
    const existing = await db.prospect.findFirst({
      where: { id, userId: authUser.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 });
    }

    // Build update data
    const data: Record<string, unknown> = {};
    const allowedFields = ['fullName', 'linkedinUrl', 'headline', 'company', 'title', 'status', 'source', 'notes', 'tags', 'score', 'isActive', 'lastContactedAt', 'nextFollowUpAt', 'linkedinProfileId'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'status' && !VALID_STATUSES.includes(body[field])) {
          return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
        }
        if (field === 'tags' && body[field]) {
          data[field] = JSON.stringify(body[field]);
        } else if (field === 'score') {
          data[field] = Math.max(0, Math.min(100, parseInt(body[field]) || 0));
        } else if (field === 'lastContactedAt' || field === 'nextFollowUpAt') {
          data[field] = body[field] ? new Date(body[field]) : null;
        } else {
          data[field] = body[field];
        }
      }
    }

    const prospect = await db.prospect.update({
      where: { id },
      data,
      include: {
        _count: { select: { outreachMessages: true } },
      },
    });

    return NextResponse.json({ prospect });
  } catch (error) {
    console.error('Prospect PUT error:', error);
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

    const existing = await db.prospect.findFirst({
      where: { id, userId: authUser.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 });
    }

    await db.prospect.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Prospect DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
