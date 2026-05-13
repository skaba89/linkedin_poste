import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { db } from '@/lib/db';
import { ensureFreeSubscriptions } from '@/lib/seed-plans';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    await ensureFreeSubscriptions();

    const subscription = await db.subscription.findUnique({
      where: { userId: authUser.id },
      include: { plan: true },
    });

    if (!subscription) {
      return NextResponse.json({
        usage: {
          plan: null,
          postsUsed: 0,
          postsLimit: 0,
          aiGenerationsUsed: 0,
          aiGenerationsLimit: 0,
          teamMembersUsed: 0,
          teamMembersLimit: 0,
          periodEnd: null,
          periodStart: null,
          percentageUsed: 0,
          isNearLimit: false,
          isAtLimit: false,
        },
      });
    }

    // Count team members (users with same subscription concept - for now, count users)
    // In a real multi-tenant system, this would be per-organization
    const teamMembersCount = await db.user.count({
      where: { isActive: true },
    });

    const plan = subscription.plan;
    const postsUsed = subscription.postsUsedThisMonth;
    const aiGenerationsUsed = subscription.aiGenerationsUsed;

    // Check if we need to reset monthly counters
    const now = new Date();
    const periodStart = new Date(subscription.currentPeriodStart);
    const periodEnd = new Date(subscription.currentPeriodEnd);

    // Calculate if we're in a new month
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const subMonth = periodStart.getMonth();
    const subYear = periodStart.getFullYear();

    // If months differ and we're past the period start, reset counters
    let effectivePostsUsed = postsUsed;
    let effectiveAiUsed = aiGenerationsUsed;

    if (currentMonth !== subMonth || currentYear !== subYear) {
      // Check if we need to auto-renew the period
      if (now > periodEnd || plan.name === 'free') {
        // Reset counters and extend period for free plans
        await db.subscription.update({
          where: { id: subscription.id },
          data: {
            postsUsedThisMonth: 0,
            aiGenerationsUsed: 0,
            currentPeriodStart: new Date(currentYear, currentMonth, 1),
            currentPeriodEnd: plan.name === 'free'
              ? new Date(currentYear + 100, currentMonth, 1)
              : new Date(currentYear, currentMonth + 1, 1),
          },
        });
        effectivePostsUsed = 0;
        effectiveAiUsed = 0;
      }
    }

    const postsLimit = plan.maxPostsPerMonth;
    const aiLimit = plan.maxAiGenerations;
    const teamLimit = plan.maxTeamMembers;

    const postsPercentage = postsLimit > 0 ? Math.round((effectivePostsUsed / postsLimit) * 100) : 0;
    const aiPercentage = aiLimit > 0 ? Math.round((effectiveAiUsed / aiLimit) * 100) : 0;
    const teamPercentage = teamLimit > 0 ? Math.round((teamMembersCount / teamLimit) * 100) : 0;

    const isNearLimit = postsPercentage >= 80 || aiPercentage >= 80;
    const isAtLimit = postsPercentage >= 100 || aiPercentage >= 100;

    return NextResponse.json({
      usage: {
        plan: {
          id: plan.id,
          name: plan.name,
          label: plan.label,
          features: JSON.parse(plan.features),
        },
        postsUsed: effectivePostsUsed,
        postsLimit: postsLimit >= 999 ? -1 : postsLimit, // -1 = unlimited
        aiGenerationsUsed: effectiveAiUsed,
        aiGenerationsLimit: aiLimit >= 999 ? -1 : aiLimit,
        teamMembersUsed: teamMembersCount,
        teamMembersLimit: teamLimit >= 50 ? -1 : teamLimit,
        postsPercentage,
        aiPercentage,
        teamPercentage,
        periodEnd: subscription.currentPeriodEnd,
        periodStart: subscription.currentPeriodStart,
        status: subscription.status,
        isNearLimit,
        isAtLimit,
        isFreePlan: plan.name === 'free',
      },
    });
  } catch (error) {
    console.error('Usage GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
