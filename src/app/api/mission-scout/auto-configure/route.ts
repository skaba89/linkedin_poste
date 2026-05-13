import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { MissionScoutAgent } from '@/lib/agents/mission-scout';

// POST /api/mission-scout/auto-configure — Auto-configure from LinkedIn profile analysis
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const config = await MissionScoutAgent.autoConfigureFromProfile(authUser.id);
    return NextResponse.json({
      success: true,
      config,
      message: 'Configuration auto-mise-à-jour à partir de votre profil LinkedIn',
    });
  } catch (error) {
    console.error('[AutoConfigure] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
