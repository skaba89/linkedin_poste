import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin')) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes. Seuls les administrateurs peuvent modifier le mode de publication.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { publishAs } = body;

    if (!publishAs || !['person', 'organization'].includes(publishAs)) {
      return NextResponse.json(
        { error: 'Mode invalide. Utilisez "person" ou "organization".' },
        { status: 400 }
      );
    }

    const account = await db.linkedInAccount.findFirst({
      where: { isActive: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Aucun compte LinkedIn connecté.' },
        { status: 400 }
      );
    }

    const updated = await db.linkedInAccount.update({
      where: { id: account.id },
      data: { publishAs },
    });

    await createAuditLog({
      entityType: 'LinkedInAccount',
      entityId: account.id,
      action: 'publish_mode_changed',
      userId: authUser.id,
      metadata: {
        oldMode: account.publishAs,
        newMode: publishAs,
      },
    });

    return NextResponse.json({
      success: true,
      publishAs: updated.publishAs,
      message: publishAs === 'person'
        ? 'Mode publication personnelle activé. Les posts seront publiés depuis votre profil Sekouna KABA.'
        : 'Mode publication organisation activé. Les posts seront publiés depuis la page DataSphere Innovation.',
    });
  } catch (error) {
    console.error('Publish mode update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
