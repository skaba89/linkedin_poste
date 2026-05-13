// Types LinkedIn SaaS

export type UserRole = 'admin' | 'editor' | 'validator';

export type PostStatus = 
  | 'idea' 
  | 'draft' 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected' 
  | 'scheduled' 
  | 'posted' 
  | 'failed';

export type AIProvider = 'openrouter' | 'groq' | 'glm';

export type ContentTone = 'professionnel' | 'inspirant' | 'educatif' | 'conversational' | 'humour' | 'provocateur' | 'storytelling' | 'expert';
export type ContentLength = 'court' | 'moyen' | 'long';

export type ValidationAction = 'approve' | 'reject' | 'request_changes';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  subject: string;
  angle?: string;
  audience?: string;
  cta?: string;
  imageUrl?: string;
  hashtags?: string;
  scheduledDate?: string;
  aiProvider: AIProvider;
  status: PostStatus;
  finalContent?: string;
  contentScore?: number;
  scoreDetails?: string;
  authorId: string;
  linkedinAccountId?: string;
  linkedinPostId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
  aiVariants?: AIVariant[];
  validations?: ValidationLog[];
  publicationLogs?: PublicationLog[];
  linkedinAccount?: LinkedInAccount;
  metrics?: PostMetric[];
}

export interface AIVariant {
  id: string;
  postId: string;
  content: string;
  variantIndex: number;
  provider: string;
  model?: string;
  contentScore?: number;
  createdAt: string;
}

export interface ValidationLog {
  id: string;
  postId: string;
  userId: string;
  action: ValidationAction;
  comment?: string;
  createdAt: string;
  user?: User;
}

export interface PublicationLog {
  id: string;
  postId: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  linkedinPostId?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface LinkedInAccount {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  tokenExpired?: boolean | null;
  organizationId?: string;
  organizationName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId?: string;
  action: string;
  userId?: string;
  metadata?: string;
  createdAt: string;
  user?: User;
}

export interface DashboardStats {
  totalIdeas: number;
  totalDrafts: number;
  pendingApproval: number;
  approved: number;
  published: number;
  failed: number;
  totalPosts: number;
  recentPosts: Post[];
}

export interface CreatePostInput {
  subject: string;
  angle?: string;
  audience?: string;
  cta?: string;
  imageUrl?: string;
  hashtags?: string;
  scheduledDate?: string;
  aiProvider: AIProvider;
}

export interface GenerateAIInput {
  postId: string;
  provider: AIProvider;
}

export interface ValidatePostInput {
  postId: string;
  action: ValidationAction;
  comment?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  prompt: string;
  variables?: string;
  isDefault: boolean;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Phase 3A: Analytics & Intelligence Types
// ============================================================

export interface PostMetric {
  id: string;
  postId: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  reposts: number;
  clicks: number;
  engagementRate: number;
  collectedAt: string;
  source: 'manual' | 'linkedin_api' | 'imported';
}

export type ABTestStatus = 'draft' | 'running' | 'completed' | 'cancelled';
export type ABTestCriteria = 'engagement' | 'impressions' | 'clicks';

export interface ABTest {
  id: string;
  name: string;
  description?: string;
  status: ABTestStatus;
  postAId: string;
  postBId: string;
  winnerId?: string;
  startDate?: string;
  endDate?: string;
  criteria: ABTestCriteria;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author?: User;
  postA?: Post;
  postB?: Post;
  readings?: ABReading[];
}

export interface ABReading {
  id: string;
  testId: string;
  variant: 'A' | 'B';
  metric: string;
  value: number;
  recordedAt: string;
}

export interface Competitor {
  id: string;
  name: string;
  linkedinUrl: string;
  industry?: string;
  notes?: string;
  isActive: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  posts?: CompetitorPost[];
  _count?: { posts: number };
  postCount?: number;
  avgEngagement?: number;
}

export interface CompetitorPost {
  id: string;
  competitorId: string;
  subject: string;
  content?: string;
  publishedAt?: string;
  likes: number;
  comments: number;
  reposts: number;
  engagementRate: number;
  detectedFormat?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsOverview {
  totalImpressions: number;
  avgEngagementRate: number;
  bestPost: { id: string; subject: string; engagementRate: number } | null;
  worstPost: { id: string; subject: string; engagementRate: number } | null;
  postsWithMetrics: number;
  totalPosts: number;
  trendData: { date: string; impressions: number; engagementRate: number }[];
}

export interface FormatPerformance {
  format: string;
  label: string;
  avgEngagement: number;
  avgImpressions: number;
  postCount: number;
}

export interface DayPerformance {
  day: string;
  dayLabel: string;
  avgEngagement: number;
  avgImpressions: number;
  postCount: number;
}

export interface HourPerformance {
  hour: number;
  avgEngagement: number;
  avgImpressions: number;
  postCount: number;
}

export interface ProviderPerformance {
  provider: string;
  label: string;
  avgScore: number;
  avgEngagement: number;
  postCount: number;
}

export interface ScoreCorrelation {
  posts: { id: string; subject: string; contentScore: number; engagementRate: number }[];
  correlation: number;
}

export interface AnalyticsInsight {
  id: string;
  type: 'positive' | 'warning' | 'action';
  title: string;
  detail: string;
  icon?: string;
}

// ============================================================
// Phase 3B: Intelligence Types
// ============================================================

export interface ScoringCalibration {
  id: string;
  postId: string;
  predictedScore: number;
  actualScore: number;
  delta: number;
  calibratedAt: string;
  factors?: string;
}

export interface SmartScoreResult {
  rawScore: number;
  calibratedScore: number;
  confidence: number;
  factors: ScoreFactor[];
  recommendations: string[];
}

export interface ScoreFactor {
  name: string;
  score: number;
  weight: number;
  impact: 'high' | 'medium' | 'low';
  tip: string;
}

export interface ScoringStatus {
  calibrationsCount: number;
  avgDelta: number;
  factorWeights: { name: string; weight: number; avgDelta: number }[];
  confidence: 'low' | 'medium' | 'high';
  lastCalibration: string | null;
}

export interface TimeRecommendation {
  dayOfWeek: number;
  dayLabel: string;
  hour: number;
  slotLabel: string;
  avgEngagement: number;
  confidence: number;
  totalDataPoints: number;
  rank: number;
}

export interface BestTimeAnalysis {
  topSlots: TimeRecommendation[];
  worstSlots: TimeRecommendation[];
  byDay: { day: string; avgEngagement: number; posts: number }[];
  byHour: { hour: number; avgEngagement: number; posts: number }[];
  patterns: string[];
  recommendation: string;
}

export interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  avgEngagement: number;
  totalPosts: number;
  confidence: number;
}

export interface BrandVoiceResult {
  tone: { [key: string]: number };
  vocabulary: {
    topWords: { word: string; count: number; tfidf: number }[];
    signaturePhrases: string[];
    avgWordLength: number;
    avgPostLength: number;
    uniqueWordRatio: number;
  };
  structure: {
    avgSentenceLength: number;
    avgParagraphCount: number;
    avgLineBreaksPerPost: number;
    hookPatterns: string[];
    ctaPatterns: string[];
  };
  emotional: {
    positive: number;
    negative: number;
    neutral: number;
    interrogative: number;
    exclamatory: number;
    emojiFrequency: number;
  };
  themes: { name: string; frequency: number; representative: string }[];
  voicePrompt: string;
  recommendations: string[];
}

export interface AudienceInsight {
  totalComments: number;
  avgCommentsPerPost: number;
  topCommenters: { name: string; count: number }[];
  questions: { question: string; postId: string; frequency: number }[];
  painPoints: { point: string; frequency: number; posts: string[] }[];
  interests: { topic: string; frequency: number }[];
  sentimentDistribution: { positive: number; negative: number; neutral: number; question: number };
  contentIdeas: ContentIdeaData[];
}

export interface ContentIdeaData {
  title: string;
  description: string;
  suggestedFormat: string;
  suggestedAngle: string;
  priority: 'high' | 'medium' | 'low';
  source: string;
  sourcePostId: string;
}

export interface ContentIdea {
  id: string;
  source: string;
  sourceDetail?: string;
  title: string;
  description?: string;
  suggestedFormat?: string;
  suggestedAngle?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'idea' | 'assigned' | 'in_progress' | 'published';
  relatedPostIds?: string;
  upvotes: number;
  createdAt: string;
  updatedAt: string;
}

export interface AudienceComment {
  id: string;
  postId: string;
  authorName?: string;
  content: string;
  likes: number;
  sentiment?: string;
  collectedAt: string;
}

export type NotificationType =
  | 'post_approved'
  | 'post_rejected'
  | 'post_published'
  | 'post_failed'
  | 'comment_added'
  | 'system'
  | 'mention';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: string;
  createdAt: string;
}

// Navigation
export type AppView = 
  | 'dashboard' 
  | 'posts' 
  | 'create-post' 
  | 'post-detail' 
  | 'calendar'
  | 'prompts'
  | 'settings' 
  | 'audit-logs'
  | 'analytics'
  | 'ab-testing'
  | 'competitors'
  | 'brand-voice'
  | 'content-ideas'
  | 'login';

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  idea: 'Idée',
  draft: 'Brouillon',
  pending_approval: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  scheduled: 'Planifié',
  posted: 'Publié',
  failed: 'Échoué',
};

export const POST_STATUS_COLORS: Record<PostStatus, string> = {
  idea: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  pending_approval: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  scheduled: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  posted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  editor: 'Éditeur',
  validator: 'Validateur',
};

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  openrouter: 'OpenRouter',
  groq: 'Groq',
  glm: 'GLM-5',
};

export const PROMPT_CATEGORY_LABELS: Record<string, string> = {
  thought_leadership: 'Thought Leadership',
  listicle: 'Listicle',
  storytelling: 'Storytelling',
  controverse: 'Controverse',
  howto: 'Guide Pratique',
  engagement: 'Engagement',
  general: 'Général',
};

export const PROMPT_CATEGORY_COLORS: Record<string, string> = {
  thought_leadership: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  listicle: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  storytelling: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  controverse: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  howto: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  engagement: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400',
  general: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

export const AB_TEST_STATUS_LABELS: Record<ABTestStatus, string> = {
  draft: 'Brouillon',
  running: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

export const AB_TEST_STATUS_COLORS: Record<ABTestStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
};

export const AB_TEST_CRITERIA_LABELS: Record<ABTestCriteria, string> = {
  engagement: 'Engagement',
  impressions: 'Impressions',
  clicks: 'Clics',
};

export const DAY_LABELS: Record<string, string> = {
  '1': 'Lun',
  '2': 'Mar',
  '3': 'Mer',
  '4': 'Jeu',
  '5': 'Ven',
  '6': 'Sam',
  '0': 'Dim',
};

export const FORMAT_LABELS: Record<string, string> = {
  listicle: 'Listicle',
  storytelling: 'Storytelling',
  controverse: 'Controverse',
  howto: 'Guide Pratique',
  thought_leadership: 'Thought Leadership',
};
