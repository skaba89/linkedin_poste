import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';

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
    const rlResult = await rateLimitMiddleware(apiLimiter, request, `nurture:get:${authUser.id}`);
    if (rlResult) return rlResult;

    const sequence = await db.nurtureSequence.findFirst({
      where: { id, userId: authUser.id },
      include: {
        prospectSequences: {
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
            steps: {
              orderBy: { stepIndex: 'asc' },
            },
          },
          orderBy: { startedAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Séquence non trouvée' }, { status: 404 });
    }

    let steps: any[] = [];
    try {
      steps = JSON.parse(sequence.steps);
    } catch { /* ignore */ }

    const totalProspects = sequence.prospectSequences.length;
    const activeProspects = sequence.prospectSequences.filter((ps) => ps.status === 'active').length;
    const repliedProspects = sequence.prospectSequences.filter((ps) => ps.status === 'replied').length;
    const completedProspects = sequence.prospectSequences.filter((ps) => ps.status === 'completed').length;

    // Count step log statuses
    const allStepLogs = sequence.prospectSequences.flatMap((ps) => ps.steps);
    const sentCount = allStepLogs.filter((s) => s.status === 'sent' || s.status === 'delivered').length;
    const repliedCount = allStepLogs.filter((s) => s.status === 'replied').length;

    return NextResponse.json({
      sequence: {
        ...sequence,
        steps,
        stats: {
          totalProspects,
          activeProspects,
          repliedProspects,
          completedProspects,
          sentCount,
          repliedCount,
          responseRate: sentCount > 0 ? Math.round((repliedCount / sentCount) * 100) : 0,
        },
      },
    });
  } catch (error) {
    console.error('Nurture sequence GET error:', error);
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
    const rlResult = await rateLimitMiddleware(apiLimiter, request, `nurture:update:${authUser.id}`);
    if (rlResult) return rlResult;

    const sequence = await db.nurtureSequence.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Séquence non trouvée' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, channel, steps, isActive } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (channel !== undefined) updateData.channel = channel;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (steps !== undefined) {
      if (!Array.isArray(steps) || steps.length === 0) {
        return NextResponse.json({ error: 'Au moins une étape est requise' }, { status: 400 });
      }
      updateData.steps = JSON.stringify(steps);
    }

    const updated = await db.nurtureSequence.update({
      where: { id },
      data: updateData,
    });

    let parsedSteps: any[] = [];
    try {
      parsedSteps = JSON.parse(updated.steps);
    } catch { /* ignore */ }

    return NextResponse.json({ sequence: { ...updated, steps: parsedSteps } });
  } catch (error) {
    console.error('Nurture sequence PATCH error:', error);
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
    const rlResult = await rateLimitMiddleware(apiLimiter, request, `nurture:delete:${authUser.id}`);
    if (rlResult) return rlResult;

    const sequence = await db.nurtureSequence.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Séquence non trouvée' }, { status: 404 });
    }

    await db.nurtureSequence.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Nurture sequence DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
