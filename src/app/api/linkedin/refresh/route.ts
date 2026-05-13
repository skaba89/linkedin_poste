import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Configuration LinkedIn manquante (LINKEDIN_CLIENT_ID ou LINKEDIN_CLIENT_SECRET)' },
        { status: 500 }
      );
    }

    // Find active LinkedInAccount for this user
    const account = await db.linkedInAccount.findFirst({
      where: {
        userId: authUser.id,
        isActive: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Aucun compte LinkedIn actif trouvé pour votre utilisateur' },
        { status: 404 }
      );
    }

    if (!account.refreshToken) {
      return NextResponse.json(
        { error: 'Aucun refresh token disponible. Veuillez reconnecter votre compte LinkedIn via OAuth.' },
        { status: 400 }
      );
    }

    // Exchange refresh token for new access token
    const tokenResponse = await fetch(
      'https://www.linkedin.com/oauth/v2/accessToken',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: account.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('LinkedIn token refresh failed:', tokenResponse.status, errorBody);

      // If refresh token is also invalid, deactivate the account
      if (tokenResponse.status === 400 || tokenResponse.status === 401) {
        await db.linkedInAccount.update({
          where: { id: account.id },
          data: { isActive: false },
        });

        await createAuditLog({
          entityType: 'LinkedInAccount',
          entityId: account.id,
          action: 'refresh_failed_deactivated',
          userId: authUser.id,
          metadata: { reason: 'refresh_token_invalid' },
        });

        return NextResponse.json(
          {
            error: 'Le refresh token est invalide ou a expiré. Veuillez reconnecter votre compte LinkedIn.',
            needsReauth: true,
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Échec du rafraîchissement du token LinkedIn' },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();
    const newAccessToken = tokenData.access_token;
    const newRefreshToken = tokenData.refresh_token || account.refreshToken;
    const expiresIn = tokenData.expires_in || 60 * 24 * 60 * 60; // default 60 days in seconds
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Update account with new tokens
    const updated = await db.linkedInAccount.update({
      where: { id: account.id },
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenExpiresAt: newExpiresAt,
      },
    });

    await createAuditLog({
      entityType: 'LinkedInAccount',
      entityId: account.id,
      action: 'token_refresh',
      userId: authUser.id,
      metadata: {
        expiresIn,
        newExpiresAt: newExpiresAt.toISOString(),
        hadNewRefreshToken: tokenData.refresh_token !== undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Token LinkedIn rafraîchi avec succès',
      account: {
        id: updated.id,
        organizationId: updated.organizationId,
        organizationName: updated.organizationName,
        tokenExpiresAt: updated.tokenExpiresAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('LinkedIn refresh error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
