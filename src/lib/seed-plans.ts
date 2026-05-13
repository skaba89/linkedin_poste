import { db } from '@/lib/db';

export async function seedPlans() {
  const existingPlans = await db.plan.count();
  if (existingPlans > 0) {
    console.log('Plans already exist, skipping seed.');
    return;
  }

  await db.plan.createMany({
    data: [
      {
        name: 'free',
        label: 'Gratuit',
        description: 'Parfait pour découvrir DataSphere et commencer à publier sur LinkedIn.',
        priceMonthly: 0,
        priceYearly: 0,
        maxPostsPerMonth: 5,
        maxAiGenerations: 10,
        maxTeamMembers: 1,
        features: JSON.stringify([
          '5 publications par mois',
          '10 générations IA',
          'Calendrier de publication',
          'Analytiques de base',
          '1 compte LinkedIn',
        ]),
        isPopular: false,
        sortOrder: 0,
        isActive: true,
      },
      {
        name: 'pro',
        label: 'Pro',
        description: 'Pour les créateurs sérieux qui veulent maximiser leur impact sur LinkedIn.',
        priceMonthly: 2900, // 29€
        priceYearly: 29000, // 290€/year (≈24€/month)
        maxPostsPerMonth: 999, // effectively unlimited
        maxAiGenerations: 100,
        maxTeamMembers: 5,
        features: JSON.stringify([
          'Publications illimitées',
          '100 générations IA par mois',
          'Tests A/B',
          'Brand Voice',
          'Analyse des concurrents',
          'Lead Scoring',
          'Calendrier avancé',
          'Analytiques complètes',
          '5 comptes LinkedIn',
          'Support prioritaire',
        ]),
        isPopular: true,
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'enterprise',
        label: 'Entreprise',
        description: 'Solution complète pour les équipes et les agences de communication.',
        priceMonthly: 9900, // 99€
        priceYearly: 99000, // 990€/year (≈82.5€/month)
        maxPostsPerMonth: 9999, // effectively unlimited
        maxAiGenerations: 9999, // unlimited
        maxTeamMembers: 50,
        features: JSON.stringify([
          'Tout ce qui est inclus dans Pro',
          'Générations IA illimitées',
          '50 membres d\'équipe',
          'Accès API',
          'Multi-tenant',
          'Agent IA avancé',
          'Support dédié',
          'SLA garanti',
          'Formation personnalisée',
          'Rapports personnalisés',
        ]),
        isPopular: false,
        sortOrder: 2,
        isActive: true,
      },
    ],
  });

  console.log('Plans seeded successfully!');
}

// Ensure free plan users get a subscription
export async function ensureFreeSubscriptions() {
  const freePlan = await db.plan.findUnique({ where: { name: 'free' } });
  if (!freePlan) return;

  // Find users without subscriptions
  const usersWithoutSub = await db.user.findMany({
    where: {
      subscription: null,
      isActive: true,
    },
    select: { id: true },
  });

  if (usersWithoutSub.length === 0) return;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 100); // effectively never expires for free

  await db.subscription.createMany({
    data: usersWithoutSub.map((u) => ({
      userId: u.id,
      planId: freePlan.id,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    })),
    skipDuplicates: true,
  });

  console.log(`Created free subscriptions for ${usersWithoutSub.length} users.`);
}
