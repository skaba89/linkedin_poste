import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const calibrationsCount = await db.scoringCalibration.count();
    const allCalibrations = await db.scoringCalibration.findMany({ orderBy: { calibratedAt: 'desc' } });

    const avgDelta = calibrationsCount > 0
      ? Math.round(allCalibrations.reduce((sum, c) => sum + c.delta, 0) / calibrationsCount * 100) / 100
      : 0;

    const lastCalibration = allCalibrations.length > 0 ? allCalibrations[0].calibratedAt.toISOString() : null;
    const confidence = calibrationsCount > 20 ? 'high' as const : calibrationsCount > 10 ? 'medium' as const : 'low' as const;

    const defaultWeights = [
      { name: 'length', weight: 0.24, avgDelta: 0 },
      { name: 'hook', weight: 0.18, avgDelta: 0 },
      { name: 'cta', weight: 0.18, avgDelta: 0 },
      { name: 'hashtags', weight: 0.12, avgDelta: 0 },
      { name: 'readability', weight: 0.18, avgDelta: 0 },
      { name: 'emoji', weight: 0.12, avgDelta: 0 },
    ];

    return NextResponse.json({
      calibrationsCount,
      avgDelta,
      factorWeights: defaultWeights,
      confidence,
      lastCalibration,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
