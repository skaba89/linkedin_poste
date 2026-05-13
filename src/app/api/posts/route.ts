import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';
import type { PostStatus } from '@/types';

const VALID_PROVIDERS = ['openrouter', 'groq', 'glm', 'anthropic', 'openai'];

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as PostStatus | null;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    
    // Phase 2 advanced filters
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const provider = searchParams.get('provider') || '';
    const authorId = searchParams.get('authorId') || '';
    const hasImage = searchParams.get('hasImage') || '';
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { angle: { contains: search } },
        { audience: { contains: search } },
        { finalContent: { contains: search } },
        { hashtags: { contains: search } },
      ];
    }
    if (fromDate) {
      where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), gte: new Date(fromDate) };
    }
    if (toDate) {
      const toDateEnd = new Date(toDate);
      toDateEnd.setHours(23, 59, 59, 999);
      where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), lte: toDateEnd };
    }
    if (provider) {
      where.aiProvider = provider;
    }
    if (authorId) {
      where.authorId = authorId;
    }
    if (hasImage === 'true') {
      where.imageUrl = { not: null };
    } else if (hasImage === 'false') {
      where.imageUrl = null;
    }

    // Editors see only their posts, admins/validators see all
    if (!hasRole(authUser, 'admin', 'validator')) {
      where.authorId = authUser.id;
    }

    // Build order by
    const orderByMap: Record<string, string> = {
      date: 'updatedAt',
      subject: 'subject',
      score: 'contentScore',
      status: 'status',
    };
    const orderField = orderByMap[sortBy] || 'updatedAt';
    const orderBy = { [orderField]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const [posts, total] = await Promise.all([
      db.post.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
          aiVariants: { orderBy: { variantIndex: 'asc' } },
          validations: {
            include: {
              user: { select: { id: true, name: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          publicationLogs: { orderBy: { createdAt: 'desc' } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.post.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Posts GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const body = await request.json();
    const { subject, angle, audience, cta, imageUrl, hashtags, scheduledDate, aiProvider } = body;

    if (!subject) {
      return NextResponse.json({ error: 'Le sujet est requis' }, { status: 400 });
    }

    if (aiProvider && !VALID_PROVIDERS.includes(aiProvider)) {
      return NextResponse.json({ error: 'Provider IA invalide' }, { status: 400 });
    }

    const post = await db.post.create({
      data: {
        subject,
        angle: angle || null,
        audience: audience || null,
        cta: cta || null,
        imageUrl: imageUrl || null,
        hashtags: hashtags || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        aiProvider: aiProvider || 'openrouter',
        status: 'idea',
        authorId: authUser.id,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await createAuditLog({
      entityType: 'Post',
      entityId: post.id,
      action: 'create',
      userId: authUser.id,
      metadata: { subject: post.subject, aiProvider: post.aiProvider },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Posts POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
