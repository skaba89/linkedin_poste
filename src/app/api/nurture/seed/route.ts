import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';

const DEFAULT_SEQUENCES = [
  {
    name: 'Séquence Prospection Standard',
    description: 'Séquence complète de prospection en 5 étapes pour de nouveaux prospects LinkedIn.',
    channel: 'linkedin',
    isActive: true,
    steps: [
      {
        delay: '0d',
        channel: 'linkedin',
        type: 'connection',
        template: "Bonjour {firstName}, j'ai remarqué votre profil et votre parcours chez {company} est impressionnant. Je serais ravi(e) d'échanger avec vous sur nos sujets communs.",
        aiGenerated: true,
      },
      {
        delay: '2d',
        channel: 'linkedin',
        type: 'message',
        template: "Merci d'avoir accepté ma connexion ! Je travaille dans le domaine de {domain} et j'aide les entreprises comme {company} à {valueProp}. Y a-t-il un sujet en particulier qui vous intéresse ?",
        aiGenerated: true,
      },
      {
        delay: '5d',
        channel: 'linkedin',
        type: 'message',
        template: "Je voulais partager avec vous ce contenu qui pourrait vous intéresser : [Case Study/Article pertinent]. Il aborde un défi que beaucoup de professionnels dans votre secteur rencontrent. Qu'en pensez-vous ?",
        aiGenerated: true,
      },
      {
        delay: '10d',
        channel: 'linkedin',
        type: 'message',
        template: "Suite à nos échanges, je pensais qu'il pourrait être intéressant de discuter plus en détail de la façon dont nous pourrions collaborer. Seriez-vous disponible pour un appel de 15 minutes cette semaine ?",
        aiGenerated: true,
      },
      {
        delay: '15d',
        channel: 'linkedin',
        type: 'message',
        template: "Je comprends que vous êtes très occupé(e). N'hésitez pas à me contacter quand le moment sera venu. Je reste à votre disposition pour échanger sur {sujet}. Bonne continuation !",
        aiGenerated: true,
      },
    ],
  },
  {
    name: 'Séquence Relance Post-Événement',
    description: 'Séquence de 3 étapes pour relancer les contacts après un événement ou salon professionnel.',
    channel: 'linkedin',
    isActive: true,
    steps: [
      {
        delay: '0d',
        channel: 'linkedin',
        type: 'message',
        template: "Bonjour {firstName}, suite à notre échange lors de {event}, c'était un plaisir de vous rencontrer ! J'aurais aimé prolonger notre discussion sur {topic}. Comment se passent vos projets depuis ?",
        aiGenerated: true,
      },
      {
        delay: '3d',
        channel: 'linkedin',
        type: 'message',
        template: "Suite à notre discussion sur {topic}, voici une ressource qui pourrait vous être utile : [Article/Guide/Lien]. Elle aborde exactement le point dont nous parlions. Je serais curieux d'avoir votre retour.",
        aiGenerated: true,
      },
      {
        delay: '7d',
        channel: 'linkedin',
        type: 'message',
        template: "Bonjour {firstName}, pour faire suite à notre échange à {event} et à la ressource partagée, je vous propose un appel découverte de 20 minutes pour explorer comment nous pourrions collaborer. Quelle disponibilité auriez-vous prochainement ?",
        aiGenerated: true,
      },
    ],
  },
  {
    name: 'Séquence Ré-engagement',
    description: 'Séquence de 4 étapes pour ré-engager des prospects inactifs ou froids.',
    channel: 'linkedin',
    isActive: true,
    steps: [
      {
        delay: '0d',
        channel: 'linkedin',
        type: 'message',
        template: "Bonjour {firstName}, ça fait un moment ! Je repensais à notre échange de l'an dernier et je me demandais comment se passaient vos projets chez {company}. De nouvelles perspectives depuis ?",
        aiGenerated: true,
      },
      {
        delay: '4d',
        channel: 'linkedin',
        type: 'message',
        template: "Je voulais partager une actualité intéressante dans votre secteur : {news}. Je me suis dit que cela pourrait vous être utile vu votre rôle chez {company}. Avez-vous vu les récents développements autour de {topic} ?",
        aiGenerated: true,
      },
      {
        delay: '8d',
        channel: 'linkedin',
        type: 'message',
        template: "Je travaille actuellement avec plusieurs entreprises similaires à {company} et les résultats sont très positifs. Voici un témoignage récent : [Témoignage/Case study]. Pensez-vous que ce type d'approche pourrait vous intéresser ?",
        aiGenerated: true,
      },
      {
        delay: '14d',
        channel: 'linkedin',
        type: 'message',
        template: "Bonjour {firstName}, pour conclure notre échange, je vous propose un appel rapide de 15 minutes pour vous présenter concrètement comment nous pourrions vous aider. Un simple 'oui' et je vous envoie un lien !",
        aiGenerated: true,
      },
    ],
  },
];

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `nurture:seed:${authUser.id}`);
    if (rlResult) return rlResult;

    // Check if default sequences already exist
    const existingCount = await db.nurtureSequence.count({
      where: {
        userId: authUser.id,
        name: { in: DEFAULT_SEQUENCES.map((s) => s.name) },
      },
    });

    if (existingCount > 0) {
      return NextResponse.json({
        created: 0,
        message: 'Les séquences par défaut existent déjà',
      });
    }

    // Create all default sequences
    const created = await db.nurtureSequence.createMany({
      data: DEFAULT_SEQUENCES.map((seq) => ({
        userId: authUser.id,
        name: seq.name,
        description: seq.description,
        channel: seq.channel,
        steps: JSON.stringify(seq.steps),
        isActive: seq.isActive,
      })),
    });

    return NextResponse.json({
      created: created.count,
      message: `${created.count} séquences par défaut créées`,
    });
  } catch (error) {
    console.error('Nurture seed POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
