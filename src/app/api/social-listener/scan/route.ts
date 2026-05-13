import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

const SIMULATED_AUTHORS = [
  { name: 'Sophie Martin', url: 'https://linkedin.com/in/sophie-martin' },
  { name: 'Thomas Dubois', url: 'https://linkedin.com/in/thomas-dubois' },
  { name: 'Marie Leclerc', url: 'https://linkedin.com/in/marie-leclerc' },
  { name: 'Pierre Laurent', url: 'https://linkedin.com/in/pierre-laurent' },
  { name: 'Camille Petit', url: 'https://linkedin.com/in/camille-petit' },
  { name: 'Lucas Moreau', url: 'https://linkedin.com/in/lucas-moreau' },
  { name: 'Emma Roux', url: 'https://linkedin.com/in/emma-roux' },
  { name: 'Hugo Garcia', url: 'https://linkedin.com/in/hugo-garcia' },
];

const SIMULATED_MENTIONS = [
  { content: "J'utilise cette solution depuis 6 mois et les résultats sont impressionnants. L'automatisation a transformé notre stratégie.", sentiment: 'positive' },
  { content: "Le service client laisse à désirer. Temps de réponse beaucoup trop long pour un problème critique.", sentiment: 'negative' },
  { content: "Quelqu'un a déjà testé cette nouvelle fonctionnalité ? Je suis curieux de savoir si ça vaut le coup.", sentiment: 'neutral' },
  { content: "Excellent outil pour la gestion de contenu LinkedIn. L'IA propose des suggestions vraiment pertinentes.", sentiment: 'positive' },
  { content: "Le prix est trop élevé par rapport à la concurrence. On trouve mieux pour moins cher.", sentiment: 'negative' },
  { content: "Je recommande vivement cet outil à tous les marketeurs B2B. Gain de temps considérable.", sentiment: 'positive' },
  { content: "La version gratuite est trop limitée pour vraiment évaluer le potentiel du produit.", sentiment: 'neutral' },
  { content: "Support technique inexistant. J'attends une réponse depuis 2 semaines sur un bug bloquant.", sentiment: 'negative' },
  { content: "Superbe intégration avec les autres outils de notre stack marketing. Tout fonctionne parfaitement.", sentiment: 'positive' },
  { content: "Le tableau de bord est bien pensé et les analytics sont très utiles pour notre stratégie.", sentiment: 'positive' },
];

function generateSuggestedReply(keyword: string, sentiment: string): string {
  if (sentiment === 'positive') {
    const replies = [
      `Merci beaucoup pour votre retour positif sur ${keyword} ! Nous sommes ravis que notre solution vous soit utile. N'hésitez pas à nous contacter pour toute question.`,
      `Merci pour ce beau témoignage ! Votre satisfaction est notre priorité. Nous continuons à améliorer ${keyword} chaque jour.`,
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }
  if (sentiment === 'negative') {
    const replies = [
      `Nous sommes désolés d'apprendre cela. Pouvez-vous nous contacter en privé pour que nous puissions résoudre ce problème rapidement ?`,
      `Votre feedback est important. Nous prenons ce point très au sérieux et allons investiguer. Merci de nous avoir alertés.`,
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }
  return `Merci pour votre question ! N'hésitez pas à consulter notre documentation ou à nous contacter directement pour plus d'informations.`;
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const keywords = await db.trackedKeyword.findMany({
      where: { userId: authUser.id, isActive: true },
    });

    if (keywords.length === 0) {
      return NextResponse.json({ error: 'Aucun mot-clé actif à surveiller' }, { status: 400 });
    }

    const newMentions = [];
    const sourceOptions = ['linkedin', 'twitter', 'web'];

    for (const kw of keywords) {
      const count = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < count; i++) {
        const mentionData = SIMULATED_MENTIONS[Math.floor(Math.random() * SIMULATED_MENTIONS.length)];
        const author = SIMULATED_AUTHORS[Math.floor(Math.random() * SIMULATED_AUTHORS.length)];

        const existing = await db.socialMention.findFirst({
          where: {
            userId: authUser.id,
            keyword: kw.keyword,
            content: mentionData.content,
          },
        });

        if (!existing) {
          const mention = await db.socialMention.create({
            data: {
              userId: authUser.id,
              source: sourceOptions[Math.floor(Math.random() * sourceOptions.length)],
              keyword: kw.keyword,
              authorName: author.name,
              authorUrl: author.url,
              content: mentionData.content,
              postUrl: `https://linkedin.com/posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              sentiment: mentionData.sentiment,
              relevanceScore: Math.floor(Math.random() * 40) + 60,
              suggestedReply: generateSuggestedReply(kw.keyword, mentionData.sentiment),
            },
          });

          newMentions.push(mention);

          if (mentionData.sentiment === 'negative') {
            await db.notification.create({
              data: {
                userId: authUser.id,
                type: 'system',
                title: 'Mention négative détectée',
                message: `Une mention négative pour "${kw.keyword}" a été trouvée : ${mention.content.slice(0, 80)}...`,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({
      message: `Scan terminé : ${newMentions.length} nouvelles mentions trouvées`,
      count: newMentions.length,
      mentions: newMentions,
    });
  } catch (error) {
    console.error('Scan POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
