import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';
import { linkedinHeaders } from '@/lib/linkedin-config';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (!hasRole(authUser, 'admin')) {
      return NextResponse.json({ error: 'Admin uniquement' }, { status: 403 });
    }

    const { orgId, description, tagline, website, headline } = await request.json();

    if (!orgId) {
      return NextResponse.json({ error: 'ID organisation requis' }, { status: 400 });
    }

    // Find active LinkedIn account
    const account = await db.linkedInAccount.findFirst({
      where: { isActive: true, organizationId: orgId },
    });
    if (!account) {
      return NextResponse.json({ error: 'Aucun compte LinkedIn connecté pour cette organisation' }, { status: 404 });
    }

    // Build patch body — only include fields that are provided
    const patchBody: Record<string, unknown> = {};

    if (typeof description === 'string') {
      patchBody.description = { text: description };
    }
    if (typeof tagline === 'string') {
      patchBody.tagline = { text: tagline };
    }
    if (typeof headline === 'string') {
      patchBody.headline = { text: headline };
    }
    if (typeof website === 'string' && website.trim()) {
      patchBody.website = { url: website.trim() };
    }

    if (Object.keys(patchBody).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    // Call LinkedIn API to update
    const response = await fetch(
      `https://api.linkedin.com/rest/organizations/${orgId}`,
      {
        method: 'PATCH',
        headers: linkedinHeaders(account.accessToken, {
          'X-Restli-Protocol-Version': '2.0.0',
        }),
        body: JSON.stringify(patchBody),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      return NextResponse.json(
        { error: `Échec de la mise à jour (LinkedIn ${response.status}): ${errBody.slice(0, 300)}` },
        { status: 400 }
      );
    }

    // Audit log
    await createAuditLog({
      entityType: 'LinkedInAccount',
      entityId: account.id,
      action: 'page_update',
      userId: authUser.id,
      metadata: { orgId, fields: Object.keys(patchBody) },
    });

    return NextResponse.json({
      success: true,
      message: 'Page mise à jour avec succès sur LinkedIn',
      updatedFields: Object.keys(patchBody),
    });
  } catch (error) {
    console.error('LinkedIn page-update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
