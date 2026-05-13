'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Lightbulb,
  FileEdit,
  Clock,
  CheckCircle2,
  Send,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Sparkles,
  ShieldCheck,
  FileText,
  RefreshCw,
  Calendar,
  Download,
  Plus,
  Flame,
  MousePointerClick,
  Database,
  BrainCircuit,
  LogIn,
  Pencil,
  Trash2,
  Check,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Post, PostStatus, AuditLog } from '@/types';
import { POST_STATUS_LABELS, POST_STATUS_COLORS, AI_PROVIDER_LABELS, FORMAT_LABELS } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ============================================================
// Types
// ============================================================

interface DashboardStatsResponse {
  totalIdeas: number;
  totalDrafts: number;
  pendingApproval: number;
  approved: number;
  published: number;
  failed: number;
  totalPosts: number;
  recentPosts: Post[];
  postsByProvider: { aiProvider: string; _count: number }[];
  postsThisWeek: number;
  engagementRate: number;
  weeklyGrowth: number;
  topPerformingFormat: string | null;
  streak: number;
  lastError: string | null;
}

interface ChartData {
  weeklyData: { week: string; created: number; published: number }[];
  statusDistribution: { status: string; count: number }[];
  recentActivity: AuditLog[];
  performance: {
    thisMonthPosts: number;
    lastMonthPosts: number;
    monthChange: number;
    avgTimeHours: number | null;
  };
  pendingApproval: Post[];
}

type QuickFilter = 'today' | '7days' | '30days' | 'month';

interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

// ============================================================
// StatCard Component
// ============================================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
}

function StatCard({ title, value, icon, color, bgColor, subtitle, trend, trendValue, onClick }: StatCardProps) {
  return (
    <Card
      className={cn(
        'border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </p>
            <p className="text-2xl font-bold truncate">{value}</p>
            <div className="flex items-center gap-1.5">
              {trend && trendValue && (
                <span
                  className={cn(
                    'inline-flex items-center text-[10px] font-semibold',
                    trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
                    trend === 'down' && 'text-red-500 dark:text-red-400',
                    trend === 'neutral' && 'text-muted-foreground'
                  )}
                >
                  {trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                  {trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                  {trendValue}
                </span>
              )}
              {subtitle && !trendValue && (
                <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0', bgColor)}>
            <div className={color}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Constants
// ============================================================

const STATUS_PIE_COLORS: Record<string, string> = {
  idea: '#94a3b8',
  draft: '#f59e0b',
  pending_approval: '#3b82f6',
  approved: '#10b981',
  rejected: '#ef4444',
  scheduled: '#8b5cf6',
  posted: '#22c55e',
  failed: '#f43f5e',
};

interface ActivityIconResult {
  icon: React.ReactNode;
  color: string;
}

function getActivityIcon(action: string): ActivityIconResult {
  switch (true) {
    case action.includes('login'):
      return { icon: <LogIn className="w-3.5 h-3.5" />, color: 'text-emerald-500 bg-emerald-500/10' };
    case action.includes('create'):
      return { icon: <Plus className="w-3.5 h-3.5" />, color: 'text-blue-500 bg-blue-500/10' };
    case action.includes('update'):
      return { icon: <Pencil className="w-3.5 h-3.5" />, color: 'text-amber-500 bg-amber-500/10' };
    case action.includes('delete'):
      return { icon: <Trash2 className="w-3.5 h-3.5" />, color: 'text-red-500 bg-red-500/10' };
    case action.includes('publish') || action.includes('posted'):
      return { icon: <Send className="w-3.5 h-3.5" />, color: 'text-indigo-500 bg-indigo-500/10' };
    case action.includes('approve') || action.includes('approved'):
      return { icon: <Check className="w-3.5 h-3.5" />, color: 'text-emerald-500 bg-emerald-500/10' };
    case action.includes('reject') || action.includes('rejected'):
      return { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-rose-500 bg-rose-500/10' };
    case action.includes('generate_ai'):
      return { icon: <Sparkles className="w-3.5 h-3.5" />, color: 'text-violet-500 bg-violet-500/10' };
    default:
      return { icon: <Activity className="w-3.5 h-3.5" />, color: 'text-slate-500 bg-slate-500/10' };
  }
}

const POLL_INTERVAL_MS = 60_000; // 60 seconds

// ============================================================
// Helper: date formatting
// ============================================================

function formatDateForInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDateRangeForFilter(filter: QuickFilter): DateRange {
  const now = new Date();
  const to = formatDateForInput(now);
  switch (filter) {
    case 'today':
      return { from: to, to };
    case '7days': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: formatDateForInput(d), to };
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatDateForInput(d), to };
    }
    case '30days':
    default: {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: formatDateForInput(d), to };
    }
  }
}

function getLastUpdatedLabel(lastUpdated: Date): string {
  const diffMs = Date.now() - lastUpdated.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  return `il y a ${Math.floor(diffH / 24)}j`;
}

// ============================================================
// Insight generator
// ============================================================

function generateInsight(stats: DashboardStatsResponse): { title: string; detail: string; icon: React.ReactNode } {
  // 1. Format performance
  if (stats.topPerformingFormat && FORMAT_LABELS[stats.topPerformingFormat]) {
    return {
      title: `Les posts "${FORMAT_LABELS[stats.topPerformingFormat]}" performent mieux`,
      detail: `Le format ${FORMAT_LABELS[stats.topPerformingFormat]} génère en moyenne un meilleur engagement. Pensez à en créer davantage pour maximiser votre portée.`,
      icon: <TrendingUp className="w-5 h-5 text-violet-500" />,
    };
  }

  // 2. Streak insight
  if (stats.streak >= 7) {
    return {
      title: `${stats.streak} jours consécutifs de publication !`,
      detail: 'Votre régularité est excellente. La constance est la clé de la croissance sur LinkedIn. Continuez sur cette lancée !',
      icon: <Flame className="w-5 h-5 text-orange-500" />,
    };
  }

  // 3. Engagement insight
  if (stats.engagementRate > 0 && stats.engagementRate >= 3) {
    return {
      title: 'Engagement au-dessus de la moyenne',
      detail: `Votre taux d'engagement moyen de ${stats.engagementRate}% est excellent. Les publications LinkedIn obtiennent en moyenne 2-3% d'engagement.`,
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
    };
  }

  // 4. Pending review
  if (stats.pendingApproval > 3) {
    return {
      title: `${stats.pendingApproval} posts en attente de validation`,
      detail: "Vous avez beaucoup de posts en attente. Validez-les rapidement pour ne pas manquer les fenêtres de publication optimales.",
      icon: <Clock className="w-5 h-5 text-blue-500" />,
    };
  }

  // 5. Growth insight
  if (stats.weeklyGrowth > 20) {
    return {
      title: `Croissance de ${stats.weeklyGrowth}% cette semaine`,
      detail: "Votre rythme de création accélère. Profitez de cet élan pour programmer des publications à l'avance.",
      icon: <ArrowUpRight className="w-5 h-5 text-emerald-500" />,
    };
  }

  // 6. Failed posts
  if (stats.failed > 0 && stats.lastError) {
    return {
      title: `${stats.failed} post${stats.failed > 1 ? 's' : ''} en échec`,
      detail: `Dernière erreur : "${stats.lastError.substring(0, 80)}${stats.lastError.length > 80 ? '...' : ''}". Vérifiez votre connexion LinkedIn.`,
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    };
  }

  // 7. Low posts
  if (stats.totalPosts < 10) {
    return {
      title: 'Commencez par créer vos premiers posts',
      detail: 'Utilisez la fonction IA pour générer du contenu rapidement. Les posts avec un score élevé obtiennent généralement plus d\'engagement.',
      icon: <Lightbulb className="w-5 h-5 text-indigo-500" />,
    };
  }

  // 8. Generic tip
  return {
    title: 'Conseil du jour',
    detail: "Publiez entre 8h et 10h ou entre 17h et 19h pour maximiser votre portée. Les posts avec des questions obtiennent 2x plus de commentaires.",
    icon: <BrainCircuit className="w-5 h-5 text-indigo-500" />,
  };
}

// ============================================================
// Main DashboardView
// ============================================================

export default function DashboardView() {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('30days');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeForFilter('30days'));
  const [exporting, setExporting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const setView = useAppStore((s) => s.setView);
  const selectPost = useAppStore((s) => s.selectPost);
  const user = useAppStore((s) => s.user);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canValidate = (user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'validator';
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  // --- Fetch functions ---
  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch<DashboardStatsResponse>('/api/dashboard');
      setStats(data);
      setLastUpdated(new Date());
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCharts = useCallback(async (range?: DateRange) => {
    try {
      setChartsLoading(true);
      const params = new URLSearchParams();
      if (range) {
        params.set('from', range.from);
        params.set('to', range.to);
      }
      const qs = params.toString();
      const url = `/api/dashboard/charts${qs ? `?${qs}` : ''}`;
      const data = await apiFetch<ChartData>(url);
      setChartData(data);
    } catch {
      // silently fail for charts
    } finally {
      setChartsLoading(false);
    }
  }, []);

  // --- Initial fetch + polling ---
  useEffect(() => {
    fetchStats();
    fetchCharts(dateRange);

    intervalRef.current = setInterval(() => {
      fetchStats();
      fetchCharts(dateRange);
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStats, fetchCharts, dateRange]);

  // --- Date filter handlers ---
  const handleQuickFilter = (filter: QuickFilter) => {
    setActiveFilter(filter);
    const range = getDateRangeForFilter(filter);
    setDateRange(range);
  };

  const handleDateChange = (key: 'from' | 'to', value: string) => {
    setActiveFilter(null as unknown as QuickFilter); // clear quick filter
    setDateRange((prev) => ({ ...prev, [key]: value }));
  };

  // --- Actions ---
  const handlePostClick = (post: Post) => {
    selectPost(post.id);
    setView('post-detail');
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      toast.loading('Export en cours...', { id: 'export-csv' });
      const res = await apiFetch<{ url: string }>('/api/posts/export/csv', {
        method: 'POST',
      });
      if (res.url) {
        window.open(res.url, '_blank');
        toast.success('Export terminé !', { id: 'export-csv' });
      } else {
        toast.success('Export terminé !', { id: 'export-csv' });
      }
    } catch (error) {
      toast.error("Erreur lors de l'export", { id: 'export-csv' });
    } finally {
      setExporting(false);
    }
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      toast.loading('Génération des données...', { id: 'seed-data' });
      await apiFetch('/api/seed', { method: 'POST' });
      toast.success('Données de démonstration générées !', { id: 'seed-data' });
      // Refetch
      setLoading(true);
      fetchStats();
      fetchCharts(dateRange);
    } catch (error) {
      toast.error('Erreur lors de la génération', { id: 'seed-data' });
    } finally {
      setSeeding(false);
    }
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Impossible de charger les statistiques</p>
      </div>
    );
  }

  // --- Insight ---
  const insight = generateInsight(stats);

  // --- Stat cards ---
  const statCards: StatCardProps[] = [
    {
      title: 'Total Posts',
      value: stats.totalPosts,
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
      trend: stats.weeklyGrowth > 0 ? 'up' : stats.weeklyGrowth < 0 ? 'down' : 'neutral',
      trendValue: stats.weeklyGrowth !== 0 ? `${Math.abs(stats.weeklyGrowth)}% cette semaine` : undefined,
    },
    {
      title: 'Posts publiés',
      value: stats.published,
      icon: <Send className="w-5 h-5" />,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
      subtitle: stats.streak > 0 ? `${stats.streak}j consécutifs 🔥` : undefined,
      trend: stats.streak > 0 ? 'up' : undefined,
      trendValue: stats.streak > 0 ? `${stats.streak}j de série` : undefined,
    },
    {
      title: 'Taux d\'engagement',
      value: `${stats.engagementRate}%`,
      icon: <MousePointerClick className="w-5 h-5" />,
      color: stats.engagementRate >= 3
        ? 'text-emerald-600 dark:text-emerald-400'
        : stats.engagementRate >= 1
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-red-500 dark:text-red-400',
      bgColor: stats.engagementRate >= 3
        ? 'bg-emerald-50 dark:bg-emerald-950/50'
        : stats.engagementRate >= 1
          ? 'bg-amber-50 dark:bg-amber-950/50'
          : 'bg-red-50 dark:bg-red-950/50',
      subtitle: stats.engagementRate >= 3 ? 'Excellent' : stats.engagementRate >= 1 ? 'Correct' : 'À améliorer',
    },
    {
      title: 'En attente de validation',
      value: stats.pendingApproval,
      icon: <Clock className="w-5 h-5" />,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      onClick: canValidate ? () => setView('posts') : undefined,
      subtitle: canValidate ? 'Cliquer pour voir →' : undefined,
    },
    {
      title: 'Brouillons',
      value: stats.totalDrafts,
      icon: <FileEdit className="w-5 h-5" />,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    },
    {
      title: 'Idées',
      value: stats.totalIdeas,
      icon: <Lightbulb className="w-5 h-5" />,
      color: 'text-slate-600 dark:text-slate-300',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
    },
    {
      title: 'Échoués',
      value: stats.failed,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/50',
      subtitle: stats.lastError
        ? stats.lastError.length > 40
          ? stats.lastError.substring(0, 40) + '...'
          : stats.lastError
        : undefined,
    },
  ];

  // --- Quick filter buttons ---
  const quickFilters: { key: QuickFilter; label: string }[] = [
    { key: 'today', label: "Aujourd'hui" },
    { key: '7days', label: '7 jours' },
    { key: '30days', label: '30 jours' },
    { key: 'month', label: 'Ce mois' },
  ];

  const maxProviderCount = Math.max(
    ...stats.postsByProvider.map((p) => p._count),
    1
  );

  return (
    <div className="space-y-6">
      {/* Header with date filter and last updated */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Tableau de bord</h2>
          <span className="text-xs text-muted-foreground">
            Dernière mise à jour : {getLastUpdatedLabel(lastUpdated)}
          </span>
          <button
            onClick={() => { setLoading(true); fetchStats(); fetchCharts(dateRange); }}
            className="p-1 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            title="Rafraîchir"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick filters */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            {quickFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => handleQuickFilter(f.key)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md transition-all font-medium',
                  activeFilter === f.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Date inputs */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="text-xs bg-background border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="text-xs bg-background border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button
          onClick={() => setView('create-post')}
          className="w-full justify-start gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un post</span>
        </Button>
        <Button
          onClick={() => setView('calendar')}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <Calendar className="w-4 h-4" />
          <span>Voir le calendrier</span>
        </Button>
        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="w-full justify-start gap-2"
          disabled={exporting}
        >
          <Download className="w-4 h-4" />
          <span>Exporter les posts</span>
        </Button>
        {isAdmin && (
          <Button
            onClick={handleSeed}
            variant="outline"
            className="w-full justify-start gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30"
            disabled={seeding}
          >
            <Database className="w-4 h-4" />
            <span>Seed données</span>
          </Button>
        )}
        {!isAdmin && (
          <div className="w-full" />
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts par semaine - Area Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Posts par semaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : chartData && chartData.weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData.weeklyData}>
                  <defs>
                    <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPublished" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    stroke="#f59e0b"
                    fillOpacity={1}
                    fill="url(#colorCreated)"
                    name="Créés"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="published"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorPublished)"
                    name="Publiés"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Aucune donnée pour la période sélectionnée
              </div>
            )}
          </CardContent>
        </Card>

        {/* Répartition par statut - Donut Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Répartition par statut
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : chartData && chartData.statusDistribution.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-[180px] h-[180px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="count"
                      >
                        {chartData.statusDistribution.map((entry) => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_PIE_COLORS[entry.status] || '#94a3b8'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--popover)',
                          color: 'var(--popover-foreground)',
                          fontSize: '12px',
                        }}
                        formatter={(value: number, name: string) => [
                          value,
                          POST_STATUS_LABELS[name as PostStatus] || name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5 max-h-[180px] overflow-y-auto">
                  {chartData.statusDistribution
                    .sort((a, b) => b.count - a.count)
                    .map((item) => (
                      <div key={item.status} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: STATUS_PIE_COLORS[item.status] || '#94a3b8' }}
                        />
                        <span className="flex-1 truncate">
                          {POST_STATUS_LABELS[item.status as PostStatus] || item.status}
                        </span>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insight IA Card */}
      <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50/50 to-indigo-50/50 dark:from-violet-950/20 dark:to-indigo-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/50 shrink-0 mt-0.5">
              <BrainCircuit className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold">Insight IA</h3>
                <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                  <Sparkles className="w-3 h-3 mr-0.5" />
                  Automatique
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground">{insight.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{insight.detail}</p>
            </div>
            <div className="shrink-0 hidden sm:block">{insight.icon}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Posts */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                Posts récents
              </CardTitle>
              <button
                onClick={() => setView('posts')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Voir tout →
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {stats.recentPosts.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                Aucun post pour le moment. Créez votre premier post !
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {stats.recentPosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => handlePostClick(post)}
                    className="w-full text-left px-6 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{post.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {post.author?.name} · {AI_PROVIDER_LABELS[post.aiProvider]}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px] shrink-0', POST_STATUS_COLORS[post.status])}
                      >
                        {POST_STATUS_LABELS[post.status]}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Performance */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {chartsLoading ? (
                <>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </>
              ) : chartData ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-xs text-muted-foreground">Posts ce mois</p>
                      <p className="text-lg font-bold">{chartData.performance.thisMonthPosts}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Mois dernier</p>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{chartData.performance.lastMonthPosts}</span>
                        {chartData.performance.monthChange !== 0 && (
                          <span
                            className={cn(
                              'inline-flex items-center text-xs font-medium',
                              chartData.performance.monthChange > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-500 dark:text-red-400'
                            )}
                          >
                            {chartData.performance.monthChange > 0 ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {Math.abs(chartData.performance.monthChange)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground">Temps moyen création → publication</p>
                    <span className="text-sm font-bold">
                      {chartData.performance.avgTimeHours !== null
                        ? chartData.performance.avgTimeHours < 24
                          ? `${chartData.performance.avgTimeHours}h`
                          : `${Math.round(chartData.performance.avgTimeHours / 24)}j`
                        : '—'}
                    </span>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          {/* Posts à valider (for validators/admins) */}
          {canValidate && chartData && chartData.pendingApproval.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Posts à valider
                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 ml-auto">
                    {chartData.pendingApproval.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {chartData.pendingApproval.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => handlePostClick(post)}
                    className="w-full text-left p-2 rounded-lg hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{post.subject}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {post.author?.name}
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Activité récente */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  Activité récente
                </CardTitle>
                {canValidate && (
                  <button
                    onClick={() => setView('audit-logs')}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Voir tout →
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : chartData && chartData.recentActivity.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {chartData.recentActivity.slice(0, 8).map((log) => {
                    const { icon, color } = getActivityIcon(log.action);
                    return (
                      <div key={log.id} className="flex items-start gap-2.5">
                        <div className={cn('flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5', color)}>
                          {icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs">
                            <span className="font-medium">{log.user?.name || 'Système'}</span>
                            <span className="text-muted-foreground ml-1">
                              {formatAction(log.action)}
                            </span>
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {formatDistanceToNow(new Date(log.createdAt), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune activité récente
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatAction(action: string): string {
  const actions: Record<string, string> = {
    create: 'a créé un post',
    generate_ai: 'a généré des variantes IA',
    publish: 'a publié un post',
    approve: 'a approuvé un post',
    reject: 'a rejeté un post',
    login: 's\'est connecté',
    update: 'a modifié un post',
    delete: 'a supprimé un post',
  };
  return actions[action] || action;
}
