'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Eye,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  FileText,
  Plus,
  Sparkles,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  Gauge,
  Clock,
  CalendarDays,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import EmptyState from './EmptyState';
import {
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import type {
  AnalyticsOverview,
  PostMetric,
  Post,
  FormatPerformance,
  DayPerformance,
  HourPerformance,
  ProviderPerformance,
  ScoreCorrelation,
  AnalyticsInsight,
  ScoringStatus,
  HeatmapCell,
  BestTimeAnalysis,
  TimeRecommendation,
} from '@/types';

/* ============================================================
   Sub: Metric Entry Dialog
   ============================================================ */
function MetricEntryDialog({ onSaved, externalOpen, onExternalOpenChange }: { onSaved: () => void; externalOpen?: boolean; onExternalOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [form, setForm] = useState({ impressions: '', reach: '', likes: '', comments: '', reposts: '', clicks: '' });

  const controlled = externalOpen !== undefined;
  const open = controlled ? externalOpen : internalOpen;
  const setOpen = controlled ? (v: boolean) => onExternalOpenChange?.(v) : setInternalOpen;

  useEffect(() => {
    if (open) {
      setLoading(true);
      apiFetch<{ posts: Post[] }>('/api/posts?status=posted&limit=100')
        .then(data => setPosts(data.posts))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleSave = async () => {
    if (!selectedPostId) {
      toast.error('Sélectionnez un post');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/posts/metrics', {
        method: 'POST',
        body: JSON.stringify({
          postId: selectedPostId,
          impressions: Number(form.impressions) || 0,
          reach: Number(form.reach) || 0,
          likes: Number(form.likes) || 0,
          comments: Number(form.comments) || 0,
          reposts: Number(form.reposts) || 0,
          clicks: Number(form.clicks) || 0,
        }),
      });
      toast.success('Métriques enregistrées');
      setOpen(false);
      setForm({ impressions: '', reach: '', likes: '', comments: '', reposts: '', clicks: '' });
      setSelectedPostId('');
      onSaved();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const engRate = form.impressions && Number(form.impressions) > 0
    ? (((Number(form.likes) || 0) + (Number(form.comments) || 0) + (Number(form.reposts) || 0) + (Number(form.clicks) || 0)) / Number(form.impressions) * 100).toFixed(2)
    : '0';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Saisir des métriques
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Saisir des métriques</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Post</Label>
            <Select value={selectedPostId} onValueChange={setSelectedPostId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un post publié..." /></SelectTrigger>
              <SelectContent className="max-h-60">
                {loading ? <SelectItem value="_loading" disabled>Chargement...</SelectItem> :
                  posts.map(p => (
                    <SelectItem key={p.id} value={p.id} className="max-w-[300px]">
                      <span className="truncate">{p.subject}</span>
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'impressions', label: 'Impressions' },
              { key: 'reach', label: 'Portée' },
              { key: 'likes', label: 'Likes' },
              { key: 'comments', label: 'Commentaires' },
              { key: 'reposts', label: 'Reposts' },
              { key: 'clicks', label: 'Clics' },
            ].map(field => (
              <div key={field.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                <Input
                  type="number"
                  min="0"
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="text-center">
            <Badge variant="secondary" className="text-sm">
              Taux d&apos;engagement : {engRate}%
            </Badge>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Sub: KPI Cards
   ============================================================ */
function KPICards({ overview }: { overview: AnalyticsOverview | null }) {
  const items = [
    {
      label: 'Total Impressions',
      value: overview ? overview.totalImpressions.toLocaleString('fr-FR') : '-',
      icon: <Eye className="w-4 h-4" />,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'Engagement Moyen',
      value: overview ? `${overview.avgEngagementRate}%` : '-',
      icon: <Target className="w-4 h-4" />,
      color: overview && overview.avgEngagementRate >= 3 ? 'text-emerald-600 dark:text-emerald-400' : overview && overview.avgEngagementRate >= 1.5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400',
      bg: overview && overview.avgEngagementRate >= 3 ? 'bg-emerald-50 dark:bg-emerald-950/30' : overview && overview.avgEngagementRate >= 1.5 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-red-50 dark:bg-red-950/30',
    },
    {
      label: 'Meilleur Post',
      value: overview?.bestPost ? (overview.bestPost.subject.length > 30 ? overview.bestPost.subject.slice(0, 30) + '...' : overview.bestPost.subject) : '-',
      subValue: overview?.bestPost ? `${overview.bestPost.engagementRate}%` : undefined,
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'Posts avec Métriques',
      value: overview ? `${overview.postsWithMetrics} / ${overview.totalPosts}` : '-',
      icon: <BarChart3 className="w-4 h-4" />,
      color: 'text-slate-600',
      bg: 'bg-slate-50 dark:bg-slate-800/50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <Card key={i} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                <p className={cn('text-lg font-bold', item.color)}>{item.value}</p>
                {item.subValue && <p className="text-xs text-emerald-500 dark:text-emerald-400">{item.subValue} engagement</p>}
              </div>
              <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg', item.bg)}>
                <span className={item.color}>{item.icon}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ============================================================
   Sub: Trend Chart
   ============================================================ */
function TrendChart({ overview }: { overview: AnalyticsOverview | null }) {
  if (!overview || overview.trendData.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center text-muted-foreground">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune donnée de tendance disponible</p>
        </CardContent>
      </Card>
    );
  }

  const formatted = overview.trendData.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
  }));

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Tendances (30 derniers jours)</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatted}>
              <defs>
                <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
              <RechartsTooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: number, name: string) => [
                  name === 'Impressions' ? value.toLocaleString('fr-FR') : `${value}%`,
                  name,
                ]}
              />
              <Area yAxisId="left" type="monotone" dataKey="impressions" stroke="#10b981" fill="url(#colorImp)" strokeWidth={2} name="Impressions" />
              <Area yAxisId="right" type="monotone" dataKey="engagementRate" stroke="#f59e0b" fill="url(#colorEng)" strokeWidth={2} name="Engagement %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Sub: Sort Header (hoisted)
   ============================================================ */
function SortHeader({ label, field, sortKey, sortDir, onSort }: { label: string; field: string; sortKey: string; sortDir: string; onSort: (f: string) => void }) {
  return (
    <button onClick={() => onSort(field)} className="text-xs font-medium text-left hover:text-foreground transition-colors flex items-center gap-1">
      {label}
      {sortKey === field && (
        <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );
}

/* ============================================================
   Sub: Performance Table
   ============================================================ */
function PerformanceTable({ posts, onViewPost }: { posts: (Post & { latestMetric?: PostMetric })[]; onViewPost: (id: string) => void }) {
  const [sortKey, setSortKey] = useState<string>('engagementRate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...posts].sort((a, b) => {
    const aVal = sortKey === 'subject' ? (a.subject || '').toLowerCase() : 
                 sortKey === 'contentScore' ? (a.contentScore || 0) :
                 (a.latestMetric?.[sortKey as keyof PostMetric] as number) || 0;
    const bVal = sortKey === 'subject' ? (b.subject || '').toLowerCase() : 
                 sortKey === 'contentScore' ? (b.contentScore || 0) :
                 (b.latestMetric?.[sortKey as keyof PostMetric] as number) || 0;
    if (sortKey === 'subject') return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Tableau de performance</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/50 bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5"><SortHeader label="Sujet" field="subject" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-left px-3 py-2.5"><SortHeader label="Score IA" field="contentScore" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-right px-3 py-2.5"><SortHeader label="Impressions" field="impressions" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-right px-3 py-2.5"><SortHeader label="Likes" field="likes" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-right px-3 py-2.5"><SortHeader label="Comm." field="comments" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-right px-3 py-2.5"><SortHeader label="Reposts" field="reposts" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-right px-3 py-2.5"><SortHeader label="Clics" field="clicks" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="text-right px-4 py-2.5"><SortHeader label="Engagement" field="engagementRate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(post => {
                const m = post.latestMetric;
                const er = m?.engagementRate || 0;
                const erColor = er >= 3 ? 'text-emerald-600 dark:text-emerald-400' : er >= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
                return (
                  <tr key={post.id} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer" onClick={() => onViewPost(post.id)}>
                    <td className="px-4 py-2.5 max-w-[200px] truncate">{post.subject}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{post.contentScore ?? '-'}</td>
                    <td className="px-3 py-2.5 text-right">{m?.impressions?.toLocaleString('fr-FR') ?? '-'}</td>
                    <td className="px-3 py-2.5 text-right">{m?.likes ?? '-'}</td>
                    <td className="px-3 py-2.5 text-right">{m?.comments ?? '-'}</td>
                    <td className="px-3 py-2.5 text-right">{m?.reposts ?? '-'}</td>
                    <td className="px-3 py-2.5 text-right">{m?.clicks ?? '-'}</td>
                    <td className={cn('px-4 py-2.5 text-right font-medium', erColor)}>{m ? `${er}%` : '-'}</td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Aucun post avec métriques</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Sub: Score vs Performance Scatter
   ============================================================ */
function ScoreScatterChart({ correlation }: { correlation: ScoreCorrelation | null }) {
  if (!correlation || correlation.posts.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Pas assez de données pour la corrélation</p>
        </CardContent>
      </Card>
    );
  }

  const formatColors: Record<string, string> = {
    listicle: '#3b82f6',
    storytelling: '#f59e0b',
    controverse: '#ef4444',
    howto: '#10b981',
    thought_leadership: '#8b5cf6',
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Score IA vs Performance</CardTitle>
          <Badge variant="secondary" className="text-xs">
            Corrélation : {correlation.correlation > 0 ? '+' : ''}{correlation.correlation}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="contentScore" name="Score IA" tick={{ fontSize: 11 }} label={{ value: 'Score IA', position: 'bottom', fontSize: 11 }} />
              <YAxis dataKey="engagementRate" name="Engagement %" tick={{ fontSize: 11 }} unit="%" />
              <RechartsTooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: number) => [`${value}%`, 'Engagement']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.subject?.slice(0, 30) || ''}
              />
              <Scatter name="Posts" data={correlation.posts}>
                {correlation.posts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={formatColors[(entry as any).format] || '#6b7280'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {Object.entries(formatColors).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="capitalize">{key.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Sub: Format Performance Chart
   ============================================================ */
function FormatChart({ formats }: { formats: FormatPerformance[] }) {
  if (formats.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune donnée par format</p>
        </CardContent>
      </Card>
    );
  }

  const formatColors: Record<string, string> = {
    listicle: '#3b82f6',
    storytelling: '#f59e0b',
    controverse: '#ef4444',
    howto: '#10b981',
    thought_leadership: '#8b5cf6',
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Performance par Format</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={120} />
              <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => [`${value}%`, 'Engagement moyen']} />
              <Bar dataKey="avgEngagement" radius={[0, 4, 4, 0]}>
                {formats.map((entry) => (
                  <Cell key={entry.format} fill={formatColors[entry.format] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Sub: Day/Hour Chart
   ============================================================ */
function DayHourChart({ days, hours }: { days: DayPerformance[]; hours: HourPerformance[] }) {
  if (days.length === 0 && hours.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune donnée jour/heure</p>
        </CardContent>
      </Card>
    );
  }

  const bestDay = [...days].sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
  const bestHour = [...hours].sort((a, b) => b.avgEngagement - a.avgEngagement)[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Performance par Jour</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => [`${value}%`, 'Engagement moyen']} />
                <Bar dataKey="avgEngagement" fill="#10b981" radius={[4, 4, 0, 0]} name="Engagement %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {bestDay && bestDay.avgEngagement > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 text-center">
              Meilleur jour : <strong>{bestDay.dayLabel}</strong> ({bestDay.avgEngagement}%)
            </p>
          )}
        </CardContent>
      </Card>
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Performance par Heure</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hours}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} label={{ value: 'Heure', position: 'bottom', fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => [`${value}%`, 'Engagement moyen']} />
                <Line type="monotone" dataKey="avgEngagement" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Engagement %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {bestHour && bestHour.avgEngagement > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">
              Meilleur créneau : <strong>{bestHour.hour}h-{bestHour.hour + 1}h</strong> ({bestHour.avgEngagement}%)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   Sub: Provider Performance
   ============================================================ */
function ProviderChart({ providers }: { providers: ProviderPerformance[] }) {
  if (providers.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Performance par Fournisseur IA</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={providers}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
              <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="avgScore" fill="#8b5cf6" name="Score IA moyen" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="avgEngagement" fill="#10b981" name="Engagement moyen %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Sub: Insights Panel
   ============================================================ */
function InsightsPanel({ insights }: { insights: AnalyticsInsight[] }) {
  const typeConfig = {
    positive: { icon: <CheckCircle2 className="w-4 h-4" />, bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', color: 'text-emerald-700 dark:text-emerald-400' },
    warning: { icon: <AlertTriangle className="w-4 h-4" />, bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', color: 'text-amber-700 dark:text-amber-400' },
    action: { icon: <Lightbulb className="w-4 h-4" />, bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', color: 'text-red-700 dark:text-red-400' },
  };

  if (insights.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun insight disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Insights IA
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map(insight => {
            const config = typeConfig[insight.type];
            return (
              <div key={insight.id} className={cn('p-3 rounded-lg border', config.bg, config.border)}>
                <div className="flex items-start gap-2">
                  <span className={cn('mt-0.5 shrink-0', config.color)}>{config.icon}</span>
                  <div>
                    <p className={cn('text-xs font-semibold mb-1', config.color)}>{insight.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   NEW: Smart Scoring Calibration Section
   ============================================================ */

const FACTOR_LABELS: Record<string, string> = {
  length: 'Longueur',
  hook: 'Accroche',
  cta: 'CTA',
  hashtags: 'Hashtags',
  readability: 'Lisibilité',
  emoji: 'Émojis',
};

const FACTOR_COLORS: Record<string, string> = {
  length: '#10b981',
  hook: '#f59e0b',
  cta: '#ef4444',
  hashtags: '#8b5cf6',
  readability: '#06b6d4',
  emoji: '#ec4899',
};

function ScoringCalibrationSection() {
  const [scoringStatus, setScoringStatus] = useState<ScoringStatus | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Array<{ id: string; subject: string; contentScore: number; engagementRate: number | null; delta: number | null }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchScoringData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, lbRes] = await Promise.all([
        apiFetch<ScoringStatus>('/api/scoring/status').catch(() => null),
        apiFetch<{ leaderboard: typeof leaderboard }>('/api/scoring/leaderboard').catch(() => ({ leaderboard: [] })),
      ]);
      setScoringStatus(statusRes);
      setLeaderboard(lbRes.leaderboard);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchScoringData(); }, [fetchScoringData]);

  const handleCalibrate = async () => {
    setCalibrating(true);
    try {
      const data = await apiFetch<{ calibrationsCreated: number; avgDelta: number }>('/api/scoring/calibrate', { method: 'POST' });
      toast.success(`${data.calibrationsCreated} calibrations créées (delta moyen: ${data.avgDelta})`);
      fetchScoringData();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setCalibrating(false);
    }
  };

  const confidenceLabel = (c: string) => {
    if (c === 'high') return { label: 'Haute', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/30' };
    if (c === 'medium') return { label: 'Moyenne', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/30' };
    return { label: 'Basse', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-950/30' };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  const conf = scoringStatus ? confidenceLabel(scoringStatus.confidence) : null;

  // Prepare scatter data from leaderboard
  const scatterData = leaderboard
    .filter(p => p.engagementRate !== null)
    .map(p => ({ predicted: p.contentScore, actual: Math.round((p.engagementRate || 0) * 10), subject: p.subject }));

  // Factor weights data for chart
  const weightsData = scoringStatus?.factorWeights.map(fw => ({
    name: FACTOR_LABELS[fw.name] || fw.name,
    weight: Math.round(fw.weight * 100),
    fill: FACTOR_COLORS[fw.name] || '#6b7280',
  })) || [];

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-500" />
              Calibration du scoring
            </CardTitle>
            <Button
              size="sm"
              onClick={handleCalibrate}
              disabled={calibrating}
              className="gap-1.5"
            >
              {calibrating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Calibrer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Calibrations</p>
              <p className="text-lg font-bold">{scoringStatus?.calibrationsCount ?? 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Delta moyen</p>
              <p className={cn('text-lg font-bold', (scoringStatus?.avgDelta ?? 0) > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
                {scoringStatus?.avgDelta ?? 0 > 0 ? '+' : ''}{scoringStatus?.avgDelta ?? 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Confiance</p>
              {conf ? (
                <Badge className={cn('text-xs', conf.bg, conf.color)}>{conf.label}</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">-</Badge>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Dernière calibration</p>
              <p className="text-xs">
                {scoringStatus?.lastCalibration
                  ? new Date(scoringStatus.lastCalibration).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                  : 'Jamais'}
              </p>
            </div>
          </div>
          {scoringStatus && scoringStatus.calibrationsCount < 5 && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                Minimum 5 calibrations nécessaires pour une confiance fiable. Saisissez des métriques sur vos posts publiés puis calibrez.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factor Weights + Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Factor Weights Bar Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Poids des facteurs</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weightsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 30]} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => [`${value}%`, 'Poids']} />
                  <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                    {weightsData.map((entry, index) => (
                      <Cell key={`fw-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Calibration Scatter: Predicted vs Actual */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Score prédit vs Réel</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {scatterData.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="predicted" name="Prédit" tick={{ fontSize: 11 }} label={{ value: 'Score prédit', position: 'bottom', fontSize: 11 }} />
                    <YAxis dataKey="actual" name="Réel" tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <RechartsTooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number) => [value]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.subject?.slice(0, 25) || ''}
                    />
                    <Scatter name="Calibrations" data={scatterData}>
                      {scatterData.map((_, index) => (
                        <Cell key={`sc-${index}`} fill={scatterData[index].actual > scatterData[index].predicted ? '#10b981' : '#ef4444'} fillOpacity={0.7} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Réel &gt; Prédit</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>Prédit &gt; Réel</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Pas de données de calibration</p>
                  <p className="text-xs mt-1">Calibrez pour voir le graphique</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Table */}
      {leaderboard.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Classement des posts (par score IA)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/50 bg-muted/30 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium">#</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium">Sujet</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium">Score IA</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium">Engagement</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((post, i) => {
                    const deltaColor = post.delta === null ? 'text-muted-foreground' : post.delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : post.delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground';
                    return (
                      <tr key={post.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2.5 max-w-[250px] truncate">{post.subject}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{post.contentScore}</td>
                        <td className="px-3 py-2.5 text-right">{post.engagementRate !== null ? `${post.engagementRate}%` : '-'}</td>
                        <td className={cn('px-4 py-2.5 text-right font-medium', deltaColor)}>
                          {post.delta !== null ? (
                            <span className="flex items-center justify-end gap-1">
                              {post.delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : post.delta < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                              {post.delta > 0 ? '+' : ''}{post.delta}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
   NEW: Best Time Predictor Section
   ============================================================ */

const DAY_LABELS_FULL: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi', 0: 'Dimanche',
};
const DAY_LABELS_SHORT: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 0: 'Dim',
};

function BestTimeSection() {
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [analysis, setAnalysis] = useState<BestTimeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  const fetchBestTime = useCallback(async () => {
    setLoading(true);
    try {
      const [heatRes, analysisRes] = await Promise.all([
        apiFetch<{ grid: HeatmapCell[] }>('/api/analytics/best-time/heatmap').catch(() => ({ grid: [] })),
        apiFetch<{ analysis: BestTimeAnalysis | null }>('/api/analytics/best-time').catch(() => ({ analysis: null })),
      ]);
      setHeatmapData(heatRes.grid);
      setAnalysis(analysisRes.analysis);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBestTime(); }, [fetchBestTime]);

  const handleCompute = async () => {
    setComputing(true);
    try {
      await apiFetch('/api/analytics/best-time', { method: 'POST' });
      toast.success('Analyse des créneaux mise à jour');
      fetchBestTime();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setComputing(false);
    }
  };

  const getHeatmapColor = (value: number, maxVal: number) => {
    if (value === 0) return 'bg-muted/30';
    const ratio = value / maxVal;
    if (ratio >= 0.7) return 'bg-emerald-500 text-white';
    if (ratio >= 0.5) return 'bg-emerald-300 text-emerald-900';
    if (ratio >= 0.3) return 'bg-amber-200 text-amber-900';
    if (ratio >= 0.15) return 'bg-red-200 text-red-900';
    return 'bg-red-400 text-white';
  };

  const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  // Build 2D grid
  const gridMap = new Map<string, HeatmapCell>();
  heatmapData.forEach(cell => gridMap.set(`${cell.dayOfWeek}-${cell.hour}`, cell));

  const maxEngagement = Math.max(...heatmapData.map(c => c.avgEngagement), 1);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const hasData = heatmapData.some(c => c.totalPosts > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-500" />
              Meilleurs Créneaux
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleCompute} disabled={computing} className="gap-1.5">
              {computing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CalendarDays className="w-3.5 h-3.5" />}
              Recalculer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {analysis?.recommendation ? (
            <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800">
              <p className="text-sm text-cyan-800 dark:text-cyan-300 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                {analysis.recommendation}
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                Pas assez de données. Publiez au moins 3 posts avec des métriques à des heures variées pour activer les recommandations. Conseil par défaut : mardi-jeudi, 8h-10h.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Heatmap + Top Slots */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Heatmap */}
        <Card className="border-border/50 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Carte de chaleur (7j × 17h)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Hour header row */}
              <div className="grid grid-cols-[60px_repeat(17,1fr)] gap-[2px] mb-[2px]">
                <div className="text-[10px] text-muted-foreground" />
                {hours.map(h => (
                  <div key={h} className="text-[10px] text-center text-muted-foreground">{h}h</div>
                ))}
              </div>
              {/* Day rows */}
              {dayOrder.map(dow => (
                <div key={dow} className="grid grid-cols-[60px_repeat(17,1fr)] gap-[2px] mb-[2px]">
                  <div className="text-[11px] font-medium text-muted-foreground flex items-center pr-2">
                    {DAY_LABELS_SHORT[dow]}
                  </div>
                  {hours.map(hour => {
                    const cell = gridMap.get(`${dow}-${hour}`);
                    const value = cell?.avgEngagement || 0;
                    const posts = cell?.totalPosts || 0;
                    return (
                      <Tooltip key={`${dow}-${hour}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'h-7 rounded-sm flex items-center justify-center text-[9px] font-medium transition-colors',
                              getHeatmapColor(value, maxEngagement),
                              hasData && 'cursor-default'
                            )}
                          >
                            {posts > 0 ? `${value.toFixed(1)}` : ''}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs" side="top">
                          <p className="font-medium">{DAY_LABELS_FULL[dow]} {hour}h00</p>
                          <p>Engagement moyen : {value.toFixed(2)}%</p>
                          <p>Posts : {posts}</p>
                          {posts > 0 && <p>Confiance : {Math.min(100, posts * 25)}%</p>}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center gap-2 mt-3 justify-end">
                <span className="text-[10px] text-muted-foreground">Faible</span>
                <div className="flex gap-0.5">
                  <div className="w-4 h-3 rounded-sm bg-red-400" />
                  <div className="w-4 h-3 rounded-sm bg-red-200" />
                  <div className="w-4 h-3 rounded-sm bg-amber-200" />
                  <div className="w-4 h-3 rounded-sm bg-emerald-300" />
                  <div className="w-4 h-3 rounded-sm bg-emerald-500" />
                </div>
                <span className="text-[10px] text-muted-foreground">Élevé</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Recommended Slots */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Top 5 Créneaux
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {analysis?.topSlots && analysis.topSlots.length > 0 ? (
              analysis.topSlots.map((slot, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    i === 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-muted/20 border-border/50'
                  )}
                >
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    i === 0 ? 'bg-emerald-500 text-white' : i === 1 ? 'bg-amber-500 text-white' : i === 2 ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    {slot.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {slot.dayLabel} {slot.slotLabel}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {slot.totalDataPoints} données · Confiance {slot.confidence}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{slot.avgEngagement}%</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun créneau recommandé</p>
                <p className="text-xs mt-1">Ajoutez des métriques pour activer</p>
              </div>
            )}

            {/* Worst slot warning */}
            {analysis?.worstSlots && analysis.worstSlots.length > 0 && (
              <div className="pt-3 border-t border-border/30">
                <p className="text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1 mb-1.5">
                  <TrendingDown className="w-3 h-3" />
                  Créneaux à éviter
                </p>
                {analysis.worstSlots.slice(0, 2).map((slot, i) => (
                  <div key={i} className="flex items-center justify-between py-1 text-xs text-muted-foreground">
                    <span>{slot.dayLabel} {slot.slotLabel}</span>
                    <span className="text-red-500 dark:text-red-400 font-medium">{slot.avgEngagement}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Patterns */}
      {analysis?.patterns && analysis.patterns.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-500" />
              Motifs détectés
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {analysis.patterns.map((pattern, i) => (
                <div key={i} className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                  <p className="text-xs text-violet-800 dark:text-violet-300 leading-relaxed">{pattern}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
   Main: AnalyticsView
   ============================================================ */
export default function AnalyticsView() {
  const setView = useAppStore((s) => s.setView);
  const selectPost = useAppStore((s) => s.selectPost);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [postsWithMetrics, setPostsWithMetrics] = useState<(Post & { latestMetric?: PostMetric })[]>([]);
  const [formats, setFormats] = useState<FormatPerformance[]>([]);
  const [days, setDays] = useState<DayPerformance[]>([]);
  const [hours, setHours] = useState<HourPerformance[]>([]);
  const [providers, setProviders] = useState<ProviderPerformance[]>([]);
  const [correlation, setCorrelation] = useState<ScoreCorrelation | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showMetricDialog, setShowMetricDialog] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, postsRes, formatRes, dayRes, hourRes, providerRes, corrRes, insightRes] = await Promise.all([
        apiFetch<AnalyticsOverview>('/api/analytics/overview'),
        apiFetch<{ posts: Post[] }>('/api/posts?status=posted&limit=100').catch(() => ({ posts: [] })),
        apiFetch<{ formats: FormatPerformance[] }>('/api/analytics/by-format'),
        apiFetch<{ days: DayPerformance[] }>('/api/analytics/by-day'),
        apiFetch<{ hours: HourPerformance[] }>('/api/analytics/by-hour'),
        apiFetch<{ providers: ProviderPerformance[] }>('/api/analytics/by-provider'),
        apiFetch<ScoreCorrelation>('/api/analytics/score-correlation'),
        apiFetch<{ insights: AnalyticsInsight[] }>('/api/analytics/insights'),
      ]);

      setOverview(overviewRes);
      setFormats(formatRes.formats);
      setDays(dayRes.days);
      setHours(hourRes.hours);
      setProviders(providerRes.providers);
      setCorrelation(corrRes);
      setInsights(insightRes.insights);

      // Get latest metric per post
      const postsWithLatest = await Promise.all(
        postsRes.posts.map(async (post) => {
          try {
            const metricsRes = await apiFetch<{ metrics: PostMetric[] }>(`/api/posts/metrics/${post.id}?postId=${post.id}`);
            return { ...post, latestMetric: metricsRes.metrics[0] || undefined };
          } catch {
            return { ...post, latestMetric: undefined };
          }
        })
      );
      setPostsWithMetrics(postsWithLatest.filter(p => p.latestMetric));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSeed = async () => {
    try {
      const data = await apiFetch<{ seeded: number }>('/api/analytics/seed', { method: 'POST' });
      toast.success(`${data.seeded} posts avec métriques de démo générés`);
      fetchAll();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleViewPost = (postId: string) => {
    selectPost(postId);
    setView('post-detail');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Analytics</h2>
          <p className="text-sm text-muted-foreground">Performance et intelligence de vos contenus LinkedIn</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Données de démo
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={downloadingPdf || !overview}
            onClick={async () => {
              setDownloadingPdf(true);
              try {
                const token = useAppStore.getState().token;
                const res = await fetch('/api/posts/export/pdf', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ type: 'analytics' }),
                });
                if (!res.ok) throw new Error('Export PDF failed');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rapport_analytique_${new Date().toISOString().split('T')[0]}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Rapport PDF téléchargé');
              } catch {
                toast.error("Erreur lors de l'export PDF");
              } finally {
                setDownloadingPdf(false);
              }
            }}
          >
            {downloadingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Export PDF
          </Button>
          <MetricEntryDialog onSaved={fetchAll} externalOpen={showMetricDialog} onExternalOpenChange={(v) => setShowMetricDialog(v)} />
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards overview={overview} />

      {/* Empty state when no metrics data at all */}
      {!overview || (overview.totalPosts === 0 && postsWithMetrics.length === 0) ? (
        <EmptyState
          icon={<BarChart3 className="w-6 h-6" />}
          title="Aucune donnée analytique"
          description="Publiez des posts et ajoutez des métriques pour voir vos performances"
          action={{
            label: 'Ajouter des métriques',
            onClick: () => setShowMetricDialog(true),
            icon: <Plus className="w-3.5 h-3.5" />,
          }}
        />
      ) : (
      <Tabs defaultValue="trends">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="table">Tableau</TabsTrigger>
          <TabsTrigger value="details">Analyses</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="scoring" className="gap-1.5">
            <Brain className="w-3 h-3" />
            Smart Score
          </TabsTrigger>
          <TabsTrigger value="besttime" className="gap-1.5">
            <Clock className="w-3 h-3" />
            Créneaux
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4 mt-4">
          <TrendChart overview={overview} />
          <ScoreScatterChart correlation={correlation} />
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <PerformanceTable posts={postsWithMetrics} onViewPost={handleViewPost} />
        </TabsContent>

        <TabsContent value="details" className="space-y-4 mt-4">
          <FormatChart formats={formats} />
          <DayHourChart days={days} hours={hours} />
          <ProviderChart providers={providers} />
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <InsightsPanel insights={insights} />
        </TabsContent>

        <TabsContent value="scoring" className="mt-4">
          <ScoringCalibrationSection />
        </TabsContent>

        <TabsContent value="besttime" className="mt-4">
          <BestTimeSection />
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
