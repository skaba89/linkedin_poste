import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, mot de passe et nom sont requis' },
        { status: 400 }
      );
    }

    // Rate limit: 3 registrations per minute per IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(`register:${ip}`, 3, 60000)) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
        { status: 429 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    
    // First user is admin
    const userCount = await db.user.count();
    const role = userCount === 0 ? 'admin' : 'editor';

    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await createAuditLog({
      entityType: 'User',
      entityId: user.id,
      action: 'register',
      userId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
