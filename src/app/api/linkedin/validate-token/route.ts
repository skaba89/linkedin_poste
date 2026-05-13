import { NextResponse } from 'next/server';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { linkedinHeaders } from '@/lib/linkedin-config';

interface LinkedInOrgAcl {
  role: string;
  organization: string;
}

interface LinkedInOrgResponse {
  elements: LinkedInOrgAcl[];
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (!hasRole(authUser, 'admin')) {
      return NextResponse.json({ error: 'Admin uniquement' }, { status: 403 });
    }

    const { accessToken } = await request.json();
    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json({ error: 'Token d\'accès requis' }, { status: 400 });
    }

    const token = accessToken.trim();

    // 1) Try to fetch user profile (optional — may fail if scopes missing)
    let userName = 'Utilisateur';
    let userEmail = '';
    try {
      const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.ok) {
        const data = await meRes.json();
        userName = [data.given_name, data.family_name].filter(Boolean).join(' ') || 'Utilisateur';
        userEmail = data.email || '';
      }
      // If 403, the token is valid but lacks r_liteprofile scope — that's OK
    } catch {
      // non-critical
    }

    // 2) Fetch organizations the user administers (the key step)
    let organizations: { id: string; name: string; role: string; logo?: string }[] = [];
    let orgError = '';

    try {
      const orgRes = await fetch(
        'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR',
        {
          headers: linkedinHeaders(token),
        }
      );

      if (!orgRes.ok) {
        const errBody = await orgRes.text();
        orgError = `Impossible de lister les organisations (LinkedIn ${orgRes.status}): ${errBody.slice(0, 200)}`;
      } else {
        const data: LinkedInOrgResponse = await orgRes.json();

        if (!data.elements || data.elements.length === 0) {
          orgError = 'Vous n\'êtes administrateur d\'aucune page entreprise LinkedIn. Vérifiez que vous gérez au moins une page.';
        } else {
          for (const el of data.elements.slice(0, 10)) {
            if (!el.organization) continue;
            const match = el.organization.match(/urn:li:organization:(\d+)/);
            if (!match) continue;
            const orgId = match[1];

            try {
              const detailRes = await fetch(
                `https://api.linkedin.com/rest/organizations/${orgId}?field=localizedName,logoV2`,
                {
                  headers: linkedinHeaders(token),
                }
              );
              if (detailRes.ok) {
                const detail = await detailRes.json();
                let logo = '';
                if (detail.logoV2?.primary?.image?.elements?.[0]?.identifiers?.[0]?.identifier) {
                  logo = detail.logoV2.primary.image.elements[0].identifiers[0].identifier;
                }
                organizations.push({
                  id: orgId,
                  name: detail.localizedName || detail.name || `Organisation ${orgId}`,
                  role: el.role,
                  logo,
                });
              } else {
                organizations.push({ id: orgId, name: `Organisation ${orgId}`, role: el.role });
              }
            } catch {
              organizations.push({ id: orgId, name: `Organisation ${orgId}`, role: el.role });
            }
          }
        }
      }
    } catch (err) {
      orgError = 'Erreur réseau lors de la détection des organisations';
    }

    // 3) If no organizations found but token seems valid, still allow manual entry
    if (organizations.length === 0) {
      return NextResponse.json({
        valid: true,
        user: { name: userName, email: userEmail },
        organizations: [],
        warning: orgError || 'Aucune page entreprise détectée automatiquement.',
      });
    }

    // 4) Return validated info
    return NextResponse.json({
      valid: true,
      user: { name: userName, email: userEmail },
      organizations,
    });
  } catch (error) {
    console.error('LinkedIn validate-token error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
