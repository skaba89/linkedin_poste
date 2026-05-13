import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';

const VALID_STATUSES = ['active', 'paused', 'completed', 'stopped', 'replied'];

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

    const where: any = {};
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
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
            avatarUrl: true,
          },
        },
        sequence: {
          select: {
            id: true,
            name: true,
            channel: true,
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

    // Parse sequence steps for total step count
    const enriched = await Promise.all(
      prospectSequences.map(async (ps) => {
        let steps: any[] = [];
        try {
          const seq = await db.nurtureSequence.findUnique({
            where: { id: ps.sequenceId },
            select: { steps: true },
          });
          if (seq) steps = JSON.parse(seq.steps);
        } catch { /* ignore */ }

        const lastStep = ps.steps[0];
        return {
          ...ps,
          totalSteps: steps.length,
          progress: steps.length > 0 ? Math.round((ps.currentStep / steps.length) * 100) : 0,
          lastAction: lastStep
            ? { status: lastStep.status, sentAt: lastStep.sentAt, content: lastStep.content }
            : null,
        };
      })
    );

    return NextResponse.json({ prospectSequences: enriched });
  } catch (error) {
    console.error('Nurture prospect-sequences GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const rlResult = await rateLimitMiddleware(apiLimiter, request, `nurture:prospect-sequence:update:${authUser.id}`);
    if (rlResult) return rlResult;

    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    // Verify ownership through sequence
    const prospectSequence = await db.prospectSequence.findFirst({
      where: { id },
      include: { sequence: true },
    });

    if (!prospectSequence || prospectSequence.sequence.userId !== authUser.id) {
      return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });
    }

    const updateData: any = { status };
    if (status === 'paused') updateData.pausedAt = new Date();
    if (status === 'completed' || status === 'stopped') updateData.completedAt = new Date();

    const updated = await db.prospectSequence.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ prospectSequence: updated });
  } catch (error) {
    console.error('Nurture prospect-sequence PATCH error:', error);
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
    const rlResult = await rateLimitMiddleware(apiLimiter, request, `nurture:prospect-sequence:delete:${authUser.id}`);
    if (rlResult) return rlResult;

    // Verify ownership through sequence
    const prospectSequence = await db.prospectSequence.findFirst({
      where: { id },
      include: { sequence: true },
    });

    if (!prospectSequence || prospectSequence.sequence.userId !== authUser.id) {
      return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });
    }

    await db.prospectSequence.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Nurture prospect-sequence DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
