import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { MissionScoutAgent } from '@/lib/agents/mission-scout';
import { db } from '@/lib/db';

// POST /api/mission-scout/follow-ups — Process pending follow-ups
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const result = await MissionScoutAgent.processFollowUps(authUser.id);

    return NextResponse.json({
      processed: result.processed,
      expired: result.expired,
      details: result.details,
    });
  } catch (error) {
    console.error('[MissionScout] Follow-ups process error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// GET /api/mission-scout/follow-ups — List pending follow-ups with counts
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const now = new Date();

    const [pendingCount, overdueCount, upcomingCount, pendingApps] = await Promise.all([
      // Applications needing follow-up now
      db.application.count({
        where: {
          userId: authUser.id,
          status: 'sent',
          nextFollowUpAt: { lte: now },
          followUpStage: { lt: 3 },
        },
      }),
      // Overdue (more than 2 days past follow-up date)
      db.application.count({
        where: {
          userId: authUser.id,
          status: 'sent',
          nextFollowUpAt: { lte: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
          followUpStage: { lt: 3 },
        },
      }),
      // Upcoming in next 24h
      db.application.count({
        where: {
          userId: authUser.id,
          status: 'sent',
          nextFollowUpAt: { gt: now, lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
        },
      }),
      // Full list of pending follow-ups with opportunity details
      db.application.findMany({
        where: {
          userId: authUser.id,
          status: 'sent',
          nextFollowUpAt: { lte: now },
        },
        include: {
          opportunity: true,
        },
        orderBy: { nextFollowUpAt: 'asc' },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      counts: {
        pending: pendingCount,
        overdue: overdueCount,
        upcoming: upcomingCount,
      },
      followUps: pendingApps.map((app) => ({
        id: app.id,
        opportunityId: app.opportunity.id,
        opportunityTitle: app.opportunity.title,
        company: app.opportunity.company,
        followUpStage: app.followUpStage,
        nextFollowUpAt: app.nextFollowUpAt?.toISOString(),
        lastFollowUpAt: app.lastFollowUpAt?.toISOString(),
        messagePreview: app.message?.substring(0, 100),
      })),
    });
  } catch (error) {
    console.error('[MissionScout] Follow-ups fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
