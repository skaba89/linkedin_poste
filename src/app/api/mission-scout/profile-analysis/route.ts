import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { MissionScoutAgent } from '@/lib/agents/mission-scout';
import { db } from '@/lib/db';

// GET /api/mission-scout/profile-analysis — Analyze LinkedIn profile with caching
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    if (force) {
      const analysis = await MissionScoutAgent.analyzeLinkedInProfile(authUser.id);
      return NextResponse.json({ analysis });
    }

    // Check cache first from settings (24h TTL)
    const cached = await db.settings.findUnique({
      where: { key: `mission_scout_${authUser.id}_profileAnalysis` },
    });

    if (cached) {
      try {
        const parsed = JSON.parse(cached.value);
        const analyzedAt = new Date(parsed.analyzedAt);
        const hoursDiff = (Date.now() - analyzedAt.getTime()) / (1000 * 60 * 60);
        if (hoursDiff < 24) {
          return NextResponse.json({ analysis: parsed, cached: true });
        }
      } catch {
        // Cache parse error — continue to fresh analysis
      }
    }

    // Run fresh analysis
    const analysis = await MissionScoutAgent.analyzeLinkedInProfile(authUser.id);
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('[ProfileAnalysis] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
