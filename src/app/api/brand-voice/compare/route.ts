import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { analyzeBrandVoice } from '@/lib/brand-voice-analyzer';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const competitorId = searchParams.get('competitorId');

    if (!competitorId) {
      return NextResponse.json({ error: 'competitorId requis' }, { status: 400 });
    }

    const competitorPosts = await db.competitorPost.findMany({
      where: { competitorId },
      select: { content: true },
    });

    const contents = competitorPosts.map(p => p.content).filter((c): c is string => !!c && c.length > 50);

    if (contents.length < 2) {
      return NextResponse.json({ error: 'Pas assez de posts pour ce concurrent' }, { status: 400 });
    }

    const result = analyzeBrandVoice(contents);

    const myProfile = await db.brandVoiceProfile.findFirst({
      where: { userId: authUser.id },
      orderBy: { analyzedAt: 'desc' },
    });
    let myVoice: { tone: any; vocabulary: any } | null = null;
    if (myProfile) {
      myVoice = {
        tone: myProfile.tone ? JSON.parse(myProfile.tone) : null,
        vocabulary: myProfile.vocabulary ? JSON.parse(myProfile.vocabulary) : null,
      };
    }

    return NextResponse.json({ competitor: result, myVoice });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
