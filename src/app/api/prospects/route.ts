import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';
import { triggerWebhooks } from '@/lib/webhook-sender';

const VALID_STATUSES = ['new', 'contacted', 'replied', 'interested', 'not_interested', 'converted'];
const VALID_SOURCES = ['manual', 'linkedin_search', 'recommendation', 'import'];

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Rate limit
    const rlResult = await rateLimitMiddleware(apiLimiter, request, `prospects:list:${authUser.id}`);
    if (rlResult) return rlResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const scoreMin = parseInt(searchParams.get('scoreMin') || '0');
    const scoreMax = parseInt(searchParams.get('scoreMax') || '100');
    const source = searchParams.get('source') || '';
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    // Build where clause
    const where: Record<string, unknown> = { userId: authUser.id, isActive: true };

    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    if (source && VALID_SOURCES.includes(source)) {
      where.source = source;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { company: { contains: search } },
        { title: { contains: search } },
        { headline: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    if (scoreMin > 0 || scoreMax < 100) {
      where.score = { gte: scoreMin, lte: scoreMax };
    }

    // Order
    const orderByMap: Record<string, string> = {
      score: 'score',
      name: 'fullName',
      company: 'company',
      status: 'status',
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
      lastContactedAt: 'lastContactedAt',
    };
    const orderField = orderByMap[sortBy] || 'updatedAt';
    const orderBy = { [orderField]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const [prospects, total] = await Promise.all([
      db.prospect.findMany({
        where,
        include: {
          _count: { select: { outreachMessages: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.prospect.count({ where }),
    ]);

    // Get status counts for the pipeline
    const statusCounts = await db.prospect.groupBy({
      by: ['status'],
      where: { userId: authUser.id, isActive: true },
      _count: true,
    });

    return NextResponse.json({
      prospects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Prospects GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlCreate = await rateLimitMiddleware(apiLimiter, request, `prospects:create:${authUser.id}`);
    if (rlCreate) return rlCreate;

    const body = await request.json();
    const { fullName, linkedinUrl, headline, company, title, source, notes, tags, score } = body;

    if (!fullName?.trim()) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    if (source && !VALID_SOURCES.includes(source)) {
      return NextResponse.json({ error: 'Source invalide' }, { status: 400 });
    }

    const prospect = await db.prospect.create({
      data: {
        userId: authUser.id,
        fullName: fullName.trim(),
        linkedinUrl: linkedinUrl?.trim() || null,
        headline: headline?.trim() || null,
        company: company?.trim() || null,
        title: title?.trim() || null,
        source: source || 'manual',
        notes: notes?.trim() || null,
        tags: tags ? JSON.stringify(tags) : null,
        score: Math.max(0, Math.min(100, parseInt(score) || 0)),
      },
    });

    // Webhook: prospect.created (fire-and-forget)
    triggerWebhooks(authUser.id, 'prospect.created', {
      prospectId: prospect.id,
      fullName: prospect.fullName,
      company: prospect.company,
      source: prospect.source,
      score: prospect.score,
    }).catch(() => {});

    return NextResponse.json({ prospect }, { status: 201 });
  } catch (error) {
    console.error('Prospects POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
