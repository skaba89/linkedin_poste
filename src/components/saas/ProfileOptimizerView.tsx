'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Settings2,
  Loader2,
  Sparkles,
  Target,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Copy,
  Clock,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Linkedin,
  BadgeCheck,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================

interface LinkedInStatus {
  connected: boolean;
  account: {
    id: string;
    personName: string;
    personEmail: string | null;
    personPicture: string | null;
    organizationName: string | null;
    isActive: boolean;
    tokenExpiresAt: string | null;
    isExpired: boolean;
  } | null;
}

interface AutoReadResult {
  success: boolean;
  profileData: {
    name: string;
    email: string;
    headline: string | null;
    about: string | null;
    positions: Array<{
      title: string;
      company: string;
      startDate: string;
      description: string | null;
    }>;
    picture: string;
    warnings: string[];
  };
  analysis: ProfileAnalysis;
}

interface Suggestion {
  priority: string;
  category: string;
  text: string;
  impact: string;
}

interface TopProfile {
  name: string;
  headline: string;
  score?: number;
  strengths?: string[];
}

interface ProfileAnalysis {
  id: string;
  headline: string | null;
  about: string | null;
  score: number;
  headlineScore: number;
  aboutScore: number;
  experienceScore: number;
  skillsScore: number;
  recommendationsScore: number;
  suggestions: string | null;
  optimizedHeadline: string | null;
  optimizedAbout: string | null;
  topProfiles: string | null;
  analyzedAt: string;
}

// ============================================================
// Helpers
// ============================================================

function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; } catch { return fallback; }
}

function getGrade(score: number): { grade: string; color: string; bgColor: string } {
  if (score >= 90) return { grade: 'A', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-950/40' };
  if (score >= 75) return { grade: 'B', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-950/40' };
  if (score >= 60) return { grade: 'C', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-950/40' };
  if (score >= 40) return { grade: 'D', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-950/40' };
  return { grade: 'F', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-950/40' };
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400';
    case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
    case 'low': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
}

const PRIORITY_LABELS: Record<string, string> = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };
const CATEGORY_LABELS: Record<string, string> = {
  headline: 'Titre',
  about: 'À propos',
  experience: 'Expérience',
  skills: 'Compétences',
  general: 'Général',
};
const SECTION_LABELS: Record<string, string> = {
  headlineScore: 'Titre',
  aboutScore: 'À propos',
  experienceScore: 'Expérience',
  skillsScore: 'Compétences',
  recommendationsScore: 'Recommandations',
};

// ============================================================
// Score Gauge Component
// ============================================================

function ScoreGauge({ score, size = 160 }: { score: number; size?: number }) {
  const { grade, color } = getGrade(score);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="currentColor"
          className="text-muted/20" strokeWidth="8"
        />
        <circle
          cx={center} cy={center} r={radius}
          fill="none" strokeWidth="8"
          strokeLinecap="round"
          className={color}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{score}</span>
        <span className={cn('text-lg font-bold', color)}>{grade}</span>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function ProfileOptimizerView() {
  const [currentAnalysis, setCurrentAnalysis] = useState<ProfileAnalysis | null>(null);
  const [history, setHistory] = useState<ProfileAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<any>(null);

  // LinkedIn auto-read state
  const [linkedinStatus, setLinkedinStatus] = useState<LinkedInStatus | null>(null);
  const [autoReading, setAutoReading] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [autoReadWarnings, setAutoReadWarnings] = useState<string[]>([]);

  // Form
  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState('');
  const [sector, setSector] = useState('');

  // Fetch LinkedIn connection status on mount
  const fetchLinkedInStatus = useCallback(async () => {
    try {
      const data = await apiFetch<LinkedInStatus>('/api/profile-optimizer/linkedin-profile');
      setLinkedinStatus(data);
    } catch {
      // silent — not critical
    }
  }, []);

  useEffect(() => {
    fetchLinkedInStatus();
  }, [fetchLinkedInStatus]);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiFetch<{ analyses: ProfileAnalysis[] }>('/api/profile/history?limit=10');
      setHistory(data.analyses);
      if (data.analyses.length > 0) {
        setCurrentAnalysis(data.analyses[0]);
      }
    } catch {
      // silent
    }
  }, []);

  useState(() => { fetchHistory(); });

  const handleAutoRead = async () => {
    setAutoReading(true);
    setAutoReadWarnings([]);
    try {
      const data = await apiFetch<AutoReadResult>('/api/profile-optimizer/auto-read', {
        method: 'POST',
      });

      // Auto-fill form fields with gathered data
      const filledFields = new Set<string>();
      if (data.profileData.headline) {
        setHeadline(data.profileData.headline);
        filledFields.add('headline');
      }
      if (data.profileData.about) {
        setAbout(data.profileData.about);
        filledFields.add('about');
      }
      if (data.profileData.positions && data.profileData.positions.length > 0) {
        const experienceText = data.profileData.positions
          .map(
            (p) =>
              `${p.title} chez ${p.company} (${p.startDate})${p.description ? `\n${p.description}` : ''}`
          )
          .join('\n\n');
        setExperience(experienceText);
        filledFields.add('experience');
      }
      setAutoFilledFields(filledFields);
      setAutoReadWarnings(data.profileData.warnings || []);

      // Set analysis result
      if (data.analysis) {
        setCurrentAnalysis(data.analysis);
        setHistory((prev) => [data.analysis, ...prev.filter((a) => a.id !== data.analysis.id)]);
      }

      toast.success('Profil LinkedIn lu automatiquement !');
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error('Erreur lors de la lecture du profil LinkedIn');
      }
    } finally {
      setAutoReading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!headline && !about && !experience && !skills) {
      toast.error('Remplissez au moins un champ pour lancer l\'analyse');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ analysis: ProfileAnalysis }>('/api/profile/analyzer', {
        method: 'POST',
        body: JSON.stringify({ headline, about, experience, skills, sector }),
      });
      setCurrentAnalysis(data.analysis);
      setHistory((prev) => [data.analysis, ...prev.filter((a) => a.id !== data.analysis.id)]);
      toast.success('Analyse terminée !');
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!sector) {
      toast.error('Le secteur est requis pour la comparaison');
      return;
    }
    setComparing(true);
    try {
      const data = await apiFetch<{ comparison: any }>('/api/profile/compare', {
        method: 'POST',
        body: JSON.stringify({ headline, about, sector, skills }),
      });
      setComparison(data.comparison);
      toast.success('Comparaison générée !');
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setComparing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papiers');
  };

  const suggestions = safeJsonParse<Suggestion[]>(currentAnalysis?.suggestions, []);
  const topProfiles = safeJsonParse<TopProfile[]>(currentAnalysis?.topProfiles, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-950/40">
          <Settings2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Optimiseur de Profil IA</h2>
          <p className="text-sm text-muted-foreground">
            Analyse et optimisez votre profil LinkedIn avec l&apos;intelligence artificielle
          </p>
        </div>
      </div>

      <Tabs defaultValue="analyzer" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analyzer" className="gap-1.5 text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 hidden sm:inline" />
            Analyser
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="w-4 h-4 hidden sm:inline" />
            Résultats
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
            <Clock className="w-4 h-4 hidden sm:inline" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Analyze Form */}
        <TabsContent value="analyzer">
          {/* LinkedIn Auto-Read Banner */}
          <Card className={cn(
            'border-border/50 mb-4',
            linkedinStatus?.connected && 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
          )}>
            <CardContent className="p-4">
              {linkedinStatus === null ? (
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ) : linkedinStatus.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {linkedinStatus.account?.personPicture ? (
                        <img
                          src={linkedinStatus.account.personPicture}
                          alt={linkedinStatus.account.personName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-emerald-300 dark:border-emerald-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white font-bold text-sm">
                          {linkedinStatus.account?.personName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          {linkedinStatus.account?.personName}
                          <BadgeCheck className="w-4 h-4 text-emerald-500" />
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {linkedinStatus.account?.organizationName
                            ? `${linkedinStatus.account.organizationName} · Compte connecté`
                            : 'Compte LinkedIn connecté'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleAutoRead}
                      disabled={autoReading}
                      className="ml-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {autoReading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Lecture en cours…
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Lire mon profil LinkedIn automatiquement
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Auto-filled badges */}
                  {autoFilledFields.size > 0 && (
                    <div className="flex flex-wrap items-center gap-2 ml-[52px]">
                      <span className="text-xs text-muted-foreground">Champs remplis :</span>
                      {autoFilledFields.has('headline') && (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Titre
                        </Badge>
                      )}
                      {autoFilledFields.has('about') && (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          À propos
                        </Badge>
                      )}
                      {autoFilledFields.has('experience') && (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Expérience
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">— Vous pouvez modifier les champs avant d&apos;analyser</span>
                    </div>
                  )}

                  {/* Warnings */}
                  {autoReadWarnings.length > 0 && (
                    <div className="ml-[52px] space-y-1">
                      {autoReadWarnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Linkedin className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Compte LinkedIn non connecté</p>
                      <p className="text-xs text-muted-foreground">
                        Connectez votre compte LinkedIn pour lire votre profil automatiquement
                      </p>
                    </div>
                  </div>
                  <a href="/api/linkedin/authorize">
                    <Button variant="outline" className="ml-auto gap-2">
                      <Linkedin className="w-4 h-4" />
                      Connecter LinkedIn
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Informations du profil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector" className="text-xs font-medium">Secteur d&apos;activité</Label>
                  <Select value={sector} onValueChange={setSector}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {['Tech / IT', 'Marketing', 'Finance', 'Ressources Humaines', 'Conseil', 'Industrie', 'Santé', 'Éducation', 'Autre'].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headline" className="text-xs font-medium">Titre LinkedIn</Label>
                  <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Ex: Directeur Data & IA | J&apos;aide les entreprises à transformer" className="h-9 text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="about" className="text-xs font-medium">Section À propos</Label>
                <Textarea id="about" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Décrivez votre parcours, expertise et ce qui vous distingue..." className="min-h-[100px] text-sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience" className="text-xs font-medium">Expérience clés</Label>
                  <Textarea id="experience" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Postes, résultats, projets marquants..." className="min-h-[80px] text-sm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skills" className="text-xs font-medium">Compétences</Label>
                  <Textarea id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Liste de vos compétences clés..." className="min-h-[80px] text-sm" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleAnalyze} disabled={loading} className="gap-1.5">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Analyser mon profil
                </Button>
                <Button onClick={handleCompare} disabled={comparing || !sector} variant="outline" className="gap-1.5">
                  {comparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                  Comparer avec le secteur
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Results */}
        <TabsContent value="results">
          {loading ? (
            <div className="space-y-4">
              <Card className="border-border/50"><CardContent className="p-6 flex justify-center"><Skeleton className="h-40 w-40 rounded-full" /></CardContent></Card>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            </div>
          ) : currentAnalysis ? (
            <div className="space-y-4">
              {/* Score + Section Scores */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border/50 flex flex-col items-center justify-center p-6">
                  <ScoreGauge score={currentAnalysis.score} size={150} />
                  <p className="text-sm text-muted-foreground mt-2">Score global</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {new Date(currentAnalysis.analyzedAt).toLocaleDateString('fr-FR')}
                  </p>
                </Card>

                <Card className="border-border/50 md:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Scores par section</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {['headlineScore', 'aboutScore', 'experienceScore', 'skillsScore', 'recommendationsScore'].map((key) => {
                      const score = currentAnalysis[key as keyof ProfileAnalysis] as number;
                      return (
                        <div key={key} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">{SECTION_LABELS[key] || key}</span>
                            <span className="text-muted-foreground">{score}/100</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all duration-700', getScoreBarColor(score))} style={{ width: `${score}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Optimized vs Current */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Avant / Après optimisation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentAnalysis.optimizedHeadline && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Titre</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-[10px] text-muted-foreground mb-1">Actuel</p>
                          <p className="text-sm">{currentAnalysis.headline || '—'}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3 border border-emerald-200 dark:border-emerald-800">
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-1 flex items-center justify-between">
                            Optimisé
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(currentAnalysis.optimizedHeadline!)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </p>
                          <p className="text-sm">{currentAnalysis.optimizedHeadline}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {currentAnalysis.optimizedAbout && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Section À propos</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-muted/50 p-3 max-h-40 overflow-y-auto">
                          <p className="text-[10px] text-muted-foreground mb-1">Actuel</p>
                          <p className="text-xs whitespace-pre-wrap">{currentAnalysis.about || '—'}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3 border border-emerald-200 dark:border-emerald-800 max-h-40 overflow-y-auto">
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-1 flex items-center justify-between">
                            Optimisé
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(currentAnalysis.optimizedAbout!)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </p>
                          <p className="text-xs whitespace-pre-wrap">{currentAnalysis.optimizedAbout}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {currentAnalysis.optimizedHeadline && currentAnalysis.optimizedAbout && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                      copyToClipboard(currentAnalysis.optimizedHeadline! + '\n\n' + currentAnalysis.optimizedAbout!);
                    }}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Appliquer les suggestions
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Suggestions d&apos;amélioration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-80">
                      <div className="space-y-2">
                        {suggestions.map((s, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                              <Badge variant="secondary" className={cn('text-[10px]', getPriorityColor(s.priority))}>
                                {PRIORITY_LABELS[s.priority] || s.priority}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] bg-muted">
                                {CATEGORY_LABELS[s.category] || s.category}
                              </Badge>
                            </div>
                            <p className="text-sm flex-1">{s.text}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Top Profiles Comparison */}
              {topProfiles.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Top profils du secteur
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Profil</TableHead>
                          <TableHead className="text-xs">Headline</TableHead>
                          <TableHead className="text-xs w-20">Score</TableHead>
                          <TableHead className="text-xs">Points forts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProfiles.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs font-medium">{p.name}</TableCell>
                            <TableCell className="text-xs">{p.headline}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="secondary" className={cn('text-[10px]', getGrade(p.score || 0).bgColor, getGrade(p.score || 0).color)}>
                                {p.score || '—'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {p.strengths?.join(', ') || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Sector Comparison */}
              {comparison && (
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Comparaison sectorielle — {comparison.sector}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {comparison.benchmarkScore && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Score de référence du secteur :</span>
                        <Badge variant="secondary" className={cn('text-sm px-3 py-1', getGrade(comparison.benchmarkScore).bgColor, getGrade(comparison.benchmarkScore).color)}>
                          {comparison.benchmarkScore}/100
                        </Badge>
                      </div>
                    )}
                    {comparison.comparison?.length > 0 && (
                      <div className="space-y-2">
                        {comparison.comparison.map((c: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{c.metric}</p>
                              <p className="text-xs text-muted-foreground">{c.advice}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={cn('text-lg font-bold', c.gap > 0 ? 'text-red-500' : 'text-emerald-500')}>
                                {c.gap > 0 ? '+' : ''}{c.gap}
                              </p>
                              <p className="text-[10px] text-muted-foreground">vous: {c.userScore} / moy: {c.averageScore}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <Settings2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucune analyse disponible</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Remplissez le formulaire et cliquez sur &quot;Analyser mon profil&quot;
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: History */}
        <TabsContent value="history">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Historique des analyses</CardTitle>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={fetchHistory}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Actualiser
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                {history.length === 0 ? (
                  <div className="py-8 text-center">
                    <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune analyse effectuée</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((a) => {
                      const g = getGrade(a.score);
                      return (
                        <button
                          key={a.id}
                          onClick={() => setCurrentAnalysis(a)}
                          className={cn(
                            'w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors',
                            currentAnalysis?.id === a.id ? 'border-primary bg-primary/5' : 'border-border/50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className={cn('text-xs px-2 py-0.5', g.bgColor, g.color)}>
                                {a.score}/100 ({g.grade})
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(a.analyzedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {a.headline ? a.headline.slice(0, 50) + (a.headline.length > 50 ? '...' : '') : 'Sans titre'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
