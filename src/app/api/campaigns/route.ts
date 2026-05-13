import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';

const VALID_STATUSES = ['draft', 'active', 'paused', 'completed'];

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `campaigns:list:${authUser.id}`);
    if (rlResult) return rlResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const where: Record<string, unknown> = { userId: authUser.id };

    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    const [campaigns, total] = await Promise.all([
      db.outreachCampaign.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.outreachCampaign.count({ where }),
    ]);

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Campaigns GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlCreate = await rateLimitMiddleware(apiLimiter, request, `campaigns:create:${authUser.id}`);
    if (rlCreate) return rlCreate;

    const body = await request.json();
    const { name, description, messageTemplate, targetAudience, status } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }
    if (!messageTemplate?.trim()) {
      return NextResponse.json({ error: 'Le template de message est requis' }, { status: 400 });
    }

    const campaign = await db.outreachCampaign.create({
      data: {
        userId: authUser.id,
        name: name.trim(),
        description: description?.trim() || null,
        messageTemplate: messageTemplate.trim(),
        targetAudience: targetAudience ? JSON.stringify(targetAudience) : null,
        status: (status && VALID_STATUSES.includes(status)) ? status : 'draft',
        startDate: status === 'active' ? new Date() : null,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Campaigns POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
