import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const posts = await db.post.findMany({ take: 5 });
    if (posts.length === 0) return NextResponse.json({ error: 'Aucun post' }, { status: 400 });

    const demoContents = [
      "Comment l'IA transforme le marketing B2B ?\n\n3 vérités surprenantes que personne n'ose dire :\n\n1️⃣ 72% des CTOs utilisent déjà l'IA sans le savoir\n2️⃣ Le content marketing classique est mort\n3️⃣ Les meilleurs posts LinkedIn ont moins de 1300 caractères\n\nPourquoi ? Parce que la valeur est dans l'authenticité.\n\nVous n'êtes pas d'accord ? Dites-le-moi en commentaire 👇",
      "Le secret que les entreprises tech ne veulent pas que vous sachiez...\n\nOn me demande souvent : \"Comment attirer des talents dans un marché tendu ?\"\n\nMa réponse est toujours la même :\n\nArrêtez de publier des offres d'emploi.\nCommencez à publier des problèmes intéressants.\n\nLes meilleurs ingénieurs ne cherchent pas un emploi.\nIls cherchent un défi.\n\nQuel est votre dernier défi technique ? 💡",
      "Thread 🧵 : Les 5 erreurs fatales dans votre stratégie LinkedIn\n\n❌ Erreur #1 : Publier sans accroche\n❌ Erreur #2 : Ignorer les hashtags\n❌ Erreur #3 : Poster aux mauvaises heures\n❌ Erreur #4 : Écrire des blocs de texte\n❌ Erreur #5 : Ne jamais engager avec les commentaires\n\nJ'ai testé chaque erreur sur 100+ posts.\nLes résultats sont sans appel.\n\nSauvez ce post pour plus tard ⭐",
      "Mon équipe a doublé son engagement en 30 jours.\n\nVoici exactement ce qu'on a fait :\n\n→ Remplacement des posts promo par du storytelling\n→ Tests A/B systématiques sur les accroches\n→ Engagement dans les 30 premières minutes\n→ Partage de résultats réels (pas de BS)\n\nLe plus surprenant ?\nLa clé n'était pas le contenu.\nC'était la consistance.\n\nQuelle est votre plus grande difficulté avec LinkedIn ?",
      "Pourquoi je suis passé de 0 à 50K followers en 6 mois :\n\nUn seul changement a fait toute la différence.\n\nJ'ai arrêté de parler de moi.\nEt j'ai commencé à parler de VOUS.\n\nConseil pratique :\n- 80% de vos posts doivent aider votre audience\n- 20% peuvent promouvoir\n- Jamais 100% de promo\n\nEssayez pendant 2 semaines et regardez les chiffres. 📈",
      "L'erreur numéro 1 des entrepreneurs sur LinkedIn :\n\nIls pensent que plus de posts = plus de visibilité.\n\nFAUX.\n\nLa qualité prime sur la quantité. Toujours.\n\nPostez 2x par semaine max.\nPrenez 2h par post.\nMesurez les résultats.\n\nC'est simple. Mais pas facile.\n\nÊtes-vous d'accord avec cette approche ?",
    ];

    // Update existing posts with demo content
    for (let i = 0; i < Math.min(posts.length, demoContents.length); i++) {
      await db.post.update({
        where: { id: posts[i].id },
        data: { finalContent: demoContents[i], status: 'posted' },
      });
    }

    return NextResponse.json({ updated: Math.min(posts.length, demoContents.length) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
