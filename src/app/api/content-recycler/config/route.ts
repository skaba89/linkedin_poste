import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { ContentRecyclerAgent } from '@/lib/agents/content-recycler';

// GET /api/content-recycler/config — Récupérer la configuration de l'agent
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const config = await ContentRecyclerAgent.getConfig(authUser.id);
    return NextResponse.json(config);
  } catch (error) {
    console.error('[ContentRecycler] Config fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/content-recycler/config — Sauvegarder la configuration de l'agent
export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const config = await ContentRecyclerAgent.saveConfig(authUser.id, body);
    return NextResponse.json(config);
  } catch (error) {
    console.error('[ContentRecycler] Config save error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
