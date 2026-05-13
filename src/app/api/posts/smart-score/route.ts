import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { computeSmartScore } from '@/lib/smart-scorer';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const content = body.content;

    if (!content) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }

    const calibrations = await db.scoringCalibration.findMany();
    const mapped = calibrations.map(c => {
      const factors: Record<string, number> = { length: 0, hook: 0, cta: 0, hashtags: 0, readability: 0, emoji: 0 };
      if (c.factors) {
        try {
          const f = c.factors as string;
          const lm = f.match(/Longueur.*?\((\d+)\/20\)/);
          const hm = f.match(/Hook.*?\((\d+)\/15\)/);
          const cm = f.match(/CTA.*?\((\d+)\/15\)/);
          const hm2 = f.match(/Hashtags.*?\((\d+)\/10\)/);
          const rm = f.match(/Lisibilité.*?\((\d+)\/15\)/);
          const em = f.match(/Émojis.*?\((\d+)\/10\)/);
          if (lm) factors.length = parseFloat(lm[1]);
          if (hm) factors.hook = parseFloat(hm[1]);
          if (cm) factors.cta = parseFloat(cm[1]);
          if (hm2) factors.hashtags = parseFloat(hm2[1]);
          if (rm) factors.readability = parseFloat(rm[1]);
          if (em) factors.emoji = parseFloat(em[1]);
        } catch {}
      }
      return { delta: c.delta, factors };
    });

    const result = computeSmartScore(content, mapped as any);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
