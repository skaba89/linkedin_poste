import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { ExpertEngagementAgent } from '@/lib/agents/expert-engagement';

// GET /api/expert-engagement/config — Récupérer la configuration de l'agent
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const config = await ExpertEngagementAgent.getConfig(authUser.id);
    return NextResponse.json(config);
  } catch (error) {
    console.error('[ExpertEngagement] Config fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/expert-engagement/config — Sauvegarder la configuration de l'agent
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const config = await ExpertEngagementAgent.saveConfig(authUser.id, body);
    return NextResponse.json(config);
  } catch (error) {
    console.error('[ExpertEngagement] Config save error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
