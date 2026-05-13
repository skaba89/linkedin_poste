'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Mic, RefreshCw, Sparkles, Copy, ArrowRight, Loader2,
  BarChart3, FileText, MessageSquare, Target, TrendingUp, AlertTriangle, CheckCircle2, Lightbulb, Palette, Hash, Quote, Crosshair, Megaphone,
} from 'lucide-react';
import EmptyState from './EmptyState';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { BrandVoiceResult } from '@/types';

const RADAR_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function BrandVoiceView() {
  const [profile, setProfile] = useState<BrandVoiceResult | null>(null);
  const [dbProfile, setDbProfile] = useState<{ name: string; postCount: number; analyzedAt: string; voicePrompt?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ profile: BrandVoiceResult | null }>('/api/brand-voice');
      setProfile(data.profile);
    } catch {}
    try {
      const dbData = await apiFetch<{ profile: { name: string; postCount: number; analyzedAt: string; voicePrompt?: string; tone?: any; vocabulary?: any; structure?: any; emotional?: any; themes?: any } | null }>('/api/brand-voice');
      setDbProfile(dbData.profile);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const data = await apiFetch<BrandVoiceResult>('/api/brand-voice', { method: 'POST' });
      setProfile(data);
      toast.success('Analyse terminée !');
      fetchProfile();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSeed = async () => {
    try {
      await apiFetch('/api/brand-voice/seed', { method: 'POST' });
      toast.success('Données de démo créées');
      fetchProfile();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleCopyPrompt = async () => {
    if (profile?.voicePrompt) {
      try {
        await navigator.clipboard.writeText(profile.voicePrompt);
        toast.success('Prompt copié !');
      } catch {
        toast.error('Impossible de copier dans le presse-papiers');
      }
    }
  };

  const handleUseInGeneration = () => {
    if (profile?.voicePrompt) {
      sessionStorage.setItem('prefill_angle', profile.voicePrompt);
      sessionStorage.setItem('brand_voice_source', 'true');
      const { setView } = useAppStore.getState();
      setView('create-post');
      toast.success('Brand Voice appliqué au formulaire de création');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  if (!profile && !dbProfile) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <EmptyState
          icon={<Mic className="w-6 h-6" />}
          title="Aucun profil de marque"
          description="Analysez votre voix de marque pour un contenu cohérent"
          action={{
            label: 'Créer un profil',
            onClick: handleAnalyze,
            icon: analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />,
          }}
          secondaryAction={{
            label: 'Données de démo',
            onClick: handleSeed,
          }}
          className="py-20"
        />
      </div>
    );
  }

  const toneData = profile?.tone ? Object.entries(profile.tone).map(([key, val]) => ({ subject: key.charAt(0).toUpperCase() + key.slice(1), value: val, fullMark: 100 })) : [];
  const emotionData = profile?.emotional ? [
    { name: 'Positif', value: profile.emotional.positive, fill: '#10b981' },
    { name: 'Négatif', value: profile.emotional.negative, fill: '#ef4444' },
    { name: 'Neutre', value: profile.emotional.neutral, fill: '#94a3b8' },
    { name: 'Question', value: profile.emotional.interrogative, fill: '#f59e0b' },
    { name: 'Exclamation', value: profile.emotional.exclamatory, fill: '#8b5cf6' },
  ] : [];

  const themesData = profile?.themes?.slice(0, 8).map(t => ({ name: t.name, value: Math.round(t.frequency * 100), count: Math.round(t.frequency * 10) / 10 })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Brand Voice DNA</h2>
          <p className="text-sm text-muted-foreground">Analyse de votre identité éditoriale LinkedIn</p>
        </div>
        <div className="flex items-center gap-2">
          {dbProfile && (
            <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              {dbProfile.postCount} posts analysés
            </Badge>
          )}
          <Button onClick={handleAnalyze} disabled={analyzing} size="sm" className="gap-1.5">
            {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Analyser
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="vocabulary">Vocabulaire</TabsTrigger>
          <TabsTrigger value="emotional">Émotions</TabsTrigger>
          <TabsTrigger value="voice-prompt">Prompt IA</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tone Radar */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  Profil tonal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={toneData}>
                      <PolarGrid strokeDasharray="3 3" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar name="Ton" stroke="#10b981" fill="#10b981" fillOpacity={0.2} dataKey="value" />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Emotional Pie */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  Signature émotionnelle
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={emotionData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                        {emotionData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Themes */}
          {themesData.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  Thèmes récurrents
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={themesData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} name="Présence %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {profile?.recommendations && profile.recommendations.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Recommandations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {profile.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{r}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Vocabulary */}
        <TabsContent value="vocabulary" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Word Cloud */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Top mots-clés</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2 min-h-[120px]">
                  {profile?.vocabulary.topWords.slice(0, 25).map((w, i) => (
                    <span
                      key={w.word}
                      className="inline-block px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors cursor-default"
                      style={{ fontSize: `${Math.max(10, Math.min(24, 10 + w.count * 0.8))}px` }}
                    >
                      {w.word}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Expressions signatures</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2 min-h-[80px]">
                  {profile?.vocabulary.signaturePhrases.length ? profile.vocabulary.signaturePhrases.map((p, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Quote className="w-3 h-3 mr-1" />
                      {p}
                    </Badge>
                  )) : <p className="text-xs text-muted-foreground">Pas assez de données</p>}
                </div>
                <Separator className="my-3" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">Longueur moy. mots</p>
                    <p className="text-lg font-bold">{profile?.vocabulary.avgWordLength || '—'}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">Richesse vocab.</p>
                    <p className="text-lg font-bold">{profile?.vocabulary.uniqueWordRatio ? `${Math.round(profile.vocabulary.uniqueWordRatio * 100)}%` : '—'}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">Longueur moy. posts</p>
                    <p className="text-lg font-bold">{profile?.vocabulary.avgPostLength ? `${Math.round(profile.vocabulary.avgPostLength)} chars` : '—'}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">Mots uniques</p>
                    <p className="text-lg font-bold">{profile?.vocabulary.topWords?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Structure */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Structure typique
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="font-mono text-xs text-muted-foreground bg-muted/30 rounded-lg p-4 leading-loose">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Accroche : {profile?.structure.hookPatterns[0] || 'Première ligne percutante'}</span>
                </div>
                <div className="ml-4 border-l-2 border-border/30 pl-4 space-y-1">
                  {Array.from({ length: Math.min(3, profile?.structure.avgParagraphCount || 3) }).map((_, i) => (
                    <div key={i} className="text-slate-500">├── Paragraphe {i + 1}</div>
                  ))}
                  <div className="text-slate-500">└── Paragraphe {(profile?.structure.avgParagraphCount || 3)}</div>
                </div>
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mt-1">
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>CTA : {profile?.structure.ctaPatterns[0] || 'Appel à l\'action en fin'}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Phrases moy.</p>
                  <p className="text-sm font-bold">{profile?.structure.avgSentenceLength || '—'}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Paragraphes</p>
                  <p className="text-sm font-bold">{profile?.structure.avgParagraphCount || '—'}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Retours ligne</p>
                  <p className="text-sm font-bold">{profile?.structure.avgLineBreaksPerPost || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emotional */}
        <TabsContent value="emotional" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Distribution émotionnelle</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  {emotionData.map((d) => (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="w-20 text-xs text-right text-muted-foreground">{d.name}</div>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.max(2, d.value)}%`, backgroundColor: d.fill }}
                        />
                      </div>
                      <div className="w-8 text-xs font-medium text-right">{d.value}%</div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fréquence d&apos;emojis</p>
                    <p className="text-sm font-bold">{profile?.emotional.emojiFrequency || 0} / 1000 chars</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Voice Prompt */}
        <TabsContent value="voice-prompt" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Prompt de voix IA
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {profile?.voicePrompt ? (
                <>
                  <div className="bg-muted/30 rounded-lg p-4 mb-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{profile.voicePrompt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopyPrompt} className="gap-1.5">
                      <Copy className="w-3.5 h-3.5" />
                      Copier le prompt
                    </Button>
                    <Button size="sm" onClick={handleUseInGeneration} className="gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5" />
                      Utiliser dans la génération
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Analysez votre voix d&apos;abord pour générer un prompt personnalisé.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
