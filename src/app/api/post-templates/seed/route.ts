import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';

const TEMPLATES = [
  {
    name: 'Hook + Story + Lesson',
    category: 'storytelling',
    description: 'Structure narrative captivante avec une leçon à la fin',
    structure: `{hook_puissant}\n\n{histoire_personnelle_ou_client}\n\n{moment_cle}\n\n❌ Ce que j\'ai appris :\n{lecon_1}\n{lecon_2}\n{lecon_3}\n\n✅ Et si je devais le refaire :\n{amelioration}\n\n👉 Quel est votre expérience ? Partagez en commentaire.`,
    example: `80% des projets data échouent avant la mise en production.\n\nIl y a 3 ans, j\'ai pris en charge un projet d\'analytique prédictive.\n\nAu bout de 4 mois, on avait un modèle magnifique.\nSauf qu\'il ne prédisait rien de fiable.\n\n❌ Ce que j\'ai appris :\n- Les données brutes ne remplacent jamais le contexte métier\n- Impliquez les utilisateurs finaux dès le jour 1\n- Un MVP fiable vaut mieux qu\'un modèle parfait jamais déployé\n\n✅ Et si je devais le refaire :\nJe commencerais par une solution rule-based, puis j\'ajouterais le ML progressivement.`,
  },
  {
    name: 'Listicle 5 points',
    category: 'listicle',
    description: 'Article structuré en liste avec conseils pratiques',
    structure: `{accroche_numerique}\n\n{introduction_contexte}\n\n1️⃣ {point_1}\n→ {detail_1}\n\n2️⃣ {point_2}\n→ {detail_2}\n\n3️⃣ {point_3}\n→ {detail_3}\n\n4️⃣ {point_4}\n→ {detail_4}\n\n5️⃣ {point_5}\n→ {detail_5}\n\n💡 Bonus : {conseil_bonus}\n\n{cta_engagement}`,
    example: `5 erreurs qui coûtent 150K€/an à une équipe data.\n\n1️⃣ Collecter sans gouvernance\n→ Des lakehouses pleins de fichiers non documentés\n\n2️⃣ Ignorer la qualité des données\n→ Garbage in, garbage out — toujours\n\n3️⃣ Sous-estimer la documentation\n→ Le métier change, les KPIs restent\n\n4️⃣ Ne pas versionner les modèles\n→ Qui produit quoi ? Mystère total\n\n5️⃣ Mesurer la quantité pas la valeur\n→ 50 dashboards, 0 décision prise\n\n💡 Bonus : Commencez par un data catalog.`,
  },
  {
    name: 'Question Engagement',
    category: 'engagement',
    description: 'Question provocatrice pour stimuler les interactions',
    structure: `{question_polarisante}\n\n{contexte_bref}\n\n📥 Ma réponse :\n{position_personnelle}\n\n{argument_cle}\n\nEt vous, quel est votre avis ?\n\n👇 Répondez en commentaire, je lis TOUT.`,
    example: `Faut-il toujours embaucher un Data Engineer avant un Data Scientist ?\n\n📥 Ma réponse :\nNON. Pas toujours.\n\nSi vos données sont déjà structurées, un Data Scientist autonome peut démarrer seul.\nLe Data Engineer devient critique quand les pipelines sont complexes.`,
  },
  {
    name: 'Case Client',
    category: 'promotional',
    description: 'Témoignage client avec résultats mesurables',
    structure: `{resultat_choc}\n\n{contexte_client}\n\nLe défi :\n{probleme_initial}\n\nNotre approche :\n{solution_mise_en_place}\n\nLes résultats après {periode} :\n📊 {metrique_1}\n📈 {metrique_2}\n🎯 {metrique_3}\n\n{temoignage_client}\n\n{cta_prospect}`,
    example: `Comment nous avons réduit le churn de 40% en 3 mois.\n\n📊 Churn : 8% → 4.8%\n📈 MRR recover : +32K€/mois\n🎯 NPS : 32 → 67`,
  },
  {
    name: 'Leçon Apprise',
    category: 'thought_leadership',
    description: 'Réflexion personnelle authentique et inspirante',
    structure: `{declaration_forte}\n\n{contexte_situation}\n\n{deroulement_evenements}\n\n{prise_conscience}\n\n{reformulation_cle}\n\n{conseil_applicable}\n\n{question_finale}`,
    example: `J\'ai quitté un CDI confortable pour me lancer. Meilleure décision de ma carrière.\n\nCe que j\'ai appris :\nLe confort est le pire ennemi de l\'ambition.`,
  },
  {
    name: 'Controverse Nuancée',
    category: 'engagement',
    description: 'Opinion stimulante avec nuances et respect',
    structure: `{opinion_polarisante}\n\n⏸️ Attendez avant de juger.\n\n{nuance_1}\n{nuance_2}\n\nVoici pourquoi :\n\n{argument_developpe}\n\n{exemple_concret}\n\nMon avis final :\n{position_nuancee}\n\nJe sais que certains ne seront pas d\'accord.\n\n👉 Quel est VOTRE avis ? Soyez honnêtes.`,
    example: `Les certifications techniques ne valent plus rien.\n\n⏸️ Attendez avant de juger.\n\nJe ne dis pas que les compétences ne comptent pas.\nJe dis que le FORMAT certification est dépassé.\n\nMon avis final :\nInvestissez dans des projets, pas dans des examens.`,
  },
  {
    name: 'Tutoriel Pas à Pas',
    category: 'howto',
    description: 'Guide pratique avec étapes claires',
    structure: `{promesse_resultat}\n\n{probleme_rencontre}\n\nVoici comment j\'ai fait, étape par étape :\n\nÉtape 1 : {etape_1_titre}\n{etape_1_detail}\n\nÉtape 2 : {etape_2_titre}\n{etape_2_detail}\n\nÉtape 3 : {etape_3_titre}\n{etape_3_detail}\n\n{resultat_obtenu}\n\n{conseil_important}\n\n📸 Sauvegardez ce post pour plus tard.\n\n{cta_suivi}`,
    example: `Comment j\'ai automatisé 80% de mes rapports hebdomadaires.\n\nRésultat : 4h → 30 min par semaine.`,
  },
  {
    name: 'Citation Inspirante',
    category: 'personal',
    description: 'Citation impactante avec réflexion personnelle',
    structure: `"{citation}"\n— {auteur}\n\n{reflexion_personnelle}\n\n{application_pratique}\n\n{question_communaute}`,
    example: `"Le meilleur moment pour planter un arbre était il y a 20 ans. Le deuxième meilleur moment, c\'est maintenant."\n— Proverbe chinois`,
  },
  {
    name: 'Annonce Produit',
    category: 'promotional',
    description: 'Lancement produit/service avec enthousiasme',
    structure: `🚀 {annonce}\n\n{probleme_resolu}\n\nAvant : {situation_avant}\nAprès : {situation_apres}\n\n{fonctionnalites_cles}\n\n🎁 {offre_lancement}\n\n{preuve_sociale}\n\n{cta_action}\n\nLien en commentaire 👇`,
    example: `🚀 On lance la feature que vous attendiez depuis 6 mois.\n\n🎁 Offre de lancement : -30% pendant 30 jours`,
  },
  {
    name: 'Réflexion Matinale',
    category: 'personal',
    description: 'Pensée personnelle du matin, authentique et réflexive',
    structure: `{observation_matinale}\n\n{reflexion_developpee}\n\n{pivot_pensee}\n\n{lecon_du_jour}\n\nBonne journée à tous 🌅`,
    example: `Lundi matin, 7h34.\n\n108 frameworks IA sortis cette semaine. On confond vitesse avec valeur.\n\nLeçon du jour :\nLa technologie est un outil. Pas un remplacement.\n\nBonne journée à tous 🌅`,
  },
  {
    name: 'Fresque de Connaissances',
    category: 'thought_leadership',
    description: 'Partage de ressources et synthèse de connaissances',
    structure: `{introduction_sujet}\n\n📚 Ce que j\'ai lu/couté cette semaine :\n\n1. {ressource_1}\n→ {takeaway_1}\n\n2. {ressource_2}\n→ {takeaway_2}\n\n3. {ressource_3}\n→ {takeaway_3}\n\n💡 Mon insight principal :\n{synthese_personnelle}\n\n{question_communaute}\n\n♻️ Partagez si ça vous est utile.`,
    example: `3 ressources qui ont changé ma vision du data engineering.\n\n💡 Mon insight principal :\nLe data engineer de 2025 sera 50% ingénieur, 50% "data diplomat".`,
  },
  {
    name: 'Avant/Après Transformation',
    category: 'storytelling',
    description: 'Comparaison avant/après pour montrer l\'impact',
    structure: `{titre_impact}\n\nBEFORE ❌\n{situation_avant_1}\n{situation_avant_2}\n{situation_avant_3}\n\nAFTER ✅\n{situation_apres_1}\n{situation_apres_2}\n{situation_apres_3}\n\n{detail_changement}\n\n{resultat_chiffre}\n\n{cta_engagement}`,
    example: `BEFORE : 2 publications/mois, 3 likes en moyenne\nAFTER : 5 publications/semaine, 150+ likes\n\nRésultat : +5400% d\'engagement.`,
  },
];

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin')) {
      return NextResponse.json({ error: 'Admin uniquement' }, { status: 403 });
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const tpl of TEMPLATES) {
      const existing = await db.postTemplate.findFirst({
        where: { userId: authUser.id, name: tpl.name },
      });

      if (!existing) {
        await db.postTemplate.create({
          data: {
            userId: authUser.id,
            name: tpl.name,
            description: tpl.description,
            category: tpl.category,
            structure: tpl.structure,
            example: tpl.example,
            isPublic: true,
            usageCount: Math.floor(Math.random() * 50) + 5,
          },
        });
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      created: createdCount,
      skipped: skippedCount,
      total: TEMPLATES.length,
    });
  } catch (error) {
    console.error('Template seed error:', error);
    return NextResponse.json({ error: 'Erreur lors du seed des templates' }, { status: 500 });
  }
}
