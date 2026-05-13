import { NextResponse } from 'next/server';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { generateHashtags } from '@/lib/ai-providers';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const body = await request.json();
    const { subject, audience } = body;

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Le sujet est requis' }, { status: 400 });
    }

    const hashtags = await generateHashtags(subject.trim(), audience?.trim() || undefined);

    return NextResponse.json({ hashtags });
  } catch (error) {
    console.error('Hashtag suggestion error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suggestion de hashtags. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
