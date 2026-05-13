import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { linkedinHeaders } from '@/lib/linkedin-config';

interface LinkedInTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface LinkedInUserInfo {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

interface LinkedInOrgAcl {
  role: string;
  organization: string;
  organizationLock?: string;
  state?: string;
}

interface LinkedInOrgResponse {
  elements: LinkedInOrgAcl[];
}

async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<LinkedInTokenResponse> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Configuration LinkedIn manquante');
  }

  const response = await fetch(
    'https://www.linkedin.com/oauth/v2/accessToken',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    console.error('LinkedIn token exchange failed:', errorData);
    throw new Error('Échec de l\'échange du code d\'autorisation');
  }

  return response.json();
}

async function fetchUserProfile(accessToken: string): Promise<LinkedInUserInfo> {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    console.error('LinkedIn user info fetch failed:', response.status);
    return {};
  }

  return response.json();
}

async function fetchOrganizations(
  accessToken: string
): Promise<{ id: string; name: string }[]> {
  try {
    const response = await fetch(
      'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR',
      {
        headers: linkedinHeaders(accessToken),
      }
    );

    if (!response.ok) {
      console.error('LinkedIn orgs fetch failed:', response.status);
      return [];
    }

    const data: LinkedInOrgResponse = await response.json();
    if (!data.elements || data.elements.length === 0) {
      return [];
    }

    // Extract org URNs and fetch org names
    const orgUrns = data.elements
      .map((el) => el.organization)
      .filter(Boolean);

    // Fetch organization details for names
    const organizations: { id: string; name: string }[] = [];

    for (const urn of orgUrns.slice(0, 5)) {
      // Extract numeric ID from URN (urn:li:organization:123456)
      const match = urn.match(/urn:li:organization:(\d+)/);
      if (!match) continue;
      const orgId = match[1];

      try {
        const orgResponse = await fetch(
          `https://api.linkedin.com/rest/organizations/${orgId}`,
          {
            headers: linkedinHeaders(accessToken),
          }
        );

        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          organizations.push({
            id: orgId,
            name: orgData.localizedName || orgData.name || `Organisation ${orgId}`,
          });
        } else {
          organizations.push({
            id: orgId,
            name: `Organisation ${orgId}`,
          });
        }
      } catch {
        organizations.push({
          id: orgId,
          name: `Organisation ${orgId}`,
        });
      }
    }

    return organizations;
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return [];
  }
}

function generateSuccessHTML(
  userName: string,
  email: string,
  orgs: { id: string; name: string }[]
): string {
  const orgList = orgs.length > 0
    ? orgs.map((o) => `<li>${o.name} (${o.id})</li>`).join('')
    : '<li>Aucune organisation trouvée</li>';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkedIn connecté — Innovation DataSphere</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #e2e8f0;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 48px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.3);
    }
    .icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #0a66c2, #004182);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 28px;
      color: white;
    }
    h1 { font-size: 24px; margin-bottom: 8px; color: #f8fafc; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 16px; }
    .user-info {
      background: #0f172a;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      text-align: left;
    }
    .user-info .label { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .user-info .value { color: #e2e8f0; font-size: 14px; margin-top: 4px; }
    .orgs { text-align: left; margin: 16px 0; }
    .orgs ul { list-style: none; padding: 0; }
    .orgs li {
      background: #0f172a;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 6px;
      font-size: 14px;
      color: #cbd5e1;
    }
    .badge {
      display: inline-block;
      background: #065f46;
      color: #6ee7b7;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 13px;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">in</div>
    <h1>LinkedIn connecté avec succès</h1>
    <p>Votre compte LinkedIn a été autorisé avec succès pour l'application Innovation DataSphere.</p>
    <div class="user-info">
      <div class="label">Utilisateur</div>
      <div class="value">${userName} ${email ? `(${email})` : ''}</div>
    </div>
    ${orgs.length > 0 ? `
    <div class="orgs">
      <div class="label" style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Organisations</div>
      <ul>${orgList}</ul>
    </div>` : ''}
    <div class="badge">Connexion réussie</div>
    <p style="margin-top: 24px; font-size: 13px;">Vous pouvez fermer cette fenêtre et retourner à l'application.</p>
  </div>
</body>
</html>`;
}

function generateErrorHTML(errorMessage: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erreur LinkedIn — Innovation DataSphere</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #e2e8f0;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 48px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.3);
    }
    .icon {
      width: 64px; height: 64px;
      background: #dc2626;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
      font-size: 28px; color: white;
    }
    h1 { font-size: 24px; margin-bottom: 8px; color: #f8fafc; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 16px; }
    .error-detail {
      background: #0f172a; border-radius: 8px; padding: 16px;
      margin: 16px 0; text-align: left; color: #fca5a5; font-size: 14px;
      border-left: 3px solid #dc2626;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">!</div>
    <h1>Erreur de connexion LinkedIn</h1>
    <p>Une erreur est survenue lors de la connexion avec LinkedIn.</p>
    <div class="error-detail">${errorMessage}</div>
    <p style="margin-top: 24px; font-size: 13px;">Veuillez réessayer ou contacter le support.</p>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Check for OAuth errors from LinkedIn
    if (error) {
      const html = generateErrorHTML(
        errorDescription || `Erreur LinkedIn : ${error}`
      );
      return new NextResponse(html, {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Validate required params
    if (!code || !state) {
      const html = generateErrorHTML(
        'Paramètres manquants (code ou state). Veuillez réessayer la connexion.'
      );
      return new NextResponse(html, {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // CSRF: verify state matches cookie
    const cookieState = request.cookies.get('linkedin_oauth_state')?.value;
    if (!cookieState || cookieState !== state) {
      const html = generateErrorHTML(
        'Erreur de sécurité : le jeton CSRF ne correspond pas. Veuillez réessayer.'
      );
      return new NextResponse(html, {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Clear the CSRF cookie
    const responseInit: ResponseInit = {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    };

    // Determine redirect URI
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${origin}/api/linkedin/callback`;

    // Exchange code for tokens
    let tokenData: LinkedInTokenResponse;
    try {
      tokenData = await exchangeCodeForTokens(code, redirectUri);
    } catch (err) {
      const html = generateErrorHTML(
        err instanceof Error ? err.message : 'Échec de l\'échange du code d\'autorisation avec LinkedIn.'
      );
      return new NextResponse(html, {
        status: 500,
        ...responseInit,
      });
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Fetch user profile
    const userInfo = await fetchUserProfile(access_token);
    const userName = [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ') || 'Utilisateur LinkedIn';
    const userEmail = userInfo.email || '';

    // Fetch organizations
    const organizations = await fetchOrganizations(access_token);

    // Compute token expiry
    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // default 60 days

    // Check if user is authenticated (via lp_token cookie)
    const lpTokenCookie = request.cookies.get('lp_token')?.value;
    const authUser = lpTokenCookie ? await verifyToken(lpTokenCookie) : null;

    if (authUser) {
      // Authenticated user — save to DB
      try {
        // Verify user still exists and is active
        const user = await db.user.findUnique({
          where: { id: authUser.userId },
          select: { id: true, isActive: true },
        });

        if (!user || !user.isActive) {
          const html = generateErrorHTML(
            'Compte utilisateur introuvable ou désactivé.'
          );
          return new NextResponse(html, { status: 403, ...responseInit });
        }

        // Deactivate existing accounts for this user
        await db.linkedInAccount.updateMany({
          where: { userId: user.id },
          data: { isActive: false },
        });

        // Determine primary organization
        const primaryOrg = organizations[0];
        const orgId = primaryOrg?.id;
        const orgName = primaryOrg?.name;

        if (!orgId) {
          const html = generateErrorHTML(
            'Aucune organisation administrateur trouvée sur votre compte LinkedIn. Veuillez vous assurer que vous êtes administrateur d\'au moins une page organisation.'
          );
          return new NextResponse(html, { status: 400, ...responseInit });
        }

        // Create LinkedInAccount
        const account = await db.linkedInAccount.create({
          data: {
            userId: user.id,
            accessToken: access_token,
            refreshToken: refresh_token || null,
            organizationId: orgId,
            organizationName: orgName || null,
            isActive: true,
            tokenExpiresAt,
          },
        });

        await createAuditLog({
          entityType: 'LinkedInAccount',
          entityId: account.id,
          action: 'oauth_connect',
          userId: user.id,
          metadata: {
            method: 'oauth',
            organizationId: orgId,
            organizationName: orgName,
            totalOrgs: organizations.length,
          },
        });

        // Redirect to settings page
        const settingsUrl = `${origin || ''}/settings?linkedin=connected`;
        const redirectResponse = NextResponse.redirect(settingsUrl, 302);
        // Clear CSRF cookie on redirect too
        redirectResponse.cookies.delete('linkedin_oauth_state');
        return redirectResponse;
      } catch (dbError) {
        console.error('DB save error during LinkedIn OAuth:', dbError);
        const html = generateErrorHTML(
          'Erreur lors de la sauvegarde de la connexion LinkedIn en base de données.'
        );
        return new NextResponse(html, { status: 500, ...responseInit });
      }
    } else {
      // Not authenticated — show success page
      const html = generateSuccessHTML(userName, userEmail, organizations);
      const successResponse = new NextResponse(html, {
        status: 200,
        ...responseInit,
      });
      // Clear CSRF cookie
      successResponse.cookies.delete('linkedin_oauth_state');
      return successResponse;
    }
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    const html = generateErrorHTML(
      'Erreur serveur inattendue lors du traitement de la connexion LinkedIn.'
    );
    return new NextResponse(html, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
