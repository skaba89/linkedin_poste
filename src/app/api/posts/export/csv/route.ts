import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const provider = searchParams.get('provider') || '';
    const authorId = searchParams.get('authorId') || '';
    const hasImage = searchParams.get('hasImage') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '1000')));

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { angle: { contains: search } },
        { audience: { contains: search } },
        { finalContent: { contains: search } },
        { hashtags: { contains: search } },
      ];
    }
    if (provider) where.aiProvider = provider;
    if (authorId) where.authorId = authorId;
    if (hasImage === 'true') where.imageUrl = { not: null };
    else if (hasImage === 'false') where.imageUrl = null;
    if (fromDate) {
      where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), gte: new Date(fromDate) };
    }
    if (toDate) {
      const toDateEnd = new Date(toDate);
      toDateEnd.setHours(23, 59, 59, 999);
      where.createdAt = { ...(where.createdAt as Record<string, unknown> || {}), lte: toDateEnd };
    }
    if (!hasRole(authUser, 'admin', 'validator')) {
      where.authorId = authUser.id;
    }

    const orderByMap: Record<string, string> = {
      date: 'updatedAt',
      subject: 'subject',
      score: 'contentScore',
      status: 'status',
    };
    const orderField = orderByMap[sortBy] || 'updatedAt';
    const orderBy = { [orderField]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const posts = await db.post.findMany({
      where,
      include: {
        author: { select: { name: true } },
      },
      orderBy,
      take: limit,
    });

    // Generate CSV
    const headers = [
      'Sujet',
      'Statut',
      'Auteur',
      'Provider IA',
      'Score',
      'Date création',
      'Date planifiée',
      'URL image',
      'Hashtags',
    ];

    const statusLabels: Record<string, string> = {
      idea: 'Idée',
      draft: 'Brouillon',
      pending_approval: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté',
      scheduled: 'Planifié',
      posted: 'Publié',
      failed: 'Échoué',
    };

    const providerLabels: Record<string, string> = {
      openrouter: 'OpenRouter',
      groq: 'Groq',
      glm: 'GLM-5',
    };

    const rows = posts.map((post) => [
      `"${(post.subject || '').replace(/"/g, '""')}"`,
      statusLabels[post.status] || post.status,
      `"${post.author?.name || ''}"`,
      providerLabels[post.aiProvider] || post.aiProvider,
      post.contentScore ?? '',
      post.createdAt ? new Date(post.createdAt).toLocaleDateString('fr-FR') : '',
      post.scheduledDate ? new Date(post.scheduledDate).toLocaleDateString('fr-FR') : '',
      post.imageUrl || '',
      `"${(post.hashtags || '').replace(/"/g, '""')}"`,
    ]);

    // BOM for UTF-8 encoding in Excel
    const bom = '\uFEFF';
    const csv = bom + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="posts_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export CSV error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
