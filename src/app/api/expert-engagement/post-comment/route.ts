import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import { ExpertEngagementAgent } from '@/lib/agents/expert-engagement';

// POST /api/expert-engagement/post-comment — Publier un commentaire sur LinkedIn
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { postUrn, commentText, domain } = body;

    if (!postUrn || typeof postUrn !== 'string') {
      return NextResponse.json({ error: 'L\'URN du post est requise' }, { status: 400 });
    }

    if (!commentText || typeof commentText !== 'string') {
      return NextResponse.json({ error: 'Le texte du commentaire est requis' }, { status: 400 });
    }

    if (commentText.length > 2000) {
      return NextResponse.json({ error: 'Le commentaire ne doit pas dépasser 2000 caractères' }, { status: 400 });
    }

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Le domaine est requis' }, { status: 400 });
    }

    const result = await ExpertEngagementAgent.postExpertComment(
      authUser.id,
      postUrn,
      commentText,
      domain
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        postedToLinkedIn: true,
      });
    } else {
      return NextResponse.json({
        success: false,
        postedToLinkedIn: false,
        error: result.error,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[ExpertEngagement] Post comment error:', error);
    return NextResponse.json({ error: 'Erreur lors de la publication du commentaire' }, { status: 500 });
  }
}
