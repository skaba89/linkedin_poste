import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const accounts = await db.linkedInAccount.findMany({
      where: { isActive: true },
      select: {
        id: true,
        organizationId: true,
        organizationName: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Add token status info
    const accountsWithStatus = accounts.map(acc => ({
      ...acc,
      tokenExpired: acc.tokenExpiresAt
        ? new Date(acc.tokenExpiresAt) < new Date()
        : null,
      tokenExpiresAt: acc.tokenExpiresAt,
    }));

    return NextResponse.json({ accounts: accountsWithStatus });
  } catch (error) {
    console.error('LinkedIn accounts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
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

    const body = await request.json();
    const { accessToken, refreshToken, organizationId, organizationName } = body;

    if (!accessToken || !organizationId) {
      return NextResponse.json(
        { error: 'Token d\'accès et ID organisation requis' },
        { status: 400 }
      );
    }

    // Deactivate existing accounts for this user
    await db.linkedInAccount.updateMany({
      where: { userId: authUser.id },
      data: { isActive: false },
    });

    const account = await db.linkedInAccount.create({
      data: {
        userId: authUser.id,
        accessToken,
        refreshToken: refreshToken || null,
        organizationId,
        organizationName: organizationName || null,
        isActive: true,
        // Set token expiry to 60 days from now (LinkedIn default)
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    });

    await createAuditLog({
      entityType: 'LinkedInAccount',
      entityId: account.id,
      action: 'connect',
      userId: authUser.id,
      metadata: { organizationId, organizationName },
    });

    return NextResponse.json({
      account: {
        id: account.id,
        userId: account.userId,
        organizationId: account.organizationId,
        organizationName: account.organizationName,
        isActive: account.isActive,
        tokenExpiresAt: account.tokenExpiresAt,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    });
  } catch (error) {
    console.error('LinkedIn connect error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin')) {
      return NextResponse.json({ error: 'Admin uniquement' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'ID du compte requis' }, { status: 400 });
    }

    await db.linkedInAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    await createAuditLog({
      entityType: 'LinkedInAccount',
      entityId: accountId,
      action: 'disconnect',
      userId: authUser.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LinkedIn disconnect error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
