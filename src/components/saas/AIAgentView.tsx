'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  PenLine,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Clock,
  Play,
  Sparkles,
  Bot,
  MessageSquare,
  Send,
  BarChart3,
  Settings2,
  Bell,
  Mail,
  Trash2,
  Eye,
  AlertCircle,
  ExternalLink,
  CalendarDays,
  Info,
  ChevronDown,
  ChevronUp,
  Circle,
  Check,
  Plus,
  Users,
  Repeat,
  HeartPulse,
  MessageSquareText,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================

type ChannelType = 'email' | 'telegram' | 'whatsapp';
type AgentType =
  | 'content_creator'
  | 'mission_scout'
  | 'outreach_manager'
  | 'engagement_bot'
  | 'analytics_reporter'
  | 'profile_optimizer'
  | 'network_builder'
  | 'content_recycler'
  | 'competitor_spy'
  | 'client_nurture'
  | 'expert_engagement';

type ActivityStatus = 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';

interface AgentActivity {
  id: string;
  agentType: AgentType;
  status: ActivityStatus;
  title: string;
  description?: string;
  result?: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentConfig {
  agentType: AgentType;
  enabled: boolean;
  autoApprove: boolean;
  frequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  lastExecutedAt?: string;
}

interface NotificationChannel {
  id: string;
  channel: ChannelType;
  label: string;
  isEnabled: boolean;
  config: string; // JSON
  events: string; // JSON array
  lastUsedAt?: string;
  lastError?: string;
  createdAt: string;
}

// ============================================================
// Constants
// ============================================================

const AGENT_META: Record<
  AgentType,
  {
    label: string;
    description: string;
    icon: typeof PenLine;
    color: string;
    bgColor: string;
  }
> = {
  content_creator: {
    label: 'Content Creator',
    description:
      'Génère du contenu engageant adapté à votre audience et votre brand voice.',
    icon: PenLine,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-100 dark:bg-violet-950/40',
  },
  mission_scout: {
    label: 'Mission Scout',
    description:
      'Surveille les tendances et identifie les opportunités de contenu pertinentes.',
    icon: Search,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-950/40',
  },
  outreach_manager: {
    label: 'Outreach Manager',
    description:
      'Gère les campagnes de prospection et le suivi des contacts qualifiés.',
    icon: Send,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-950/40',
  },
  engagement_bot: {
    label: 'Engagement Bot',
    description:
      'Suggère des réponses aux commentaires et favorise l\'interaction avec votre audience.',
    icon: MessageSquare,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-950/40',
  },
  analytics_reporter: {
    label: 'Analytics Reporter',
    description:
      'Analyse les performances et génère des rapports d\'intelligence automatiques.',
    icon: BarChart3,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-100 dark:bg-rose-950/40',
  },
  profile_optimizer: {
    label: 'Profile Optimizer',
    description:
      'Analyse et optimise votre profil LinkedIn automatiquement.',
    icon: Settings2,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-950/40',
  },
  network_builder: {
    label: 'Network Builder',
    description:
      'Identifie et connecte automatiquement avec des profils pertinents.',
    icon: Users,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-950/40',
  },
  content_recycler: {
    label: 'Content Recycler',
    description:
      'Recycle vos meilleurs contenus dans de nouveaux formats.',
    icon: Repeat,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-950/40',
  },
  competitor_spy: {
    label: 'Competitor Spy',
    description:
      'Analyse vos concurrents et détecte les opportunités.',
    icon: Eye,
    color: 'text-rose-500 dark:text-rose-400',
    bgColor: 'bg-rose-100 dark:bg-rose-950/40',
  },
  client_nurture: {
    label: 'Client Nurture',
    description:
      'Réactive vos prospects et clients froids automatiquement.',
    icon: HeartPulse,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-950/40',
  },
  expert_engagement: {
    label: 'Posture Expert',
    description:
      'Commente automatiquement des posts Data, IA, Cloud, DevOps, Cyber, SaaS et plus pour renforcer votre posture d\'expert.',
    icon: MessageSquareText,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-950/40',
  },
};

const ACTIVITY_STATUS_META: Record<
  ActivityStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: 'En attente',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-950/50',
  },
  approved: {
    label: 'Approuvée',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-100 dark:bg-emerald-950/50',
  },
  rejected: {
    label: 'Rejetée',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-950/50',
  },
  executing: {
    label: 'En cours',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-950/50',
  },
  completed: {
    label: 'Exécutée',
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-950/50',
  },
  failed: {
    label: 'Échouée',
    color: 'text-rose-700 dark:text-rose-300',
    bgColor: 'bg-rose-100 dark:bg-rose-950/50',
  },
};

const CHANNEL_ICONS: Record<ChannelType, typeof Mail> = {
  email: Mail,
  telegram: Send,
  whatsapp: MessageSquare,
};

const CHANNEL_LABELS: Record<ChannelType, string> = {
  email: 'Email',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
};

const FREQUENCY_LABELS: Record<string, string> = {
  manual: 'Manuel',
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
};

const EVENT_CATEGORIES: {
  id: string;
  label: string;
  events: { id: string; label: string }[];
}[] = [
  {
    id: 'contenu',
    label: 'Contenu',
    events: [
      { id: 'content_created', label: 'Contenu créé' },
      { id: 'content_approved', label: 'Contenu approuvé' },
      { id: 'content_published', label: 'Contenu publié' },
      { id: 'content_rejected', label: 'Contenu rejeté' },
      { id: 'content_score_low', label: 'Score bas détecté' },
    ],
  },
  {
    id: 'missions',
    label: 'Missions',
    events: [
      { id: 'mission_created', label: 'Mission créée' },
      { id: 'mission_started', label: 'Mission lancée' },
      { id: 'mission_completed', label: 'Mission terminée' },
      { id: 'mission_failed', label: 'Mission échouée' },
      { id: 'mission_result_ready', label: 'Résultat prêt' },
      { id: 'mission_auto_approved', label: 'Auto-approuvée' },
    ],
  },
  {
    id: 'prospection',
    label: 'Prospection',
    events: [
      { id: 'prospect_new', label: 'Nouveau prospect' },
      { id: 'prospect_replied', label: 'Prospect a répondu' },
      { id: 'prospect_converted', label: 'Prospect converti' },
      { id: 'outreach_sent', label: 'Message envoyé' },
    ],
  },
  {
    id: 'engagement',
    label: 'Engagement',
    events: [
      { id: 'comment_received', label: 'Commentaire reçu' },
      { id: 'reply_suggested', label: 'Réponse suggérée' },
      { id: 'reply_posted', label: 'Réponse publiée' },
      { id: 'engagement_spike', label: 'Pic d\'engagement' },
    ],
  },
  {
    id: 'ia',
    label: 'IA',
    events: [
      { id: 'ai_task_completed', label: 'Tâche IA terminée' },
      { id: 'ai_task_failed', label: 'Tâche IA échouée' },
      { id: 'ai_approval_needed', label: 'Approbation requise' },
    ],
  },
  {
    id: 'systeme',
    label: 'Système',
    events: [
      { id: 'system_error', label: 'Erreur système' },
      { id: 'system_maintenance', label: 'Maintenance' },
    ],
  },
];

// ============================================================
// Helper
// ============================================================

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin}min`;
  if (diffHr < 24) return `il y a ${diffHr}h`;
  if (diffDay < 7) return `il y a ${diffDay}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

function getEventsCount(eventsStr: string): number {
  if (!eventsStr) return 0;
  try {
    const arr = JSON.parse(eventsStr);
    if (Array.isArray(arr) && arr.includes('*')) return EVENT_CATEGORIES.reduce((s, c) => s + c.events.length, 0);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

// ============================================================
// Main Component
// ============================================================

export default function AIAgentView() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-950/40">
          <Bot className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Agent IA</h2>
          <p className="text-sm text-muted-foreground">
            Automatisez vos tâches avec l&apos;intelligence artificielle
          </p>
        </div>
      </div>

      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activities" className="gap-1.5 text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 hidden sm:inline" />
            Activités IA
          </TabsTrigger>
          <TabsTrigger value="launch" className="gap-1.5 text-xs sm:text-sm">
            <Play className="w-4 h-4 hidden sm:inline" />
            Lancer une tâche
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5 text-xs sm:text-sm">
            <Settings2 className="w-4 h-4 hidden sm:inline" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm">
            <Bell className="w-4 h-4 hidden sm:inline" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <ActivitiesTab />
        </TabsContent>
        <TabsContent value="launch">
          <LaunchTab />
        </TabsContent>
        <TabsContent value="config">
          <ConfigTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Tab 1: Activités IA
// ============================================================

function ActivitiesTab() {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<AgentActivity | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ activities: AgentActivity[] }>(
        '/api/ai-agent?limit=50'
      );
      setActivities(data.activities);
    } catch {
      toast.error('Erreur lors du chargement des activités');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filtered = activities.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (agentFilter !== 'all' && a.agentType !== agentFilter) return false;
    return true;
  });

  const stats = {
    total: activities.length,
    pending: activities.filter((a) => a.status === 'pending').length,
    approved: activities.filter((a) => a.status === 'approved').length,
    executed: activities.filter(
      (a) => a.status === 'completed' || a.status === 'executing'
    ).length,
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      await apiFetch(`/api/ai-agent/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      toast.success(action === 'approve' ? 'Activité approuvée' : 'Activité rejetée');
      setSelectedActivity(null);
      fetchActivities();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const statCards = [
    { label: 'Total', value: stats.total, icon: Bot, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-950/40' },
    { label: 'En attente', value: stats.pending, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/40' },
    { label: 'Approuvées', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/40' },
    { label: 'Exécutées', value: stats.executed, icon: Play, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950/40' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', s.bg)}>
                <s.icon className={cn('w-4 h-4', s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(ACTIVITY_STATUS_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue placeholder="Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les agents</SelectItem>
            {Object.entries(AGENT_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={fetchActivities}
          disabled={loading}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Actualiser
        </Button>
      </div>

      {/* Activity List */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Bot className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune activité trouvée</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[480px]">
              <div className="divide-y divide-border/50">
                {filtered.map((activity) => {
                  const agent = AGENT_META[activity.agentType];
                  const status = ACTIVITY_STATUS_META[activity.status];
                  const AgentIcon = agent.icon;
                  return (
                    <button
                      key={activity.id}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3"
                      onClick={() => setSelectedActivity(activity)}
                    >
                      <div className={cn('p-2 rounded-lg mt-0.5 shrink-0', agent.bgColor)}>
                        <AgentIcon className={cn('w-4 h-4', agent.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">
                            {activity.title}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px] shrink-0', status.bgColor, status.color)}
                          >
                            {status.label}
                          </Badge>
                        </div>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(activity.createdAt)}
                          <span className="mx-1">·</span>
                          {agent.label}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedActivity}
        onOpenChange={(open) => !open && setSelectedActivity(null)}
      >
        <DialogContent className="sm:max-w-lg">
          {selectedActivity && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const agent = AGENT_META[selectedActivity.agentType];
                    const AgentIcon = agent.icon;
                    return (
                      <>
                        <div className={cn('p-1.5 rounded-lg', agent.bgColor)}>
                          <AgentIcon className={cn('w-4 h-4', agent.color)} />
                        </div>
                        {selectedActivity.title}
                      </>
                    );
                  })()}
                </DialogTitle>
                <DialogDescription>
                  {AGENT_META[selectedActivity.agentType].label} ·{' '}
                  {ACTIVITY_STATUS_META[selectedActivity.status].label}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {selectedActivity.description && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-sm">{selectedActivity.description}</p>
                  </div>
                )}
                {selectedActivity.result && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Résultat
                    </Label>
                    <p className="text-sm whitespace-pre-wrap">{selectedActivity.result}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Créé {formatRelativeTime(selectedActivity.createdAt)}
                </div>
              </div>

              {(selectedActivity.status === 'pending') && (
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => handleAction(selectedActivity.id, 'reject')}
                    disabled={actionLoading === selectedActivity.id}
                  >
                    {actionLoading === selectedActivity.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    Rejeter
                  </Button>
                  <Button
                    className="gap-1.5"
                    onClick={() => handleAction(selectedActivity.id, 'approve')}
                    disabled={actionLoading === selectedActivity.id}
                  >
                    {actionLoading === selectedActivity.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Approuver
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Tab 2: Lancer une tâche
// ============================================================

function LaunchTab() {
  const [launching, setLaunching] = useState<AgentType | null>(null);
  const [lastExecuted, setLastExecuted] = useState<Record<string, string>>({});

  const handleLaunch = async (agentType: AgentType) => {
    setLaunching(agentType);
    try {
      await apiFetch('/api/ai-agent', {
        method: 'POST',
        body: JSON.stringify({ agentType }),
      });
      toast.success(`${AGENT_META[agentType].label} lancé avec succès`);
      setLastExecuted((prev) => ({
        ...prev,
        [agentType]: new Date().toISOString(),
      }));
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setLaunching(null);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {(Object.entries(AGENT_META) as [AgentType, typeof AGENT_META[AgentType]][]).map(
        ([type, meta]) => {
          const Icon = meta.icon;
          return (
            <Card key={type} className="border-border/50 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={cn('p-2.5 rounded-lg', meta.bgColor)}>
                    <Icon className={cn('w-5 h-5', meta.color)} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm">{meta.label}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {meta.description}
                </p>
                <div className="flex items-center justify-between">
                  {lastExecuted[type] ? (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Dernière exécution: {formatRelativeTime(lastExecuted[type])}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Jamais exécuté
                    </p>
                  )}
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleLaunch(type)}
                    disabled={launching === type}
                  >
                    {launching === type ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    Lancer
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }
      )}
    </div>
  );
}

// ============================================================
// Tab 3: Configuration
// ============================================================

function ConfigTab() {
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [globalAutoApprove, setGlobalAutoApprove] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        agents: AgentConfig[];
        globalAutoApprove: boolean;
      }>('/api/ai-agent/config');
      setConfigs(data.agents);
      setGlobalAutoApprove(data.globalAutoApprove);
    } catch {
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveAgentConfig = async (agentType: AgentType, updates: Partial<AgentConfig>) => {
    setSaving(agentType);
    try {
      await apiFetch('/api/ai-agent/config', {
        method: 'PUT',
        body: JSON.stringify({ agentType, ...updates }),
      });
      toast.success('Configuration sauvegardée');
      fetchConfig();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setSaving(null);
    }
  };

  const saveGlobalAutoApprove = async (value: boolean) => {
    setSaving('global');
    try {
      await apiFetch('/api/ai-agent/config', {
        method: 'PUT',
        body: JSON.stringify({ globalAutoApprove: value }),
      });
      setGlobalAutoApprove(value);
      toast.success('Auto-approbation globale mise à jour');
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Global setting */}
      <Card className="border-border/50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/40">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Auto-approbation globale</p>
              <p className="text-xs text-muted-foreground">
                Approuver automatiquement toutes les tâches IA sans intervention
              </p>
            </div>
          </div>
          <Switch
            checked={globalAutoApprove}
            onCheckedChange={saveGlobalAutoApprove}
            disabled={saving === 'global'}
          />
        </CardContent>
      </Card>

      {/* Per-agent settings */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Configuration par agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y divide-border/50">
          {(Object.entries(AGENT_META) as [AgentType, typeof AGENT_META[AgentType]][]).map(
            ([type, meta]) => {
              const config = configs.find((c) => c.agentType === type);
              const Icon = meta.icon;
              const isSaving = saving === type;
              return (
                <div
                  key={type}
                  className="py-4 first:pt-0 last:pb-0 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 items-start"
                >
                  {/* Agent info */}
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', meta.bgColor)}>
                      <Icon className={cn('w-4 h-4', meta.color)} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {config?.lastExecutedAt
                          ? `Dernière exécution: ${formatRelativeTime(config.lastExecutedAt)}`
                          : 'Jamais exécuté'}
                      </p>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-4 md:justify-end flex-wrap">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config?.enabled ?? false}
                        onCheckedChange={(v) =>
                          saveAgentConfig(type, { enabled: v })
                        }
                        disabled={isSaving}
                      />
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        Activé
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config?.autoApprove ?? false}
                        onCheckedChange={(v) =>
                          saveAgentConfig(type, { autoApprove: v })
                        }
                        disabled={isSaving}
                      />
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        Auto-approve
                      </Label>
                    </div>
                    <Select
                      value={config?.frequency ?? 'manual'}
                      onValueChange={(v) =>
                        saveAgentConfig(type, {
                          frequency: v as AgentConfig['frequency'],
                        })
                      }
                      disabled={isSaving}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            }
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Tab 4: Notifications
// ============================================================

function NotificationsTab() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ channels: NotificationChannel[] }>(
        '/api/notification-channels'
      );
      setChannels(data.channels);
    } catch {
      toast.error('Erreur lors du chargement des canaux');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      const ch = channels.find((c) => c.id === id);
      if (!ch) return;
      await apiFetch(`/api/notification-channels/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isEnabled: !ch.isEnabled }),
      });
      toast.success(ch.isEnabled ? 'Canal désactivé' : 'Canal activé');
      fetchChannels();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/notification-channels/${id}`, { method: 'DELETE' });
      toast.success('Canal supprimé');
      setDeleteConfirm(null);
      fetchChannels();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      await apiFetch('/api/notification-channels/test', {
        method: 'POST',
        body: JSON.stringify({ channelId: id }),
      });
      toast.success('Notification de test envoyée');
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setTestingId(null);
    }
  };

  const openAdd = () => {
    setEditingChannel(null);
    setDialogOpen(true);
  };

  const openEdit = (ch: NotificationChannel) => {
    setEditingChannel(ch);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Channel List */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Canaux de notification
            </CardTitle>
            <Button size="sm" className="gap-1.5" onClick={openAdd}>
              <Plus className="w-3.5 h-3.5" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : channels.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Aucun canal de notification configuré
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Ajoutez un canal pour recevoir les alertes de vos agents IA
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[480px]">
              <div className="divide-y divide-border/50">
                {channels.map((ch) => {
                  const Icon = CHANNEL_ICONS[ch.channel];
                  const config = safeJsonParse<Record<string, unknown>>(ch.config, {});
                  return (
                    <div
                      key={ch.id}
                      className="px-4 py-3 flex items-center gap-3"
                    >
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          ch.channel === 'email' && 'bg-rose-100 dark:bg-rose-950/40',
                          ch.channel === 'telegram' && 'bg-blue-100 dark:bg-blue-950/40',
                          ch.channel === 'whatsapp' && 'bg-emerald-100 dark:bg-emerald-950/40'
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-4 h-4',
                            ch.channel === 'email' && 'text-rose-600 dark:text-rose-400',
                            ch.channel === 'telegram' && 'text-blue-600 dark:text-blue-400',
                            ch.channel === 'whatsapp' && 'text-emerald-600 dark:text-emerald-400'
                          )}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {ch.label || CHANNEL_LABELS[ch.channel]}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px]',
                              ch.isEnabled
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            )}
                          >
                            {ch.isEnabled ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {CHANNEL_LABELS[ch.channel]}
                            {config.email ? ` · ${config.email}` : ''}
                            {config.phoneNumber ? ` · ${config.phoneNumber}` : ''}
                            {config.chatId ? ` · Chat ${config.chatId}` : ''}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            · {getEventsCount(ch.events)} événement(s)
                          </span>
                        </div>
                        {ch.lastError && (
                          <p className="text-[10px] text-destructive flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3" />
                            {ch.lastError}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Tester"
                          onClick={() => handleTest(ch.id)}
                          disabled={testingId === ch.id}
                        >
                          {testingId === ch.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Modifier"
                          onClick={() => openEdit(ch)}
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </Button>
                        <Switch
                          checked={ch.isEnabled}
                          onCheckedChange={() => handleToggle(ch.id)}
                          disabled={togglingId === ch.id}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Supprimer"
                          onClick={() => setDeleteConfirm(ch.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <ChannelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingChannel={editingChannel}
        onSave={fetchChannels}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce canal ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les notifications ne seront plus
              envoyées via ce canal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Channel Dialog (Add / Edit)
// ============================================================

interface ChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingChannel: NotificationChannel | null;
  onSave: () => void;
}

function ChannelDialog({ open, onOpenChange, editingChannel, onSave }: ChannelDialogProps) {
  const [saving, setSaving] = useState(false);

  // Form state
  const [channelType, setChannelType] = useState<ChannelType>('email');
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappApiKey, setWhatsappApiKey] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  // UI state
  const [telegramGuideOpen, setTelegramGuideOpen] = useState(false);
  const [whatsappGuideOpen, setWhatsappGuideOpen] = useState(false);

  // Populate when editing
  useEffect(() => {
    if (editingChannel) {
      const config = safeJsonParse<Record<string, string>>(editingChannel.config, {});
      const events = safeJsonParse<string[]>(editingChannel.events, []);
      setChannelType(editingChannel.channel);
      setLabel(editingChannel.label);
      setEmail(config.email || '');
      setBotToken(config.botToken || config.telegramBotToken || '');
      setChatId(config.chatId || config.telegramChatId || '');
      setPhoneNumber(config.phoneNumber || config.whatsappPhone || '');
      setWhatsappApiKey(config.whatsappApiKey || '');
      setSelectedEvents(events.includes('*') ? getAllEventIds() : events);
    } else {
      // Reset for add
      setChannelType('email');
      setLabel('');
      setEmail('');
      setBotToken('');
      setChatId('');
      setPhoneNumber('');
      setWhatsappApiKey('');
      setSelectedEvents([]);
    }
    setTelegramGuideOpen(false);
    setWhatsappGuideOpen(false);
  }, [editingChannel, open]);

  const getAllEventIds = () =>
    EVENT_CATEGORIES.flatMap((c) => c.events.map((e) => e.id));

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((e) => e !== eventId)
        : [...prev, eventId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    const cat = EVENT_CATEGORIES.find((c) => c.id === categoryId);
    if (!cat) return;
    const catIds = cat.events.map((e) => e.id);
    const allSelected = catIds.every((id) => selectedEvents.includes(id));
    setSelectedEvents((prev) =>
      allSelected
        ? prev.filter((id) => !catIds.includes(id))
        : [...prev.filter((id) => !catIds.includes(id)), ...catIds]
    );
  };

  const buildConfig = (): Record<string, string> => {
    const base: Record<string, string> = {};
    switch (channelType) {
      case 'email':
        base.email = email;
        break;
      case 'telegram':
        base.botToken = botToken;
        base.chatId = chatId;
        break;
      case 'whatsapp':
        base.phoneNumber = phoneNumber;
        base.whatsappApiKey = whatsappApiKey;
        base.whatsappProvider = 'callmebot';
        break;
    }
    return base;
  };

  const validate = (): string | null => {
    if (!label.trim()) return 'Le libellé est requis';
    switch (channelType) {
      case 'email':
        if (!email || !email.includes('@')) return 'Adresse email invalide';
        break;
      case 'telegram':
        if (!botToken) return 'Le Bot Token est requis';
        if (!chatId) return 'Le Chat ID est requis';
        break;
      case 'whatsapp':
        if (!phoneNumber) return 'Le numéro WhatsApp est requis';
        if (!whatsappApiKey) return 'La clé API CallMeBot est requise';
        break;
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const body = {
        channel: channelType,
        label: label.trim(),
        config: JSON.stringify(buildConfig()),
        events: JSON.stringify(selectedEvents),
        isEnabled: true,
      };

      if (editingChannel) {
        await apiFetch(`/api/notification-channels/${editingChannel.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        toast.success('Canal mis à jour');
      } else {
        await apiFetch('/api/notification-channels', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        toast.success('Canal ajouté');
      }
      onOpenChange(false);
      onSave();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const CHANNEL_TYPE_OPTIONS: {
    type: ChannelType;
    label: string;
    icon: typeof Mail;
    color: string;
    bgColor: string;
    borderColor: string;
  }[] = [
    {
      type: 'email',
      label: 'Email',
      icon: Mail,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-100 dark:bg-rose-950/40',
      borderColor: 'border-rose-300 dark:border-rose-800',
    },
    {
      type: 'telegram',
      label: 'Telegram',
      icon: Send,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-950/40',
      borderColor: 'border-blue-300 dark:border-blue-800',
    },
    {
      type: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageSquare,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-300 dark:border-emerald-800',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingChannel ? 'Modifier le canal' : 'Ajouter un canal'}
          </DialogTitle>
          <DialogDescription>
            Configurez un canal de notification pour recevoir les alertes de
            vos agents IA.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-4">
            {/* Channel Type Selection */}
            {!editingChannel && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Type de canal</Label>
                <div className="grid grid-cols-3 gap-2">
                  {CHANNEL_TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = channelType === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer',
                          isSelected
                            ? cn(opt.borderColor, opt.bgColor, 'shadow-sm')
                            : 'border-border/50 hover:border-border'
                        )}
                        onClick={() => setChannelType(opt.type)}
                      >
                        <Icon className={cn('w-5 h-5', opt.color)} />
                        <span
                          className={cn(
                            'text-xs font-medium',
                            isSelected ? opt.color : 'text-muted-foreground'
                          )}
                        >
                          {opt.label}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-primary absolute top-1.5 right-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {editingChannel && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                {(() => {
                  const Icon = CHANNEL_ICONS[editingChannel.channel];
                  return (
                    <>
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Type : {CHANNEL_LABELS[editingChannel.channel]}
                      </span>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Label */}
            <div className="space-y-1.5">
              <Label htmlFor="channel-label" className="text-sm font-medium">
                Libellé
              </Label>
              <Input
                id="channel-label"
                placeholder="Ex: Notifications bureau"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Channel-specific fields */}
            {channelType === 'email' && (
              <div className="space-y-1.5">
                <Label htmlFor="channel-email" className="text-sm font-medium">
                  Adresse email
                </Label>
                <Input
                  id="channel-email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            )}

            {channelType === 'telegram' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="channel-bot-token" className="text-sm font-medium">
                    Bot Token
                  </Label>
                  <Input
                    id="channel-bot-token"
                    type="password"
                    placeholder="123456:ABC-DEF..."
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="channel-chat-id" className="text-sm font-medium">
                    Chat ID
                  </Label>
                  <Input
                    id="channel-chat-id"
                    placeholder="-1001234567890"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>

                {/* Telegram Guide */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  onClick={() => setTelegramGuideOpen(!telegramGuideOpen)}
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Comment configurer Telegram ?
                  </span>
                  {telegramGuideOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {telegramGuideOpen && (
                  <div className="rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/80 dark:bg-blue-950/30 p-4 space-y-2.5">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      Guide de configuration Telegram Bot
                    </p>
                    <ol className="text-xs text-blue-600/80 dark:text-blue-400/80 space-y-2 list-decimal list-inside">
                      <li>
                        Ouvrez Telegram et recherchez{' '}
                        <span className="font-semibold">@BotFather</span>
                      </li>
                      <li>
                        Envoyez la commande{' '}
                        <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded text-[11px]">
                          /newbot
                        </code>{' '}
                        et suivez les instructions
                      </li>
                      <li>
                        BotFather vous donnera un token (gardez-le secret)
                      </li>
                      <li>
                        Copiez le token et collez-le dans le champ{' '}
                        <strong>&quot;Bot Token&quot;</strong> ci-dessus
                      </li>
                      <li>
                        Envoyez un message à votre nouveau bot (n&apos;importe quel message)
                      </li>
                      <li>
                        Allez sur{' '}
                        <a
                          href="https://api.telegram.org/bot<TOKEN>/getUpdates"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 underline"
                        >
                          api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </li>
                      <li>
                        Trouvez <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded text-[11px]">{'"chat":{"id":'}</code> dans la réponse JSON
                      </li>
                      <li>
                        Copiez le Chat ID et collez-le ci-dessus, puis cliquez sur{' '}
                        <strong>Enregistrer</strong>
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {channelType === 'whatsapp' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="channel-phone"
                    className="text-sm font-medium"
                  >
                    Numéro WhatsApp
                  </Label>
                  <Input
                    id="channel-phone"
                    placeholder="+33612345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="channel-api-key"
                    className="text-sm font-medium"
                  >
                    Clé API CallMeBot
                  </Label>
                  <Input
                    id="channel-api-key"
                    type="password"
                    placeholder="3286280"
                    value={whatsappApiKey}
                    onChange={(e) => setWhatsappApiKey(e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>

                {/* WhatsApp Guide */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-sm text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  onClick={() => setWhatsappGuideOpen(!whatsappGuideOpen)}
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Comment configurer WhatsApp ?
                  </span>
                  {whatsappGuideOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {whatsappGuideOpen && (
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-950/30 p-4 space-y-2.5">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Guide de configuration WhatsApp via CallMeBot
                    </p>
                    <ol className="text-xs text-emerald-600/80 dark:text-emerald-400/80 space-y-2 list-decimal list-inside">
                      <li>
                        Envoyez le message{' '}
                        <code className="rounded bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 text-[11px] font-mono">I allow callmebot to send me messages</code>{' '}
                        au numéro{' '}
                        <a
                          href="https://wa.me/34644538927"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 underline font-semibold"
                        >
                          +34 644 53 89 27
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>{' '}
                        sur WhatsApp
                      </li>
                      <li>
                        Attendez la réponse avec votre clé API CallMeBot
                      </li>
                      <li>
                        Copiez la clé API reçue (ex: 3286280)
                      </li>
                      <li>
                        Copiez la clé et collez-la dans le champ{' '}
                        <strong>&quot;Clé API CallMeBot&quot;</strong> ci-dessus
                      </li>
                      <li>
                        Entrez votre numéro WhatsApp et cliquez sur{' '}
                        <strong>Enregistrer</strong>
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Events Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" />
                Événements à surveiller
              </Label>
              <div className="space-y-3">
                {EVENT_CATEGORIES.map((cat) => {
                  const catIds = cat.events.map((e) => e.id);
                  const allSelected = catIds.every((id) =>
                    selectedEvents.includes(id)
                  );
                  const someSelected =
                    !allSelected &&
                    catIds.some((id) => selectedEvents.includes(id));

                  return (
                    <div key={cat.id} className="space-y-2">
                      <button
                        type="button"
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => toggleCategory(cat.id)}
                      >
                        <Checkbox
                          checked={allSelected}
                          ref={(el) => {
                            if (el) {
                              (el as unknown as HTMLInputElement).dataset.indeterminate =
                                someSelected ? 'true' : 'false';
                            }
                          }}
                          className={cn(
                            someSelected && !allSelected && 'data-[state=unchecked]:bg-primary/30 data-[state=unchecked]:border-primary/50'
                          )}
                        />
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          {cat.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          ({selectedEvents.filter((e) => catIds.includes(e)).length}/{catIds.length})
                        </span>
                        {someSelected && !allSelected && (
                          <Circle className="w-2 h-2 text-primary fill-primary/50" />
                        )}
                      </button>
                      <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {cat.events.map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                            onClick={() => toggleEvent(event.id)}
                          >
                            <Checkbox
                              checked={selectedEvents.includes(event.id)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {event.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                {selectedEvents.length} événement(s) sélectionné(s)
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            {editingChannel ? 'Mettre à jour' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
