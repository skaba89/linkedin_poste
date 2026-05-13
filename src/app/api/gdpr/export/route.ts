import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `gdpr:export:${authUser.id}`);
    if (rlResult) return rlResult;

    const userId = authUser.id;

    // Fetch ALL user data in parallel for GDPR compliance
    const [
      userProfile,
      posts,
      prospects,
      applications,
      opportunities,
      agentActivities,
      notifications,
      settings,
      workspaceMemberships,
      subscription,
      competitors,
      contentIdeas,
      newsletters,
      promptTemplates,
      postTemplates,
      brandVoiceProfiles,
      contentPlanItems,
      nurtureSequences,
      socialMentions,
      trackedKeywords,
      connectionTargets,
      profileAnalyses,
      repurposedContents,
      contentRecyclingRules,
      outreachCampaigns,
      webhookSubscriptions,
      notificationChannels,
      audienceComments,
      abTests,
    ] = await Promise.all([
      // User profile (without password)
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      // All posts
      db.post.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // All prospects
      db.prospect.findMany({
        where: { userId: userId },
        include: { outreachMessages: true },
        orderBy: { createdAt: 'desc' },
      }),
      // All applications
      db.application.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // All opportunities
      db.opportunity.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // All agent activities
      db.agentActivity.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // All notifications
      db.notification.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Settings
      db.settings.findMany({}),
      // Workspace memberships
      db.workspaceMember.findMany({
        where: { userId: userId },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              isActive: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      // Subscription
      db.subscription.findUnique({
        where: { userId: userId },
        include: { plan: true },
      }),
      // Competitors
      db.competitor.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Content ideas
      db.contentIdea.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Newsletters
      db.newsletter.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Prompt templates
      db.promptTemplate.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Post templates
      db.postTemplate.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Brand voice profiles
      db.brandVoiceProfile.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Content plan items
      db.contentPlanItem.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Nurture sequences
      db.nurtureSequence.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Social mentions
      db.socialMention.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Tracked keywords
      db.trackedKeyword.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Connection targets
      db.connectionTarget.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Profile analyses
      db.profileAnalysis.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Repurposed contents
      db.repurposedContent.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Content recycling rules
      db.contentRecyclingRule.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Outreach campaigns
      db.outreachCampaign.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Webhook subscriptions
      db.webhookSubscription.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Notification channels
      db.notificationChannel.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Audience comments (via posts)
      db.audienceComment.findMany({
        where: { post: { authorId: userId } },
        orderBy: { collectedAt: 'desc' },
      }),
      // AB tests
      db.aBTest.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Build export package
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportReason: 'RGPD - Droit à la portabilité des données',
      user: userProfile,
      data: {
        posts,
        prospects,
        applications,
        opportunities,
        agentActivities,
        notifications,
        settings,
        workspaceMemberships,
        subscription,
        competitors,
        contentIdeas,
        newsletters,
        promptTemplates,
        postTemplates,
        brandVoiceProfiles,
        contentPlanItems,
        nurtureSequences,
        socialMentions,
        trackedKeywords,
        connectionTargets,
        profileAnalyses,
        repurposedContents,
        contentRecyclingRules,
        outreachCampaigns,
        webhookSubscriptions,
        notificationChannels,
        audienceComments,
        abTests,
      },
      summary: {
        totalPosts: posts.length,
        totalProspects: prospects.length,
        totalApplications: applications.length,
        totalOpportunities: opportunities.length,
        totalAgentActivities: agentActivities.length,
        totalNotifications: notifications.length,
        totalCompetitors: competitors.length,
        totalContentIdeas: contentIdeas.length,
        totalNewsletters: newsletters.length,
      },
    };

    // Create audit log for GDPR export
    await createAuditLog({
      entityType: 'GDPR',
      action: 'data_export',
      userId: userId,
      metadata: {
        reason: 'RGPD portabilité',
        recordsExported: exportData.summary.totalPosts +
          exportData.summary.totalProspects +
          exportData.summary.totalNotifications +
          exportData.summary.totalAgentActivities,
      },
    });

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('GDPR export error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
