import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { MissionScoutAgent } from '@/lib/agents/mission-scout';
import { db } from '@/lib/db';

const VALID_POST_TYPES = ['opportunity_found', 'application_sent', 'market_insight', 'weekly_summary'] as const;

// POST /api/mission-scout/auto-post — Generate a mission-related LinkedIn post
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { type, opportunityId } = body;

    if (!type || !VALID_POST_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Type invalide. Valeurs: opportunity_found, application_sent, market_insight, weekly_summary' },
        { status: 400 }
      );
    }

    const post = await MissionScoutAgent.generateMissionPost(authUser.id, type, opportunityId);
    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('[AutoPost] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// GET /api/mission-scout/auto-post — Retrieve auto-post settings
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const prefix = `mission_scout_${authUser.id}_`;
    const settings = await db.settings.findMany({
      where: {
        key: {
          in: [
            `${prefix}autoPost`,
            `${prefix}autoPostFrequency`,
            `${prefix}lastAutoPost`,
          ],
        },
      },
    });

    const config: Record<string, any> = {
      autoPost: false,
      frequency: 'weekly',
      lastAutoPost: null,
    };

    for (const s of settings) {
      const key = s.key.replace(prefix, '');
      if (key === 'autoPost') config.autoPost = s.value === 'true';
      else if (key === 'autoPostFrequency') config.frequency = s.value;
      else if (key === 'lastAutoPost') config.lastAutoPost = s.value;
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('[AutoPost GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/mission-scout/auto-post — Update auto-post settings
export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { autoPost, frequency } = body;

    const entries: { key: string; value: string }[] = [];
    if (autoPost !== undefined) {
      entries.push({ key: `mission_scout_${authUser.id}_autoPost`, value: String(autoPost) });
    }
    if (frequency !== undefined) {
      entries.push({ key: `mission_scout_${authUser.id}_autoPostFrequency`, value: frequency });
    }

    await Promise.all(
      entries.map((e) =>
        db.settings.upsert({
          where: { key: e.key },
          update: { value: e.value },
          create: { key: e.key, value: e.value },
        })
      )
    );

    return NextResponse.json({ success: true, message: 'Paramètres auto-post mis à jour' });
  } catch (error) {
    console.error('[AutoPost PUT] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
