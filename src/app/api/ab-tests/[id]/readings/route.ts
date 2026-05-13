import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';

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
    const body = await request.json();
    const { readings } = body; // Array of { variant: 'A'|'B', metric: string, value: number }

    if (!readings || !Array.isArray(readings)) {
      return NextResponse.json({ error: 'readings est requis (tableau)' }, { status: 400 });
    }

    const test = await db.aBTest.findUnique({ where: { id } });
    if (!test) {
      return NextResponse.json({ error: 'Test introuvable' }, { status: 404 });
    }

    const created = await db.aBReading.createMany({
      data: readings.map((r: { variant: string; metric: string; value: number }) => ({
        testId: id,
        variant: r.variant,
        metric: r.metric,
        value: Number(r.value) || 0,
      })),
    });

    return NextResponse.json({ created: created.count });
  } catch (error) {
    console.error('ABReadings POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
