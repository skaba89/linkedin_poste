import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `nurture:assign:${authUser.id}`);
    if (rlResult) return rlResult;

    const body = await request.json();
    const { sequenceId, prospectIds } = body;

    if (!sequenceId || !prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json({ error: 'sequenceId et prospectIds requis' }, { status: 400 });
    }

    // Verify sequence ownership
    const sequence = await db.nurtureSequence.findFirst({
      where: { id: sequenceId, userId: authUser.id },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Séquence non trouvée' }, { status: 404 });
    }

    if (!sequence.isActive) {
      return NextResponse.json({ error: 'Cette séquence est désactivée' }, { status: 400 });
    }

    // Verify all prospects belong to user
    const prospects = await db.prospect.findMany({
      where: {
        id: { in: prospectIds },
        userId: authUser.id,
      },
    });

    if (prospects.length !== prospectIds.length) {
      return NextResponse.json({ error: 'Certains prospects n\'ont pas été trouvés' }, { status: 400 });
    }

    let assigned = 0;
    let skipped = 0;

    for (const prospectId of prospectIds) {
      // Check if already assigned
      const existing = await db.prospectSequence.findUnique({
        where: {
          prospectId_sequenceId: { prospectId, sequenceId },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await db.prospectSequence.create({
        data: {
          prospectId,
          sequenceId,
          status: 'active',
          currentStep: 0,
        },
      });

      assigned++;
    }

    return NextResponse.json({
      assigned,
      skipped,
      message: `${assigned} prospect${assigned > 1 ? 's' : ''} assigné${assigned > 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} ignoré${skipped > 1 ? 's' : ''} (déjà en séquence)` : ''}`,
    });
  } catch (error) {
    console.error('Nurture assign POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
