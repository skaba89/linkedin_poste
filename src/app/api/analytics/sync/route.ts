import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { syncAllPostMetrics } from '@/lib/linkedin-analytics';

/**
 * POST /api/analytics/sync
 * 
 * Déclenche une synchronisation des métriques LinkedIn pour tous les posts
 * publiés de l'utilisateur authentifié.
 * 
 * Retourne un résumé des posts synchronisés et des erreurs éventuelles.
 */
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const result = await syncAllPostMetrics(authUser.id);

    return NextResponse.json({
      success: true,
      message: `Synchronisation terminée: ${result.synced} posts mis à jour, ${result.errors} erreurs`,
      ...result,
    });
  } catch (error) {
    console.error('[Analytics Sync] Erreur lors de la synchronisation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation des métriques' },
      { status: 500 }
    );
  }
}
