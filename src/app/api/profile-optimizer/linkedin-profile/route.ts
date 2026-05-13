import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

// ============================================================
// GET /api/profile-optimizer/linkedin-profile
// Returns the LinkedIn connection status and profile data for the current user.
// Used by the frontend to show the connection status banner.
// ============================================================

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const linkedinAccount = await db.linkedInAccount.findFirst({
      where: { userId: authUser.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!linkedinAccount) {
      return NextResponse.json({
        connected: false,
        account: null,
      });
    }

    // Check if token is expired
    const isExpired = linkedinAccount.tokenExpiresAt
      ? linkedinAccount.tokenExpiresAt < new Date()
      : false;

    return NextResponse.json({
      connected: !isExpired,
      account: {
        id: linkedinAccount.id,
        personName: linkedinAccount.personName || authUser.name,
        personEmail: linkedinAccount.personEmail || null,
        personPicture: linkedinAccount.personPicture || null,
        organizationName: linkedinAccount.organizationName || null,
        isActive: linkedinAccount.isActive,
        tokenExpiresAt: linkedinAccount.tokenExpiresAt || null,
        isExpired,
      },
    });
  } catch (error) {
    console.error('[ProfileOptimizer] LinkedIn profile status error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
