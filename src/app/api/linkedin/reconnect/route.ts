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

    const body = await request.json();
    const { accessToken, refreshToken, organizationId } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Le nouveau token d\'accès est requis' },
        { status: 400 }
      );
    }

    // Find existing active account or any account
    const existingAccount = await db.linkedInAccount.findFirst({
      where: { isActive: true, userId: authUser.id },
    });

    if (existingAccount) {
      // Update existing account with new token
      const updated = await db.linkedInAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken,
          refreshToken: refreshToken || existingAccount.refreshToken,
          organizationId: organizationId || existingAccount.organizationId,
          // Set token expiry to 60 days from now (LinkedIn default)
          tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      });

      await createAuditLog({
        entityType: 'LinkedInAccount',
        entityId: updated.id,
        action: 'reconnect',
        userId: authUser.id,
        metadata: { organizationId: organizationId || existingAccount.organizationId },
      });

      return NextResponse.json({
        success: true,
        account: {
          id: updated.id,
          organizationId: updated.organizationId,
          organizationName: updated.organizationName,
          updatedAt: updated.updatedAt,
        },
      });
    } else {
      // No existing account - need full connection
      if (!organizationId) {
        return NextResponse.json(
          { error: 'ID organisation requis pour une nouvelle connexion' },
          { status: 400 }
        );
      }

      const account = await db.linkedInAccount.create({
        data: {
          userId: authUser.id,
          accessToken,
          refreshToken: refreshToken || null,
          organizationId,
          tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });

      await createAuditLog({
        entityType: 'LinkedInAccount',
        entityId: account.id,
        action: 'connect',
        userId: authUser.id,
        metadata: { organizationId },
      });

      return NextResponse.json({
        success: true,
        account: {
          id: account.id,
          organizationId: account.organizationId,
          organizationName: account.organizationName,
          updatedAt: account.updatedAt,
        },
      });
    }
  } catch (error) {
    console.error('LinkedIn reconnect error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
