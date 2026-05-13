import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const [totalTargets, connectionSent, connected, replied, converted, ignored] = await Promise.all([
      db.connectionTarget.count({ where: { userId: authUser.id } }),
      db.connectionTarget.count({ where: { userId: authUser.id, status: 'connection_sent' } }),
      db.connectionTarget.count({ where: { userId: authUser.id, status: 'connected' } }),
      db.connectionTarget.count({ where: { userId: authUser.id, status: 'replied' } }),
      db.connectionTarget.count({ where: { userId: authUser.id, status: 'converted' } }),
      db.connectionTarget.count({ where: { userId: authUser.id, status: 'ignored' } }),
    ]);

    // By sector
    const targets = await db.connectionTarget.findMany({
      where: { userId: authUser.id, targetSector: { not: null } },
      select: { targetSector: true },
    });
    const sectorCounts: Record<string, number> = {};
    for (const t of targets) {
      if (t.targetSector) {
        sectorCounts[t.targetSector] = (sectorCounts[t.targetSector] || 0) + 1;
      }
    }
    const bySector = Object.entries(sectorCounts)
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count);

    // Weekly goal
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyConnections = await db.connectionTarget.count({
      where: {
        userId: authUser.id,
        connectionDate: { gte: weekStart },
      },
    });

    const acceptanceRate = connectionSent > 0
      ? Math.round(((connected + replied) / connectionSent) * 100)
      : 0;
    const responseRate = connectionSent > 0
      ? Math.round((replied / connectionSent) * 100)
      : 0;

    return NextResponse.json({
      totalTargets,
      connectionSent,
      connected,
      replied,
      converted,
      ignored,
      acceptanceRate,
      responseRate,
      bySector,
      weeklyGoal: {
        target: 15,
        current: weeklyConnections,
      },
    });
  } catch (error) {
    console.error('Networking Stats error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
