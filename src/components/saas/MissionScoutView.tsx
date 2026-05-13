'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Radar,
  Search,
  Target,
  Send,
  Clock,
  Eye,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  Briefcase,
  Zap,
  Settings2,
  ArrowRight,
  Plus,
  X,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Bell,
  Tag,
  MapPin,
  Building2,
  Star,
  Timer,
  Activity,
  Home,
  Globe,
  GraduationCap,
  Repeat,
  Users,
  Filter,
  Gavel,
  BookOpen,
  Database,
  Cloud,
  Shield,
  Network,
  FolderKanban,
  Monitor,
  Cpu,
  HardDrive,
  Wrench,
  Sparkles,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================

interface Opportunity {
  id: string;
  source: string;
  sourceUrl?: string;
  title: string;
  company?: string;
  location?: string;
  description?: string;
  salaryRange?: string;
  relevanceScore: number;
  requiredSkills?: string;
  sector?: string;
  category?: string;
  contractType?: string;
  workMode?: string;
  region?: string;
  city?: string;
  country?: string;
  language?: string;
  jobTitle?: string;
  status: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  applications?: Application[];
  _count?: { applications: number };
}

interface Application {
  id: string;
  opportunityId: string;
  status: string;
  message?: string;
  connectionSent: boolean;
  followUpStage: number;
  nextFollowUpAt?: string;
  lastFollowUpAt?: string;
  responseText?: string;
  aiAnalysis?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  opportunity?: Opportunity;
}

interface MissionScoutConfig {
  targetSectors: string[];
  targetLocations: string[];
  skills: string[];
  maxApplicationsPerWeek: number;
  autoApply: boolean;
  followUpEnabled: boolean;
  notificationChannel: string;
}

interface DashboardStats {
  totalOpportunities: number;
  newOpportunities: number;
  totalApplications: number;
  sentApplications: number;
  repliedApplications: number;
  interestedOpportunities: number;
  responseRate: number;
  pipeline: { found: number; applied: number; viewed: number; replied: number; interested: number };
  pendingFollowUps: number;
  recentActivities: { id: string; title: string; status: string; description?: string; createdAt: string }[];
}

interface LinkedInProfileAnalysis {
  skills: string[];
  sectors: string[];
  jobTitles: string[];
  preferredWorkMode: string[];
  preferredRegions: string[];
  preferredCountries: string[];
  languages: string[];
  contentTone: string;
  engagementStyle: string;
  topTopics: string[];
  analyzedAt: string;
  postCount: number;
}

// ============================================================
// Constants
// ============================================================

const CATEGORIES = [
  { value: 'data', label: 'Data' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'devops', label: 'DevOps' },
  { value: 'ia_ml', label: 'IA / ML' },
  { value: 'cybersecurite', label: 'Cybersécurité' },
  { value: 'reseau', label: 'Réseau' },
  { value: 'gestion_projet', label: 'Gestion de Projet' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'autre', label: 'Autre' },
];

const CONTRACT_TYPES = [
  { value: 'cdi', label: 'CDI' },
  { value: 'cdd', label: 'CDD' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'stage', label: 'Stage' },
  { value: 'alternance', label: 'Alternance' },
  { value: 'contrat_pro', label: 'Contrat Pro' },
];

const WORK_MODES = [
  { value: 'remote', label: 'Télétravail' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'onsite', label: 'Sur site' },
];

const REGIONS = [
  { value: 'ile_de_france', label: 'Île-de-France' },
  { value: 'auvergne_rhone_alpes', label: 'Auvergne-Rhône-Alpes' },
  { value: 'provence_alpes_cote_d_azur', label: "Provence-Alpes-Côte d'Azur" },
  { value: 'nouvelle_aquitaine', label: 'Nouvelle-Aquitaine' },
  { value: 'occitanie', label: 'Occitanie' },
  { value: 'grand_est', label: 'Grand Est' },
  { value: 'hauts_de_france', label: 'Hauts-de-France' },
  { value: 'bretagne', label: 'Bretagne' },
  { value: 'normandie', label: 'Normandie' },
  { value: 'pays_de_la_loire', label: 'Pays de la Loire' },
  { value: 'bourgogne_franche_compte', label: 'Bourgogne-Franche-Comté' },
  { value: 'centre_val_de_loire', label: 'Centre-Val de Loire' },
  { value: 'corse', label: 'Corse' },
  { value: 'dom_tom', label: 'DOM-TOM' },
  { value: 'etranger', label: 'Étranger' },
];

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
  { value: 'de', label: 'Allemand' },
  { value: 'es', label: 'Espagnol' },
  { value: 'it', label: 'Italien' },
  { value: 'nl', label: 'Néerlandais' },
  { value: 'autre', label: 'Autre' },
];

const JOB_TITLES = [
  { value: 'data_engineer', label: 'Data Engineer' },
  { value: 'data_architect', label: 'Data Architect' },
  { value: 'data_analyst', label: 'Data Analyst' },
  { value: 'data_scientist', label: 'Data Scientist' },
  { value: 'devops_engineer', label: 'DevOps Engineer' },
  { value: 'cloud_engineer', label: 'Cloud Engineer' },
  { value: 'cloud_architect', label: 'Cloud Architect' },
  { value: 'sre_engineer', label: 'SRE Engineer' },
  { value: 'platform_engineer', label: 'Platform Engineer' },
  { value: 'ml_engineer', label: 'ML Engineer' },
  { value: 'ia_engineer', label: 'IA Engineer' },
  { value: 'bigdata_engineer', label: 'Big Data Engineer' },
  { value: 'db_admin', label: 'DBA' },
  { value: 'autre', label: 'Autre' },
];

const SOURCES = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'referral', label: 'Recommandation' },
];

const OPP_STATUS_META: Record<string, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  applied: { label: 'Candidaturé', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
  viewed: { label: 'Vu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  replied: { label: 'Répondu', color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400' },
  interested: { label: 'Intéressé', color: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' },
  not_interested: { label: 'Pas intéressé', color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
  expired: { label: 'Expiré', color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
  archived: { label: 'Archivé', color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
};

const APP_STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
  sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
  viewed: { label: 'Vu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  replied: { label: 'Répondu', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
  expired: { label: 'Expiré', color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
};

const CONTRACT_TYPE_COLORS: Record<string, string> = {
  cdi: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400',
  cdd: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  freelance: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
  stage: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  alternance: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400',
  contrat_pro: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
};

function getScoreBadge(score: number) {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
  if (score >= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
}

function getLabel(constants: { value: string; label: string }[], value: string | null | undefined): string | null {
  if (!value) return null;
  return constants.find((c) => c.value === value)?.label || value;
}

function getWorkModeIcon(mode: string | null | undefined) {
  if (mode === 'remote') return Home;
  if (mode === 'hybride') return Repeat;
  if (mode === 'onsite') return Building2;
  return MapPin;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
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

// ============================================================
// Main Component
// ============================================================

export default function MissionScoutView() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/40">
          <Radar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Mission Scout Ultra</h2>
          <p className="text-sm text-muted-foreground">
            Chasseur d&apos;opportunités autonome propulsé par l&apos;IA
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="w-4 h-4 hidden sm:inline" />
            Tableau de bord
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="gap-1.5 text-xs sm:text-sm">
            <Briefcase className="w-4 h-4 hidden sm:inline" />
            Opportunités
          </TabsTrigger>
          <TabsTrigger value="applications" className="gap-1.5 text-xs sm:text-sm">
            <Send className="w-4 h-4 hidden sm:inline" />
            Candidatures
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="gap-1.5 text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 hidden sm:inline" />
            Intelligence
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5 text-xs sm:text-sm">
            <Settings2 className="w-4 h-4 hidden sm:inline" />
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="opportunities">
          <OpportunitiesTab />
        </TabsContent>
        <TabsContent value="applications">
          <ApplicationsTab />
        </TabsContent>
        <TabsContent value="intelligence">
          <IntelligenceTab />
        </TabsContent>
        <TabsContent value="config">
          <ConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Tab 1: Tableau de bord
// ============================================================

function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      await apiFetch<{
        totalOpportunities: number;
      }>('/api/mission-scout/opportunities?limit=1');

      const [fuData, actData] = await Promise.all([
        apiFetch<{ counts: { pending: number; overdue: number; upcoming: number } }>('/api/mission-scout/follow-ups'),
        apiFetch<{ activities: any[] }>('/api/ai-agent?limit=10'),
      ]);

      const oppCount = await apiFetch<{ total: number }>('/api/mission-scout/opportunities?limit=1');
      const appOpps = await apiFetch<{ total: number }>('/api/mission-scout/opportunities?status=applied&limit=1');
      const viewedOpps = await apiFetch<{ total: number }>('/api/mission-scout/opportunities?status=viewed&limit=1');
      const repliedOpps = await apiFetch<{ total: number }>('/api/mission-scout/opportunities?status=replied&limit=1');
      const interestedOpps = await apiFetch<{ total: number }>('/api/mission-scout/opportunities?status=interested&limit=1');
      const newOpps = await apiFetch<{ total: number }>('/api/mission-scout/opportunities?status=new&limit=1');

      setStats({
        totalOpportunities: oppCount.total,
        newOpportunities: newOpps.total,
        totalApplications: appOpps.total,
        sentApplications: appOpps.total,
        repliedApplications: repliedOpps.total,
        interestedOpportunities: interestedOpps.total,
        responseRate: appOpps.total > 0 ? Math.round((repliedOpps.total / appOpps.total) * 100) : 0,
        pipeline: {
          found: newOpps.total,
          applied: appOpps.total,
          viewed: viewedOpps.total,
          replied: repliedOpps.total,
          interested: interestedOpps.total,
        },
        pendingFollowUps: fuData.counts.pending,
        recentActivities: (actData.activities || []).filter((a: any) => a.agentType === 'mission_scout').slice(0, 8),
      });
    } catch {
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleScan = async () => {
    setScanning(true);
    try {
      await apiFetch('/api/mission-scout/scan', { method: 'POST' });
      toast.success('Scan lancé avec succès');
      setTimeout(fetchStats, 2000);
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setScanning(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const kpis = [
    { label: 'Opportunités trouvées', value: stats.totalOpportunities, icon: Search, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/40' },
    { label: 'Candidatures envoyées', value: stats.sentApplications, icon: Send, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950/40' },
    { label: 'Taux de réponse', value: `${stats.responseRate}%`, icon: MessageSquare, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/40' },
    { label: 'Intérêts décrochés', value: stats.interestedOpportunities, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-950/40' },
  ];

  const pipelineStages = [
    { label: 'Trouvé', value: stats.pipeline.found, color: 'bg-emerald-500' },
    { label: 'Candidaturé', value: stats.pipeline.applied, color: 'bg-blue-500' },
    { label: 'Vu', value: stats.pipeline.viewed, color: 'bg-amber-500' },
    { label: 'Réponse', value: stats.pipeline.replied, color: 'bg-violet-500' },
    { label: 'Intéressé', value: stats.pipeline.interested, color: 'bg-green-500' },
  ];

  const maxPipeline = Math.max(...pipelineStages.map((s) => s.value), 1);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', k.bg)}>
                <k.icon className={cn('w-4 h-4', k.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pipeline Funnel */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Pipeline de conversion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipelineStages.map((stage, i) => (
              <div key={stage.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{stage.label}</span>
                  <span className="font-medium">{stage.value}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', stage.color)}
                    style={{ width: `${maxPipeline > 0 ? (stage.value / maxPipeline) * 100 : 0}%` }}
                  />
                </div>
                {i < pipelineStages.length - 1 && (
                  <div className="flex justify-center">
                    <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
            {stats.pendingFollowUps > 0 && (
              <div className="mt-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {stats.pendingFollowUps} relance(s) en attente
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Activité récente
              </CardTitle>
              <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={handleScan} disabled={scanning}>
                {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radar className="w-3 h-3" />}
                Scanner
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentActivities.length === 0 ? (
              <div className="py-8 text-center">
                <Radar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucune activité récente</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Lancez un scan pour détecter des opportunités</p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="divide-y divide-border/50">
                  {stats.recentActivities.map((act) => (
                    <div key={act.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-md bg-amber-100 dark:bg-amber-950/40">
                        <Radar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{act.title}</p>
                        {act.description && <p className="text-xs text-muted-foreground line-clamp-1">{act.description}</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatRelativeTime(act.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// Tab 2: Opportunités (REWRITTEN with advanced filtering)
// ============================================================

interface FilterState {
  search: string;
  status: string;
  category: string;
  contractType: string;
  workMode: string;
  region: string;
  city: string;
  country: string;
  language: string;
  jobTitle: string;
  source: string;
  minScore: number;
}

const EMPTY_FILTERS: FilterState = {
  search: '',
  status: 'all',
  category: '',
  contractType: '',
  workMode: '',
  region: '',
  city: '',
  country: '',
  language: '',
  jobTitle: '',
  source: '',
  minScore: 0,
};

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  options,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <Select value={value || '__none__'} onValueChange={(v) => onValueChange(v === '__none__' ? '' : v)}>
      <SelectTrigger className={cn('h-8 text-sm', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function OpportunitiesTab() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [applyDialog, setApplyDialog] = useState<Opportunity | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detailDialog, setDetailDialog] = useState<Opportunity | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({
    title: '',
    company: '',
    description: '',
    category: '',
    contractType: '',
    workMode: '',
    region: '',
    city: '',
    country: 'France',
    language: '',
    jobTitle: '',
    salaryRange: '',
    sourceUrl: '',
    requiredSkills: '',
  });

  const pageSize = 20;

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      if (filters.contractType) params.set('contractType', filters.contractType);
      if (filters.workMode) params.set('workMode', filters.workMode);
      if (filters.region) params.set('region', filters.region);
      if (filters.city) params.set('city', filters.city);
      if (filters.country) params.set('country', filters.country);
      if (filters.language) params.set('language', filters.language);
      if (filters.jobTitle) params.set('jobTitle', filters.jobTitle);
      if (filters.source) params.set('source', filters.source);
      if (filters.minScore > 0) params.set('minScore', String(filters.minScore));
      params.set('sort', 'relevanceScore');
      params.set('order', 'desc');
      params.set('limit', String(pageSize));
      params.set('offset', String((currentPage - 1) * pageSize));

      const data = await apiFetch<{ opportunities: Opportunity[]; total: number }>(
        `/api/mission-scout/opportunities?${params.toString()}`
      );
      setOpportunities(data.opportunities);
      setTotal(data.total);
    } catch {
      toast.error('Erreur lors du chargement des opportunités');
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Reset to page 1 when filters change
  const updateFilter = (key: keyof FilterState, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => {
    if (k === 'status' && v === 'all') return false;
    if (k === 'minScore' && v === 0) return false;
    if (typeof v === 'string' && v === '') return false;
    return true;
  });

  const handleApply = async () => {
    if (!applyDialog) return;
    setApplying(true);
    try {
      await apiFetch('/api/mission-scout/apply', {
        method: 'POST',
        body: JSON.stringify({ opportunityId: applyDialog.id, message: applyMessage || undefined }),
      });
      toast.success('Candidature envoyée avec succès');
      setApplyDialog(null);
      setApplyMessage('');
      fetchOpportunities();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await apiFetch(`/api/mission-scout/opportunities/${id}`, { method: 'DELETE' });
      toast.success('Opportunité archivée');
      fetchOpportunities();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      await apiFetch('/api/mission-scout/scan', { method: 'POST' });
      toast.success('Scan lancé');
      setTimeout(fetchOpportunities, 3000);
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleCreate = async () => {
    if (!addForm.title.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    setCreating(true);
    try {
      const skills = addForm.requiredSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await apiFetch('/api/mission-scout/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          ...addForm,
          requiredSkills: skills.length > 0 ? skills : undefined,
        }),
      });
      toast.success('Opportunité créée');
      setAddDialogOpen(false);
      setAddForm({
        title: '',
        company: '',
        description: '',
        category: '',
        contractType: '',
        workMode: '',
        region: '',
        city: '',
        country: 'France',
        language: '',
        jobTitle: '',
        salaryRange: '',
        sourceUrl: '',
        requiredSkills: '',
      });
      fetchOpportunities();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top row: Search + Actions */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, entreprise, description..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" className="gap-1.5 h-8" onClick={handleScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radar className="w-3.5 h-3.5" />}
            Scanner
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={fetchOpportunities} disabled={loading}>
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Actualiser
          </Button>
          <Button size="sm" className="gap-1.5 h-8" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </Button>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            className={cn('gap-1.5 h-8', showFilters && 'bg-amber-600 hover:bg-amber-700 text-white')}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtres
            {hasActiveFilters && (
              <span className="ml-1 bg-white/20 text-[10px] rounded-full px-1.5 py-0.5">!</span>
            )}
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Collapsible filter panel */}
      {showFilters && (
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            {/* Row 1: Category | Contract Type | Work Mode | Score min */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Catégorie</Label>
                <FilterSelect
                  value={filters.category}
                  onValueChange={(v) => updateFilter('category', v)}
                  placeholder="Toutes"
                  options={CATEGORIES}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type de contrat</Label>
                <FilterSelect
                  value={filters.contractType}
                  onValueChange={(v) => updateFilter('contractType', v)}
                  placeholder="Tous"
                  options={CONTRACT_TYPES}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Mode de travail</Label>
                <FilterSelect
                  value={filters.workMode}
                  onValueChange={(v) => updateFilter('workMode', v)}
                  placeholder="Tous"
                  options={WORK_MODES}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Score minimum</Label>
                <Select value={String(filters.minScore)} onValueChange={(v) => updateFilter('minScore', parseInt(v, 10))}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Tous</SelectItem>
                    <SelectItem value="50">≥ 50</SelectItem>
                    <SelectItem value="60">≥ 60</SelectItem>
                    <SelectItem value="70">≥ 70</SelectItem>
                    <SelectItem value="80">≥ 80</SelectItem>
                    <SelectItem value="90">≥ 90</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Region | City | Country | Language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Région</Label>
                <FilterSelect
                  value={filters.region}
                  onValueChange={(v) => updateFilter('region', v)}
                  placeholder="Toutes"
                  options={REGIONS}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ville</Label>
                <Input
                  placeholder="Rechercher une ville..."
                  value={filters.city}
                  onChange={(e) => updateFilter('city', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Pays</Label>
                <Input
                  placeholder="France"
                  value={filters.country}
                  onChange={(e) => updateFilter('country', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Langue</Label>
                <FilterSelect
                  value={filters.language}
                  onValueChange={(v) => updateFilter('language', v)}
                  placeholder="Toutes"
                  options={LANGUAGES}
                />
              </div>
            </div>

            {/* Row 3: Job Title | Source | Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Poste</Label>
                <FilterSelect
                  value={filters.jobTitle}
                  onValueChange={(v) => updateFilter('jobTitle', v)}
                  placeholder="Tous"
                  options={JOB_TITLES}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Source</Label>
                <FilterSelect
                  value={filters.source}
                  onValueChange={(v) => updateFilter('source', v)}
                  placeholder="Toutes"
                  options={SOURCES}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Statut</Label>
                <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="new">Nouveau</SelectItem>
                    <SelectItem value="applied">Candidaturé</SelectItem>
                    <SelectItem value="viewed">Vu</SelectItem>
                    <SelectItem value="replied">Répondu</SelectItem>
                    <SelectItem value="interested">Intéressé</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reset */}
            <div className="flex justify-end pt-1">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={resetFilters} disabled={!hasActiveFilters}>
                <X className="w-3 h-3" />
                Réinitialiser les filtres
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} opportunité{total !== 1 ? 's' : ''} trouvée{total !== 1 ? 's' : ''}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Précédent
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune opportunité trouvée</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Modifiez vos filtres ou ajoutez une opportunité manuellement
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="divide-y divide-border/50">
                {opportunities.map((opp) => {
                  const status = OPP_STATUS_META[opp.status] || OPP_STATUS_META.new;
                  const skills = safeJsonParse<string[]>(opp.requiredSkills, []);
                  const hasApp = opp.applications && opp.applications.length > 0;
                  const contractColor = opp.contractType ? CONTRACT_TYPE_COLORS[opp.contractType] : null;
                  const WorkIcon = getWorkModeIcon(opp.workMode);

                  return (
                    <div key={opp.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              className="text-sm font-medium truncate hover:underline text-left"
                              onClick={() => setDetailDialog(opp)}
                            >
                              {opp.title}
                            </button>
                            <Badge variant="secondary" className={cn('text-[10px]', getScoreBadge(opp.relevanceScore))}>
                              <Star className="w-2.5 h-2.5 mr-0.5" />
                              {opp.relevanceScore}
                            </Badge>
                            <Badge variant="secondary" className={cn('text-[10px]', status.color)}>
                              {status.label}
                            </Badge>
                            {opp.contractType && contractColor && (
                              <Badge variant="secondary" className={cn('text-[10px]', contractColor)}>
                                {getLabel(CONTRACT_TYPES, opp.contractType)}
                              </Badge>
                            )}
                            {opp.workMode && (
                              <Badge variant="outline" className="text-[10px] gap-0.5">
                                <WorkIcon className="w-2.5 h-2.5" />
                                {getLabel(WORK_MODES, opp.workMode)}
                              </Badge>
                            )}
                            {opp.category && (
                              <Badge variant="outline" className="text-[10px]">
                                {getLabel(CATEGORIES, opp.category)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            {opp.company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {opp.company}
                              </span>
                            )}
                            {(opp.city || opp.location) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {opp.city || opp.location}
                              </span>
                            )}
                            {opp.country && opp.country !== 'France' && (
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {opp.country}
                              </span>
                            )}
                            {opp.sector && (
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {opp.sector}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(opp.createdAt)}
                            </span>
                          </div>
                          {skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {skills.slice(0, 4).map((s) => (
                                <Badge key={s} variant="outline" className="text-[10px] py-0 px-1.5">
                                  {s}
                                </Badge>
                              ))}
                              {skills.length > 4 && (
                                <span className="text-[10px] text-muted-foreground">+{skills.length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!hasApp && opp.status === 'new' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => setApplyDialog(opp)}>
                                  <Send className="w-3 h-3" />
                                  Postuler
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Envoyer une candidature</TooltipContent>
                            </Tooltip>
                          )}
                          {hasApp && (
                            <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                              <CheckCircle2 className="w-3 h-3 mr-0.5" />
                              Candidaturé
                            </Badge>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleArchive(opp.id)}>
                                <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Archiver</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" className="h-7 px-3" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
            Précédent
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            Page {currentPage} sur {totalPages}
          </span>
          <Button variant="outline" size="sm" className="h-7 px-3" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
            Suivant
          </Button>
        </div>
      )}

      {/* Apply Dialog */}
      <Dialog open={!!applyDialog} onOpenChange={(o) => !o && setApplyDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          {applyDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-600" />
                  Postuler — {applyDialog.title}
                </DialogTitle>
                <DialogDescription>
                  {applyDialog.company} {applyDialog.location && `· ${applyDialog.location}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Label className="text-xs font-medium">Message de candidature (optionnel — l&apos;IA en générera un si vide)</Label>
                <Textarea placeholder="Laissez vide pour une génération automatique par l'IA..." value={applyMessage} onChange={(e) => setApplyMessage(e.target.value)} rows={5} className="text-sm" />
                {applyDialog.description && (
                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Description de l&apos;offre:</p>
                    <p className="line-clamp-4">{applyDialog.description}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setApplyDialog(null)}>Annuler</Button>
                <Button className="gap-1.5" onClick={handleApply} disabled={applying}>
                  {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Envoyer la candidature
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={(o) => !o && setDetailDialog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  {detailDialog.title}
                </DialogTitle>
                <DialogDescription>
                  {detailDialog.company} {detailDialog.location && `· ${detailDialog.location}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Badges row */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className={cn('text-[10px]', getScoreBadge(detailDialog.relevanceScore))}>
                    <Star className="w-2.5 h-2.5 mr-0.5" />
                    Score: {detailDialog.relevanceScore}/100
                  </Badge>
                  <Badge variant="secondary" className={cn('text-[10px]', (OPP_STATUS_META[detailDialog.status] || OPP_STATUS_META.new).color)}>
                    {(OPP_STATUS_META[detailDialog.status] || OPP_STATUS_META.new).label}
                  </Badge>
                  {detailDialog.contractType && (
                    <Badge variant="secondary" className={cn('text-[10px]', CONTRACT_TYPE_COLORS[detailDialog.contractType] || '')}>
                      {getLabel(CONTRACT_TYPES, detailDialog.contractType)}
                    </Badge>
                  )}
                  {detailDialog.workMode && (
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      {(() => { const Icon = getWorkModeIcon(detailDialog.workMode); return <Icon className="w-2.5 h-2.5" />; })()}
                      {getLabel(WORK_MODES, detailDialog.workMode)}
                    </Badge>
                  )}
                  {detailDialog.category && (
                    <Badge variant="outline" className="text-[10px]">{getLabel(CATEGORIES, detailDialog.category)}</Badge>
                  )}
                  {detailDialog.jobTitle && (
                    <Badge variant="outline" className="text-[10px]">{getLabel(JOB_TITLES, detailDialog.jobTitle)}</Badge>
                  )}
                  {detailDialog.language && (
                    <Badge variant="outline" className="text-[10px]">{getLabel(LANGUAGES, detailDialog.language)}</Badge>
                  )}
                </div>

                {/* Description */}
                {detailDialog.description && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <Label className="text-xs font-medium text-muted-foreground mb-1 block">Description</Label>
                    <p className="text-sm whitespace-pre-wrap">{detailDialog.description}</p>
                  </div>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  {detailDialog.company && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Entreprise</p>
                      <p className="text-sm font-medium">{detailDialog.company}</p>
                    </div>
                  )}
                  {detailDialog.salaryRange && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Salaire</p>
                      <p className="text-sm font-medium">{detailDialog.salaryRange}</p>
                    </div>
                  )}
                  {(detailDialog.city || detailDialog.location) && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Lieu</p>
                      <p className="text-sm font-medium">{[detailDialog.city, detailDialog.region ? getLabel(REGIONS, detailDialog.region) : null, detailDialog.country].filter(Boolean).join(' · ') || detailDialog.location}</p>
                    </div>
                  )}
                  {detailDialog.sector && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Secteur</p>
                      <p className="text-sm font-medium">{detailDialog.sector}</p>
                    </div>
                  )}
                  {detailDialog.source && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Source</p>
                      <p className="text-sm font-medium">{getLabel(SOURCES, detailDialog.source) || detailDialog.source}</p>
                    </div>
                  )}
                </div>

                {/* Skills */}
                {detailDialog.requiredSkills && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5">Compétences requises</p>
                    <div className="flex flex-wrap gap-1.5">
                      {safeJsonParse<string[]>(detailDialog.requiredSkills, []).map((s) => (
                        <Badge key={s} variant="outline">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source URL */}
                {detailDialog.sourceUrl && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Source: </span>
                    <a href={detailDialog.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                      {detailDialog.sourceUrl}
                    </a>
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(detailDialog.createdAt)}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailDialog(null)}>Fermer</Button>
                {detailDialog.status === 'new' && (
                  <Button className="gap-1.5" onClick={() => { setDetailDialog(null); setApplyDialog(detailDialog); }}>
                    <Send className="w-3.5 h-3.5" />
                    Postuler
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Opportunity Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(o) => !o && setAddDialogOpen(false)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-600" />
              Ajouter une opportunité
            </DialogTitle>
            <DialogDescription>Remplissez les informations de l&apos;opportunité</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Titre *</Label>
              <Input placeholder="Ex: Data Engineer H/F" value={addForm.title} onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))} className="text-sm" />
            </div>

            {/* Company & Salary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Entreprise</Label>
                <Input placeholder="Nom de l'entreprise" value={addForm.company} onChange={(e) => setAddForm((f) => ({ ...f, company: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Salaire</Label>
                <Input placeholder="Ex: 45-55k€" value={addForm.salaryRange} onChange={(e) => setAddForm((f) => ({ ...f, salaryRange: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>

            {/* Category & Contract Type & Work Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Catégorie</Label>
                <FilterSelect value={addForm.category} onValueChange={(v) => setAddForm((f) => ({ ...f, category: v }))} placeholder="Catégorie" options={CATEGORIES} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Type de contrat</Label>
                <FilterSelect value={addForm.contractType} onValueChange={(v) => setAddForm((f) => ({ ...f, contractType: v }))} placeholder="Type de contrat" options={CONTRACT_TYPES} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mode de travail</Label>
                <FilterSelect value={addForm.workMode} onValueChange={(v) => setAddForm((f) => ({ ...f, workMode: v }))} placeholder="Mode" options={WORK_MODES} />
              </div>
            </div>

            {/* Job Title */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Poste</Label>
              <FilterSelect value={addForm.jobTitle} onValueChange={(v) => setAddForm((f) => ({ ...f, jobTitle: v }))} placeholder="Type de poste" options={JOB_TITLES} />
            </div>

            {/* Region & City & Country & Language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Région</Label>
                <FilterSelect value={addForm.region} onValueChange={(v) => setAddForm((f) => ({ ...f, region: v }))} placeholder="Région" options={REGIONS} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ville</Label>
                <Input placeholder="Ville" value={addForm.city} onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pays</Label>
                <Input placeholder="France" value={addForm.country} onChange={(e) => setAddForm((f) => ({ ...f, country: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Langue</Label>
                <FilterSelect value={addForm.language} onValueChange={(v) => setAddForm((f) => ({ ...f, language: v }))} placeholder="Langue" options={LANGUAGES} />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea placeholder="Description de l'offre..." value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} rows={4} className="text-sm" />
            </div>

            {/* Source URL & Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">URL source</Label>
                <Input placeholder="https://..." value={addForm.sourceUrl} onChange={(e) => setAddForm((f) => ({ ...f, sourceUrl: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Compétences requises</Label>
                <Input placeholder="Python, SQL, Spark..." value={addForm.requiredSkills} onChange={(e) => setAddForm((f) => ({ ...f, requiredSkills: e.target.value }))} className="h-8 text-sm" />
                <p className="text-[10px] text-muted-foreground">Séparées par des virgules</p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Annuler</Button>
            <Button className="gap-1.5" onClick={handleCreate} disabled={creating || !addForm.title.trim()}>
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Créer l&apos;opportunité
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Tab 3: Candidatures
// ============================================================

function ApplicationsTab() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [opportunities, setOpportunities] = useState<Record<string, Opportunity>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [responseDialog, setResponseDialog] = useState<Application | null>(null);
  const [responseText, setResponseText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ opportunities: Opportunity[] }>(
        '/api/mission-scout/opportunities?status=applied&sort=createdAt&order=desc&limit=50'
      );
      const opps = data.opportunities;

      const [viewedData, repliedData, interestedData, expiredData] = await Promise.all([
        apiFetch<{ opportunities: Opportunity[] }>('/api/mission-scout/opportunities?status=viewed&limit=50'),
        apiFetch<{ opportunities: Opportunity[] }>('/api/mission-scout/opportunities?status=replied&limit=50'),
        apiFetch<{ opportunities: Opportunity[] }>('/api/mission-scout/opportunities?status=interested&limit=50'),
        apiFetch<{ opportunities: Opportunity[] }>('/api/mission-scout/opportunities?status=expired&limit=50'),
      ]);

      const allOpps = [...opps, ...viewedData.opportunities, ...repliedData.opportunities, ...interestedData.opportunities, ...expiredData.opportunities];
      const oppMap: Record<string, Opportunity> = {};
      allOpps.forEach((o) => { oppMap[o.id] = o; });
      setOpportunities(oppMap);

      const allApps = allOpps.flatMap((o) =>
        (o.applications || []).map((a) => ({
          ...a,
          opportunity: o,
        }))
      );

      setApplications(allApps);
    } catch {
      toast.error('Erreur lors du chargement des candidatures');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filtered = applications.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const handleFollowUp = async (appId: string) => {
    setProcessing(appId);
    try {
      await apiFetch<{ processed: number; expired: number; details: any[] }>('/api/mission-scout/follow-ups', {
        method: 'POST',
      });
      toast.success('Relance traitée');
      fetchApplications();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleAnalyzeResponse = async () => {
    if (!responseDialog || !responseText.trim()) return;
    setAnalyzing(true);
    try {
      await apiFetch<{ analysis: string }>('/api/mission-scout/apply', {
        method: 'POST',
        body: JSON.stringify({
          opportunityId: responseDialog.opportunityId,
          action: 'analyze_response',
          responseText,
        }),
      });
      toast.success('Réponse analysée');
      setResponseDialog(null);
      setResponseText('');
      fetchApplications();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const followUpStageLabels = ['Aucune', 'J+3', 'J+7', 'J+14'];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="sent">Envoyé</SelectItem>
            <SelectItem value="viewed">Vu</SelectItem>
            <SelectItem value="replied">Répondu</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
            <SelectItem value="expired">Expiré</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 ml-auto" onClick={fetchApplications} disabled={loading}>
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Actualiser
        </Button>
      </div>

      {/* Applications List */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Send className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune candidature trouvée</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="divide-y divide-border/50">
                {filtered.map((app) => {
                  const status = APP_STATUS_META[app.status] || APP_STATUS_META.sent;
                  const opp = app.opportunity;

                  return (
                    <div key={app.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">
                              {opp?.title || 'Opportunité inconnue'}
                            </span>
                            <Badge variant="secondary" className={cn('text-[10px]', status.color)}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {opp?.company} {opp?.location && `· ${opp?.location}`}
                          </p>

                          {app.message && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1 cursor-help">
                                  {app.message}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs">
                                <p className="text-xs whitespace-pre-wrap">{app.message}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              Relance:
                            </span>
                            {[0, 1, 2, 3].map((stage) => (
                              <div key={stage} className={cn('h-1.5 flex-1 rounded-full max-w-[60px]', app.followUpStage >= stage ? 'bg-amber-500' : 'bg-muted')} />
                            ))}
                            <span className="text-[10px] text-muted-foreground">{followUpStageLabels[app.followUpStage]}</span>
                            {app.nextFollowUpAt && app.status === 'sent' && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                {new Date(app.nextFollowUpAt) <= new Date() ? '⚠ Prêt' : `→ ${formatRelativeTime(app.nextFollowUpAt)}`}
                              </span>
                            )}
                          </div>

                          {app.responseText && (
                            <div className="mt-2 p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mb-0.5">Réponse reçue:</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{app.responseText}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <p className="text-[10px] text-muted-foreground">{formatRelativeTime(app.createdAt)}</p>
                          {app.status === 'sent' && app.nextFollowUpAt && new Date(app.nextFollowUpAt) <= new Date() && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2 text-amber-600 border-amber-300 hover:bg-amber-50" onClick={() => handleFollowUp(app.id)} disabled={processing === app.id}>
                              {processing === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                              Relancer
                            </Button>
                          )}
                          {app.status === 'sent' && !app.responseText && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2" onClick={() => setResponseDialog(app)}>
                              <MessageSquare className="w-3 h-3" />
                              Réponse reçue
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={!!responseDialog} onOpenChange={(o) => !o && setResponseDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          {responseDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Enregistrer une réponse
                </DialogTitle>
                <DialogDescription>
                  {responseDialog.opportunity?.title} — {responseDialog.opportunity?.company}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Label className="text-xs font-medium">Texte de la réponse du recruteur</Label>
                <Textarea placeholder="Collez ici la réponse reçue..." value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={4} className="text-sm" />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => { setResponseDialog(null); setResponseText(''); }}>Annuler</Button>
                <Button className="gap-1.5" onClick={handleAnalyzeResponse} disabled={analyzing || !responseText.trim()}>
                  {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Analyser avec l&apos;IA
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Tab 4: Intelligence IA (Auto-posting & Profile Analysis)
// ============================================================

function IntelligenceTab() {
  const [profile, setProfile] = useState<LinkedInProfileAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [autoPostConfig, setAutoPostConfig] = useState({ autoPost: false, frequency: 'weekly', lastAutoPost: null as string | null });
  const [generating, setGenerating] = useState<string | null>(null);

  // Fetch profile analysis and auto-post config on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileRes, configRes] = await Promise.all([
          apiFetch<{ analysis: LinkedInProfileAnalysis }>('/api/mission-scout/profile-analysis'),
          apiFetch<{ config: any }>('/api/mission-scout/auto-post'),
        ]);
        if (profileRes.analysis) setProfile(profileRes.analysis);
        if (configRes.config) setAutoPostConfig(configRes.config);
      } catch {
        // Silently fail - data will load on button click
      }
    };
    loadData();
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await apiFetch<{ analysis: LinkedInProfileAnalysis }>('/api/mission-scout/profile-analysis?force=true');
      setProfile(res.analysis);
      toast.success('Profil analysé avec succès');
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAutoConfigure = async () => {
    setConfiguring(true);
    try {
      const res = await apiFetch<{ config: any; message: string }>('/api/mission-scout/auto-configure', { method: 'POST' });
      toast.success(res.message);
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setConfiguring(false);
    }
  };

  const handleToggleAutoPost = async (enabled: boolean) => {
    try {
      await apiFetch('/api/mission-scout/auto-post', {
        method: 'PUT',
        body: JSON.stringify({ autoPost: enabled, frequency: autoPostConfig.frequency }),
      });
      setAutoPostConfig((prev) => ({ ...prev, autoPost: enabled }));
      toast.success(enabled ? 'Auto-posting activé' : 'Auto-posting désactivé');
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    }
  };

  const handleChangeFrequency = async (freq: string) => {
    try {
      await apiFetch('/api/mission-scout/auto-post', {
        method: 'PUT',
        body: JSON.stringify({ autoPost: autoPostConfig.autoPost, frequency: freq }),
      });
      setAutoPostConfig((prev) => ({ ...prev, frequency: freq }));
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    }
  };

  const handleGeneratePost = async (type: string) => {
    setGenerating(type);
    try {
      await apiFetch('/api/mission-scout/auto-post', {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
      toast.success('Post généré en brouillon');
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Analysis Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Analyse de votre profil LinkedIn
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radar className="w-3 h-3" />}
                {profile ? 'Re-analyser' : 'Analyser'}
              </Button>
              {profile && (
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={handleAutoConfigure} disabled={configuring}>
                  {configuring ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Auto-configurer
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!profile ? (
            <div className="py-8 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucune analyse disponible</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                L&apos;IA analysera vos posts LinkedIn pour configurer automatiquement vos filtres
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary row */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-950/60">
                  <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Analyse basée sur {profile.postCount} posts</p>
                  <p className="text-xs text-muted-foreground">Ton: {profile.contentTone} | Style: {profile.engagementStyle}</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {new Date(profile.analyzedAt).toLocaleDateString('fr-FR')}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Skills */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Compétences détectées</Label>
                  <div className="flex flex-wrap gap-1">
                    {profile.skills.slice(0, 10).map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Sectors */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Secteurs d&apos;activité</Label>
                  <div className="flex flex-wrap gap-1">
                    {profile.sectors.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Job Titles */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Postes ciblés</Label>
                  <div className="flex flex-wrap gap-1">
                    {profile.jobTitles.map((j) => (
                      <Badge key={j} variant="secondary" className="text-xs bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
                        {j}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Work Mode */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Modes de travail préférés</Label>
                  <div className="flex flex-wrap gap-1">
                    {profile.preferredWorkMode.map((w) => (
                      <Badge key={w} variant="secondary" className="text-xs bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400">
                        {w}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Regions */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Régions de prédilection</Label>
                  <div className="flex flex-wrap gap-1">
                    {profile.preferredRegions.map((r) => (
                      <Badge key={r} variant="secondary" className="text-xs bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Langues utilisées</Label>
                  <div className="flex flex-wrap gap-1">
                    {profile.languages.map((l) => (
                      <Badge key={l} variant="secondary" className="text-xs bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400">
                        {l}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Top Topics */}
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Sujets récurrents</Label>
                  <div className="flex flex-wrap gap-1">
                    {profile.topTopics.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Posting Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Repeat className="w-4 h-4" />
            Auto-posting LinkedIn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Publiez automatiquement du contenu pertinent lié à vos recherches de missions, directement depuis votre profil LinkedIn analysé.
          </p>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">Auto-publication</p>
              <p className="text-xs text-muted-foreground">Générer et publier du contenu automatiquement</p>
            </div>
            <Switch
              checked={autoPostConfig.autoPost}
              onCheckedChange={handleToggleAutoPost}
            />
          </div>

          {autoPostConfig.autoPost && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fréquence</Label>
                <Select value={autoPostConfig.frequency} onValueChange={handleChangeFrequency}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Quotidienne</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="biweekly">Bimensuelle</SelectItem>
                    <SelectItem value="monthly">Mensuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {autoPostConfig.lastAutoPost && (
                <p className="text-[10px] text-muted-foreground">
                  Dernier auto-post: {new Date(autoPostConfig.lastAutoPost).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Post Generation */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="w-4 h-4" />
            Générer un post maintenant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Créez instantanément un post LinkedIn basé sur votre activité de recherche de missions. Le post sera créé en brouillon.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9 text-xs justify-start"
              onClick={() => handleGeneratePost('market_insight')}
              disabled={generating !== null}
            >
              {generating === 'market_insight' ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
              Analyse de marché
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9 text-xs justify-start"
              onClick={() => handleGeneratePost('weekly_summary')}
              disabled={generating !== null}
            >
              {generating === 'weekly_summary' ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />}
              Résumé hebdomadaire
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9 text-xs justify-start"
              onClick={() => handleGeneratePost('opportunity_found')}
              disabled={generating !== null}
            >
              {generating === 'opportunity_found' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              Nouvelle opportunité
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9 text-xs justify-start"
              onClick={() => handleGeneratePost('application_sent')}
              disabled={generating !== null}
            >
              {generating === 'application_sent' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Candidature envoyée
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Tab 5: Configuration
// ============================================================

function ConfigTab() {
  const [config, setConfig] = useState<MissionScoutConfig>({
    targetSectors: [],
    targetLocations: [],
    skills: [],
    maxApplicationsPerWeek: 10,
    autoApply: false,
    followUpEnabled: true,
    notificationChannel: 'email',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [tagTarget, setTagTarget] = useState<'sectors' | 'locations' | 'skills'>('sectors');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ config: MissionScoutConfig }>('/api/mission-scout/config');
      setConfig(data.config);
    } catch {
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = async (updates: Partial<MissionScoutConfig>) => {
    setSaving(true);
    try {
      const data = await apiFetch<{ config: MissionScoutConfig }>('/api/mission-scout/config', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setConfig(data.config);
      toast.success('Configuration sauvegardée');
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    const updates: Partial<MissionScoutConfig> = {};
    if (tagTarget === 'sectors') updates.targetSectors = [...config.targetSectors, newTag.trim()];
    else if (tagTarget === 'locations') updates.targetLocations = [...config.targetLocations, newTag.trim()];
    else updates.skills = [...config.skills, newTag.trim()];
    saveConfig(updates);
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    const updates: Partial<MissionScoutConfig> = {};
    if (tagTarget === 'sectors') updates.targetSectors = config.targetSectors.filter((t) => t !== tag);
    else if (tagTarget === 'locations') updates.targetLocations = config.targetLocations.filter((t) => t !== tag);
    else updates.skills = config.skills.filter((t) => t !== tag);
    saveConfig(updates);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      await apiFetch('/api/mission-scout/scan', { method: 'POST' });
      toast.success('Scan lancé avec succès');
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Target Sectors */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Secteurs cibles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {config.targetSectors.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1 py-1 px-2.5">
                {s}
                <button onClick={() => { setTagTarget('sectors'); removeTag(s); }} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {config.targetSectors.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucun secteur défini</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Ajouter un secteur..." value={tagTarget === 'sectors' ? newTag : ''} onChange={(e) => { setTagTarget('sectors'); setNewTag(e.target.value); }} onKeyDown={(e) => e.key === 'Enter' && addTag()} className="h-8 text-sm" />
            <Button size="sm" variant="outline" className="h-8" onClick={() => { setTagTarget('sectors'); addTag(); }}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Target Locations */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Lieux recherchés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {config.targetLocations.map((l) => (
              <Badge key={l} variant="secondary" className="gap-1 py-1 px-2.5">
                {l}
                <button onClick={() => { setTagTarget('locations'); removeTag(l); }} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {config.targetLocations.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucun lieu défini</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Ajouter un lieu..." value={tagTarget === 'locations' ? newTag : ''} onChange={(e) => { setTagTarget('locations'); setNewTag(e.target.value); }} onKeyDown={(e) => e.key === 'Enter' && addTag()} className="h-8 text-sm" />
            <Button size="sm" variant="outline" className="h-8" onClick={() => { setTagTarget('locations'); addTag(); }}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Compétences clés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {config.skills.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1 py-1 px-2.5">
                {s}
                <button onClick={() => { setTagTarget('skills'); removeTag(s); }} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {config.skills.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucune compétence définie</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Ajouter une compétence..." value={tagTarget === 'skills' ? newTag : ''} onChange={(e) => { setTagTarget('skills'); setNewTag(e.target.value); }} onKeyDown={(e) => e.key === 'Enter' && addTag()} className="h-8 text-sm" />
            <Button size="sm" variant="outline" className="h-8" onClick={() => { setTagTarget('skills'); addTag(); }}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Numeric & Toggle Settings */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Paramètres avancés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Candidatures max / semaine</Label>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{config.maxApplicationsPerWeek}</span>
            </div>
            <Slider value={[config.maxApplicationsPerWeek]} onValueChange={([v]) => saveConfig({ maxApplicationsPerWeek: v })} min={1} max={50} step={1} disabled={saving} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Mode autonome</Label>
              <p className="text-xs text-muted-foreground">Postuler automatiquement aux opportunités score ≥ 70</p>
            </div>
            <Switch checked={config.autoApply} onCheckedChange={(v) => saveConfig({ autoApply: v })} disabled={saving} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Suivi des relances</Label>
              <p className="text-xs text-muted-foreground">Relances automatiques J+3, J+7, J+14</p>
            </div>
            <Switch checked={config.followUpEnabled} onCheckedChange={(v) => saveConfig({ followUpEnabled: v })} disabled={saving} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Canal de notification</Label>
              <p className="text-xs text-muted-foreground">Où recevoir les alertes</p>
            </div>
            <Select value={config.notificationChannel} onValueChange={(v) => saveConfig({ notificationChannel: v })}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Scan Button */}
      <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/40">
              <Radar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Scanner maintenant</p>
              <p className="text-xs text-muted-foreground">Lance un scan complet : tendances + opportunités</p>
            </div>
          </div>
          <Button className="gap-1.5" onClick={handleScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radar className="w-3.5 h-3.5" />}
            Scanner
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
