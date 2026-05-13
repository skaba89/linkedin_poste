import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `prospects:bulk:${authUser.id}`);
    if (rlResult) return rlResult;

    const body = await request.json();
    const { prospects } = body;

    if (!Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json({ error: 'Un tableau de prospects est requis' }, { status: 400 });
    }

    if (prospects.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 prospects par requête' }, { status: 400 });
    }

    const validSources = ['manual', 'linkedin_search', 'recommendation', 'import'];

    // createMany not supported in SQLite — use sequential creates
    const created: unknown[] = [];
    for (const p of prospects) {
      try {
        const prospect = await db.prospect.create({
          data: {
            userId: authUser.id,
            fullName: String(p.fullName || '').trim() || 'Sans nom',
            linkedinUrl: p.linkedinUrl ? String(p.linkedinUrl).trim() : undefined,
            headline: p.headline ? String(p.headline).trim() : undefined,
            company: p.company ? String(p.company).trim() : undefined,
            title: p.title ? String(p.title).trim() : undefined,
            source: validSources.includes(String(p.source)) ? String(p.source) : 'manual',
            notes: p.notes ? String(p.notes).trim() : undefined,
            tags: p.tags ? JSON.stringify(p.tags) : undefined,
            score: Math.max(0, Math.min(100, parseInt(String(p.score)) || 0)),
          },
        });
        created.push(prospect);
      } catch (createErr) {
        // Skip duplicates (unique linkedinUrl constraint)
        if (String(createErr).includes('Unique')) continue;
        console.error('Bulk create error for prospect:', p.fullName, createErr);
      }
    }

    const total = await db.prospect.count({ where: { userId: authUser.id } });
    return NextResponse.json({ created: created.length, total }, { status: 201 });
  } catch (error) {
    console.error('Prospects bulk POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
