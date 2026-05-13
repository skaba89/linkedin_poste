import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { verifyPassword, hashPassword } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Stats: posts count by this user
    const [postsCount, publishedCount, approvedCount, rejectedCount] = await Promise.all([
      db.post.count({ where: { authorId: user.id } }),
      db.post.count({ where: { authorId: user.id, status: 'posted' } }),
      db.post.count({ where: { authorId: user.id, status: 'approved' } }),
      db.post.count({ where: { authorId: user.id, status: 'rejected' } }),
    ]);

    const totalReviewed = approvedCount + rejectedCount;
    const approvalRate = totalReviewed > 0 ? Math.round((approvedCount / totalReviewed) * 100) : null;

    // Recent activity (last 10 audit logs for this user)
    const recentActivity = await db.auditLog.findMany({
      where: { userId: user.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      postsCount,
      publishedCount,
      approvalRate,
      recentActivity,
    });
  } catch (error) {
    console.error('User profile GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Mot de passe actuel et nouveau mot de passe requis' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }

    // Fetch user with password
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Mot de passe actuel incorrect' },
        { status: 400 }
      );
    }

    // Hash and update
    const hashedPassword = await hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true, message: 'Mot de passe mis à jour' });
  } catch (error) {
    console.error('User profile PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
