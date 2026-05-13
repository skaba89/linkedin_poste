'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Users,
  Flame,
  TrendingUp,
  Clock,
  BarChart3,
  Target,
  PieChart as PieChartIcon,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  PROSPECT_STATUS_LABELS,
  PROSPECT_SOURCE_LABELS,
} from '@/types';
import type { ProspectStatus, ProspectSource } from '@/types';

/* ============================================================
   Types
   ============================================================ */

interface ScoringAnalytics {
  scoreDistribution: { range: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  topProspects: {
    id: string;
    fullName: string;
    company: string | null;
    title: string | null;
    status: string;
    source: string;
    score: number;
    tags: string | null;
  }[];
  avgScore: number;
  scoringTrend: { date: string; avgScore: number; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
  tagsCloud: { tag: string; count: number }[];
  conversionFunnel: { stage: string; count: number }[];
  totalProspects: number;
  hotLeads: number;
  convertedCount: number;
  conversionRate: number;
  pendingFollowUps: number;
}

/* ============================================================
   Constants
   ============================================================ */

const STATUS_COLORS: Record<string, string> = {
  new: '#94a3b8',
  contacted: '#3b82f6',
  replied: '#8b5cf6',
  interested: '#f59e0b',
  not_interested: '#ef4444',
  converted: '#10b981',
};

const SOURCE_COLORS: Record<string, string> = {
  manual: '#94a3b8',
  linkedin_search: '#0a66c2',
  recommendation: '#f59e0b',
  import: '#8b5cf6',
};

const FUNNEL_COLORS = ['#94a3b8', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'];

/* ============================================================
   Score Badge Component
   ============================================================ */

function ScoreBadge({ score }: { score: number }) {
  let colorClass: string;
  let bgColor: string;

  if (score >= 81) {
    colorClass = 'text-emerald-700 dark:text-emerald-300';
    bgColor = 'bg-emerald-100 dark:bg-emerald-900/40';
  } else if (score >= 61) {
    colorClass = 'text-yellow-700 dark:text-yellow-300';
    bgColor = 'bg-yellow-100 dark:bg-yellow-900/40';
  } else if (score >= 31) {
    colorClass = 'text-orange-700 dark:text-orange-300';
    bgColor = 'bg-orange-100 dark:bg-orange-900/40';
  } else {
    colorClass = 'text-red-700 dark:text-red-300';
    bgColor = 'bg-red-100 dark:bg-red-900/40';
  }

  return (
    <Badge className={cn('text-[10px] font-bold tabular-nums px-2', colorClass, bgColor)}>
      {score}
    </Badge>
  );
}

/* ============================================================
   KPI Card Component
   ============================================================ */

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

function KpiCard({ title, value, subtitle, icon, color, bgColor }: KpiCardProps) {
  return (
    <Card className="border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </p>
            <p className="text-2xl font-bold truncate">{value}</p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0', bgColor)}>
            <div className={color}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Tooltip Style
   ============================================================ */

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--popover)',
  color: 'var(--popover-foreground)',
  fontSize: '12px',
};

/* ============================================================
   Main LeadScoringDashboard
   ============================================================ */

export default function LeadScoringDashboard() {
  const [analytics, setAnalytics] = useState<ScoringAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoreSort, setScoreSort] = useState<'desc' | 'asc'>('desc');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<ScoringAnalytics>('/api/prospects/scoring-analytics');
      setAnalytics(data);
    } catch (error) {
      if (error instanceof ApiClientError) {
        console.error('Failed to load analytics:', error.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // Loading skeleton
  if (loading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    );
  }

  // Sort top prospects
  const sortedTopProspects = [...analytics.topProspects].sort((a, b) =>
    scoreSort === 'desc' ? b.score - a.score : a.score - b.score
  );

  // Format trend date labels
  const trendData = analytics.scoringTrend.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
  }));

  // Source data for pie chart
  const sourceData = analytics.sourceBreakdown.filter(s => s.count > 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          title="Total prospects"
          value={analytics.totalProspects}
          subtitle={`Score moyen : ${analytics.avgScore}`}
          icon={<Users className="w-5 h-5" />}
          color="text-violet-600 dark:text-violet-400"
          bgColor="bg-violet-50 dark:bg-violet-950/50"
        />
        <KpiCard
          title="Leads chauds"
          value={analytics.hotLeads}
          subtitle="Score > 80"
          icon={<Flame className="w-5 h-5" />}
          color="text-orange-600 dark:text-orange-400"
          bgColor="bg-orange-50 dark:bg-orange-950/50"
        />
        <KpiCard
          title="Taux de conversion"
          value={`${analytics.conversionRate}%`}
          subtitle={`${analytics.convertedCount} convertis`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KpiCard
          title="Relances en attente"
          value={analytics.pendingFollowUps}
          subtitle="Date dépassée"
          icon={<Clock className="w-5 h-5" />}
          color="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-50 dark:bg-amber-950/50"
        />
      </div>

      {/* Charts Row 1: Distribution + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Distribution des scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.scoreDistribution.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.scoreDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Prospects" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {analytics.scoreDistribution.map((entry, index) => {
                      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
                      return <Cell key={entry.range} fill={colors[index] || '#94a3b8'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              Entonnoir de conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.conversionFunnel.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={analytics.conversionFunnel}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                    width={100}
                    tickFormatter={(v: string) => PROSPECT_STATUS_LABELS[v as ProspectStatus] || v}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [value, 'Prospects']}
                    labelFormatter={(label: string) => PROSPECT_STATUS_LABELS[label as ProspectStatus] || label}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={30}>
                    {analytics.conversionFunnel.map((entry, index) => (
                      <Cell key={entry.stage} fill={FUNNEL_COLORS[index] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scoring Trend */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Tendance des scores (30 jours)
            </CardTitle>
            <button
              onClick={fetchAnalytics}
              className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              title="Rafraîchir"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" domain={[0, 100]} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [value, 'Score moyen']}
                />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
              Aucune donnée pour les 30 derniers jours
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row 2: Source + Tags Cloud */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Breakdown Donut */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-muted-foreground" />
              Répartition par source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-[160px] h-[160px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="count"
                      >
                        {sourceData.map((entry) => (
                          <Cell
                            key={entry.source}
                            fill={SOURCE_COLORS[entry.source] || '#94a3b8'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number, name: string) => [
                          value,
                          PROSPECT_SOURCE_LABELS[name as ProspectSource] || name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {sourceData
                    .sort((a, b) => b.count - a.count)
                    .map((item) => (
                      <div key={item.source} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: SOURCE_COLORS[item.source] || '#94a3b8' }}
                        />
                        <span className="flex-1 truncate">
                          {PROSPECT_SOURCE_LABELS[item.source as ProspectSource] || item.source}
                        </span>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags Cloud */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Nuage de tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.tagsCloud.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                {analytics.tagsCloud.map((item, index) => {
                  const maxCount = analytics.tagsCloud[0].count;
                  const sizePercent = (item.count / maxCount) * 100;
                  let sizeClass = 'text-xs';
                  if (sizePercent > 75) sizeClass = 'text-sm font-bold';
                  else if (sizePercent > 50) sizeClass = 'text-sm font-semibold';
                  else if (sizePercent > 25) sizeClass = 'text-xs font-medium';

                  const colors = [
                    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
                    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
                    'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
                  ];

                  return (
                    <Badge
                      key={item.tag}
                      variant="secondary"
                      className={cn(sizeClass, colors[index % colors.length])}
                    >
                      {item.tag}
                      <span className="ml-1 opacity-60">({item.count})</span>
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">
                Aucun tag disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Prospects Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Flame className="w-4 h-4 text-muted-foreground" />
              Top 20 prospects par score
            </CardTitle>
            <button
              onClick={() => setScoreSort(prev => (prev === 'desc' ? 'asc' : 'desc'))}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {scoreSort === 'desc' ? 'Décroissant' : 'Croissant'}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {analytics.topProspects.length > 0 ? (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[40px]">#</TableHead>
                    <TableHead className="text-xs">Prospect</TableHead>
                    <TableHead className="text-xs">Entreprise</TableHead>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs">Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTopProspects.map((p, index) => {
                    const rank = scoreSort === 'desc' ? index + 1 : analytics.topProspects.length - index;
                    const tags = p.tags ? (() => {
                      try { return JSON.parse(p.tags) as string[]; } catch { return []; }
                    })() : [];

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs text-muted-foreground font-medium">
                          {rank}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {p.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{p.fullName}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{p.title || '-'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs truncate max-w-[140px]">{p.company || '-'}</p>
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={p.score} />
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              'text-[9px]',
                              `bg-${p.status === 'converted' ? 'emerald' : p.status === 'new' ? 'slate' : 'blue'}-100 dark:bg-${p.status === 'converted' ? 'emerald' : p.status === 'new' ? 'slate' : 'blue'}-900/30 dark:text-${p.status === 'converted' ? 'emerald' : p.status === 'new' ? 'slate' : 'blue'}-300`
                            )}
                            style={{
                              backgroundColor: `${STATUS_COLORS[p.status] || '#94a3b8'}20`,
                              color: STATUS_COLORS[p.status] || '#94a3b8',
                            }}
                          >
                            {PROSPECT_STATUS_LABELS[p.status as ProspectStatus] || p.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px]">
                            {PROSPECT_SOURCE_LABELS[p.source as ProspectSource] || p.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {tags.length > 0
                              ? tags.slice(0, 3).map((tag: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-[8px]">
                                    {tag}
                                  </Badge>
                                ))
                              : <span className="text-[10px] text-muted-foreground">-</span>
                            }
                            {tags.length > 3 && (
                              <Badge variant="secondary" className="text-[8px]">
                                +{tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              Aucun prospect disponible
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
