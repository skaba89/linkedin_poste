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

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `nurture:prospect-sequences:list:${authUser.id}`);
    if (rlResult) return rlResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sequenceId = searchParams.get('sequenceId');
    const prospectId = searchParams.get('prospectId');

    const where: any = {};
    if (status) where.status = status;
    if (prospectId) where.prospectId = prospectId;

    const validStatuses = ['active', 'paused', 'completed', 'stopped', 'replied'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    const prospectSequences = await db.prospectSequence.findMany({
      where: {
        ...where,
        sequence: { userId: authUser.id },
        ...(sequenceId ? { sequenceId } : {}),
      },
      include: {
        prospect: {
          select: {
            id: true,
            fullName: true,
            company: true,
            title: true,
            status: true,
            score: true,
          },
        },
        sequence: {
          select: {
            id: true,
            name: true,
            channel: true,
            steps: true,
          },
        },
        steps: {
          orderBy: { stepIndex: 'desc' },
          take: 1,
        },
        _count: {
          select: { steps: true },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    // Enrich with parsed steps
    const enriched = prospectSequences.map((ps) => {
      let steps: any[] = [];
      try {
        steps = JSON.parse(ps.sequence.steps);
      } catch { /* ignore */ }

      const lastStep = ps.steps[0];
      return {
        id: ps.id,
        prospectId: ps.prospectId,
        sequenceId: ps.sequenceId,
        currentStep: ps.currentStep,
        status: ps.status,
        startedAt: ps.startedAt,
        completedAt: ps.completedAt,
        pausedAt: ps.pausedAt,
        prospect: ps.prospect,
        sequence: {
          id: ps.sequence.id,
          name: ps.sequence.name,
          channel: ps.sequence.channel,
        },
        totalSteps: steps.length,
        progress: steps.length > 0 ? Math.round((ps.currentStep / steps.length) * 100) : 0,
        lastAction: lastStep
          ? { status: lastStep.status, sentAt: lastStep.sentAt }
          : null,
        totalStepLogs: ps._count.steps,
      };
    });

    return NextResponse.json({ prospectSequences: enriched });
  } catch (error) {
    console.error('Nurture prospect-sequences list GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
