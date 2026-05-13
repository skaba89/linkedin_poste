import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const { id } = await params;

    const test = await db.aBTest.findUnique({
      where: { id },
      include: { readings: true },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test introuvable' }, { status: 404 });
    }

    if (test.readings.length === 0) {
      return NextResponse.json({ error: 'Aucune donnée de lecture disponible' }, { status: 400 });
    }

    // Aggregate readings by variant based on criteria
    const criteriaMetrics: Record<string, string[]> = {
      engagement: ['likes', 'comments', 'reposts', 'clicks'],
      impressions: ['impressions'],
      clicks: ['clicks'],
    };

    const metricsToCheck = criteriaMetrics[test.criteria] || criteriaMetrics.engagement;

    const sumByVariant: Record<string, number> = { A: 0, B: 0 };
    for (const reading of test.readings) {
      if (metricsToCheck.includes(reading.metric)) {
        sumByVariant[reading.variant] = (sumByVariant[reading.variant] || 0) + reading.value;
      }
    }

    const winnerId = sumByVariant.A >= sumByVariant.B ? test.postAId : test.postBId;
    const winnerVariant = sumByVariant.A >= sumByVariant.B ? 'A' : 'B';

    const updated = await db.aBTest.update({
      where: { id },
      data: {
        status: 'completed',
        winnerId,
        endDate: new Date(),
      },
      include: {
        postA: { select: { id: true, subject: true } },
        postB: { select: { id: true, subject: true } },
        author: { select: { id: true, name: true } },
        readings: true,
      },
    });

    await createAuditLog({
      entityType: 'ABTest',
      entityId: id,
      action: 'declare_winner',
      userId: authUser.id,
      metadata: { winnerVariant, winnerId, criteria: test.criteria },
    });

    return NextResponse.json({
      test: updated,
      winner: winnerVariant,
      scores: sumByVariant,
    });
  } catch (error) {
    console.error('ABTest declare-winner error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
