import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { MissionScoutAgent } from '@/lib/agents/mission-scout';
import type { MissionScoutConfig } from '@/lib/agents/mission-scout';

// GET /api/mission-scout/config — Get Mission Scout configuration
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const config = await MissionScoutAgent.getConfig(authUser.id);
    return NextResponse.json({ config });
  } catch (error) {
    console.error('[MissionScout] Config fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/mission-scout/config — Update Mission Scout configuration
export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json() as Partial<MissionScoutConfig>;

    // Validate arrays
    if (body.targetSectors !== undefined && !Array.isArray(body.targetSectors)) {
      return NextResponse.json({ error: 'targetSectors doit être un tableau' }, { status: 400 });
    }
    if (body.targetLocations !== undefined && !Array.isArray(body.targetLocations)) {
      return NextResponse.json({ error: 'targetLocations doit être un tableau' }, { status: 400 });
    }
    if (body.skills !== undefined && !Array.isArray(body.skills)) {
      return NextResponse.json({ error: 'skills doit être un tableau' }, { status: 400 });
    }
    if (body.maxApplicationsPerWeek !== undefined) {
      const max = parseInt(String(body.maxApplicationsPerWeek), 10);
      if (isNaN(max) || max < 1 || max > 100) {
        return NextResponse.json({ error: 'maxApplicationsPerWeek doit être entre 1 et 100' }, { status: 400 });
      }
    }

    const config = await MissionScoutAgent.saveConfig(authUser.id, body);

    return NextResponse.json({ config });
  } catch (error) {
    console.error('[MissionScout] Config save error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
