import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/mission-scout/opportunities — List opportunities with filters
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sector = searchParams.get('sector');
    const minScore = parseInt(searchParams.get('minScore') || '0', 10);
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // New advanced filters
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const contractType = searchParams.get('contractType');
    const workMode = searchParams.get('workMode');
    const region = searchParams.get('region');
    const city = searchParams.get('city');
    const country = searchParams.get('country');
    const language = searchParams.get('language');
    const jobTitle = searchParams.get('jobTitle');
    const source = searchParams.get('source');

    const where: Record<string, unknown> = { userId: authUser.id };

    if (status) where.status = status;
    if (sector) where.sector = sector;
    if (category) where.category = category;
    if (contractType) where.contractType = contractType;
    if (workMode) where.workMode = workMode;
    if (region) where.region = region;
    if (country) where.country = country;
    if (language) where.language = language;
    if (jobTitle) where.jobTitle = jobTitle;
    if (source) where.source = source;

    if (minScore > 0) where.relevanceScore = { gte: minScore };

    // Text search across title, company, description
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { company: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // City uses contains search
    if (city) {
      where.city = { contains: city };
    }

    const [opportunities, total] = await Promise.all([
      db.opportunity.findMany({
        where: where as Prisma.OpportunityWhereInput,
        orderBy: { [sort]: order === 'asc' ? 'asc' : 'desc' },
        take: limit,
        skip: offset,
        include: {
          applications: {
            where: { userId: authUser.id },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          _count: { select: { applications: true } },
        },
      }),
      db.opportunity.count({ where: where as Prisma.OpportunityWhereInput }),
    ]);

    return NextResponse.json({ opportunities, total, limit, offset });
  } catch (error) {
    console.error('[MissionScout] Opportunities fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/mission-scout/opportunities — Manually add an opportunity
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      company,
      location,
      description,
      salaryRange,
      sourceUrl,
      requiredSkills,
      sector,
      category,
      contractType,
      workMode,
      region,
      city,
      country,
      language,
      jobTitle,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 });
    }

    const opportunity = await db.opportunity.create({
      data: {
        userId: authUser.id,
        title,
        company: company || undefined,
        location: location || undefined,
        description: description || undefined,
        salaryRange: salaryRange || undefined,
        sourceUrl: sourceUrl || undefined,
        requiredSkills: requiredSkills ? JSON.stringify(requiredSkills) : undefined,
        sector: sector || undefined,
        category: category || undefined,
        contractType: contractType || undefined,
        workMode: workMode || undefined,
        region: region || undefined,
        city: city || undefined,
        country: country || undefined,
        language: language || undefined,
        jobTitle: jobTitle || undefined,
        source: sourceUrl?.includes('linkedin') ? 'linkedin' : 'referral',
        relevanceScore: 50,
      },
    });

    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (error) {
    console.error('[MissionScout] Opportunity create error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
