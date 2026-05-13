import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { db } from '@/lib/db';
import { seedPlans } from '@/lib/seed-plans';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Ensure plans exist
    await seedPlans();

    const plans = await db.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Get current user subscription
    const subscription = await db.subscription.findUnique({
      where: { userId: authUser.id },
      include: { plan: true },
    });

    const plansWithStatus = plans.map((plan) => ({
      ...plan,
      features: JSON.parse(plan.features),
      isCurrentPlan: subscription?.planId === plan.id,
      subscriptionStatus: subscription?.planId === plan.id ? subscription.status : null,
    }));

    return NextResponse.json({ plans: plansWithStatus });
  } catch (error) {
    console.error('Plans GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
