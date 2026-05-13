import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

function generateConnectionMessage(targetName?: string, targetCompany?: string, targetHeadline?: string): string {
  const templates = [
    `Bonjour${targetName ? ' ' + targetName.split(' ')[0] : ''},\n\nJ'ai remarqué votre profil et votre expertise${targetHeadline ? ' en ' + targetHeadline.split('|')[0].trim().toLowerCase() : ''}. Notre entreprise travaille dans un domaine connexe et je pense que nous pourrions avoir des synergies intéressantes.\n\nJe serais ravi d'échanger avec vous sur nos activités mutuelles.\n\nCordialement`,
    `${targetName ? 'Bonjour ' + targetName.split(' ')[0] : 'Bonjour'},\n\nVotre parcours${targetCompany ? ' chez ' + targetCompany : ''} est vraiment impressionnant. Je suis toujours à la recherche de professionnels talentueux avec qui échanger sur les tendances de notre secteur.\n\nAccepteriez-vous de nous connecter ? Je serais heureux d'en apprendre davantage sur votre expérience.\n\nBien à vous`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { count = 5 } = body;

    // LinkedIn limit simulation: max 20 per day
    const maxPerDay = 20;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todaySent = await db.connectionTarget.count({
      where: {
        userId: authUser.id,
        connectionDate: { gte: todayStart },
      },
    });

    const remaining = maxPerDay - todaySent;
    if (remaining <= 0) {
      return NextResponse.json({ error: 'Limite quotidienne atteinte (20 invitations/jour)' }, { status: 429 });
    }

    const actualCount = Math.min(count, remaining);

    // Get identified targets with highest relevance score
    const targets = await db.connectionTarget.findMany({
      where: {
        userId: authUser.id,
        status: 'identified',
      },
      orderBy: { relevanceScore: 'desc' },
      take: actualCount,
    });

    if (targets.length === 0) {
      return NextResponse.json({ error: 'Aucune cible identifiée disponible' }, { status: 400 });
    }

    const results = [];
    for (const target of targets) {
      const message = generateConnectionMessage(target.targetName || undefined, target.targetCompany || undefined, target.targetHeadline || undefined);
      const updated = await db.connectionTarget.update({
        where: { id: target.id },
        data: {
          status: 'connection_sent',
          messageSent: message,
          connectionDate: new Date(),
        },
      });
      results.push(updated);
    }

    return NextResponse.json({
      message: `${results.length} invitations envoyées (limite restante aujourd'hui : ${remaining - results.length})`,
      count: results.length,
      remaining: remaining - results.length,
      targets: results,
    });
  } catch (error) {
    console.error('Batch POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
