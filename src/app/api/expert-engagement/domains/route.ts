import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { DATA_DOMAINS } from '@/lib/agents/expert-engagement';

// GET /api/expert-engagement/domains — Liste des domaines disponibles
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    return NextResponse.json({
      domains: DATA_DOMAINS.map((d) => ({
        id: d.id,
        label: d.label,
        keywords: d.keywords,
        icon: d.icon,
        color: d.color,
        description: d.description,
      })),
    });
  } catch (error) {
    console.error('[ExpertEngagement] Domains fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
