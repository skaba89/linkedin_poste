import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { MissionScoutAgent } from '@/lib/agents/mission-scout';

// POST /api/mission-scout/apply — Generate AI application message and send
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { opportunityId, message } = body;

    if (!opportunityId) {
      return NextResponse.json({ error: 'L\'identifiant de l\'opportunité est requis' }, { status: 400 });
    }

    const result = await MissionScoutAgent.applyToOpportunity(
      authUser.id,
      opportunityId,
      message
    );

    return NextResponse.json({
      application: result.application,
      message: result.message,
    });
  } catch (error) {
    console.error('[MissionScout] Apply error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
