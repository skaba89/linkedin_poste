import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { db } from '@/lib/db';
import { seedPlans, ensureFreeSubscriptions } from '@/lib/seed-plans';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    await seedPlans();
    await ensureFreeSubscriptions();

    const subscription = await db.subscription.findUnique({
      where: { userId: authUser.id },
      include: {
        plan: true,
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!subscription) {
      // Auto-create free subscription
      const freePlan = await db.plan.findUnique({ where: { name: 'free' } });
      if (freePlan) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setFullYear(periodEnd.getFullYear() + 100);

        const newSub = await db.subscription.create({
          data: {
            userId: authUser.id,
            planId: freePlan.id,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
          include: { plan: true },
        });

        return NextResponse.json({
          subscription: {
            ...newSub,
            plan: {
              ...newSub.plan,
              features: JSON.parse(newSub.plan.features),
            },
          },
        });
      }

      return NextResponse.json({ subscription: null });
    }

    return NextResponse.json({
      subscription: {
        ...subscription,
        plan: {
          ...subscription.plan,
          features: JSON.parse(subscription.plan.features),
        },
      },
    });
  } catch (error) {
    console.error('Subscription GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Only admins can change subscriptions (for now, this is manual billing)
    if (authUser.role.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs peuvent modifier les abonnements. Contactez votre administrateur.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, planName } = body;

    if (!userId || !planName) {
      return NextResponse.json({ error: 'userId et planName sont requis' }, { status: 400 });
    }

    // Find the plan
    const plan = await db.plan.findUnique({
      where: { name: planName, isActive: true },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan introuvable' }, { status: 404 });
    }

    // Check target user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Calculate period
    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.name === 'free') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 100);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Upsert subscription
    const subscription = await db.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        postsUsedThisMonth: 0,
        aiGenerationsUsed: 0,
      },
      update: {
        planId: plan.id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
      include: {
        plan: true,
      },
    });

    await createAuditLog({
      entityType: 'Subscription',
      entityId: subscription.id,
      action: 'update',
      userId: authUser.id,
      metadata: {
        targetUserId: userId,
        targetUserName: targetUser.name,
        planName: plan.name,
        planLabel: plan.label,
      },
    });

    return NextResponse.json({
      subscription: {
        ...subscription,
        plan: {
          ...subscription.plan,
          features: JSON.parse(subscription.plan.features),
        },
      },
    });
  } catch (error) {
    console.error('Subscription POST error:', error);
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
    const { action } = body;

    if (!action || !['cancel', 'pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide. Utilisez "cancel", "pause" ou "resume".' },
        { status: 400 }
      );
    }

    const subscription = await db.subscription.findUnique({
      where: { userId: authUser.id },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Aucun abonnement trouvé' }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};
    let newStatus: string;

    switch (action) {
      case 'cancel':
        newStatus = 'cancelled';
        updateData = { status: newStatus, cancelAtPeriodEnd: true };
        break;
      case 'pause':
        newStatus = 'paused';
        updateData = { status: newStatus };
        break;
      case 'resume':
        newStatus = 'active';
        updateData = { status: newStatus, cancelAtPeriodEnd: false };
        break;
      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    const updated = await db.subscription.update({
      where: { id: subscription.id },
      data: updateData,
      include: { plan: true },
    });

    await createAuditLog({
      entityType: 'Subscription',
      entityId: subscription.id,
      action,
      userId: authUser.id,
      metadata: { previousStatus: subscription.status, newStatus },
    });

    return NextResponse.json({
      subscription: {
        ...updated,
        plan: {
          ...updated.plan,
          features: JSON.parse(updated.plan.features),
        },
      },
    });
  } catch (error) {
    console.error('Subscription PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
