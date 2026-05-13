import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';

const VALID_CHANNELS = ['linkedin', 'email', 'whatsapp', 'mixed'];

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `nurture:list:${authUser.id}`);
    if (rlResult) return rlResult;

    const sequences = await db.nurtureSequence.findMany({
      where: { userId: authUser.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            prospectSequences: {
              where: { status: 'active' },
            },
          },
        },
      },
    });

    // Parse steps and enrich with computed data
    const enriched = sequences.map((seq) => {
      let steps: any[] = [];
      try {
        steps = JSON.parse(seq.steps);
      } catch { /* ignore */ }

      return {
        ...seq,
        steps,
        stepsCount: steps.length,
        activeProspects: seq._count.prospectSequences,
      };
    });

    return NextResponse.json({ sequences: enriched });
  } catch (error) {
    console.error('Nurture sequences GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `nurture:create:${authUser.id}`);
    if (rlResult) return rlResult;

    const body = await request.json();
    const { name, description, channel, steps } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    if (channel && !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json({ error: 'Canal invalide' }, { status: 400 });
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: 'Au moins une étape est requise' }, { status: 400 });
    }

    // Validate steps
    for (const step of steps) {
      if (!step.delay || !step.template) {
        return NextResponse.json({ error: 'Chaque étape doit avoir un délai et un modèle' }, { status: 400 });
      }
    }

    const sequence = await db.nurtureSequence.create({
      data: {
        userId: authUser.id,
        name: name.trim(),
        description: description?.trim() || null,
        channel: channel || 'linkedin',
        steps: JSON.stringify(steps),
        isActive: true,
      },
    });

    return NextResponse.json({ sequence: { ...sequence, steps } }, { status: 201 });
  } catch (error) {
    console.error('Nurture sequences POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
