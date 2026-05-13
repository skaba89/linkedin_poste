import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { ProfileOptimizerAgent } from '@/lib/agents/profile-optimizer';

// GET /api/profile-optimizer/config — Récupérer la configuration de l'agent
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const config = await ProfileOptimizerAgent.getConfig(authUser.id);
    return NextResponse.json(config);
  } catch (error) {
    console.error('[ProfileOptimizer] Config fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/profile-optimizer/config — Sauvegarder la configuration de l'agent
export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const config = await ProfileOptimizerAgent.saveConfig(authUser.id, body);
    return NextResponse.json(config);
  } catch (error) {
    console.error('[ProfileOptimizer] Config save error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
