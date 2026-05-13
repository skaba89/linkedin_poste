import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

// Simulated AI-discovered profiles
const SIMULATED_PROFILES = [
  { name: 'Alexandre Chen', headline: 'Directeur Marketing @TechVision | Expert Growth B2B', company: 'TechVision', sector: 'Technologie' },
  { name: 'Isabelle Fontaine', headline: 'CEO @DataDrive | Passionnée de data & IA', company: 'DataDrive', sector: 'Data & IA' },
  { name: 'Nicolas Bernard', headline: 'VP Sales @CloudFirst | SaaS & Enterprise', company: 'CloudFirst', sector: 'Cloud/SaaS' },
  { name: 'Laura Mercier', headline: 'CMO @ScaleUp Agency | LinkedIn Strategy', company: 'ScaleUp Agency', sector: 'Marketing' },
  { name: 'Antoine Leroy', headline: 'Head of Partnerships @GlobalTech', company: 'GlobalTech', sector: 'Technologie' },
  { name: 'Claire Dubois', headline: 'Fondatrice @StartupLab | Angel Investor', company: 'StartupLab', sector: 'Startup' },
  { name: 'Maxime Petit', headline: 'CTO @InnovateTech | Architecture Cloud', company: 'InnovateTech', sector: 'Technologie' },
  { name: 'Julie Moreau', headline: 'Directrice Commerciale @BusinessHub', company: 'BusinessHub', sector: 'Commerce' },
  { name: 'François Lambert', headline: 'Consultant Senior @Deloitte Digital', company: 'Deloitte Digital', sector: 'Conseil' },
  { name: 'Anne-Sophie Girard', headline: 'Product Manager @SaaSPro', company: 'SaaSPro', sector: 'Produit' },
  { name: 'David Roux', headline: 'Data Scientist @AI Factory', company: 'AI Factory', sector: 'Data & IA' },
  { name: 'Marguerite Blanc', headline: 'Social Media Director @BrandForce', company: 'BrandForce', sector: 'Marketing' },
];

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { sector, count } = body;

    // Simulate AI discovery: pick N random profiles not already in targets
    const existingTargets = await db.connectionTarget.findMany({
      where: { userId: authUser.id },
      select: { targetName: true },
    });
    const existingNames = new Set(existingTargets.map(t => t.targetName));

    let pool = SIMULATED_PROFILES.filter(p => !existingNames.has(p.name));
    if (sector) {
      pool = pool.filter(p => p.sector.toLowerCase().includes(sector.toLowerCase()));
    }

    // Shuffle and take N
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count || 5, shuffled.length));

    if (selected.length === 0) {
      return NextResponse.json({ message: 'Aucun nouveau profil trouvé', profiles: [] });
    }

    const created = [];
    for (const profile of selected) {
      const target = await db.connectionTarget.create({
        data: {
          userId: authUser.id,
          targetName: profile.name,
          targetHeadline: profile.headline,
          targetProfileUrl: `https://linkedin.com/in/${profile.name.toLowerCase().replace(/\s+/g, '-')}`,
          targetCompany: profile.company,
          targetSector: profile.sector,
          relevanceScore: Math.floor(Math.random() * 30) + 70,
          status: 'identified',
        },
      });
      created.push(target);
    }

    return NextResponse.json({
      message: `${created.length} profils découverts par l'IA`,
      count: created.length,
      profiles: created,
    });
  } catch (error) {
    console.error('Discover POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
