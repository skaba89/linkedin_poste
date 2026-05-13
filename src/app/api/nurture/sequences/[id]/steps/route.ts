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
    const rlResult = await rateLimitMiddleware(apiLimiter, request, `nurture:steps:${authUser.id}`);
    if (rlResult) return rlResult;

    const sequence = await db.nurtureSequence.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Séquence non trouvée' }, { status: 404 });
    }

    let steps: any[] = [];
    try {
      steps = JSON.parse(sequence.steps);
    } catch { /* ignore */ }

    // Get step performance data
    const prospectSequences = await db.prospectSequence.findMany({
      where: { sequenceId: id },
      include: {
        steps: true,
      },
    });

    const stepStats = steps.map((step, index) => {
      const logsForStep = prospectSequences
        .flatMap((ps) => ps.steps)
        .filter((s) => s.stepIndex === index);

      const sent = logsForStep.filter((s) => s.status === 'sent' || s.status === 'delivered').length;
      const replied = logsForStep.filter((s) => s.status === 'replied').length;
      const failed = logsForStep.filter((s) => s.status === 'failed').length;

      return {
        index,
        delay: step.delay,
        channel: step.channel,
        type: step.type,
        template: step.template,
        aiGenerated: step.aiGenerated,
        stats: { sent, replied, failed, total: logsForStep.length },
      };
    });

    return NextResponse.json({ steps: stepStats });
  } catch (error) {
    console.error('Nurture steps GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const rlResult = await rateLimitMiddleware(apiLimiter, request, `nurture:steps-update:${authUser.id}`);
    if (rlResult) return rlResult;

    const sequence = await db.nurtureSequence.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Séquence non trouvée' }, { status: 404 });
    }

    const body = await request.json();
    const { steps } = body;

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: 'Au moins une étape est requise' }, { status: 400 });
    }

    // Validate steps
    for (const step of steps) {
      if (!step.delay || !step.template) {
        return NextResponse.json({ error: 'Chaque étape doit avoir un délai et un modèle' }, { status: 400 });
      }
    }

    const updated = await db.nurtureSequence.update({
      where: { id },
      data: { steps: JSON.stringify(steps) },
    });

    return NextResponse.json({ success: true, steps });
  } catch (error) {
    console.error('Nurture steps POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
