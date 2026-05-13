import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

// Valid alert types
const VALID_TYPES = ['spike_negative', 'threshold_negative', 'keyword'] as const;

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const alerts = await db.sentimentAlert.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
    });

    // Also check if any alerts should be triggered based on recent comments
    const userPosts = await db.post.findMany({
      where: { authorId: authUser.id },
      select: { id: true },
    });

    const postIds = userPosts.map((p) => p.id);
    const triggeredAlerts: Array<{ alertId: string; type: string; message: string; triggeredAt: string }> = [];

    if (postIds.length > 0) {
      // Get recent comments (last 24h)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const recentComments = await db.audienceComment.findMany({
        where: {
          postId: { in: postIds },
          collectedAt: { gte: oneDayAgo },
        },
      });

      const recentNegativeCount = recentComments.filter(
        (c) => c.sentiment === 'negative',
      ).length;
      const recentTotal = recentComments.length;
      const negativeRatio = recentTotal > 0 ? recentNegativeCount / recentTotal : 0;

      for (const alert of alerts) {
        if (!alert.isEnabled) continue;
        const config = JSON.parse(alert.config || '{}');

        if (alert.type === 'spike_negative') {
          // Trigger if negative ratio exceeds 40%
          if (negativeRatio > 0.4 && recentTotal >= 5) {
            triggeredAlerts.push({
              alertId: alert.id,
              type: 'spike_negative',
              message: `Pic de sentiments négatifs détecté : ${Math.round(negativeRatio * 100)}% de commentaires négatifs (${recentNegativeCount}/${recentTotal}) sur les dernières 24h`,
              triggeredAt: new Date().toISOString(),
            });
          }
        }

        if (alert.type === 'threshold_negative') {
          const threshold = config.threshold ?? 0.3;
          if (negativeRatio > threshold) {
            triggeredAlerts.push({
              alertId: alert.id,
              type: 'threshold_negative',
              message: `Seuil négatif dépassé : ${Math.round(negativeRatio * 100)}% > ${Math.round(threshold * 100)}% configuré`,
              triggeredAt: new Date().toISOString(),
            });
          }
        }

        if (alert.type === 'keyword') {
          const keywords: string[] = config.keywords || [];
          const matchingComments = recentComments.filter((c) => {
            const lower = c.content.toLowerCase();
            return keywords.some((kw) => lower.includes(kw.toLowerCase()));
          });

          if (matchingComments.length > 0) {
            const matchKeywords = keywords.filter((kw) =>
              matchingComments.some((c) => c.content.toLowerCase().includes(kw.toLowerCase())),
            );
            triggeredAlerts.push({
              alertId: alert.id,
              type: 'keyword',
              message: `Mots-clés surveillés détectés : "${matchKeywords.join('", "')}" dans ${matchingComments.length} commentaire(s)`,
              triggeredAt: new Date().toISOString(),
            });
          }
        }

        // Update lastTriggeredAt for triggered alerts
        if (triggeredAlerts.some((t) => t.alertId === alert.id)) {
          await db.sentimentAlert.update({
            where: { id: alert.id },
            data: { lastTriggeredAt: new Date() },
          });
        }
      }
    }

    return NextResponse.json({
      alerts,
      triggeredAlerts,
    });
  } catch (error) {
    console.error('Sentiment alerts GET error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { type, config, enabled } = body as {
      type: string;
      config?: Record<string, unknown>;
      enabled?: boolean;
    };

    if (!type || !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json(
        {
          error: `Type invalide. Types autorisés : ${VALID_TYPES.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Validate config based on type
    const parsedConfig = config || {};

    if (type === 'threshold_negative') {
      if (typeof parsedConfig.threshold !== 'number' || parsedConfig.threshold < 0 || parsedConfig.threshold > 1) {
        return NextResponse.json(
          { error: 'Config invalide : threshold doit être un nombre entre 0 et 1' },
          { status: 400 },
        );
      }
    }

    if (type === 'keyword') {
      if (!Array.isArray(parsedConfig.keywords) || parsedConfig.keywords.length === 0) {
        return NextResponse.json(
          { error: 'Config invalide : keywords doit être un tableau non vide' },
          { status: 400 },
        );
      }
    }

    const alert = await db.sentimentAlert.create({
      data: {
        userId: authUser.id,
        type,
        config: JSON.stringify(parsedConfig),
        isEnabled: enabled !== false,
      },
    });

    // Audit log
    await createAuditLog({
      entityType: 'SentimentAlert',
      entityId: alert.id,
      action: 'create',
      userId: authUser.id,
      metadata: { type, config: parsedConfig, enabled: enabled !== false },
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error('Sentiment alerts POST error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de l\'alerte' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { id, isEnabled, config } = body as {
      id: string;
      isEnabled?: boolean;
      config?: Record<string, unknown>;
    };

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.sentimentAlert.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== authUser.id) {
      return NextResponse.json({ error: 'Alerte introuvable' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof isEnabled === 'boolean') updateData.isEnabled = isEnabled;
    if (config) updateData.config = JSON.stringify(config);

    const updated = await db.sentimentAlert.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ alert: updated });
  } catch (error) {
    console.error('Sentiment alerts PUT error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.sentimentAlert.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== authUser.id) {
      return NextResponse.json({ error: 'Alerte introuvable' }, { status: 404 });
    }

    await db.sentimentAlert.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sentiment alerts DELETE error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
