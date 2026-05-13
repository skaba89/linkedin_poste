import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { rateLimitMiddleware, authLimiter } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate limit: per IP (authLimiter, 10 req/min)
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rlResult = await rateLimitMiddleware(authLimiter, request, `reset-password:${clientIp}`);
    if (rlResult) return rlResult;

    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Jeton de réinitialisation manquant.' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe est requis.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères.' },
        { status: 400 }
      );
    }

    // Find the reset record by token
    const resetRecord = await db.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: 'Jeton de réinitialisation invalide.' },
        { status: 400 }
      );
    }

    // Check if token has been used
    if (resetRecord.usedAt) {
      return NextResponse.json(
        { error: 'Ce jeton a déjà été utilisé. Veuillez faire une nouvelle demande.' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (resetRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Ce jeton a expiré. Veuillez faire une nouvelle demande de réinitialisation.' },
        { status: 400 }
      );
    }

    // Check if user account is active
    if (!resetRecord.user.isActive) {
      return NextResponse.json(
        { error: 'Ce compte a été désactivé.' },
        { status: 403 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and mark token as used (in a transaction)
    await db.$transaction([
      db.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      }),
      db.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Invalidate any other unused reset tokens for this user
    await db.passwordReset.updateMany({
      where: {
        userId: resetRecord.userId,
        usedAt: null,
        id: { not: resetRecord.id },
      },
      data: { usedAt: new Date() },
    });

    console.log(`[ResetPassword] Password updated for user ${resetRecord.userId}`);

    return NextResponse.json({
      message: 'Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.',
    });
  } catch (error) {
    console.error('[ResetPassword] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur. Veuillez réessayer plus tard.' },
      { status: 500 }
    );
  }
}
