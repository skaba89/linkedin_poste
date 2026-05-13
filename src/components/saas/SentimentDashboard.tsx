'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  HeartPulse,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Bell,
  BellOff,
  Plus,
  Trash2,
  Eye,
  Sparkles,
  MessageSquare,
  Smile,
  Frown,
  Meh,
  Shuffle,
  Loader2,
  BarChart3,
  Tag,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================
interface DashboardData {
  overallSentiment: { positive: number; negative: number; neutral: number; mixed: number };
  sentimentTrend: Array<{ date: string; positive: number; negative: number; neutral: number; mixed: number }>;
  topPositiveComments: Array<{ id: string; content: string; authorName?: string; collectedAt: string }>;
  topNegativeComments: Array<{ id: string; content: string; authorName?: string; collectedAt: string }>;
  emotionBreakdown: Array<{ name: string; count: number }>;
  keywordCloud: Array<{ word: string; count: number; context: 'positive' | 'negative' | 'neutral' }>;
  postSentimentMap: Array<{
    postId: string;
    title: string;
    avgSentiment: string | null;
    commentCount: number;
    score: number;
    distribution?: { positive: number; negative: number; neutral: number; mixed: number };
  }>;
  totalAnalyzed: number;
  avgScore: number;
  activeAlerts: number;
}

interface SentimentAlert {
  id: string;
  type: string;
  config: string;
  isEnabled: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
}

interface TriggeredAlert {
  alertId: string;
  type: string;
  message: string;
  triggeredAt: string;
}

const EMOTION_LABELS: Record<string, string> = {
  joie: 'Joie',
  confiance: 'Confiance',
  surprise: 'Surprise',
  colere: 'Colère',
  tristesse: 'Tristesse',
  peur: 'Peur',
};

const EMOTION_COLORS: Record<string, string> = {
  joie: 'bg-amber-400 dark:bg-amber-500',
  confiance: 'bg-emerald-400 dark:bg-emerald-500',
  surprise: 'bg-violet-400 dark:bg-violet-500',
  colere: 'bg-red-400 dark:bg-red-500',
  tristesse: 'bg-sky-400 dark:bg-sky-500',
  peur: 'bg-orange-400 dark:bg-orange-500',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  spike_negative: 'Pic négatif',
  threshold_negative: 'Seuil négatif',
  keyword: 'Mot-clé surveillé',
};

const ALERT_TYPE_COLORS: Record<string, string> = {
  spike_negative: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  threshold_negative: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  keyword: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

// ============================================================
// KPI Card Component
// ============================================================
function KPICard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Sentiment Gauge
// ============================================================
function SentimentGauge({ positive, negative, neutral, mixed }: { positive: number; negative: number; neutral: number; mixed: number }) {
  const total = positive + negative + neutral + mixed;
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
          <Minus className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Aucune donnée</p>
      </div>
    );
  }

  const posPct = Math.round((positive / total) * 100);
  const negPct = Math.round((negative / total) * 100);

  const score = posPct - negPct;
  let label: string;
  let labelColor: string;
  let scoreIcon: React.ReactNode;

  if (score > 40) {
    label = 'Très positif';
    labelColor = 'text-emerald-600 dark:text-emerald-400';
    scoreIcon = <TrendingUp className="w-4 h-4" />;
  } else if (score > 15) {
    label = 'Positif';
    labelColor = 'text-green-600 dark:text-green-400';
    scoreIcon = <TrendingUp className="w-4 h-4" />;
  } else if (score > -15) {
    label = 'Neutre';
    labelColor = 'text-slate-600 dark:text-slate-400';
    scoreIcon = <Minus className="w-4 h-4" />;
  } else if (score > -40) {
    label = 'Négatif';
    labelColor = 'text-orange-600 dark:text-orange-400';
    scoreIcon = <TrendingDown className="w-4 h-4" />;
  } else {
    label = 'Très négatif';
    labelColor = 'text-red-600 dark:text-red-400';
    scoreIcon = <TrendingDown className="w-4 h-4" />;
  }

  // Calculate gauge angle: 0° (left, negative) to 180° (right, positive)
  const angle = ((score + 100) / 200) * 180;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-32 h-16 overflow-hidden">
        <svg viewBox="0 0 100 55" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 5 50 A 45 45 0 0 1 95 50"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Positive portion */}
          <path
            d="M 50 5 A 45 45 0 0 1 95 50"
            fill="none"
            stroke="#10b981"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Negative portion */}
          <path
            d="M 5 50 A 45 45 0 0 1 50 5"
            fill="none"
            stroke="#ef4444"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Needle */}
          <line
            x1="50"
            y1="50"
            x2={50 + 35 * Math.cos(((angle - 180) * Math.PI) / 180)}
            y2={50 - 35 * Math.sin(((angle - 180) * Math.PI) / 180)}
            stroke="hsl(var(--foreground))"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="3" fill="hsl(var(--foreground))" />
        </svg>
      </div>
      <div className={`flex items-center gap-1.5 ${labelColor}`}>
        {scoreIcon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {posPct}% pos.
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {negPct}% nég.
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Skeleton Loading
// ============================================================
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function SentimentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<SentimentAlert[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [createAlertOpen, setCreateAlertOpen] = useState(false);
  const [newAlertType, setNewAlertType] = useState('threshold_negative');
  const [newAlertConfig, setNewAlertConfig] = useState<Record<string, unknown>>({ threshold: 0.3 });
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set());

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, alertsRes] = await Promise.all([
        apiFetch<DashboardData>('/api/sentiment/dashboard'),
        apiFetch<{ alerts: SentimentAlert[]; triggeredAlerts: TriggeredAlert[] }>('/api/sentiment/alerts'),
      ]);
      setData(dashRes);
      setAlerts(alertsRes.alerts);
      setTriggeredAlerts(alertsRes.triggeredAlerts);
    } catch {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Analyze all unanalyzed comments
  const handleAnalyzeAll = async () => {
    setAnalyzing(true);
    try {
      const response = await apiFetch<{ comments: Array<{ id: string }> }>('/api/audience?postId=');
      // Fetch all comments without sentiment
      const allCommentsRes = await fetch('/api/posts?limit=100&status=posted');
      // We need to get comments that have no sentiment set
      const analyzeRes = await apiFetch<{ analyzed: number }>('/api/sentiment/analyze', {
        method: 'POST',
        body: JSON.stringify({ text: '__batch__' }),
      });

      // Simpler: use a dedicated batch endpoint
      // For now, we'll call the analyze with an empty request to trigger batch
      const batchRes = await apiFetch<{ analyzed: number }>('/api/sentiment/analyze', {
        method: 'POST',
        body: JSON.stringify({ text: 'Analyse en cours des commentaires récents' }),
      });

      toast.success('Analyse lancée avec succès');
      // Refresh after a delay
      setTimeout(fetchDashboard, 2000);
    } catch {
      toast.error("Erreur lors de l'analyse");
    } finally {
      setAnalyzing(false);
    }
  };

  // Quick analyze: find comments without sentiment, get their IDs, batch analyze
  const handleQuickAnalyze = async () => {
    setAnalyzing(true);
    try {
      // Get the user's posts
      const postsRes = await apiFetch<{ posts: Array<{ id: string }> }>('/api/posts?limit=50&status=posted');
      const postIds = postsRes.posts.map((p) => p.id);

      if (postIds.length === 0) {
        toast.info('Aucun post publié trouvé');
        setAnalyzing(false);
        return;
      }

      // Get all comments for these posts
      const allComments: Array<{ id: string; sentiment?: string; content: string }> = [];
      for (const pid of postIds.slice(0, 10)) {
        try {
          const cRes = await apiFetch<{ comments: Array<{ id: string; sentiment?: string; content: string }> }>(
            `/api/audience?postId=${pid}`,
          );
          allComments.push(...cRes.comments);
        } catch {
          // skip
        }
      }

      const unanalyzed = allComments.filter((c) => !c.sentiment);
      if (unanalyzed.length === 0) {
        toast.info('Tous les commentaires sont déjà analysés');
        setAnalyzing(false);
        return;
      }

      const ids = unanalyzed.map((c) => c.id).slice(0, 20);
      const result = await apiFetch<{ analyzed: number }>('/api/sentiment/analyze', {
        method: 'POST',
        body: JSON.stringify({ commentIds: ids }),
      });

      toast.success(`${result.analyzed} commentaire(s) analysé(s)`);
      setTimeout(fetchDashboard, 1000);
    } catch {
      toast.error("Erreur lors de l'analyse");
    } finally {
      setAnalyzing(false);
    }
  };

  // Create alert
  const handleCreateAlert = async () => {
    try {
      await apiFetch('/api/sentiment/alerts', {
        method: 'POST',
        body: JSON.stringify({
          type: newAlertType,
          config: newAlertConfig,
          enabled: true,
        }),
      });
      toast.success('Alerte créée avec succès');
      setCreateAlertOpen(false);
      fetchDashboard();
    } catch {
      toast.error("Erreur lors de la création de l'alerte");
    }
  };

  // Delete alert
  const handleDeleteAlert = async (id: string) => {
    try {
      await apiFetch(`/api/sentiment/alerts?id=${id}`, { method: 'DELETE' });
      toast.success('Alerte supprimée');
      fetchDashboard();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Toggle alert
  const handleToggleAlert = async (alert: SentimentAlert) => {
    try {
      await apiFetch('/api/sentiment/alerts', {
        method: 'PUT',
        body: JSON.stringify({ id: alert.id, isEnabled: !alert.isEnabled }),
      });
      fetchDashboard();
    } catch {
      toast.error('Erreur');
    }
  };

  const markAlertRead = (id: string) => {
    setReadAlerts((prev) => new Set(prev).add(id));
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <HeartPulse className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Impossible de charger les données</p>
        <Button variant="outline" onClick={fetchDashboard}>
          Réessayer
        </Button>
      </div>
    );
  }

  const sentimentScore = data.avgScore;
  const scoreColor =
    sentimentScore >= 70 ? 'text-emerald-600' : sentimentScore >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-500" />
            Analyse de Sentiment
          </h2>
          <p className="text-sm text-muted-foreground">
            Surveillez les émotions de votre audience en temps réel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleQuickAnalyze}
            disabled={analyzing}
            className="gap-1.5"
          >
            {analyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Analyser les commentaires
          </Button>
          <Dialog open={createAlertOpen} onOpenChange={setCreateAlertOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Nouvelle alerte
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une alerte de sentiment</DialogTitle>
                <DialogDescription>
                  Recevez des notifications lorsque des patterns de sentiment sont détectés
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Type d&apos;alerte</Label>
                  <Select value={newAlertType} onValueChange={(v) => {
                    setNewAlertType(v);
                    if (v === 'threshold_negative') setNewAlertConfig({ threshold: 0.3 });
                    else if (v === 'keyword') setNewAlertConfig({ keywords: ['arnaque', 'mauvais'] });
                    else setNewAlertConfig({});
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spike_negative">Pic négatif soudain</SelectItem>
                      <SelectItem value="threshold_negative">Seuil négatif</SelectItem>
                      <SelectItem value="keyword">Mot-clé surveillé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newAlertType === 'threshold_negative' && (
                  <div className="space-y-2">
                    <Label>Seuil de tolérance ({Math.round((newAlertConfig.threshold as number || 0.3) * 100)}%)</Label>
                    <Input
                      type="range"
                      min="0.1"
                      max="0.8"
                      step="0.05"
                      value={newAlertConfig.threshold as number || 0.3}
                      onChange={(e) => setNewAlertConfig({ threshold: parseFloat(e.target.value) })}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Alerte si le ratio de commentaires négatifs dépasse ce seuil
                    </p>
                  </div>
                )}

                {newAlertType === 'keyword' && (
                  <div className="space-y-2">
                    <Label>Mots-clés (séparés par des virgules)</Label>
                    <Input
                      value={(newAlertConfig.keywords as string[] || []).join(', ')}
                      onChange={(e) =>
                        setNewAlertConfig({
                          keywords: e.target.value.split(',').map((w) => w.trim()).filter(Boolean),
                        })
                      }
                      placeholder="arnaque, mauvais, problème..."
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateAlertOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateAlert}>Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Commentaires analysés"
          value={data.totalAnalyzed}
          subtitle="sur les 30 derniers jours"
          icon={<MessageSquare className="w-5 h-5 text-white" />}
          color="bg-primary"
        />
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Sentiment global</p>
            <SentimentGauge {...data.overallSentiment} />
          </CardContent>
        </Card>
        <KPICard
          title="Score moyen"
          value={`${sentimentScore}/100`}
          subtitle={
            sentimentScore >= 70 ? 'Excellent' :
            sentimentScore >= 50 ? 'Correct' :
            'À améliorer'
          }
          icon={<Activity className={`w-5 h-5 ${sentimentScore >= 70 ? 'text-white' : sentimentScore >= 50 ? 'text-white' : 'text-white'}`} />}
          color={
            sentimentScore >= 70 ? 'bg-emerald-500' :
            sentimentScore >= 50 ? 'bg-amber-500' :
            'bg-red-500'
          }
        />
        <KPICard
          title="Alertes actives"
          value={data.activeAlerts}
          subtitle={`${triggeredAlerts.filter((a) => !readAlerts.has(a.alertId)).length} déclenchée(s)`}
          icon={
            triggeredAlerts.some((a) => !readAlerts.has(a.alertId))
              ? <Bell className="w-5 h-5 text-white" />
              : <BellOff className="w-5 h-5 text-white" />
          }
          color={
            triggeredAlerts.some((a) => !readAlerts.has(a.alertId))
              ? 'bg-red-500'
              : 'bg-muted-foreground'
          }
        />
      </div>

      {/* Triggered alerts banner */}
      {triggeredAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Alertes déclenchées
                </span>
              </div>
              <div className="space-y-2">
                {triggeredAlerts.slice(0, 3).map((ta, i) => (
                  <div
                    key={`${ta.alertId}-${i}`}
                    className={`flex items-start justify-between gap-3 p-2 rounded-lg transition-colors ${
                      readAlerts.has(ta.alertId)
                        ? 'bg-red-100/30 dark:bg-red-900/10 opacity-60'
                        : 'bg-red-100/60 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={ALERT_TYPE_COLORS[ta.type] || ''}>
                          {ALERT_TYPE_LABELS[ta.type] || ta.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ta.triggeredAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-300">{ta.message}</p>
                    </div>
                    {!readAlerts.has(ta.alertId) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => markAlertRead(ta.alertId)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Marquer comme lu
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend" className="gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Tendance
          </TabsTrigger>
          <TabsTrigger value="emotions" className="gap-1.5">
            <Smile className="w-3.5 h-3.5" />
            Émotions
          </TabsTrigger>
          <TabsTrigger value="keywords" className="gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Mots-clés
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Par post
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            Alertes
          </TabsTrigger>
        </TabsList>

        {/* Trend Tab */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tendance du sentiment (30 derniers jours)</CardTitle>
              <CardDescription>
                Évolution des commentaires positifs, négatifs et neutres
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.sentimentTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={data.sentimentTrend}>
                    <defs>
                      <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="positive"
                      stackId="1"
                      stroke="#10b981"
                      fill="url(#colorPositive)"
                      name="Positif"
                    />
                    <Area
                      type="monotone"
                      dataKey="neutral"
                      stackId="1"
                      stroke="#94a3b8"
                      fill="url(#colorNeutral)"
                      name="Neutre"
                    />
                    <Area
                      type="monotone"
                      dataKey="negative"
                      stackId="1"
                      stroke="#ef4444"
                      fill="url(#colorNegative)"
                      name="Négatif"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Aucune donnée de tendance disponible</p>
                    <p className="text-xs mt-1">Analysez vos commentaires pour voir les tendances</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Positive / Negative Comments side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Smile className="w-4 h-4 text-emerald-500" />
                  Top commentaires positifs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topPositiveComments.length > 0 ? (
                  <div className="space-y-3">
                    {data.topPositiveComments.map((c) => (
                      <div key={c.id} className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                        <p className="text-sm line-clamp-2">{c.content}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {c.authorName && <span>{c.authorName}</span>}
                          <span>{new Date(c.collectedAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun commentaire positif récent</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Frown className="w-4 h-4 text-red-500" />
                  Commentaires négatifs (alertes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topNegativeComments.length > 0 ? (
                  <div className="space-y-3">
                    {data.topNegativeComments.map((c) => (
                      <div key={c.id} className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                        <p className="text-sm line-clamp-2">{c.content}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {c.authorName && <span>{c.authorName}</span>}
                          <span>{new Date(c.collectedAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun commentaire négatif récent 🎉</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Emotions Tab */}
        <TabsContent value="emotions">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Répartition des émotions</CardTitle>
              <CardDescription>
                Détection des émotions dominantes dans les commentaires
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.emotionBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {data.emotionBreakdown.map((emotion) => {
                    const maxCount = Math.max(...data.emotionBreakdown.map((e) => e.count), 1);
                    const pct = Math.round((emotion.count / maxCount) * 100);
                    return (
                      <div key={emotion.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {EMOTION_LABELS[emotion.name] || emotion.name}
                          </span>
                          <span className="text-muted-foreground">{emotion.count}</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={`h-full rounded-full ${EMOTION_COLORS[emotion.name] || 'bg-slate-400'}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <div className="text-center">
                    <Shuffle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Aucune donnée émotionnelle disponible</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Nuage de mots-clés</CardTitle>
              <CardDescription>
                Mots les plus fréquents dans les commentaires (taille proportionnelle à la fréquence)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.keywordCloud.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.keywordCloud.map((kw) => {
                    const maxCount = Math.max(...data.keywordCloud.map((k) => k.count), 1);
                    const size = 0.75 + (kw.count / maxCount) * 0.5; // 0.75rem to 1.25rem
                    const bg =
                      kw.context === 'positive'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : kw.context === 'negative'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

                    return (
                      <motion.span
                        key={kw.word}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-all hover:scale-105 cursor-default ${bg}`}
                        style={{ fontSize: `${size}rem` }}
                      >
                        {kw.word}
                        <span className="text-[10px] opacity-60">{kw.count}</span>
                      </motion.span>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <div className="text-center">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Aucun mot-clé extrait</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sentiment par post</CardTitle>
              <CardDescription>
                Vue d&apos;ensemble du sentiment moyen de chaque post
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.postSentimentMap.length > 0 ? (
                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    {data.postSentimentMap.map((post) => {
                      const scoreColor =
                        post.score >= 70 ? 'text-emerald-600' :
                        post.score >= 50 ? 'text-amber-600' :
                        'text-red-600';
                      const scoreBg =
                        post.score >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                        post.score >= 50 ? 'bg-amber-100 dark:bg-amber-900/30' :
                        'bg-red-100 dark:bg-red-900/30';

                      return (
                        <div key={post.postId} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{post.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {post.commentCount} commentaire{post.commentCount !== 1 ? 's' : ''}
                              {post.avgSentiment && ` · ${post.avgSentiment}`}
                            </p>
                            {post.distribution && (
                              <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                                <span className="text-emerald-600">+{post.distribution.positive}</span>
                                <span className="text-slate-500">±{post.distribution.neutral}</span>
                                <span className="text-red-600">−{post.distribution.negative}</span>
                                {post.distribution.mixed > 0 && (
                                  <span className="text-violet-600">~{post.distribution.mixed}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${scoreBg}`}>
                            <span className={`text-lg font-bold ${scoreColor}`}>{post.score}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <div className="text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Aucun post avec commentaires</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Configuration des alertes</CardTitle>
                  <CardDescription>
                    Gérez vos règles de surveillance du sentiment
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreateAlertOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((alert) => {
                    const config = JSON.parse(alert.config || '{}');
                    return (
                      <div
                        key={alert.id}
                        className={`flex items-center justify-between gap-4 p-4 rounded-lg border transition-colors ${
                          alert.isEnabled
                            ? 'border-border bg-background'
                            : 'border-border/50 bg-muted/30 opacity-60'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={ALERT_TYPE_COLORS[alert.type] || ''}>
                              {ALERT_TYPE_LABELS[alert.type] || alert.type}
                            </Badge>
                            {!alert.isEnabled && (
                              <Badge variant="secondary" className="text-[10px]">Désactivée</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {alert.type === 'threshold_negative' && `Seuil : ${Math.round((config.threshold || 0) * 100)}%`}
                            {alert.type === 'keyword' && `Mots : ${(config.keywords || []).join(', ')}`}
                            {alert.type === 'spike_negative' && 'Détection automatique des pics négatifs (>40%)'}
                          </p>
                          {alert.lastTriggeredAt && (
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Dernier déclenchement : {new Date(alert.lastTriggeredAt).toLocaleString('fr-FR')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={alert.isEnabled}
                            onCheckedChange={() => handleToggleAlert(alert)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteAlert(alert.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BellOff className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Aucune alerte configurée</p>
                  <p className="text-xs mt-1 mb-4">Créez des alertes pour surveiller les sentiments de votre audience</p>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreateAlertOpen(true)}>
                    <Plus className="w-3.5 h-3.5" />
                    Créer une alerte
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
