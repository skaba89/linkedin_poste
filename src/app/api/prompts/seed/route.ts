import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

const DEFAULT_TEMPLATES = [
  {
    name: 'Thought Leadership',
    description: 'Positionnez-vous comme expert avec une prise de position forte sur un sujet de votre domaine.',
    category: 'thought_leadership',
    prompt: 'Rédige un post LinkedIn de type "Thought Leadership" sur le sujet suivant : {sujet}.\n\nLe post doit :\n- Commencer par une affirmation forte ou un constat surprenant\n- Développer 3 arguments clés avec des exemples concrets\n- Se terminer par une leçon ou une vision prospective\n- Ton : expert, crédible, visionnaire\n- Longueur : 150-200 mots\n- Style : paragraphes courts, pas de puces',
    variables: JSON.stringify([
      { name: 'sujet', required: true, placeholder: 'Le sujet sur lequel vous voulez prendre position' },
    ]),
    isDefault: true,
  },
  {
    name: 'Listicle',
    description: 'Un post structuré en liste numérotée, parfait pour maximiser l\'engagement.',
    category: 'listicle',
    prompt: 'Rédige un post LinkedIn de type "Listicle" avec le thème suivant : {sujet}\n\nLe post doit :\n- Avoir un hook accrocheur en introduction\n- Contenir {nombre} points/items numérotés\n- Chaque point doit être concis (1-2 phrases) avec un exemple ou astuce\n- Terminer par une question d\'engagement\n- Ton : pratique, direct, value-driven\n- Longueur : 200-250 mots',
    variables: JSON.stringify([
      { name: 'sujet', required: true, placeholder: 'Le thème de la liste (ex: erreurs à éviter, conseils pour...)' },
      { name: 'nombre', required: false, placeholder: 'Nombre de points (ex: 5, 7, 10)' },
    ]),
    isDefault: true,
  },
  {
    name: 'Storytelling',
    description: 'Racontez une histoire personnelle pour créer une connexion émotionnelle avec votre audience.',
    category: 'storytelling',
    prompt: 'Rédige un post LinkedIn de type "Storytelling" basé sur l\'expérience suivante : {experience}\n\nLe post doit :\n- Commencer in media res (au cœur de l\'action)\n- Raconter une histoire avec un début, un rebondissement et une résolution\n- Inclure des émotions et des détails sensoriels\n- Terminer par une leçon apprise applicable\n- Ton : authentique, vulnérable, inspirant\n- Longueur : 200-300 mots\n- Utiliser des sauts de ligne pour le rythme narratif',
    variables: JSON.stringify([
      { name: 'experience', required: true, placeholder: 'Décrivez brièvement l\'expérience à raconter' },
    ]),
    isDefault: true,
  },
  {
    name: 'Controverse',
    description: 'Une prise de position provocante pour susciter le débat et les commentaires.',
    category: 'controverse',
    prompt: 'Rédige un post LinkedIn de type "Controverse" avec la position suivante : {position}\n\nLe post doit :\n- Ouvrir avec une affirmation contre-intuitive ou provocante\n- Donner 2-3 arguments solides qui soutiennent cette position\n- Anticiper et réfuter la contre-argumentation principale\n- Poser une question ouverte pour encourager le débat\n- Ton : confiant, nuancé, respectueux mais tranché\n- Longueur : 150-200 mots\n- Attention : rester professionnel, pas de troll',
    variables: JSON.stringify([
      { name: 'position', required: true, placeholder: 'La position provocante que vous défendez' },
    ]),
    isDefault: true,
  },
  {
    name: 'Guide Pratique',
    description: 'Un tutoriel étape par étape pour partager votre expertise technique ou méthodologique.',
    category: 'howto',
    prompt: 'Rédige un post LinkedIn de type "Guide Pratique" pour : {sujet}\n\nLe post doit :\n- Commencer par le problème que ce guide résout\n- Présenter les étapes claires (étape 1, étape 2, etc.)\n- Chaque étape avec une instruction actionnable\n- Inclure un conseil pro ou une astuce à la fin\n- Terminer par un CTA (commentez pour la version détaillée)\n- Ton : pédagogique, structuré, bienveillant\n- Longueur : 200-280 mots',
    variables: JSON.stringify([
      { name: 'sujet', required: true, placeholder: 'Le sujet du guide pratique (ex: Comment lancer sa newsletter)' },
    ]),
    isDefault: true,
  },
  {
    name: 'Engagement',
    description: 'Un post axé sur les commentaires et interactions, idéal pour booster la visibilité.',
    category: 'engagement',
    prompt: 'Rédige un post LinkedIn de type "Engagement" sur le sujet : {sujet}\n\nLe post doit :\n- Avoir un hook ultra-percutant (question, statistique surprenante, affirmation forte)\n- Présenter 2 perspectives opposées ou complémentaires\n- Demander explicitement l\'avis des lecteurs\n- Proposer un choix binaire (Option A vs Option B)\n- Ton : conversationnel, inclusif, curieux\n- Longueur : 100-150 mots (court pour maximiser les commentaires)\n- Terminer par "Et vous, quel est votre avis ?"',
    variables: JSON.stringify([
      { name: 'sujet', required: true, placeholder: 'Le sujet de discussion' },
    ]),
    isDefault: true,
  },
];

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Check if templates already exist
    const count = await db.promptTemplate.count();
    if (count > 0) {
      return NextResponse.json({ message: 'Les templates par défaut existent déjà', seeded: false });
    }

    // Seed default templates
    await db.promptTemplate.createMany({
      data: DEFAULT_TEMPLATES.map((t) => ({
        ...t,
        authorId: authUser.id,
      })),
    });

    return NextResponse.json({ message: 'Templates par défaut créés', seeded: true, count: DEFAULT_TEMPLATES.length });
  } catch (error) {
    console.error('Prompts seed error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
