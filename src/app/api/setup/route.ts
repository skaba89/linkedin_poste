import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Setup route — protected by JWT_SECRET + rate limited in middleware.
// One-time use: disabled after an admin account exists.

export async function POST(request: Request) {
  try {
    const { email, name, password, secret } = await request.json();

    // Simple protection: must provide the JWT_SECRET to use this endpoint
    const setupSecret = process.env.SETUP_SECRET || process.env.JWT_SECRET;
    if (!secret || secret !== setupSecret) {
      return NextResponse.json(
        { error: 'Secret invalide.' },
        { status: 403 }
      );
    }

    // One-time lock: if an admin already exists, block further setup
    const adminCount = await db.user.count({ where: { role: 'admin' } });
    if (adminCount > 0) {
      return NextResponse.json(
        { error: 'Le setup est déjà terminé. Un administrateur existe déjà.' },
        { status: 403 }
      );
    }

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'email, name et password sont requis.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà.' },
        { status: 409 }
      );
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Compte admin créé avec succès !',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error: any) {
    console.error('[Setup] Error creating admin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du compte.' },
      { status: 500 }
    );
  }
}
