import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { ClientNurtureAgent } from '@/lib/agents/client-nurture';

// GET /api/client-nurture/config — Récupérer la configuration de l'agent
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const config = await ClientNurtureAgent.getConfig(authUser.id);
    return NextResponse.json(config);
  } catch (error) {
    console.error('[ClientNurture] Config fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/client-nurture/config — Sauvegarder la configuration de l'agent
export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const config = await ClientNurtureAgent.saveConfig(authUser.id, body);
    return NextResponse.json(config);
  } catch (error) {
    console.error('[ClientNurture] Config save error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
