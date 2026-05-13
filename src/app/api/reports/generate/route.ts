import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `reports:generate:${authUser.id}`);
    if (rlResult) return rlResult;

    const body = await request.json();
    const period: string = body.period || 'weekly';
    const format: string = body.format || 'json';

    if (!['weekly', 'monthly'].includes(period)) {
      return NextResponse.json({ error: 'Période invalide. Utilisez "weekly" ou "monthly".' }, { status: 400 });
    }
    if (!['json', 'pdf'].includes(format)) {
      return NextResponse.json({ error: 'Format invalide. Utilisez "json" ou "pdf".' }, { status: 400 });
    }

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    if (period === 'weekly') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    // Fetch all data in parallel
    const [
      postsData,
      totalEngagement,
      bestPostData,
      topProspects,
      agentActivitiesData,
      missionScoutData,
      competitorData,
      publishStats,
    ] = await Promise.all([
      // Post count and stats
      db.post.count({
        where: {
          authorId: authUser.id,
          createdAt: { gte: startDate },
        },
      }),
      // Total engagement (sum of metrics)
      db.postMetric.aggregate({
        _sum: {
          impressions: true,
          likes: true,
          comments: true,
          reposts: true,
          clicks: true,
        },
        where: {
          post: { authorId: authUser.id },
          collectedAt: { gte: startDate },
        },
      }),
      // Best post by engagement rate
      db.postMetric.findFirst({
        where: {
          post: { authorId: authUser.id },
          collectedAt: { gte: startDate },
          engagementRate: { gt: 0 },
        },
        orderBy: { engagementRate: 'desc' },
        include: {
          post: {
            select: {
              id: true,
              subject: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      // Top prospects by score
      db.prospect.findMany({
        where: {
          userId: authUser.id,
          isActive: true,
          updatedAt: { gte: startDate },
        },
        orderBy: { score: 'desc' },
        take: 5,
        select: {
          id: true,
          fullName: true,
          company: true,
          status: true,
          score: true,
          lastContactedAt: true,
        },
      }),
      // Agent activities summary
      db.agentActivity.groupBy({
        by: ['agentType', 'status'],
        where: {
          userId: authUser.id,
          createdAt: { gte: startDate },
        },
        _count: true,
      }),
      // Mission Scout stats
      Promise.all([
        db.opportunity.count({
          where: {
            userId: authUser.id,
            createdAt: { gte: startDate },
          },
        }),
        db.application.count({
          where: {
            userId: authUser.id,
            createdAt: { gte: startDate },
          },
        }),
        db.application.count({
          where: {
            userId: authUser.id,
            status: 'replied',
            createdAt: { gte: startDate },
          },
        }),
      ]),
      // Competitor tracking
      Promise.all([
        db.competitor.count({
          where: {
            userId: authUser.id,
            isActive: true,
          },
        }),
        db.competitorPost.count({
          where: {
            competitor: { userId: authUser.id },
            createdAt: { gte: startDate },
          },
        }),
      ]),
      // Publish stats (posted vs failed)
      Promise.all([
        db.post.count({
          where: {
            authorId: authUser.id,
            status: 'posted',
            createdAt: { gte: startDate },
          },
        }),
        db.post.count({
          where: {
            authorId: authUser.id,
            status: 'failed',
            createdAt: { gte: startDate },
          },
        }),
        db.post.count({
          where: {
            authorId: authUser.id,
            status: { in: ['draft', 'idea'] },
            createdAt: { gte: startDate },
          },
        }),
      ]),
    ]);

    const [opportunitiesFound, applicationsSent, applicationsReplied] = missionScoutData;
    const [competitorsTracked, competitorPostsTracked] = competitorData;
    const [postsPublished, postsFailed, postsDraft] = publishStats;

    // Build report
    const report = {
      period,
      periodLabel: period === 'weekly' ? 'Rapport Hebdomadaire' : 'Rapport Mensuel',
      generatedAt: new Date().toISOString(),
      dateRange: {
        from: startDate.toISOString(),
        to: now.toISOString(),
        fromLabel: startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        toLabel: now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      },
      user: {
        name: authUser.name,
        email: authUser.email,
      },
      summary: {
        postsCreated: postsData,
        postsPublished,
        postsDraft,
        postsFailed,
        publishSuccessRate: postsPublished + postsFailed > 0
          ? Math.round((postsPublished / (postsPublished + postsFailed)) * 100)
          : 0,
      },
      engagement: {
        totalImpressions: totalEngagement._sum.impressions || 0,
        totalLikes: totalEngagement._sum.likes || 0,
        totalComments: totalEngagement._sum.comments || 0,
        totalReposts: totalEngagement._sum.reposts || 0,
        totalClicks: totalEngagement._sum.clicks || 0,
      },
      bestPost: bestPostData
        ? {
            postId: bestPostData.post.id,
            subject: bestPostData.post.subject,
            engagementRate: bestPostData.engagementRate,
            impressions: bestPostData.impressions,
            likes: bestPostData.likes,
            comments: bestPostData.comments,
          }
        : null,
      topProspects: topProspects.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        company: p.company,
        status: p.status,
        score: p.score,
        lastContactedAt: p.lastContactedAt,
      })),
      agentActivities: {
        summary: agentActivitiesData.map((a) => ({
          agentType: a.agentType,
          status: a.status,
          count: a._count,
        })),
        total: agentActivitiesData.reduce((sum, a) => sum + a._count, 0),
      },
      missionScout: {
        opportunitiesFound,
        applicationsSent,
        applicationsReplied,
        replyRate: applicationsSent > 0
          ? Math.round((applicationsReplied / applicationsSent) * 100)
          : 0,
      },
      competitors: {
        tracked: competitorsTracked,
        postsAnalyzed: competitorPostsTracked,
      },
    };

    // Create audit log
    await createAuditLog({
      entityType: 'Report',
      action: 'generate_report',
      userId: authUser.id,
      metadata: { period, format },
    });

    // If PDF format requested, return JSON with note about client-side PDF generation
    if (format === 'pdf') {
      return NextResponse.json({
        ...report,
        pdfNote: 'La génération PDF côté serveur nécessite jsPDF. Utilisez le format "json" et générez le PDF côté client avec les données retournées.',
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
