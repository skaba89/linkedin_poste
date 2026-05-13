import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const posts = await db.post.findMany({ take: 3 });

    const demoComments = [
      { postId: posts[0]?.id, authorName: 'Sophie M.', content: 'Excellent article ! Comment appliquer cette stratégie concrètement ?', likes: 3, sentiment: 'question' },
      { postId: posts[0]?.id, authorName: 'Thomas R.', content: 'Super contenu, très utile pour notre équipe marketing', likes: 2, sentiment: 'positive' },
      { postId: posts[0]?.id, authorName: 'Marie L.', content: 'On a des difficultés à reproduire ces résultats, c\'est compliqué', likes: 1, sentiment: 'negative' },
      { postId: posts[1]?.id, authorName: 'Lucas D.', content: 'Pourquoi ne pas parler aussi du pricing ? C\'est un sujet très demandé', likes: 4, sentiment: 'question' },
      { postId: posts[1]?.id, authorName: 'Claire B.', content: 'Bravo pour cette transparence, c\'est rare !', likes: 5, sentiment: 'positive' },
      { postId: posts[1]?.id, authorName: 'Antoine V.', content: 'J\'aimerais un guide étape par étape pour mettre en place', likes: 2, sentiment: 'question' },
      { postId: posts[2]?.id, authorName: 'Emma P.', content: 'Génial ! Quel conseil recommanderiez-vous pour commencer ?', likes: 3, sentiment: 'question' },
      { postId: posts[2]?.id, authorName: 'Julien K.', content: 'Pas d\'accord sur ce point, la quantité a son importance aussi', likes: 1, sentiment: 'negative' },
      { postId: posts[2]?.id, authorName: 'Isabelle F.', content: 'Merci pour ce partage, on a partagé dans notre équipe', likes: 4, sentiment: 'positive' },
    ];

    for (const c of demoComments) {
      if (!c.postId) continue;
      await db.audienceComment.create({ data: c });
    }

    // Also create some demo content ideas
    await db.contentIdea.createMany({
      data: [
        { userId: authUser.id, title: 'Guide : Comment calibrer son scoring LinkedIn', description: 'Répondre à la question fréquente sur la calibration', suggestedFormat: 'howto', suggestedAngle: 'Approche étape par étape', priority: 'high', source: 'audience_feedback' },
        { userId: authUser.id, title: 'Comment résoudre : difficultés de mise en œuvre', description: 'Solution pour les problèmes récurrents', suggestedFormat: 'listicle', suggestedAngle: 'Approche pratique', priority: 'medium', source: 'audience_feedback' },
        { userId: authUser.id, title: 'Deep dive : Pricing et transparence', description: 'Exploration d\'un sujet d\'intérêt', suggestedFormat: 'thought_leadership', suggestedAngle: 'Analyse experte', priority: 'medium', source: 'audience_feedback' },
      ],
    });

    return NextResponse.json({ commentsCreated: demoComments.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
