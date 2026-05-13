import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const { getAuthUser } = await import('@/lib/auth_helpers');
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Admin uniquement' }, { status: 403 });
    }

    // Check if seed data already exists
    const existingPosts = await db.post.count();
    if (existingPosts > 0) {
      return NextResponse.json(
        { error: 'Des données existent déjà. Supprimez la base avant de réinitialiser.' },
        { status: 400 }
      );
    }

    // Create demo users
    const adminPassword = await hashPassword('admin123');
    const editorPassword = await hashPassword('editor123');
    const validatorPassword = await hashPassword('validator123');

    // Ensure at least the admin exists
    let admin = await db.user.findFirst({ where: { role: 'admin' } });
    if (!admin) {
      admin = await db.user.create({
        data: {
          email: 'admin@entreprise.com',
          name: 'Admin Principal',
          password: adminPassword,
          role: 'admin',
        },
      });
    }

    let editor = await db.user.findFirst({ where: { role: 'editor', email: 'editor@entreprise.com' } });
    if (!editor) {
      editor = await db.user.create({
        data: {
          email: 'editor@entreprise.com',
          name: 'Marie Éditeur',
          password: editorPassword,
          role: 'editor',
        },
      });
    }

    let validator = await db.user.findFirst({ where: { role: 'validator', email: 'validator@entreprise.com' } });
    if (!validator) {
      validator = await db.user.create({
        data: {
          email: 'validator@entreprise.com',
          name: 'Thomas Valideur',
          password: validatorPassword,
          role: 'validator',
        },
      });
    }

    // Create demo posts with different statuses
    const postsData = [
      {
        subject: '5 tendances IA en 2026 qui vont transformer votre entreprise',
        angle: 'Perspective expert avec données chiffrées',
        audience: 'Décideurs B2B, CTO, CDO',
        cta: 'Abonnez-vous pour notre newsletter hebdomadaire',
        hashtags: '#IA #Innovation #B2B #Tech2026 #TransformationDigitale',
        aiProvider: 'openrouter',
        status: 'idea',
        authorId: editor.id,
      },
      {
        subject: 'Comment notre équipe a boosté sa productivité de 300% avec l\'automatisation',
        angle: 'Storytelling interne, cas d\'usage réel',
        audience: 'Managers, directeurs opérationnels',
        cta: 'Découvrez notre méthode dans le lien ci-dessous',
        hashtags: '#Productivité #Automatisation #Management',
        aiProvider: 'groq',
        status: 'draft',
        authorId: editor.id,
      },
      {
        subject: 'Notre nouvelle solution SaaS : la révolution du contenu LinkedIn',
        angle: 'Lancement produit, ton enthousiaste',
        audience: 'Marketeurs B2B, community managers',
        cta: 'Inscrivez-vous à la version bêta gratuite',
        hashtags: '#SaaS #LinkedIn #ContentMarketing #Lancement',
        aiProvider: 'glm',
        status: 'pending_approval',
        finalContent: 'After months of development, we\'re thrilled to announce our new LinkedIn content management tool.\n\nManaging LinkedIn content for your company page shouldn\'t be chaotic.\n\nThat\'s why we built LinkedInPost — an internal SaaS that helps teams:\n\n✓ Create content ideas collaboratively\n✓ Generate AI-powered post variants\n✓ Enforce human validation before publishing\n✓ Track performance and audit everything\n\nThe result? Better content, fewer errors, full compliance.\n\nWho else is tired of juggling spreadsheets and Slack threads for content management?\n\n#SaaS #LinkedIn #ContentMarketing',
        authorId: editor.id,
      },
      {
        subject: 'Les 7 erreurs fatales dans une stratégie de content marketing B2B',
        angle: 'Listicle éducatif avec exemples concrets',
        audience: 'CMO, directeurs marketing',
        cta: 'Téléchargez notre guide gratuit',
        hashtags: '#ContentMarketing #B2B #Marketing #Stratégie',
        aiProvider: 'openrouter',
        status: 'approved',
        finalContent: 'After 10 years in B2B marketing, I\'ve seen companies repeat the same content mistakes.\n\nHere are the 7 most deadly ones:\n\n1. Posting without a strategy\nRandom content = random results.\n\n2. Ignoring the buyer\'s journey\nEvery piece of content should match a stage.\n\n3. Talking only about yourself\nYour audience doesn\'t care about your product. They care about their problems.\n\n4. Inconsistent publishing\nOne post per month won\'t build authority.\n\n5. No CTA\nIf you don\'t ask, you don\'t get.\n\n6. Forgetting LinkedIn\'s algorithm\nEngagement in the first hour is critical.\n\n7. Not measuring results\nWhat gets measured gets improved.\n\nWhich one resonates most with you?\n\n#ContentMarketing #B2B #Marketing',
        authorId: admin.id,
      },
      {
        subject: 'Interview exclusive : le CEO de TechCorp sur l\'avenir du travail hybride',
        angle: 'Format interview, citations inspirantes',
        audience: 'RH, dirigeants, professionnels',
        cta: 'Retrouvez l\'intégralité de l\'interview sur notre blog',
        hashtags: '#FutureOfWork #Hybrid #Leadership #RH',
        aiProvider: 'groq',
        status: 'posted',
        finalContent: 'I sat down with Jean-Marc Durand, CEO of TechCorp, to discuss the future of work.\n\nHis take? "The office isn\'t dead — but the 5-day week might be."\n\nHere are the 3 key insights from our conversation:\n\n→ Flexibility is no longer a perk, it\'s an expectation\n→ The best teams meet 2-3 days per week, max\n→ Culture is built through rituals, not desks\n\n"The companies that will win the talent war are those that trust their people to deliver results, not hours," he told me.\n\nStrong words. But the data backs him up.\n\nTechCorp has seen a 40% increase in employee satisfaction since implementing their hybrid policy.\n\nThoughts?\n\n#FutureOfWork #Hybrid #Leadership',
        linkedinPostId: 'demo-linkedin-post-001',
        authorId: editor.id,
      },
      {
        subject: 'Pourquoi la data est votre meilleur atout en prospection B2B',
        angle: 'Analytique, conviction par les chiffres',
        audience: 'Equipes sales, business developers',
        cta: 'Réservez une démo de notre outil d\'analyse',
        hashtags: '#Data #B2B #Sales #Prospection',
        aiProvider: 'glm',
        status: 'failed',
        finalContent: 'Les entreprises qui utilisent la data en prospection B2B ont 2.5x plus de chances de conclure un deal.\n\nPourtant, 78% des équipes commerciales prennent encore des décisions à l\'aveugle.\n\nVoici 3 façons dont la data transforme la prospection :\n\n1. Scoring prédictif : identifiez les leads les plus chauds\n2. Timing optimal : contactez au bon moment\n3. Personnalisation : adaptez chaque interaction\n\nLa data n\'est pas l\'avenir de la vente. Elle est le présent.',
        errorMessage: 'LinkedIn API error: Token expired. Please reconnect.',
        authorId: editor.id,
      },
    ];

    const posts: any[] = [];
    for (const postData of postsData) {
      const post = await db.post.create({
        data: postData,
        include: { author: { select: { id: true, name: true, email: true, role: true } } },
      });
      posts.push(post);
    }

    // Create some demo AI variants for the pending_approval post
    const pendingPost = posts.find(p => p.status === 'pending_approval');
    if (pendingPost) {
      await db.aIVariant.createMany({
        data: [
          {
            postId: pendingPost.id,
            content: '🔥 We just launched something BIG.\n\nAfter 6 months of R&D, our team is proud to introduce LinkedInPost — the tool that will change how B2B companies manage their LinkedIn content.\n\nThe problem? Content management is chaos.\n- Ideas get lost in Slack\n- No validation workflow\n- Publishing is manual and error-prone\n\nThe solution? One platform that handles everything.\n\nLinkedInPost = Ideas → AI Generation → Human Validation → Auto-publish\n\nBuilt by a team that eats its own dog food.\n\n#SaaS #LinkedIn #ContentMarketing #B2B',
            variantIndex: 0,
            provider: 'openrouter',
          },
          {
            postId: pendingPost.id,
            content: 'If your team manages LinkedIn content through spreadsheets and email threads, this is for you.\n\nWe built LinkedInPost because we were frustrated too.\n\nHere\'s what it does:\n\n→ Capture content ideas in one place\n→ Generate 3 AI variants per post (OpenRouter, Groq, or GLM)\n→ Enforce human validation before ANY publication\n→ Auto-publish to your company page\n→ Full audit trail for compliance\n\nNo more accidental publishes. No more "who approved this?" debates.\n\nJust clean, compliant, effective LinkedIn content.\n\n#SaaS #ContentManagement #LinkedIn',
            variantIndex: 1,
            provider: 'openrouter',
          },
          {
            postId: pendingPost.id,
            content: 'Content marketing teams waste 15+ hours per week on manual processes.\n\nWe did the math. Then we built the solution.\n\nLinkedInPost streamlines your entire LinkedIn content workflow:\n\n1. Ideation: Capture ideas anytime, anywhere\n2. Creation: AI generates multiple variants instantly\n3. Validation: Built-in approval workflow\n4. Publishing: One-click to your company page\n\nThe result? Our beta users report 70% time savings and 3x more consistent posting.\n\nTry it free.\n\n#Productivity #SaaS #LinkedIn #ContentMarketing',
            variantIndex: 2,
            provider: 'openrouter',
          },
        ],
      });

      // Add a validation for the approved post
      const approvedPost = posts.find(p => p.status === 'approved');
      if (approvedPost) {
        await db.validationLog.create({
          data: {
            postId: approvedPost.id,
            userId: validator.id,
            action: 'approve',
            comment: 'Excellent contenu, très bien structuré. Les 7 points sont pertinents et le CTA est clair.',
          },
        });
      }

      // Add validation for the pending post
      await db.validationLog.create({
        data: {
          postId: pendingPost.id,
          userId: validator.id,
          action: 'request_changes',
          comment: 'Bonne base mais le ton est trop promotionnel. Adoucir l\'approche et ajouter plus de valeur éducative.',
        },
      });

      // Add publication log for the posted post
      const postedPost = posts.find(p => p.status === 'posted');
      if (postedPost) {
        await db.publicationLog.create({
          data: {
            postId: postedPost.id,
            status: 'success',
            linkedinPostId: 'demo-linkedin-post-001',
            publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // Add publication log for the failed post
      const failedPost = posts.find(p => p.status === 'failed');
      if (failedPost) {
        await db.publicationLog.create({
          data: {
            postId: failedPost.id,
            status: 'failed',
            errorMessage: 'LinkedIn API error: Token expired. Please reconnect.',
          },
        });
      }
    }

    await createAuditLog({
      entityType: 'System',
      action: 'seed_data',
      userId: authUser.id,
      metadata: { 
        usersCreated: 3, 
        postsCreated: postsData.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Données de démonstration créées',
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création des données' }, { status: 500 });
  }
}
