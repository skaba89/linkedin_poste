import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `nurture:stats:${authUser.id}`);
    if (rlResult) return rlResult;

    // Get all sequences for this user
    const sequences = await db.nurtureSequence.findMany({
      where: { userId: authUser.id },
      include: {
        prospectSequences: {
          include: {
            steps: true,
          },
        },
      },
    });

    // Global stats
    const totalSequences = sequences.length;
    const activeSequences = sequences.filter((s) => s.isActive).length;
    const totalProspectEnrollments = sequences.reduce((acc, s) => acc + s.prospectSequences.length, 0);
    const activeEnrollments = sequences.reduce(
      (acc, s) => acc + s.prospectSequences.filter((ps) => ps.status === 'active').length,
      0
    );
    const completedEnrollments = sequences.reduce(
      (acc, s) => acc + s.prospectSequences.filter((ps) => ps.status === 'completed').length,
      0
    );
    const repliedEnrollments = sequences.reduce(
      (acc, s) => acc + s.prospectSequences.filter((ps) => ps.status === 'replied').length,
      0
    );

    // All step logs for stats
    const allStepLogs = sequences.flatMap((s) =>
      s.prospectSequences.flatMap((ps) => ps.steps)
    );

    const sentMessages = allStepLogs.filter(
      (l) => l.status === 'sent' || l.status === 'delivered'
    ).length;
    const repliedMessages = allStepLogs.filter((l) => l.status === 'replied').length;
    const failedMessages = allStepLogs.filter((l) => l.status === 'failed').length;
    const openedMessages = allStepLogs.filter((l) => l.status === 'opened').length;

    const responseRate = sentMessages > 0 ? Math.round((repliedMessages / sentMessages) * 100) : 0;

    // Channel effectiveness
    const channelStats: Record<string, { sent: number; replied: number }> = {};
    for (const log of allStepLogs) {
      if (!channelStats[log.channel]) {
        channelStats[log.channel] = { sent: 0, replied: 0 };
      }
      if (log.status === 'sent' || log.status === 'delivered') {
        channelStats[log.channel].sent++;
      }
      if (log.status === 'replied') {
        channelStats[log.channel].replied++;
      }
    }

    const channelEffectiveness = Object.entries(channelStats).map(([channel, stats]) => ({
      channel,
      sent: stats.sent,
      replied: stats.replied,
      responseRate: stats.sent > 0 ? Math.round((stats.replied / stats.sent) * 100) : 0,
    }));

    // Best performing sequences
    const sequencePerformance = sequences
      .map((seq) => {
        const logs = seq.prospectSequences.flatMap((ps) => ps.steps);
        const sent = logs.filter((l) => l.status === 'sent' || l.status === 'delivered').length;
        const replied = logs.filter((l) => l.status === 'replied').length;
        const completed = seq.prospectSequences.filter((ps) => ps.status === 'completed').length;

        return {
          id: seq.id,
          name: seq.name,
          channel: seq.channel,
          totalProspects: seq.prospectSequences.length,
          activeProspects: seq.prospectSequences.filter((ps) => ps.status === 'active').length,
          completedProspects: completed,
          sent,
          replied,
          responseRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
        };
      })
      .sort((a, b) => b.responseRate - a.responseRate);

    // Average response time (from step log sentAt to repliedAt)
    const replyLogs = allStepLogs.filter(
      (l) => l.status === 'replied' && l.sentAt && l.repliedAt
    );
    let avgResponseTimeHours = 0;
    if (replyLogs.length > 0) {
      const totalMs = replyLogs.reduce((acc, l) => {
        return acc + (new Date(l.repliedAt!).getTime() - new Date(l.sentAt!).getTime());
      }, 0);
      avgResponseTimeHours = Math.round(totalMs / replyLogs.length / (1000 * 60 * 60) * 10) / 10;
    }

    // Funnel data: sent -> delivered -> opened -> replied -> converted
    const funnel = [
      { stage: 'Envoyés', count: sentMessages, color: 'bg-blue-500' },
      { stage: 'Ouverts', count: openedMessages, color: 'bg-violet-500' },
      { stage: 'Réponses', count: repliedMessages, color: 'bg-amber-500' },
      { stage: 'Convertis', count: completedEnrollments, color: 'bg-emerald-500' },
    ];

    return NextResponse.json({
      global: {
        totalSequences,
        activeSequences,
        totalProspectEnrollments,
        activeEnrollments,
        completedEnrollments,
        repliedEnrollments,
        sentMessages,
        repliedMessages,
        failedMessages,
        responseRate,
        avgResponseTimeHours,
      },
      channelEffectiveness,
      bestSequences: sequencePerformance,
      funnel,
    });
  } catch (error) {
    console.error('Nurture stats GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
