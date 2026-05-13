import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

function generateConnectionMessage(targetName?: string, targetCompany?: string, targetHeadline?: string): string {
  const templates = [
    `Bonjour${targetName ? ' ' + targetName.split(' ')[0] : ''},\n\nJ'ai remarqué votre profil et votre expertise${targetHeadline ? ' en ' + targetHeadline.split('|')[0].trim().toLowerCase() : ''}. Notre entreprise travaille dans un domaine connexe et je pense que nous pourrions avoir des synergies intéressantes.\n\nJe serais ravi d'échanger avec vous sur nos activités mutuelles.\n\nCordialement`,
    `${targetName ? 'Bonjour ' + targetName.split(' ')[0] : 'Bonjour'},\n\nVotre parcours${targetCompany ? ' chez ' + targetCompany : ''} est vraiment impressionnant. Je suis toujours à la recherche de professionnels talentueux avec qui échanger sur les tendances de notre secteur.\n\nAccepteriez-vous de nous connecter ? Je serais heureux d'en apprendre davantage sur votre expérience.\n\nBien à vous`,
    `Bonjour${targetName ? ' ' + targetName.split(' ')[0] : ''},\n\nJe suis tombé sur votre profil et nos domaines d'expertise semblent très complémentaires${targetCompany ? ', notamment votre travail chez ' + targetCompany : ''}.\n\nJe vous invite à rejoindre mon réseau pour échanger sur nos perspectives communes.\n\nCordialement`,
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
    const { targetId, message } = body;

    if (!targetId) {
      return NextResponse.json({ error: 'targetId requis' }, { status: 400 });
    }

    const target = await db.connectionTarget.findFirst({
      where: { id: targetId, userId: authUser.id },
    });

    if (!target) {
      return NextResponse.json({ error: 'Cible non trouvée' }, { status: 404 });
    }

    if (target.status !== 'identified') {
      return NextResponse.json({ error: 'Une invitation a déjà été envoyée' }, { status: 400 });
    }

    const connectionMessage = message || generateConnectionMessage(target.targetName || undefined, target.targetCompany || undefined, target.targetHeadline || undefined);

    const updated = await db.connectionTarget.update({
      where: { id: targetId },
      data: {
        status: 'connection_sent',
        messageSent: connectionMessage,
        connectionDate: new Date(),
      },
    });

    return NextResponse.json({
      target: updated,
      message: connectionMessage,
    });
  } catch (error) {
    console.error('Connect POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
