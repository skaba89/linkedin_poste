import { db } from '@/lib/db';

const TEMPLATES = [
  {
    name: 'Hook + Story + Lesson',
    category: 'storytelling',
    description: 'Structure narrative captivante avec une leçon à la fin',
    structure: `{hook_puissant}\n\n{histoire_personnelle_ou_client}\n\n{moment_cle}\n\n❌ Ce que j\'ai appris :\n{lecon_1}\n{lecon_2}\n{lecon_3}\n\n✅ Et si je devais le refaire :\n{amelioration}\n\n👉 Quel est votre expérience ? Partagez en commentaire.`,
    example: `80% des projets data échouent avant la mise en production.\n\nIl y a 3 ans, j\'ai pris en charge un projet d\'analytique prédictive pour un client retail.\n\nLe budget : 200K€. La deadline : 6 mois.\n\nAu bout de 4 mois, on avait un modèle magnifique.\n\nSauf qu\'il ne prédisait rien de fiable.\n\n❌ Ce que j\'ai appris :\n- Les données brutes ne remplacent jamais le contexte métier\n- Impliquez les utilisateurs finaux dès le jour 1\n- Un MVP fiable vaut mieux qu\'un modèle parfait jamais déployé\n\n✅ Et si je devais le refaire :\nJe commencerais par une solution rule-based, puis j\'ajouterais le ML progressivement.\n\n👉 Quel est votre plus grand échec en data ? Partagez en commentaire.`,
  },
  {
    name: 'Listicle 5 points',
    category: 'listicle',
    description: 'Article structuré en liste avec conseils pratiques',
    structure: `{accroche_numerique}\n\n{introduction_contexte}\n\n1️⃣ {point_1}\n→ {detail_1}\n\n2️⃣ {point_2}\n→ {detail_2}\n\n3️⃣ {point_3}\n→ {detail_3}\n\n4️⃣ {point_4}\n→ {detail_4}\n\n5️⃣ {point_5}\n→ {detail_5}\n\n💡 Bonus : {conseil_bonus}\n\n{cta_engagement}`,
    example: `5 erreurs qui coûtent 150K€/an à une équipe data.\n\nAprès avoir audité 20+ équipes, un pattern se répète systématiquement.\n\n1️⃣ Collecter sans gouvernance\n→ Des lakehouses pleins de fichiers non documentés\n\n2️⃣ Ignorer la qualité des données\n→ Garbage in, garbage out — toujours\n\n3️⃣ Sous-estimer la documentation\n→ Le métier change, les KPIs restent\n\n4️⃣ Ne pas versionner les modèles\n→ Qui produit quoi ? Mystère total\n\n5️⃣ Mesurer la quantité pas la valeur\n→ 50 dashboards, 0 décision prise\n\n💡 Bonus : Commencez par un data catalog. Simple mais transformateur.\n\n👉 Combien de ces erreurs vous reconnaissez ?`,
  },
  {
    name: 'Question Engagement',
    category: 'engagement',
    description: 'Question provocative pour stimuler les interactions',
    structure: `{question_polarisante}\n\n{contexte_bref}\n\n📥 Ma réponse :\n{position_personnelle}\n\n{argument_cle}\n\nEt vous, quel est votre avis ?\n\n👇 Répondez en commentaire, je lis TOUT.`,
    example: `Faut-il toujours embaucher un Data Engineer avant un Data Scientist ?\n\nSujet qui divise dans 100% des projets que j\'accompagne.\n\n📥 Ma réponse :\n\nNON. Pas toujours.\n\nSi vos données sont déjà structurées (ERP, CRM), un Data Scientist autonome peut démarrer seul.\n\nLe Data Engineer devient critique quand :\n- Vous avez des pipelines complexes\n- Volume élevé en temps réel\n- Plusieurs sources hétérogènes\n\nEt vous, quel est votre avis ?\n\n👇 Répondez en commentaire, je lis TOUT.`,
  },
  {
    name: 'Case Client',
    category: 'promotional',
    description: 'Témoignage client avec résultats mesurables',
    structure: `{resultat_choc}\n\n{contexte_client}\n\nLe défi :\n{probleme_initial}\n\nNotre approche :\n{solution_mise_en_place}\n\nLes résultats après {periode} :\n📊 {metrique_1}\n📈 {metrique_2}\n🎯 {metrique_3}\n\n{temoignage_client}\n\n{cta_prospect}`,
    example: `Comment nous avons réduit le churn de 40% en 3 mois.\n\nClient : SaaS B2B, 5000 utilisateurs.\n\nLe défi :\nTaux de churn à 8%/mois. Le CEO pensait que c\'était le marché.\n\nNotre approche :\nSegmentation comportementale + modèle prédictif + actions automatisées.\n\nLes résultats après 3 mois :\n📊 Churn : 8% → 4.8%\n📈 MRR recover : +32K€/mois\n🎯 NPS : 32 → 67\n\n"En 2 semaines on voyait la différence. On aurait dû le faire il y a 2 ans." — CRO du client\n\n👉 Vous voulez les mêmes résultats ? Contactez-moi en MP.`,
  },
  {
    name: 'Leçon Apprise',
    category: 'thought_leadership',
    description: 'Réflexion personnelle authentique et inspirante',
    structure: `{declaration_forte}\n\n{contexte_situation}\n\n{deroulement_evenements}\n\n{prise_conscience}\n\n{reformulation_cle}\n\n{conseil_applicable}\n\n{question_finale}`,
    example: `J\'ai quitté un CDI confortable pour me lancer. Meilleure décision de ma carrière.\n\nIl y a 18 mois, je dirigeais une équipe de 12 personnes.\n\nSalaire correct. Prime annuelle. Belle carte de visite.\n\nMais chaque lundi matin, je ressentais la même chose : un vide.\n\nLe déclic ?\nUn client m\'a dit : "Vous devriez faire ça pour vous."\n\nJ\'ai démissionné 2 semaines plus tard.\n\nAujourd\'hui :\n- Je gagne moins au début\n- Je travaille plus\n- Mais je n\'ai jamais été aussi épanoui\n\nCe que j\'ai appris :\nLe confort est le pire ennemi de l\'ambition.\n\nSi vous hésitez à sauter, posez-vous cette question :\n"Dans 5 ans, regretterai-je de ne pas avoir essayé ?"\n\n👉 Avez-vous déjà pris une décision qui a tout changé ?`,
  },
  {
    name: 'Controverse Nuancée',
    category: 'engagement',
    description: 'Opinion stimulante avec nuances et respect',
    structure: `{opinion_polarisante}\n\n⏸️ Attendez avant de juger.\n\n{nuance_1}\n{nuance_2}\n\nVoici pourquoi :\n\n{argument_developpe}\n\n{exemple_concret}\n\nMon avis final :\n{position_nuancee}\n\nJe sais que certains ne seront pas d\'accord.\nD\'ailleurs, c\'est le but.\n\n👉 Quel est VOTRE avis ? Soyez honnêtes.`,
    example: `Les certifications techniques ne valent plus rien.\n\n⏸️ Attendez avant de juger.\n\nJe ne dis pas que les compétences ne comptent pas.\nJe dis que le FORMAT certification est dépassé.\n\nVoici pourquoi :\n\nUn AWS Solutions Architect certifié ≈ 3 mois d\'étude\n3 mois d\'expérience réelle en production ≈ incomparable\n\nJ\'ai recruté 50+ profils tech cette année.\nTop 3 des critères : projets réels, contributions open-source, capacité à expliquer.\n\nJamais : nombre de badges sur le profil.\n\nMon avis final :\nInvestissez dans des projets, pas dans des examens.\n\nJe sais que certains ne seront pas d\'accord.\nD\'ailleurs, c\'est le but.\n\n👉 Quel est VOTRE avis ? Soyez honnêtes.`,
  },
  {
    name: 'Tutoriel Pas à Pas',
    category: 'howto',
    description: 'Guide pratique avec étapes claires',
    structure: `{promesse_resultat}\n\n{probleme_rencontre}\n\nVoici comment j\'ai fait, étape par étape :\n\nÉtape 1 : {etape_1_titre}\n{etape_1_detail}\n\nÉtape 2 : {etape_2_titre}\n{etape_2_detail}\n\nÉtape 3 : {etape_3_titre}\n{etape_3_detail}\n\n{resultat_obtenu}\n\n{conseil_important}\n\n📸 Sauvegardez ce post pour plus tard.\n\n{cta_suivi}`,
    example: `Comment j\'ai automatisé 80% de mes rapports hebdomadaires.\n\nChaque vendredi, je passais 4 heures sur Excel.\n\nVoici comment j\'ai fait, étape par étape :\n\nÉtape 1 : Identifier les rapports récurrents\n3 dashboards, 2 exports CSV, 1 mail de synthèse.\n\nÉtape 2 : Choisir les bons outils\nPython + Airflow + Looker Studio (gratuit).\n\nÉtape 3 : Construire les pipelines\nWeek 1-2 : Data extraction\nWeek 3 : Transformation\nWeek 4 : Visualisation automatique\n\nRésultat : 4h → 30 min par semaine. Et des rapports plus fiables.\n\nLe conseil que j\'aurais aimé recevoir :\nCommencez petit. Automatisez UN rapport d\'abord.\n\n📸 Sauvegardez ce post pour plus tard.\n\n👉 Quel processus aimeriez-vous automatiser ? Dites-le en commentaire.`,
  },
  {
    name: 'Citation Inspirante',
    category: 'personal',
    description: 'Citation impactante avec réflexion personnelle',
    structure: `"{citation}"\n— {auteur}\n\n{reflexion_personnelle}\n\n{application_pratique}\n\n{question_communaute}`,
    example: `"Le meilleur moment pour planter un arbre était il y a 20 ans. Le deuxième meilleur moment, c\'est maintenant."\n— Proverbe chinois\n\nJ\'ai repensé à cette citation en nettoyant mon bureau ce week-end.\n\nJ\'ai retrouvé une liste de projets "à faire un jour".\nDate : 2019.\n\nEn 5 ans, j\'avais réalisé... 2 items sur 27.\n\nLes 25 autres ? Toujours en attente du "bon moment".\n\nMa règle maintenant :\nSi ça prend moins de 2h, je le fais cette semaine.\n\nEt vous, combien de projets attendent le "bon moment" ?`,
  },
  {
    name: 'Annonce Produit',
    category: 'promotional',
    description: 'Lancement produit/service avec enthousiasme',
    structure: `🚀 {annonce}\n\n{probleme_resolu}\n\nAvant : {situation_avant}\nAprès : {situation_apres}\n\n{fonctionnalites_cles}\n\n🎁 {offre_lancement}\n\n{preuve_sociale}\n\n{cta_action}\n\nLien en commentaire 👇`,
    example: `🚀 On lance la feature que vous attendiez depuis 6 mois.\n\nLe problème :\nVos équipes data passent 60% de leur temps à chercher des données.\n\nAvant : Requêtes SQL éparpillées dans Slack. Tableaux dans Google Sheets. Données jamais à jour.\nAprès : Un catalog centralisé, accessible en 3 clics.\n\nCe que ça inclut :\n🔍 Recherche sémantique\n📋 Profils de données automatisés\n🔗 Lineage end-to-end\n👥 Contrôle d\'accès granulaire\n\n🎁 Offre de lancement : -30% pendant 30 jours\n\n déjà 200+ entreprises en beta.\n\n👉 Réservez votre démo gratuite (lien en commentaire 👇)`,
  },
  {
    name: 'Réflexion Matinale',
    category: 'personal',
    description: 'Pensée personnelle du matin, authentique et réflexive',
    structure: `{observation_matinale}\n\n{reflexion_developpee}\n\n{pivot_pensee}\n\n{lecon_du_jour}\n\nBonne journée à tous 🌅`,
    example: `Lundi matin, 7h34.\n\nJe viens de lire un article sur l\'IA générative.\n108 frameworks sortis cette semaine.\n108.\n\nOn confond vitesse avec valeur.\n\nUn framework ne remplace pas :\n- La compréhension du métier\n- La qualité des données\n- Le bon sens\n\nLa vraie compétence en 2024 :\nSavoir quand NE PAS utiliser l\'IA.\n\nLeçon du jour :\nLa technologie est un outil. Pas un remplacement.\n\nBonne journée à tous 🌅`,
  },
  {
    name: 'Fresque de Connaissances',
    category: 'thought_leadership',
    description: 'Partage de ressources et synthèse de connaissances',
    structure: `{introduction_sujet}\n\n📚 Ce que j\'ai lu/couté cette semaine :\n\n1. {ressource_1}\n→ {takeaway_1}\n\n2. {ressource_2}\n→ {takeaway_2}\n\n3. {ressource_3}\n→ {takeaway_3}\n\n💡 Mon insight principal :\n{synthese_personnelle}\n\n{question_communaute}\n\n♻️ Partagez si ça vous est utile.`,
    example: `3 ressources qui ont changé ma vision du data engineering.\n\n📚 Ce que j\'ai lu cette semaine :\n\n1. "Data Engineering Fundamentals" — O\'Reilly\n→ Les pipelines batch sont morts. Vive le streaming léger.\n\n2. Podcast "Data Skeptic" — Épisode sur les vector databases\n→ L\'embedding n\'est pas que pour le NLP. Cas d\'usage en BI sont sous-exploités.\n\n3. Article de Martin Fowler sur "Data Mesh"\n→ La décentralisation des données ne fonctionne pas sans gouvernance centralisée.\n\n💡 Mon insight principal :\nLe data engineer de 2025 sera 50% ingénieur, 50% "data diplomat" — capable de naviguer entre tech et métier.\n\nQuelle est LA ressource qui vous a le plus impacté ?`,
  },
  {
    name: 'Avant/Après Transformation',
    category: 'storytelling',
    description: 'Comparaison avant/après pour montrer l\'impact',
    structure: `{titre_impact}\n\nBEFORE ❌\n{situation_avant_1}\n{situation_avant_2}\n{situation_avant_3}\n\nAFTER ✅\n{situation_apres_1}\n{situation_apres_2}\n{situation_apres_3}\n\n{detail_changement}\n\n{resultat_chiffre}\n\n{cta_engagement}`,
    example: `Ce qu\'un dashboard LinkedIn reveal en 6 mois.\n\nBEFORE ❌\n📊 2 publications par mois\n💬 3 likes en moyenne\n👥 50 abonnés en 6 mois\n\nAFTER ✅\n📊 5 publications par semaine\n💬 150+ likes en moyenne\n👥 2800 abonnés en 6 mois\n\nLe changement ?\n3 habitudes simples mais systématiques :\n1. Publier à 8h12 (consistently)\n2. Finir chaque post par une question\n3. Commenter 20 posts par jour\n\nRésultat : +5400% d\'engagement.\n\n👉 Quel est le plus gros changement que vous avez fait sur votre stratégie contenu ?`,
  },
];

async function seed() {
  console.log('Seeding post templates...');

  try {
    // Find first user to assign templates to
    const user = await db.user.findFirst();
    if (!user) {
      console.error('No user found. Skipping seed.');
      return;
    }

    for (const tpl of TEMPLATES) {
      const existing = await db.postTemplate.findFirst({
        where: { userId: user.id, name: tpl.name },
      });

      if (!existing) {
        await db.postTemplate.create({
          data: {
            userId: user.id,
            name: tpl.name,
            description: tpl.description,
            category: tpl.category,
            structure: tpl.structure,
            example: tpl.example,
            isPublic: true,
            usageCount: Math.floor(Math.random() * 50) + 5,
          },
        });
        console.log(`✓ Created template: ${tpl.name}`);
      } else {
        console.log(`  Skipped (exists): ${tpl.name}`);
      }
    }

    console.log(`\nDone! Total templates: ${await db.postTemplate.count()}`);
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await db.$disconnect();
  }
}

seed();
