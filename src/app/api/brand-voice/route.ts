import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { analyzeBrandVoice } from '@/lib/brand-voice-analyzer';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const posts = await db.post.findMany({
      where: { finalContent: { not: null }, status: { in: ['posted', 'approved'] } },
      select: { finalContent: true },
    });

    const contents = posts.map(p => p.finalContent!).filter(c => c.length > 50);
    const result = analyzeBrandVoice(contents);

    if (!result) {
      return NextResponse.json({ error: 'Pas assez de posts pour analyser (minimum 2)' }, { status: 400 });
    }

    await db.brandVoiceProfile.create({
      data: {
        name: 'Profil principal',
        userId: authUser.id,
        postCount: contents.length,
        tone: JSON.stringify(result.tone),
        vocabulary: JSON.stringify(result.vocabulary),
        structure: JSON.stringify(result.structure),
        emotional: JSON.stringify(result.emotional),
        themes: JSON.stringify(result.themes),
        voicePrompt: result.voicePrompt,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const profile = await db.brandVoiceProfile.findFirst({
      where: { userId: authUser.id },
      orderBy: { analyzedAt: 'desc' },
    });

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({
      profile: {
        ...profile,
        tone: profile.tone ? JSON.parse(profile.tone) : null,
        vocabulary: profile.vocabulary ? JSON.parse(profile.vocabulary) : null,
        structure: profile.structure ? JSON.parse(profile.structure) : null,
        emotional: profile.emotional ? JSON.parse(profile.emotional) : null,
        themes: profile.themes ? JSON.parse(profile.themes) : null,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
