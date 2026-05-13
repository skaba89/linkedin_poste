import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';
import { linkedinHeaders } from '@/lib/linkedin-config';

async function refreshLinkedInToken(account: {
  id: string;
  refreshToken: string | null;
  userId: string;
}) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret || !account.refreshToken) {
    return null;
  }

  try {
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
      console.error('Auto-refresh failed:', tokenResponse.status);
      return null;
    }

    const tokenData = await tokenResponse.json();
    const expiresIn = tokenData.expires_in || 60 * 24 * 60 * 60;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Update account with new tokens
    const updated = await db.linkedInAccount.update({
      where: { id: account.id },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || account.refreshToken,
        tokenExpiresAt: newExpiresAt,
      },
    });

    await createAuditLog({
      entityType: 'LinkedInAccount',
      entityId: account.id,
      action: 'auto_token_refresh',
      userId: account.userId,
      metadata: { expiresIn },
    });

    return updated;
  } catch (error) {
    console.error('Auto-refresh error:', error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const account = await db.linkedInAccount.findFirst({
      where: { isActive: true },
    });

    if (!account) {
      return NextResponse.json({
        connected: false,
        error: 'Aucun compte LinkedIn connecté',
      });
    }

    const now = new Date();
    const isExpired = account.tokenExpiresAt
      ? new Date(account.tokenExpiresAt) < now
      : false;

    // Auto-refresh: if token is expired but refreshToken exists, try to refresh
    if (isExpired && account.refreshToken) {
      const refreshed = await refreshLinkedInToken(account);

      if (refreshed) {
        // Successfully refreshed — verify the new token with LinkedIn
        try {
          const response = await fetch('https://api.linkedin.com/rest/me', {
            headers: linkedinHeaders(refreshed.accessToken),
          });

          if (response.ok) {
            const data = await response.json();
            return NextResponse.json({
              connected: true,
              refreshed: true,
              name: data.localizedFirstName
                ? `${data.localizedFirstName} ${data.localizedLastName || ''}`
                : refreshed.organizationName || 'Compte LinkedIn',
              organizationId: refreshed.organizationId,
              organizationName: refreshed.organizationName,
              tokenExpiresAt: refreshed.tokenExpiresAt,
            });
          }
        } catch {
          // Verification failed even after refresh
        }

        // If verification after refresh fails, report refreshed but possibly invalid
        return NextResponse.json({
          connected: true,
          refreshed: true,
          verified: false,
          organizationId: refreshed.organizationId,
          organizationName: refreshed.organizationName,
          tokenExpiresAt: refreshed.tokenExpiresAt,
        });
      }
    }

    // If expired and no refresh possible
    if (isExpired) {
      return NextResponse.json({
        connected: false,
        error: 'Token LinkedIn expiré',
        expired: true,
        accountId: account.id,
        organizationId: account.organizationId,
        organizationName: account.organizationName,
        hasRefreshToken: !!account.refreshToken,
      });
    }

    // Verify token with LinkedIn API
    try {
      const response = await fetch('https://api.linkedin.com/rest/me', {
        headers: linkedinHeaders(account.accessToken),
      });

      if (!response.ok) {
        // If 401, try auto-refresh as a fallback even if expiry date hasn't passed
        if ((response.status === 401) && account.refreshToken) {
          const refreshed = await refreshLinkedInToken(account);

          if (refreshed) {
            try {
              const retryResponse = await fetch('https://api.linkedin.com/rest/me', {
                headers: linkedinHeaders(refreshed.accessToken),
              });

              if (retryResponse.ok) {
                const data = await retryResponse.json();
                return NextResponse.json({
                  connected: true,
                  refreshed: true,
                  name: data.localizedFirstName
                    ? `${data.localizedFirstName} ${data.localizedLastName || ''}`
                    : refreshed.organizationName || 'Compte LinkedIn',
                  organizationId: refreshed.organizationId,
                  organizationName: refreshed.organizationName,
                  tokenExpiresAt: refreshed.tokenExpiresAt,
                });
              }
            } catch {
              // Retry failed
            }
          }

          return NextResponse.json({
            connected: false,
            error: 'Token LinkedIn invalide ou expiré',
            expired: true,
            accountId: account.id,
            organizationId: account.organizationId,
            organizationName: account.organizationName,
            hasRefreshToken: !!account.refreshToken,
          });
        }

        return NextResponse.json({
          connected: false,
          error: response.status === 401
            ? 'Token LinkedIn invalide ou expiré'
            : `Erreur LinkedIn (${response.status})`,
          expired: response.status === 401,
          accountId: account.id,
          organizationId: account.organizationId,
          organizationName: account.organizationName,
        });
      }

      const data = await response.json();
      return NextResponse.json({
        connected: true,
        name: data.localizedFirstName
          ? `${data.localizedFirstName} ${data.localizedLastName || ''}`
          : account.organizationName || 'Compte LinkedIn',
        organizationId: account.organizationId,
        organizationName: account.organizationName,
      });
    } catch (fetchError) {
      // If we can't reach LinkedIn, assume token is still valid
      return NextResponse.json({
        connected: true,
        verified: false,
        organizationId: account.organizationId,
        organizationName: account.organizationName,
      });
    }
  } catch (error) {
    console.error('LinkedIn check error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
