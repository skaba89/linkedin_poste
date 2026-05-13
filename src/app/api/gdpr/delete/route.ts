import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `gdpr:delete:${authUser.id}`);
    if (rlResult) return rlResult;

    const userId = authUser.id;

    // Instead of actually deleting, we mark the user as inactive and anonymize data
    // This follows GDPR "right to be forgotten" with a 30-day grace period

    // Step 1: Mark user as inactive
    await db.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        name: 'Utilisateur supprimé',
        email: `deleted_${userId}@anonymized.com`,
        avatarUrl: null,
      },
    });

    // Step 2: Anonymize posts (remove personal content, keep for audit trail)
    await db.post.updateMany({
      where: { authorId: userId },
      data: {
        finalContent: '[Contenu anonymisé - supprimé suite à la demande RGPD]',
        angle: null,
        audience: null,
      },
    });

    // Step 3: Anonymize prospects (remove personal data)
    await db.prospect.updateMany({
      where: { userId: userId },
      data: {
        fullName: '[Anonymisé]',
        headline: null,
        notes: null,
        isActive: false,
      },
    });

    // Step 4: Clear notification channels config
    await db.notificationChannel.updateMany({
      where: { userId: userId },
      data: {
        config: '{}',
      },
    });

    // Step 5: Clear linkedin accounts tokens
    await db.linkedInAccount.updateMany({
      where: { userId: userId },
      data: {
        accessToken: '[ANONYMIZED]',
        refreshToken: null,
        isActive: false,
      },
    });

    // Step 6: Clear webhook subscriptions URLs
    await db.webhookSubscription.updateMany({
      where: { userId: userId },
      data: {
        url: '[ANONYMIZED]',
        secret: '[ANONYMIZED]',
        isActive: false,
      },
    });

    // Step 7: Cancel subscription
    await db.subscription.updateMany({
      where: { userId: userId },
      data: {
        status: 'cancelled',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      },
    });

    // Step 8: Clear audit logs user references
    // We keep the audit logs but remove the userId reference
    await db.auditLog.updateMany({
      where: { userId: userId },
      data: {
        userId: null,
      },
    });

    // Create audit log for GDPR deletion (before userId is cleared from future logs)
    await createAuditLog({
      entityType: 'GDPR',
      action: 'account_deletion_requested',
      userId: userId,
      metadata: {
        reason: 'Demande de suppression RGPD',
        anonymizedAt: new Date().toISOString(),
        note: 'Les données ont été anonymisées. La suppression définitive sera effectuée après 30 jours.',
      },
    });

    return NextResponse.json({
      message: 'Demande de suppression de compte enregistrée.',
      details: {
        status: 'anonymized',
        gracePeriodDays: 30,
        note: 'Vos données personnelles ont été anonymisées. Votre compte sera définitivement supprimé dans 30 jours. Si vous souhaitez annuler cette demande, contactez le support avant cette date.',
        anonymizedFields: [
          'name',
          'email',
          'avatarUrl',
          'posts.finalContent',
          'prospects.fullName',
          'prospects.headline',
          'prospects.notes',
          'linkedinAccounts.tokens',
          'webhookSubscriptions.url',
          'webhookSubscriptions.secret',
          'subscription.status',
        ],
      },
    });
  } catch (error) {
    console.error('GDPR delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
