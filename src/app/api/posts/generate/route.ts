import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';
import { generatePostVariants } from '@/lib/ai-providers';
import { scoreContent } from '@/lib/content-scorer';
import { rateLimit } from '@/lib/rate-limit';
import type { AIProvider } from '@/types';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    // Rate limit: 10 generations per hour per user
    if (!rateLimit(`generate:${authUser.id}`, 10, 3600000)) {
      return NextResponse.json(
        { error: 'Limite de génération atteinte. Maximum 10 par heure.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { postId, provider, tone, length } = body;

    if (!postId) {
      return NextResponse.json({ error: 'ID du post requis' }, { status: 400 });
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      include: { author: { select: { id: true, name: true } } },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 });
    }

    const aiProvider: AIProvider = (provider || post.aiProvider) as AIProvider;
    const variants = await generatePostVariants({
      subject: post.subject,
      angle: post.angle || undefined,
      audience: post.audience || undefined,
      cta: post.cta || undefined,
      hashtags: post.hashtags || undefined,
      provider: aiProvider,
      tone: tone || undefined,
      length: length || undefined,
    });

    // Delete previous variants and save new ones in a transaction
    // Generate first to avoid data loss if generation fails
    await db.$transaction([
      db.aIVariant.deleteMany({ where: { postId } }),
      ...variants.map((content, index) => {
        const { score } = scoreContent(content);
        return db.aIVariant.create({
          data: {
            postId,
            content,
            variantIndex: index,
            provider: aiProvider,
            contentScore: score,
          },
        });
      }),
    ]);

    // Fetch saved variants for response
    const savedVariants = await db.aIVariant.findMany({
      where: { postId },
      orderBy: { variantIndex: 'asc' },
    });

    // Update post status
    const updatedPost = await db.post.update({
      where: { id: postId },
      data: {
        status: 'draft',
        aiProvider,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        aiVariants: { orderBy: { variantIndex: 'asc' } },
      },
    });

    await createAuditLog({
      entityType: 'Post',
      entityId: postId,
      action: 'generate_ai',
      userId: authUser.id,
      metadata: {
        provider: aiProvider,
        variantsCount: variants.length,
        tone: tone || null,
        length: length || null,
      },
    });

    return NextResponse.json({ post: updatedPost, variants: savedVariants });
  } catch (error) {
    console.error('AI Generate error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération IA. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
