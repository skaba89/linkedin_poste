'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  MessageSquareText,
  Sparkles,
  History,
  TrendingUp,
  Settings2,
  Copy,
  Send,
  Check,
  AlertCircle,
  Globe,
  Zap,
  Shield,
  Brain,
  Cloud,
  Server,
  Lock,
  AppWindow,
  Boxes,
  Loader2,
  RefreshCw,
  Plus,
  X,
  BarChart3,
  Database,
  Lightbulb,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================

interface ExpertEngagementConfig {
  enabledDomains: string[];
  customKeywords: string[];
  commentStyle: 'concis' | 'détaillé' | 'question' | 'expert_opinion';
  maxCommentsPerDay: number;
  autoPost: boolean;
  tone: 'professionnel' | 'décontracté' | 'technique' | 'thought_leader';
  languages: ('fr' | 'en')[];
}

interface DataDomain {
  id: string;
  label: string;
  keywords: string[];
  icon: string;
  color: string;
  description: string;
}

interface GeneratedComment {
  comment: string;
  domain: string;
  domainLabel?: string;
}

interface AgentActivity {
  id: string;
  agentType: string;
  status: string;
  title: string;
  description?: string;
  result?: string;
  metadata?: string;
  createdAt: string;
}

interface DomainStat {
  domain: string;
  domainLabel: string;
  totalComments: number;
  totalLikes: number;
  totalReplies: number;
}

// ============================================================
// Constants
// ============================================================

const COMMENT_STYLES = [
  { value: 'concis', label: 'Concis', icon: MessageCircle, desc: '1-3 phrases, va droit au but', preview: '"Totalement d\'accord. La data governance est la clé d\'un projet data réussi."' },
  { value: 'détaillé', label: 'Détaillé', icon: MessageSquareText, desc: '3-8 sentences avec des exemples', preview: '"Excellent point. Dans mon expérience avec dbt, la clé réside dans la modularité des transformations..." (plus développé)' },
  { value: 'question', label: 'Question', icon: Lightbulb, desc: 'Se termine par une question ouverte', preview: '"Très intéressant. Comment gérez-vous la migration vers un data mesh tout en maintenant la qualité ?"' },
  { value: 'expert_opinion', label: 'Avis d\'expert', icon: Brain, desc: 'Opinion tranchée et nuancée', preview: '"Mon avis : le hype autour de RAG va se tasser. Ce qui reste fondamental c\'est la qualité des données sous-jacentes."' },
];

const TONE_OPTIONS = [
  { value: 'professionnel', label: 'Professionnel', desc: 'B2B structuré' },
  { value: 'décontracté', label: 'Décontracté', desc: 'Conversationnel et accessible' },
  { value: 'technique', label: 'Technique', desc: 'Jargon métier approprié' },
  { value: 'thought_leader', label: 'Thought Leader', desc: 'Visionnaire et inspirant' },
];

const DOMAIN_ICONS: Record<string, any> = {
  Database, Boxes, BarChart3, Brain, Zap, Cloud, Server, Shield, AppWindow, Settings2,
};

function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; } catch { return fallback; }
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

// ============================================================
// Main Component
// ============================================================

export default function ExpertEngagementView() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Gradient Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-6 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <MessageSquareText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Agent d&apos;Engagement Expert</h2>
              <p className="text-sm text-white/80">
                Maintenez votre posture d&apos;expert avec des commentaires IA sur les posts Data, IA, Cloud, DevOps et plus encore.
              </p>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-white/70">
              <Sparkles className="w-3.5 h-3.5" />
              10 domaines d&apos;expertise
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/70">
              <Globe className="w-3.5 h-3.5" />
              FR &amp; EN
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/70">
              <Zap className="w-3.5 h-3.5" />
              4 styles de commentaire
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config" className="gap-1.5 text-xs sm:text-sm">
            <Settings2 className="w-4 h-4 hidden sm:inline" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-1.5 text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 hidden sm:inline" />
            Générer
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
            <History className="w-4 h-4 hidden sm:inline" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-1.5 text-xs sm:text-sm">
            <TrendingUp className="w-4 h-4 hidden sm:inline" />
            Tendances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <ConfigTab />
        </TabsContent>
        <TabsContent value="generate">
          <GenerateTab />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
        <TabsContent value="trends">
          <TrendsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Tab 1: Configuration
// ============================================================

function ConfigTab() {
  const [config, setConfig] = useState<ExpertEngagementConfig | null>(null);
  const [domains, setDomains] = useState<DataDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [configData, domainsData] = await Promise.all([
        apiFetch<ExpertEngagementConfig>('/api/expert-engagement/config'),
        apiFetch<{ domains: DataDomain[] }>('/api/expert-engagement/domains'),
      ]);
      setConfig(configData);
      setDomains(domainsData.domains);
    } catch {
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const saved = await apiFetch<ExpertEngagementConfig>('/api/expert-engagement/config', {
        method: 'POST',
        body: JSON.stringify(config),
      });
      setConfig(saved);
      toast.success('Configuration sauvegardée');
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleDomain = (domainId: string) => {
    if (!config) return;
    const enabled = config.enabledDomains.includes(domainId);
    setConfig({
      ...config,
      enabledDomains: enabled
        ? config.enabledDomains.filter((d) => d !== domainId)
        : [...config.enabledDomains, domainId],
    });
  };

  const addKeyword = () => {
    if (!config || !newKeyword.trim()) return;
    if (config.customKeywords.includes(newKeyword.trim())) {
      toast.error('Ce mot-clé existe déjà');
      return;
    }
    setConfig({
      ...config,
      customKeywords: [...config.customKeywords, newKeyword.trim()],
    });
    setNewKeyword('');
  };

  const removeKeyword = (keyword: string) => {
    if (!config) return;
    setConfig({
      ...config,
      customKeywords: config.customKeywords.filter((k) => k !== keyword),
    });
  };

  const toggleLanguage = (lang: 'fr' | 'en') => {
    if (!config) return;
    const hasLang = config.languages.includes(lang);
    setConfig({
      ...config,
      languages: hasLang
        ? config.languages.filter((l) => l !== lang)
        : [...config.languages, lang],
    });
  };

  if (loading || !config) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Domain Selection */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Domaines d&apos;expertise activés
          </CardTitle>
          <CardDescription className="text-xs">
            Sélectionnez les domaines sur lesquels vous souhaitez commenter automatiquement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {domains.map((domain) => {
              const isEnabled = config.enabledDomains.includes(domain.id);
              const IconComponent = DOMAIN_ICONS[domain.icon] || Database;
              return (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => toggleDomain(domain.id)}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-sm',
                    isEnabled
                      ? 'border-primary/50 bg-primary/5 shadow-sm'
                      : 'border-border/50 hover:border-border'
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    <Checkbox checked={isEnabled} />
                  </div>
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className={cn('p-1.5 rounded-md shrink-0', isEnabled ? domain.color : 'bg-muted')}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{domain.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{domain.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comment Style */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquareText className="w-4 h-4" />
            Style de commentaire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMMENT_STYLES.map((style) => {
              const isSelected = config.commentStyle === style.value;
              return (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => setConfig({ ...config, commentStyle: style.value as ExpertEngagementConfig['commentStyle'] })}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-sm',
                    isSelected
                      ? 'border-primary/50 bg-primary/5 shadow-sm'
                      : 'border-border/50 hover:border-border'
                  )}
                >
                  <div className={cn('p-1.5 rounded-md shrink-0', isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                    <style.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{style.label}</p>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{style.desc}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1.5 italic line-clamp-2">{style.preview}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tone */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Ton du commentaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OPTIONS.map((tone) => {
                const isSelected = config.tone === tone.value;
                return (
                  <button
                    key={tone.value}
                    type="button"
                    onClick={() => setConfig({ ...config, tone: tone.value as ExpertEngagementConfig['tone'] })}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-all text-xs',
                      isSelected
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/50 hover:border-border'
                    )}
                  >
                    <p className="font-medium">{tone.label}</p>
                    <p className="text-muted-foreground mt-0.5">{tone.desc}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Paramètres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Max comments per day */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Commentaires / jour</Label>
                <span className="text-sm font-bold text-primary">{config.maxCommentsPerDay}</span>
              </div>
              <Slider
                value={[config.maxCommentsPerDay]}
                onValueChange={([v]) => setConfig({ ...config, maxCommentsPerDay: v })}
                min={1}
                max={10}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1</span>
                <span>10</span>
              </div>
            </div>

            <Separator />

            {/* Auto-post */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium">Publication automatique</Label>
                <p className="text-[10px] text-muted-foreground">Publier sans approbation manuelle</p>
              </div>
              <Switch
                checked={config.autoPost}
                onCheckedChange={(checked) => setConfig({ ...config, autoPost: checked })}
              />
            </div>

            {config.autoPost && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Attention : la publication automatique peut rapidement consommer votre quota LinkedIn. Limitez à 2-3 commentaires par jour maximum.
                </p>
              </div>
            )}

            <Separator />

            {/* Languages */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Langues des commentaires</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleLanguage('fr')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all',
                    config.languages.includes('fr')
                      ? 'border-primary/50 bg-primary/5 text-primary font-medium'
                      : 'border-border/50 text-muted-foreground hover:border-border'
                  )}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Français
                  {config.languages.includes('fr') && <Check className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => toggleLanguage('en')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all',
                    config.languages.includes('en')
                      ? 'border-primary/50 bg-primary/5 text-primary font-medium'
                      : 'border-border/50 text-muted-foreground hover:border-border'
                  )}
                >
                  <Globe className="w-3.5 h-3.5" />
                  English
                  {config.languages.includes('en') && <Check className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Keywords */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Mots-clés personnalisés
          </CardTitle>
          <CardDescription className="text-xs">
            Ajoutez vos propres mots-clés pour enrichir la détection de domaines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Ajouter un mot-clé..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              className="h-9 text-sm flex-1"
            />
            <Button size="sm" className="gap-1.5 h-9" onClick={addKeyword} disabled={!newKeyword.trim()}>
              <Plus className="w-3.5 h-3.5" />
              Ajouter
            </Button>
          </div>
          {config.customKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {config.customKeywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="gap-1 pr-1 text-xs">
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeKeyword(keyword)}
                    className="p-0.5 rounded hover:bg-muted-foreground/20 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Sauvegarder la configuration
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Tab 2: Generate Comment
// ============================================================

function GenerateTab() {
  const [config, setConfig] = useState<ExpertEngagementConfig | null>(null);
  const [domains, setDomains] = useState<DataDomain[]>([]);
  const [postContent, setPostContent] = useState('');
  const [postAuthor, setPostAuthor] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [generatedComment, setGeneratedComment] = useState<GeneratedComment | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedHistory, setGeneratedHistory] = useState<GeneratedComment[]>([]);

  // Publish dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [postUrn, setPostUrn] = useState('');
  const [publishing, setPublishing] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const [configData, domainsData] = await Promise.all([
        apiFetch<ExpertEngagementConfig>('/api/expert-engagement/config'),
        apiFetch<{ domains: DataDomain[] }>('/api/expert-engagement/domains'),
      ]);
      setConfig(configData);
      setDomains(domainsData.domains);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Auto-detect domain from content
  useEffect(() => {
    if (!postContent || !domains.length) return;
    const contentLower = postContent.toLowerCase();
    let bestDomain = '';
    let bestScore = 0;

    const enabledDomains = config?.enabledDomains || [];
    const searchDomains = enabledDomains.length > 0
      ? domains.filter((d) => enabledDomains.includes(d.id))
      : domains;

    for (const domain of searchDomains) {
      let score = 0;
      for (const kw of domain.keywords) {
        if (contentLower.includes(kw.toLowerCase())) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestDomain = domain.id;
      }
    }

    if (bestDomain && bestScore > 0) {
      setSelectedDomain(bestDomain);
    }
  }, [postContent, domains, config]);

  const handleGenerate = async () => {
    if (!postContent.trim()) {
      toast.error('Collez le contenu d\'un post LinkedIn');
      return;
    }
    setGenerating(true);
    setGeneratedComment(null);
    try {
      const result = await apiFetch<GeneratedComment>('/api/expert-engagement/generate', {
        method: 'POST',
        body: JSON.stringify({
          postContent,
          postAuthor: postAuthor || undefined,
          domain: selectedDomain || undefined,
        }),
      });
      setGeneratedComment(result);
      setGeneratedHistory((prev) => [result, ...prev]);
      toast.success('Commentaire généré !');
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedComment) {
      navigator.clipboard.writeText(generatedComment.comment);
      toast.success('Commentaire copié dans le presse-papiers');
    }
  };

  const handlePublish = async () => {
    if (!generatedComment || !postUrn.trim()) {
      toast.error('L\'URN du post est requise');
      return;
    }
    setPublishing(true);
    try {
      const result = await apiFetch<{ success: boolean; postedToLinkedIn: boolean; error?: string }>(
        '/api/expert-engagement/post-comment',
        {
          method: 'POST',
          body: JSON.stringify({
            postUrn: postUrn.trim(),
            commentText: generatedComment.comment,
            domain: generatedComment.domain,
          }),
        }
      );
      if (result.success) {
        toast.success('Commentaire publié sur LinkedIn !');
        setPublishDialogOpen(false);
        setPostUrn('');
      } else {
        toast.error(result.error || 'Erreur lors de la publication');
      }
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const detectedDomain = domains.find((d) => d.id === selectedDomain);

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquareText className="w-4 h-4" />
            Contenu du post LinkedIn
          </CardTitle>
          <CardDescription className="text-xs">
            Collez le contenu du post sur lequel vous souhaitez commenter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Collez ici le contenu du post LinkedIn..."
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            className="min-h-[140px] text-sm"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Auteur du post (optionnel)</Label>
              <Input
                placeholder="Ex: Thomas Durand"
                value={postAuthor}
                onChange={(e) => setPostAuthor(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                Domaine détecté
                {detectedDomain && (
                  <Badge variant="secondary" className={cn('ml-2 text-[10px]', detectedDomain.color)}>
                    {detectedDomain.label}
                  </Badge>
                )}
              </Label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Sélectionner un domaine..." />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generating || !postContent.trim()} className="gap-1.5 w-full sm:w-auto">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Générer un commentaire expert
          </Button>
        </CardContent>
      </Card>

      {/* Generated Comment Preview */}
      {generatedComment && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Commentaire généré
                {generatedComment.domainLabel && (
                  <Badge variant="secondary" className="text-[10px]">
                    {generatedComment.domainLabel}
                  </Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={handleCopy}>
                <Copy className="w-3.5 h-3.5" />
                Copier
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-background border border-border/50 p-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{generatedComment.comment}</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
                <Copy className="w-3.5 h-3.5" />
                Copier
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setPublishDialogOpen(true)}>
                <Send className="w-3.5 h-3.5" />
                Publier sur LinkedIn
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Comments History */}
      {generatedHistory.length > 1 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4" />
              Commentaires générés cette session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {generatedHistory.slice(1).map((gc, i) => {
                  const domainData = domains.find((d) => d.id === gc.domain);
                  return (
                    <div key={i} className="rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge variant="secondary" className={cn('text-[10px]', domainData?.color)}>
                          {gc.domainLabel || gc.domain}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] gap-1"
                          onClick={() => {
                            navigator.clipboard.writeText(gc.comment);
                            toast.success('Copié');
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{gc.comment}</p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Publier sur LinkedIn
            </DialogTitle>
            <DialogDescription>
              Entrez l&apos;URN du post LinkedIn pour publier le commentaire généré.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">URN du post LinkedIn</Label>
              <Input
                placeholder="urn:li:activity:1234567890"
                value={postUrn}
                onChange={(e) => setPostUrn(e.target.value)}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                L&apos;URN se trouve dans l&apos;URL du post LinkedIn ou via l&apos;API.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Aperçu du commentaire</Label>
              <div className="rounded-lg bg-muted/50 p-3 max-h-32 overflow-y-auto">
                <p className="text-xs whitespace-pre-wrap">{generatedComment?.comment}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handlePublish} disabled={publishing || !postUrn.trim()} className="gap-1.5">
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Publier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Tab 3: History & Stats
// ============================================================

function HistoryTab() {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [domainStats, setDomainStats] = useState<DomainStat[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        activities: AgentActivity[];
        domainStats: DomainStat[];
        totalComments: number;
      }>('/api/expert-engagement/history?limit=50');
      setActivities(data.activities);
      setDomainStats(data.domainStats);
      setTotalComments(data.totalComments);
    } catch {
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const STATUS_META: Record<string, { label: string; color: string }> = {
    completed: { label: 'Publié', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
    pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
    failed: { label: 'Échoué', color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
  };

  const statusMeta = (status: string) => STATUS_META[status] || STATUS_META.pending;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
              <MessageSquareText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalComments}</p>
              <p className="text-xs text-muted-foreground">Commentaires publiés</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-950/40">
              <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{domainStats.length}</p>
              <p className="text-xs text-muted-foreground">Domaines actifs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/40">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activities.filter((a) => a.status === 'pending').length}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Domain Stats */}
      {domainStats.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistiques par domaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {domainStats.map((stat) => (
                <div key={stat.domain} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{stat.domainLabel}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {stat.totalComments} commentaire{stat.totalComments !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity List */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4" />
              Historique des activités
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={fetchHistory}>
              <RefreshCw className="w-3.5 h-3.5" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center">
              <History className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune activité</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Génèrez votre premier commentaire expert pour commencer
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {activities.map((activity) => {
                  const meta = safeJsonParse<Record<string, string>>(activity.metadata, {});
                  const st = statusMeta(activity.status);
                  return (
                    <div key={activity.id} className="rounded-lg border border-border/50 p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <Badge variant="secondary" className={cn('text-[10px]', st.color)}>
                              {st.label}
                            </Badge>
                            {meta.domainLabel && (
                              <Badge variant="secondary" className="text-[10px]">
                                {meta.domainLabel}
                              </Badge>
                            )}
                          </div>
                          {activity.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{activity.description}</p>
                          )}
                          {activity.result && (
                            <div className="mt-2 rounded-md bg-muted/50 p-2.5 max-h-20 overflow-y-auto">
                              <p className="text-xs line-clamp-3">{activity.result}</p>
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                            {formatRelativeTime(activity.createdAt)}
                          </p>
                        </div>
                        {activity.result && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] shrink-0 gap-1"
                            onClick={() => {
                              navigator.clipboard.writeText(activity.result || '');
                              toast.success('Copié');
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Tab 4: Trends
// ============================================================

function TrendsTab() {
  const [domains, setDomains] = useState<DataDomain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ domains: DataDomain[] }>('/api/expert-engagement/domains')
      .then((data) => setDomains(data.domains))
      .catch(() => toast.error('Erreur lors du chargement des domaines'))
      .finally(() => setLoading(false));
  }, []);

  const DOMAIN_TIPS: Record<string, string[]> = {
    data_engineering: [
      'Mentionnez des outils concrets (dbt, Airflow, Fivetran)',
      'Partagez des retours d\'expérience de production',
      'Positionnez-vous sur la modern data stack vs batch legacy',
    ],
    data_architecture: [
      'Abordez le data mesh et ses défis concrets',
      'Parlez gouvernance et qualité des données',
      'Le lakehouse vs data warehouse est un sujet chaud',
    ],
    data_science: [
      'Partagez des insights business, pas juste du code',
      'L\'importance de la data culture dans les entreprises',
      'De l\'analyse descriptive à l\'analytique prédictive',
    ],
    ai_ml: [
      'MLOps est le sujet clé du moment en IA production',
      'RAG et fine-tuning dominent les conversations LLM',
      'Partagez des cas d\'usage réels, pas du hype',
    ],
    ai_agents: [
      'Les agents autonomes changent la donne',
      'Multi-agent orchestration est le prochain frontier',
      'Partagez des workflows concrets avec LangChain/CrewAI',
    ],
    cloud: [
      'Kubernetes reste incontournable pour l\'orchestration',
      'Le multi-cloud et FinOps sont des sujets brûlants',
      'Serverless vs containers : le bon usage',
    ],
    devops: [
      'Platform Engineering est le DevOps 2.0',
      'L\'observabilité va au-delà du monitoring',
      'GitOps et DORA metrics pour mesurer la performance',
    ],
    cybersecurity: [
      'Zero Trust Architecture est le nouveau standard',
      'RGPD et conformité restent des sujets critiques',
      'L\'IA au service de la cybersécurité (AI-powered security)',
    ],
    saas: [
      'Product-Led Growth change le go-to-market',
      'Le pricing et l\'activation sont les leviers clés',
      'Customer success = rétention = croissance',
    ],
    software_arch: [
      'Event-driven architecture pour la scalabilité',
      'Clean architecture et hexagonal en production',
      'API-first est devenu le standard de facto',
    ],
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Expert Positioning Tips */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Conseils pour un positionnement expert
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { title: 'Authenticité d\'abord', desc: 'Partagez des retours d\'expérience réels. Les gens repèrent les commentaires génériques.' },
              { title: 'Soyez spécifique', desc: 'Mentionnez des outils, méthodologies et métriques concrètes plutôt que des généralités.' },
              { title: 'Posez des questions', desc: 'Les commentaires qui posent une question ouverte génèrent 3x plus d\'engagement.' },
              { title: 'Variez les domaines', desc: 'Commentez sur au moins 4-5 domaines différents pour renforcer votre profil multi-expert.' },
              { title: 'Réagissez vite', desc: 'Les 30 premières minutes après la publication d\'un post sont cruciales pour la visibilité.' },
              { title: 'Cohérence de ton', desc: 'Gardez un ton constant — vos followers doivent reconnaître votre style.' },
            ].map((tip) => (
              <div key={tip.title} className="flex items-start gap-2.5 rounded-lg border border-border/50 p-3">
                <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{tip.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Domain Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {domains.map((domain) => {
          const IconComponent = DOMAIN_ICONS[domain.icon] || Database;
          const tips = DOMAIN_TIPS[domain.id] || [];
          return (
            <Card key={domain.id} className="border-border/50 hover:shadow-sm transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn('p-2 rounded-lg', domain.color)}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{domain.label}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-xs mt-1">
                  {domain.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Keywords Preview */}
                <div className="flex flex-wrap gap-1">
                  {domain.keywords.slice(0, 5).map((kw) => (
                    <Badge key={kw} variant="secondary" className="text-[10px]">
                      {kw}
                    </Badge>
                  ))}
                  {domain.keywords.length > 5 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{domain.keywords.length - 5}
                    </Badge>
                  )}
                </div>

                {/* Tips */}
                {tips.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Conseils d&apos;engagement
                    </p>
                    {tips.map((tip, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-primary/60" />
                        {tip}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
