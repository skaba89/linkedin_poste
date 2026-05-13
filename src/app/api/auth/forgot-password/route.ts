import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimitMiddleware, authLimiter } from '@/lib/rate-limit';
import { sendRealEmail, buildPasswordResetHtml } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Adresse e-mail invalide.' },
        { status: 400 }
      );
    }

    // Rate limit: per email (authLimiter, 10 req/min)
    const rlResult = await rateLimitMiddleware(authLimiter, request, `forgot-password:${email.toLowerCase()}`);
    if (rlResult) return rlResult;

    const normalizedEmail = email.toLowerCase().trim();
    const user = await db.user.findUnique({ where: { email: normalizedEmail } });

    // Always return 200 — don't reveal if email exists
    if (!user) {
      return NextResponse.json({
        message: 'Si un compte existe avec cette adresse, un e-mail de réinitialisation a été envoyé.',
      });
    }

    if (!user.isActive) {
      return NextResponse.json({
        message: 'Si un compte existe avec cette adresse, un e-mail de réinitialisation a été envoyé.',
      });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Invalidate any previous unused tokens for this user
    await db.passwordReset.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    // Save the new reset token (expires in 1 hour)
    await db.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Build reset URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Send reset email
    const htmlContent = buildPasswordResetHtml({
      resetUrl,
      userName: user.name,
    });

    const textContent = `Bonjour ${user.name},\n\nVous avez demandé la réinitialisation de votre mot de passe.\n\nCliquez sur le lien suivant pour choisir un nouveau mot de passe :\n${resetUrl}\n\nCe lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.\n\n— DataSphere`;

    await sendRealEmail({
      to: user.email,
      subject: '🔐 Réinitialisation de votre mot de passe — DataSphere',
      html: htmlContent,
      text: textContent,
    });

    return NextResponse.json({
      message: 'Si un compte existe avec cette adresse, un e-mail de réinitialisation a été envoyé.',
    });
  } catch (error) {
    console.error('[ForgotPassword] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur. Veuillez réessayer plus tard.' },
      { status: 500 }
    );
  }
}
