import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

// Parse delay string like "1d", "3d", "7d", "14d", "30d" to milliseconds
function parseDelay(delayStr: string): number {
  const match = delayStr.match(/^(\d+)(d|h)$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  return 0;
}

// Calculate expected send time for a step based on sequence start + cumulative delays
function getExpectedSendTime(steps: any[], stepIndex: number, startedAt: Date): Date {
  let totalDelay = 0;
  for (let i = 0; i <= stepIndex; i++) {
    totalDelay += parseDelay(steps[i]?.delay || '0d');
  }
  return new Date(startedAt.getTime() + totalDelay);
}

// Generate personalized message using AI
async function generatePersonalizedMessage(
  prospect: { fullName: string; title?: string; company?: string; headline?: string; notes?: string },
  template: string,
  stepIndex: number,
  previousMessages: string[]
): Promise<string> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default;

  const context = previousMessages.length > 0
    ? `\n\nHISTORIQUE DES ÉCHANGES PRÉCÉDENTS:\n${previousMessages.map((m, i) => `Message ${i + 1}: ${m}`).join('\n')}`
    : '';

  const prompt = `Tu es un expert en prospection B2B. Personnalise le message de séquence de nurturing suivant en fonction du profil du prospect.

PROSPECT:
- Nom: ${prospect.fullName}
- Titre: ${prospect.title || 'Non renseigné'}
- Entreprise: ${prospect.company || 'Non renseignée'}
- Résumé: ${prospect.headline || 'Non renseigné'}
- Notes: ${prospect.notes || 'Aucune'}${context}

MODÈLE DE BASE (à personnaliser):
${template}

CONSIGNES:
1. Personnalise le message en fonction du profil du prospect
2. Garde le ton professionnel et engageant
3. Si c'est le premier message (étape 0), fais une introduction chaleureuse
4. Si des échanges précédents existent, fais référence au contexte
5. Le message doit être en français
6. Ne dépasse pas 200 mots
7. N'utilise PAS de markdown ou formatage spécial`;

  try {
    const zai = await ZAI.create();
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un assistant expert en nurturing de prospects B2B. Tu génères des messages personnalisés et engageants en français.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.8,
    });

    return response.choices?.[0]?.message?.content?.trim() || template;
  } catch {
    return template;
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Get all active prospect sequences that need processing
    const activeSequences = await db.prospectSequence.findMany({
      where: { status: 'active' },
      include: {
        prospect: {
          select: {
            id: true,
            userId: true,
            fullName: true,
            title: true,
            company: true,
            headline: true,
            notes: true,
            score: true,
          },
        },
        sequence: true,
        steps: {
          orderBy: { stepIndex: 'desc' },
          take: 1,
        },
      },
    });

    // Filter for this user's prospects only
    const userSequences = activeSequences.filter(
      (ps) => ps.prospect.userId === authUser.id
    );

    const now = new Date();
    let processed = 0;
    let sent = 0;
    let completed = 0;

    for (const ps of userSequences) {
      let sequenceSteps: any[] = [];
      try {
        sequenceSteps = JSON.parse(ps.sequence.steps);
      } catch {
        continue;
      }

      if (sequenceSteps.length === 0) continue;

      // Check if current step is due
      const expectedTime = getExpectedSendTime(sequenceSteps, ps.currentStep, new Date(ps.startedAt));
      if (expectedTime > now) continue;

      const currentStep = sequenceSteps[ps.currentStep];
      if (!currentStep) continue;

      // Check if we already have a pending or sent log for this step
      const existingLog = await db.sequenceStepLog.findFirst({
        where: {
          prospectSequenceId: ps.id,
          stepIndex: ps.currentStep,
          status: { in: ['pending', 'sent', 'delivered'] },
        },
      });

      if (existingLog) continue;

      // Get previous messages for context
      const previousLogs = await db.sequenceStepLog.findMany({
        where: {
          prospectSequenceId: ps.id,
          stepIndex: { lt: ps.currentStep },
        },
        orderBy: { stepIndex: 'asc' },
      });

      const previousMessages = previousLogs.map((log) => log.content);

      // Generate personalized message
      const content = currentStep.aiGenerated
        ? await generatePersonalizedMessage(ps.prospect, currentStep.template, ps.currentStep, previousMessages)
        : currentStep.template;

      // Create step log
      const stepLog = await db.sequenceStepLog.create({
        data: {
          prospectSequenceId: ps.id,
          stepIndex: ps.currentStep,
          channel: currentStep.channel || ps.sequence.channel,
          content,
          status: 'sent',
          sentAt: now,
        },
      });

      // Also create an OutreachMessage for the prospect
      await db.outreachMessage.create({
        data: {
          prospectId: ps.prospectId,
          channel: currentStep.channel || ps.sequence.channel,
          direction: 'outbound',
          content,
          status: 'sent',
          sentAt: now,
        },
      });

      // Update prospect's lastContactedAt and nextFollowUpAt
      const nextStep = ps.currentStep + 1;
      let nextFollowUp: Date | null = null;
      if (nextStep < sequenceSteps.length) {
        nextFollowUp = getExpectedSendTime(sequenceSteps, nextStep, new Date(ps.startedAt));
      }

      await db.prospect.update({
        where: { id: ps.prospectId },
        data: {
          lastContactedAt: now,
          nextFollowUpAt: nextFollowUp,
          status: ps.prospect.status === 'new' ? 'contacted' : ps.prospect.status,
        },
      });

      sent++;

      // Check if sequence is complete
      if (nextStep >= sequenceSteps.length) {
        await db.prospectSequence.update({
          where: { id: ps.id },
          data: {
            status: 'completed',
            completedAt: now,
            currentStep: nextStep,
          },
        });
        completed++;
      } else {
        await db.prospectSequence.update({
          where: { id: ps.id },
          data: { currentStep: nextStep },
        });
      }

      processed++;
    }

    return NextResponse.json({
      processed,
      sent,
      completed,
      message: `${processed} étape${processed > 1 ? 's' : ''} traitée${processed > 1 ? 's' : ''}, ${sent} message${sent > 1 ? 's' : ''} envoyé${sent > 1 ? 's' : ''}, ${completed} séquence${completed > 1 ? 's' : ''} terminée${completed > 1 ? 's' : ''}`,
    });
  } catch (error) {
    console.error('Nurture process POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
