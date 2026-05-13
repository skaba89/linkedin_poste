'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Sparkles,
  Check,
  RotateCcw,
  Send,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Save,
  ChevronLeft,
  FileDown,
  ClipboardList,
  Hash,
  FileText,
  BarChart3,
  Plus,
  Gauge,
  Lightbulb,
  Users,
  ThumbsUp,
  RefreshCw,
  SmilePlus,
  Frown,
  Meh,
  HelpCircle,
  Linkedin,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import ImageUpload from './ImageUpload';
import ContentScoreBadge from './ContentScoreBadge';
import { toast } from 'sonner';
import type {
  Post,
  AIProvider,
  AIVariant,
  ValidationLog,
  ValidationAction,
  PublicationLog,
  PostMetric,
  AudienceComment,
} from '@/types';
import {
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
  AI_PROVIDER_LABELS,
  ROLE_LABELS,
} from '@/types';

/* ============================================================
   SUB-COMPONENT: Content Tab
   ============================================================ */
interface ContentTabProps {
  post: Post;
  onUpdate: () => void;
}

function ContentTab({ post, onUpdate }: ContentTabProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState(post.subject);
  const [angle, setAngle] = useState(post.angle || '');
  const [audience, setAudience] = useState(post.audience || '');
  const [cta, setCta] = useState(post.cta || '');
  const [imageUrl, setImageUrl] = useState(post.imageUrl || '');
  const [hashtags, setHashtags] = useState(post.hashtags || '');
  const [contentScore, setContentScore] = useState<number | null>(null);
  const [scoreDetails, setScoreDetails] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);

  useEffect(() => {
    setSubject(post.subject);
    setAngle(post.angle || '');
    setAudience(post.audience || '');
    setCta(post.cta || '');
    setImageUrl(post.imageUrl || '');
    setHashtags(post.hashtags || '');
    setEditing(false);
  }, [post]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/posts/${post.id}?postId=${post.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          postId: post.id,
          subject: subject.trim(),
          angle: angle.trim() || undefined,
          audience: audience.trim() || undefined,
          cta: cta.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          hashtags: hashtags.trim() || undefined,
        }),
      });
      toast.success('Post mis à jour');
      onUpdate();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Status & Meta */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge className={cn('text-xs', POST_STATUS_COLORS[post.status])}>
          {POST_STATUS_LABELS[post.status]}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {AI_PROVIDER_LABELS[post.aiProvider]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Par {post.author?.name || 'Inconnu'} · Créé le {formatDate(post.createdAt)}
        </span>
      </div>

      {/* Editable Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Sujet</Label>
          {editing ? (
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          ) : (
            <p className="text-base font-semibold">{post.subject}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Angle rédactionnel</Label>
            {editing ? (
              <Textarea value={angle} onChange={(e) => setAngle(e.target.value)} rows={3} />
            ) : (
              <p className="text-sm">{post.angle || <span className="italic text-muted-foreground">Non défini</span>}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Audience cible</Label>
            {editing ? (
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} />
            ) : (
              <p className="text-sm">{post.audience || <span className="italic text-muted-foreground">Non défini</span>}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Call to Action</Label>
          {editing ? (
            <Input value={cta} onChange={(e) => setCta(e.target.value)} />
          ) : (
            <p className="text-sm">{post.cta || <span className="italic text-muted-foreground">Non défini</span>}</p>
          )}
        </div>

        <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Image</Label>
            {editing ? (
              <>
                <ImageUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  onRemove={() => setImageUrl('')}
                />
              </>
            ) : (
              post.imageUrl ? (
                <div className="rounded-lg overflow-hidden border border-border/50 max-w-sm">
                  <img
                    src={post.imageUrl}
                    alt="Image du post"
                    className="w-full h-auto object-cover max-h-[200px]"
                  />
                </div>
              ) : (
                <span className="italic text-muted-foreground text-sm">Aucune image</span>
              )
            )}
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Hashtags</Label>
            {editing ? (
              <Input value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
            ) : (
              <p className="text-sm">{post.hashtags || <span className="italic text-muted-foreground">Aucun</span>}</p>
            )}
          </div>
        </div>

        {post.scheduledDate && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Date planifiée</Label>
            <p className="text-sm">{formatDate(post.scheduledDate)}</p>
          </div>
        )}
      </div>

      {/* Edit / Save actions */}
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Enregistrer
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              setEditing(false);
              setSubject(post.subject);
              setAngle(post.angle || '');
              setAudience(post.audience || '');
              setCta(post.cta || '');
              setImageUrl(post.imageUrl || '');
              setHashtags(post.hashtags || '');
            }}>
              Annuler
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Modifier les détails
          </Button>
        )}
      </div>

      {/* Final Content Preview */}
      {post.finalContent && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Contenu final</Label>
              {contentScore !== null && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs font-bold',
                    contentScore >= 70
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : contentScore >= 40
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                  )}
                >
                  Score : {contentScore}/100
                </Badge>
              )}
            </div>
            <Card className="bg-muted/30 border-border/50">
              <CardContent className="p-4">
                <pre className="text-sm whitespace-pre-wrap font-[inherit] leading-relaxed">
                  {post.finalContent}
                </pre>
              </CardContent>
            </Card>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  setScoring(true);
                  try {
                    const result = await apiFetch<{ score: number; details: string }>('/api/posts/score', {
                      method: 'POST',
                      body: JSON.stringify({ postId: post.id }),
                    });
                    setContentScore(result.score);
                    setScoreDetails(result.details);
                    onUpdate();
                  } catch (error) {
                    if (error instanceof ApiClientError) toast.error(error.message);
                  } finally {
                    setScoring(false);
                  }
                }}
                disabled={scoring}
              >
                {scoring ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                Score contenu
              </Button>
              {scoreDetails && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">Voir les détails</summary>
                  <pre className="mt-1 whitespace-pre-wrap bg-muted/50 p-2 rounded-md text-[11px]">{scoreDetails}</pre>
                </details>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   SUB-COMPONENT: AI Generation Tab
   ============================================================ */
interface AIGenerationTabProps {
  post: Post;
  onUpdate: () => void;
}

function AIGenerationTab({ post, onUpdate }: AIGenerationTabProps) {
  const [generating, setGenerating] = useState(false);
  const [provider, setProvider] = useState<AIProvider>(post.aiProvider);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    post.finalContent ? '__final__' : null
  );
  const [editingContent, setEditingContent] = useState(post.finalContent || '');
  const [savingContent, setSavingContent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [smartScoring, setSmartScoring] = useState(false);
  const [smartResult, setSmartResult] = useState<{
    rawScore: number;
    calibratedScore: number;
    confidence: number;
    factors: Array<{ name: string; score: number; weight: number; impact: string; tip: string }>;
    recommendations: string[];
  } | null>(null);
  const [variantSmartScores, setVariantSmartScores] = useState<Record<string, {
    rawScore: number;
    calibratedScore: number;
    confidence: number;
    recommendations: string[];
  }>>({});

  const variants = post.aiVariants || [];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await apiFetch<{ post: Post; variants: AIVariant[] }>('/api/posts/generate', {
        method: 'POST',
        body: JSON.stringify({ postId: post.id, provider }),
      });
      toast.success('3 variantes générées');
      setSelectedVariant(null);
      setEditingContent('');
      setVariantSmartScores({});
      setSmartResult(null);
      onUpdate();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectVariant = (variant: AIVariant) => {
    setSelectedVariant(variant.id);
    setEditingContent(variant.content);
    setSmartResult(null);
  };

  const handleSmartScore = async (content: string) => {
    setSmartScoring(true);
    try {
      const result = await apiFetch<{
        rawScore: number;
        calibratedScore: number;
        confidence: number;
        factors: Array<{ name: string; score: number; weight: number; impact: string; tip: string }>;
        recommendations: string[];
      }>('/api/posts/smart-score', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      setSmartResult(result);
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSmartScoring(false);
    }
  };

  const handleSmartScoreAllVariants = async () => {
    setSmartScoring(true);
    try {
      const scores: typeof variantSmartScores = {};
      for (const variant of variants) {
        try {
          const result = await apiFetch<{
            rawScore: number;
            calibratedScore: number;
            confidence: number;
            recommendations: string[];
          }>('/api/posts/smart-score', {
            method: 'POST',
            body: JSON.stringify({ content: variant.content }),
          });
          scores[variant.id] = result;
        } catch {
          // skip failed
        }
      }
      setVariantSmartScores(scores);
      toast.success('Smart Score calculé pour toutes les variantes');
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSmartScoring(false);
    }
  };

  const handleSaveFinalContent = async () => {
    if (!editingContent.trim()) {
      toast.error('Le contenu ne peut pas être vide');
      return;
    }
    setSavingContent(true);
    try {
      await apiFetch(`/api/posts/${post.id}?postId=${post.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          postId: post.id,
          finalContent: editingContent.trim(),
        }),
      });
      toast.success('Contenu final enregistré');
      onUpdate();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setSavingContent(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!post.finalContent && !editingContent.trim()) {
      toast.error('Enregistrez un contenu final d\'abord');
      return;
    }
    setSubmitting(true);
    try {
      // Save final content if not already saved
      const contentToSave = post.finalContent || editingContent.trim();
      if (!post.finalContent) {
        await apiFetch(`/api/posts/${post.id}?postId=${post.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            postId: post.id,
            finalContent: contentToSave,
          }),
        });
      }
      // Update status to pending_approval
      await apiFetch(`/api/posts/${post.id}?postId=${post.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          postId: post.id,
          status: 'pending_approval',
        }),
      });
      toast.success('Post soumis pour validation');
      onUpdate();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generate Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
        <div className="space-y-1.5 flex-1">
          <Label className="text-sm font-medium">Fournisseur IA</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
            <SelectTrigger className="w-full sm:w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(AI_PROVIDER_LABELS) as [AIProvider, string][]).map(
                ([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Générer 3 variantes
            </>
          )}
        </Button>
        {variants.length > 0 && (
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Régénérer
          </Button>
        )}
      </div>

      {/* Variants */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Variantes générées</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSmartScoreAllVariants}
              disabled={smartScoring || variants.length === 0}
              className="gap-1.5 text-xs h-7"
            >
              {smartScoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gauge className="w-3 h-3" />}
              Analyser avec Smart Score
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {variants.map((variant, index) => {
              const vs = variantSmartScores[variant.id];
              return (
                <Card
                  key={variant.id}
                  className={cn(
                    'cursor-pointer transition-all duration-300 border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
                    selectedVariant === variant.id
                      ? 'ring-2 ring-primary border-primary/50'
                      : ''
                  )}
                  onClick={() => handleSelectVariant(variant)}
                >
                  <CardHeader className="pb-2 pt-3 px-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-semibold text-muted-foreground">
                        Variante {index + 1}
                      </CardTitle>
                      <div className="flex items-center gap-1.5">
                        {variant.contentScore !== undefined && variant.contentScore !== null && (
                          <ContentScoreBadge score={variant.contentScore} size="sm" />
                        )}
                        {vs && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[9px] font-bold',
                              vs.calibratedScore >= 70
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : vs.calibratedScore >= 40
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                            )}
                          >
                            Smart: {vs.calibratedScore}
                          </Badge>
                        )}
                        {selectedVariant === variant.id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <p className="text-xs text-muted-foreground line-clamp-6 whitespace-pre-wrap leading-relaxed">
                      {variant.content}
                    </p>
                    {/* Show top recommendation for variant */}
                    {vs && vs.recommendations.length > 0 && (
                      <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-start gap-1">
                          <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{vs.recommendations[0]}</span>
                        </p>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 w-full h-7 text-xs gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectVariant(variant);
                      }}
                    >
                      {selectedVariant === variant.id ? (<span className="flex items-center gap-1"><Check className="w-3 h-3" /> Sélectionnée</span>) : 'Choisir cette variante'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Final Content Editor */}
      {(selectedVariant || post.finalContent) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Contenu final
              {post.finalContent && (
                <Badge variant="secondary" className="ml-2 text-[10px]">Enregistré</Badge>
              )}
            </Label>
          </div>
          <Textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            rows={12}
            className="resize-y font-[inherit] text-sm leading-relaxed"
            placeholder="Le contenu final apparaîtra ici..."
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSaveFinalContent}
              disabled={savingContent || !editingContent.trim()}
            >
              {savingContent ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Enregistrer
            </Button>
            <Button
              size="sm"
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSubmitForApproval}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1.5" />
              )}
              Soumettre pour validation
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => editingContent && handleSmartScore(editingContent)}
              disabled={smartScoring || !editingContent.trim()}
              className="gap-1.5 ml-auto"
            >
              {smartScoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gauge className="w-3.5 h-3.5" />}
              Analyser avec Smart Score
            </Button>
          </div>
          {/* Smart Score Result */}
          {smartResult && (
            <div className="space-y-3 p-4 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">Smart Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Brut: {smartResult.rawScore}
                  </Badge>
                  <Badge
                    className={cn(
                      'text-xs font-bold',
                      smartResult.calibratedScore >= 70
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : smartResult.calibratedScore >= 40
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                    )}
                  >
                    Calibré: {smartResult.calibratedScore}/100
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Confiance: {smartResult.confidence}%
                  </Badge>
                </div>
              </div>

              {/* Factors breakdown */}
              {smartResult.factors.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {smartResult.factors.map((f, i) => (
                    <div key={i} className="p-2 rounded bg-white/60 dark:bg-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-muted-foreground">{f.name}</span>
                        <span className={cn('text-[11px] font-bold', f.score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : f.score >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')}>
                          {f.score}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={cn(
                            'h-1.5 rounded-full transition-all',
                            f.score >= 70 ? 'bg-emerald-500' : f.score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${f.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {smartResult.recommendations.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">Conseils d&apos;amélioration :</p>
                  {smartResult.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-violet-800 dark:text-violet-300">
                      <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {variants.length === 0 && !generating && (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Cliquez sur &quot;Générer 3 variantes&quot; pour créer du contenu avec l&apos;IA</p>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SUB-COMPONENT: Validation Tab
   ============================================================ */
interface ValidationTabProps {
  post: Post;
  onUpdate: () => void;
}

function ValidationTab({ post, onUpdate }: ValidationTabProps) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const user = useAppStore((s) => s.user);
  const canValidate = (user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'validator';
  const isPending = post.status === 'pending_approval';
  const validations = post.validations || [];

  const handleValidate = async (action: ValidationAction) => {
    setSubmitting(true);
    try {
      await apiFetch('/api/posts/validate', {
        method: 'POST',
        body: JSON.stringify({
          postId: post.id,
          action,
          comment: comment.trim() || undefined,
        }),
      });
      const messages: Record<ValidationAction, string> = {
        approve: 'Post approuvé',
        reject: 'Post rejeté',
        request_changes: 'Modifications demandées',
      };
      toast.success(messages[action]);
      setComment('');
      onUpdate();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const actionLabels: Record<ValidationAction, string> = {
    approve: 'Approuvé',
    reject: 'Rejeté',
    request_changes: 'Modifications demandées',
  };

  const actionColors: Record<ValidationAction, string> = {
    approve: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50',
    reject: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/50',
    request_changes: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/50',
  };

  return (
    <div className="space-y-6">
      {/* Validation Actions */}
      {isPending && canValidate && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Ce post attend votre validation</h3>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Commentaire (optionnel)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ajoutez un commentaire pour l'auteur..."
                rows={2}
                className="resize-none text-sm"
                disabled={submitting}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                onClick={() => handleValidate('approve')}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approuver
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                onClick={() => handleValidate('reject')}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Rejeter
              </Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                onClick={() => handleValidate('request_changes')}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}
                Demander des modifications
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isPending && canValidate && (
        <div className="text-sm text-muted-foreground text-center py-4">
          Ce post n&apos;est pas en attente de validation (statut : {POST_STATUS_LABELS[post.status]})
        </div>
      )}

      {!canValidate && (
        <div className="text-sm text-muted-foreground text-center py-4">
          Seuls les validateurs et administrateurs peuvent valider les posts
        </div>
      )}

      {/* Validation History */}
      {validations.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Historique des validations ({validations.length})
          </Label>
          <div className="space-y-2">
            {validations.map((validation) => (
              <Card key={validation.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px] font-medium', actionColors[validation.action])}
                        >
                          {actionLabels[validation.action]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {validation.user?.name || 'Inconnu'}
                          {validation.user?.role && (
                            <span className="ml-1">
                              ({ROLE_LABELS[validation.user.role]})
                            </span>
                          )}
                        </span>
                      </div>
                      {validation.comment && (
                        <p className="text-sm text-muted-foreground italic">
                          &quot;{validation.comment}&quot;
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/60">
                        {formatDate(validation.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {validations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune validation enregistrée</p>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SUB-COMPONENT: History Tab
   ============================================================ */
interface HistoryTabProps {
  post: Post;
  onUpdate: () => void;
}

function HistoryTab({ post, onUpdate }: HistoryTabProps) {
  const [publishing, setPublishing] = useState(false);
  const pubLogs = post.publicationLogs || [];

  // LinkedIn reconnect state
  const [reconnectDialogOpen, setReconnectDialogOpen] = useState(false);
  const [newAccessToken, setNewAccessToken] = useState('');
  const [newOrgId, setNewOrgId] = useState('');
  const [reconnecting, setReconnecting] = useState(false);
  const [linkedinStatus, setLinkedinStatus] = useState<{
    connected: boolean;
    error?: string;
    expired?: boolean;
    organizationName?: string;
  } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Check LinkedIn connection status when component mounts
  useEffect(() => {
    const checkLinkedIn = async () => {
      if (!post.errorMessage) return;
      setCheckingStatus(true);
      try {
        const data = await apiFetch<{
          connected: boolean;
          error?: string;
          expired?: boolean;
          organizationName?: string;
        }>('/api/linkedin/check');
        setLinkedinStatus(data);
      } catch {
        // silent
      } finally {
        setCheckingStatus(false);
      }
    };
    checkLinkedIn();
  }, [post.errorMessage]);

  const isTokenError = post.errorMessage && (
    post.errorMessage.toLowerCase().includes('token') ||
    post.errorMessage.toLowerCase().includes('invalid') ||
    post.errorMessage.toLowerCase().includes('expired') ||
    linkedinStatus?.expired
  );

  const handlePublish = async () => {
    if (post.status !== 'approved') {
      toast.error('Le post doit être approuvé avant publication');
      return;
    }
    if (!post.finalContent) {
      toast.error('Le contenu final est requis pour la publication');
      return;
    }
    setPublishing(true);
    try {
      const data = await apiFetch<{
        success: boolean;
        error?: string;
        post: Post;
      }>('/api/posts/publish', {
        method: 'POST',
        body: JSON.stringify({ postId: post.id }),
      });
      if (data.success) {
        toast.success('Post publié sur LinkedIn !');
        setLinkedinStatus({ connected: true });
      } else {
        toast.error(data.error || 'Échec de la publication');
        // Refresh LinkedIn status after failed publish
        try {
          const status = await apiFetch<{
            connected: boolean;
            error?: string;
            expired?: boolean;
          }>('/api/linkedin/check');
          setLinkedinStatus(status);
        } catch {}
      }
      onUpdate();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleReconnect = async () => {
    if (!newAccessToken.trim()) {
      toast.error('Le nouveau token d\'accès est requis');
      return;
    }
    setReconnecting(true);
    try {
      await apiFetch('/api/linkedin/reconnect', {
        method: 'POST',
        body: JSON.stringify({
          accessToken: newAccessToken.trim(),
          organizationId: newOrgId.trim() || undefined,
        }),
      });
      toast.success('Compte LinkedIn reconnecté avec succès !');
      setReconnectDialogOpen(false);
      setNewAccessToken('');
      setNewOrgId('');
      setLinkedinStatus({ connected: true });
      onUpdate();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setReconnecting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canPublish = post.status === 'approved' && post.finalContent;

  return (
    <div className="space-y-6">
      {/* Publish Button */}
      <Card className={cn(
        'border-border/50',
        canPublish ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/50' : ''
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Publication LinkedIn</h3>
              {!canPublish && (
                <p className="text-xs text-muted-foreground mt-1">
                  {post.status !== 'approved'
                    ? 'Le post doit être approuvé avant de pouvoir être publié'
                    : 'Un contenu final doit être enregistré'}
                </p>
              )}
              {canPublish && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Le post est prêt à être publié sur LinkedIn
                </p>
              )}
            </div>
            <Button
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publication...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publier
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {post.errorMessage && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Erreur de publication
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                  {post.errorMessage}
                </p>
                {isTokenError && (
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
                      onClick={() => setReconnectDialogOpen(true)}
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      Reconnecter LinkedIn
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        setCheckingStatus(true);
                        apiFetch<{ connected: boolean; error?: string; expired?: boolean; organizationName?: string }>('/api/linkedin/check')
                          .then(data => setLinkedinStatus(data))
                          .catch(() => {})
                          .finally(() => setCheckingStatus(false));
                      }}
                      disabled={checkingStatus}
                    >
                      <RefreshCw className={cn('w-3.5 h-3.5', checkingStatus && 'animate-spin')} />
                      {checkingStatus ? 'Vérification...' : 'Vérifier le statut'}
                    </Button>
                  </div>
                )}
                {linkedinStatus && !linkedinStatus.connected && !isTokenError && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    {linkedinStatus.error}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LinkedIn Reconnect Dialog */}
      <Dialog open={reconnectDialogOpen} onOpenChange={setReconnectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Linkedin className="w-5 h-5 text-[#0A66C2]" />
              Reconnecter LinkedIn
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Votre token LinkedIn a expiré. Pour publier de nouveau, vous devez générer un nouveau token d&apos;accès depuis le
                {' '}<a href="https://www.linkedin.com/developers/tools/oauth" target="_blank" rel="noopener noreferrer" className="underline font-medium">LinkedIn Developer Portal</a>.
              </p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Nouveau Access Token <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  placeholder="AQV..."
                  value={newAccessToken}
                  onChange={(e) => setNewAccessToken(e.target.value)}
                  disabled={reconnecting}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  ID Organisation (laisser vide pour garder l&apos;actuel)
                </Label>
                <Input
                  placeholder={linkedinStatus?.organizationName || '12345678'}
                  value={newOrgId}
                  onChange={(e) => setNewOrgId(e.target.value)}
                  disabled={reconnecting}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setReconnectDialogOpen(false)}
                disabled={reconnecting}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleReconnect}
                disabled={reconnecting || !newAccessToken.trim()}
                className="flex-1 gap-1.5 bg-[#0A66C2] hover:bg-[#004182]"
              >
                {reconnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <Linkedin className="w-3.5 h-3.5" />
                    Reconnecter
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Publication History */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Journal de publication ({pubLogs.length})
        </Label>
        {pubLogs.length > 0 ? (
          <div className="space-y-2">
            {pubLogs.map((log: PublicationLog) => (
              <Card key={log.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                        )}
                        <span className="text-sm font-medium">
                          {log.status === 'success' ? 'Publication réussie' : 'Publication échouée'}
                        </span>
                      </div>
                      {log.errorMessage && (
                        <p className="text-xs text-red-500 dark:text-red-400 ml-6">{log.errorMessage}</p>
                      )}
                      {log.linkedinPostId && (
                        <p className="text-xs text-muted-foreground ml-6">
                          LinkedIn Post ID : {log.linkedinPostId}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/60 ml-6">
                        {log.publishedAt ? formatDate(log.publishedAt) : formatDate(log.createdAt)}
                      </p>
                    </div>
                    {log.status === 'failed' && canPublish && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePublish}
                        disabled={publishing}
                        className="text-xs h-7 gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Réessayer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-6 h-6 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune tentative de publication</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SUB-COMPONENT: Audience Tab
   ============================================================ */
interface AudienceTabProps {
  post: Post;
  onUpdate: () => void;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  negative: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  question: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
};

const SENTIMENT_ICONS: Record<string, React.ReactNode> = {
  positive: <SmilePlus className="w-3 h-3" />,
  negative: <Frown className="w-3 h-3" />,
  neutral: <Meh className="w-3 h-3" />,
  question: <HelpCircle className="w-3 h-3" />,
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positif',
  negative: 'Négatif',
  neutral: 'Neutre',
  question: 'Question',
};

function AudienceTab({ post, onUpdate }: AudienceTabProps) {
  const [comments, setComments] = useState<AudienceComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ comments: AudienceComment[] }>(`/api/audience?postId=${post.id}`);
      setComments(data.comments);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [post.id]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleAddComments = async () => {
    const lines = commentText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) { toast.error('Ajoutez au moins un commentaire'); return; }
    setAdding(true);
    try {
      const commentsData = lines.map(content => ({
        content,
        authorName: authorName.trim() || undefined,
        likes: 0,
      }));
      await apiFetch('/api/audience', {
        method: 'POST',
        body: JSON.stringify({ postId: post.id, comments: commentsData }),
      });
      toast.success(`${lines.length} commentaire(s) ajouté(s)`);
      setDialogOpen(false);
      setCommentText('');
      setAuthorName('');
      fetchComments();
      onUpdate();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setAdding(false);
    }
  };

  // Summary stats
  const sentimentCounts = { positive: 0, negative: 0, neutral: 0, question: 0 };
  for (const c of comments) {
    const s = c.sentiment || 'neutral';
    if (s in sentimentCounts) sentimentCounts[s]++;
  }
  const total = comments.length || 1;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Ajouter des commentaires
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter des commentaires</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nom de l&apos;auteur (optionnel)</Label>
                <Input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Ex: Sophie M." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Commentaires (un par ligne)</Label>
                <Textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  rows={6}
                  placeholder={"Super article !&#10;Comment appliquer cette stratégie ?&#10;On a des difficultés avec ce sujet"}
                  disabled={adding}
                />
              </div>
              <Button onClick={handleAddComments} disabled={adding || !commentText.trim()} className="w-full">
                {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button size="sm" variant="ghost" onClick={fetchComments} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Rafraîchir
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-[200px]" />
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun commentaire collecté</p>
          <p className="text-xs mt-1">Ajoutez des commentaires pour analyser votre audience</p>
        </div>
      ) : (
        <>
          {/* Sentiment summary */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Distribution des sentiments</p>
                <Badge variant="secondary" className="text-xs">{comments.length} commentaires</Badge>
              </div>
              <div className="flex gap-2 h-4 rounded-full overflow-hidden">
                {sentimentCounts.positive > 0 && (
                  <div className="bg-emerald-500 rounded-l-full" style={{ width: `${(sentimentCounts.positive / total) * 100}%` }} />
                )}
                {sentimentCounts.neutral > 0 && (
                  <div className="bg-slate-400" style={{ width: `${(sentimentCounts.neutral / total) * 100}%` }} />
                )}
                {sentimentCounts.question > 0 && (
                  <div className="bg-amber-500" style={{ width: `${(sentimentCounts.question / total) * 100}%` }} />
                )}
                {sentimentCounts.negative > 0 && (
                  <div className="bg-red-500 rounded-r-full" style={{ width: `${(sentimentCounts.negative / total) * 100}%` }} />
                )}
              </div>
              <div className="flex gap-4 mt-2">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><SmilePlus className="w-3 h-3" /> {sentimentCounts.positive} ({Math.round((sentimentCounts.positive / total) * 100)}%)</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-0.5"><Meh className="w-3 h-3" /> {sentimentCounts.neutral} ({Math.round((sentimentCounts.neutral / total) * 100)}%)</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5"><HelpCircle className="w-3 h-3" /> {sentimentCounts.question} ({Math.round((sentimentCounts.question / total) * 100)}%)</span>
                <span className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-0.5"><Frown className="w-3 h-3" /> {sentimentCounts.negative} ({Math.round((sentimentCounts.negative / total) * 100)}%)</span>
              </div>
            </CardContent>
          </Card>

          {/* Comments list */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {comments.map((c) => (
              <Card key={c.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">{c.authorName || 'Anonyme'}</span>
                        <Badge variant="secondary" className={cn('text-[10px] flex items-center gap-1', SENTIMENT_COLORS[c.sentiment || 'neutral'])}>
                          {SENTIMENT_ICONS[c.sentiment || 'neutral']}
                          {SENTIMENT_LABELS[c.sentiment || 'neutral']}
                        </Badge>
                      </div>
                      <p className="text-sm">{c.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {c.likes > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <ThumbsUp className="w-2.5 h-2.5" /> {c.likes}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">
                          {new Date(c.collectedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   SUB-COMPONENT: Metrics Tab
   ============================================================ */
interface MetricsTabProps {
  post: Post;
  onUpdate: () => void;
}

function MetricsTab({ post, onUpdate }: MetricsTabProps) {
  const [metrics, setMetrics] = useState<PostMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ impressions: '', reach: '', likes: '', comments: '', reposts: '', clicks: '' });

  useEffect(() => {
    setLoading(true);
    apiFetch<{ metrics: PostMetric[] }>(`/api/posts/metrics/${post.id}?postId=${post.id}`)
      .then(data => setMetrics(data.metrics))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [post.id, post.updatedAt]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/posts/metrics', {
        method: 'POST',
        body: JSON.stringify({
          postId: post.id,
          impressions: Number(form.impressions) || 0,
          reach: Number(form.reach) || 0,
          likes: Number(form.likes) || 0,
          comments: Number(form.comments) || 0,
          reposts: Number(form.reposts) || 0,
          clicks: Number(form.clicks) || 0,
        }),
      });
      toast.success('Métriques enregistrées');
      setDialogOpen(false);
      setForm({ impressions: '', reach: '', likes: '', comments: '', reposts: '', clicks: '' });
      onUpdate();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const latest = metrics[0];
  const engRate = form.impressions && Number(form.impressions) > 0
    ? (((Number(form.likes) || 0) + (Number(form.comments) || 0) + (Number(form.reposts) || 0) + (Number(form.clicks) || 0)) / Number(form.impressions) * 100).toFixed(2)
    : '0';

  const metricItems = [
    { label: 'Impressions', value: latest?.impressions },
    { label: 'Portée', value: latest?.reach },
    { label: 'Likes', value: latest?.likes },
    { label: 'Commentaires', value: latest?.comments },
    { label: 'Reposts', value: latest?.reposts },
    { label: 'Clics', value: latest?.clicks },
  ];

  const trendData = [...metrics].reverse().map(m => ({
    date: new Date(m.collectedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    engagement: m.engagementRate,
    impressions: m.impressions,
  }));

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Saisir des métriques
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle saisie de métriques</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-[200px]" />
        </div>
      ) : metrics.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune métrique enregistrée pour ce post</p>
          <p className="text-xs mt-1">Cliquez sur &quot;Saisir des métriques&quot; pour commencer</p>
        </div>
      ) : (
        <>
          {/* Score vs Actual Performance */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Score IA vs Performance réelle</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Score IA</p>
                  <p className="text-2xl font-bold">{post.contentScore ?? '-'}</p>
                  <p className="text-[10px] text-muted-foreground">/ 100</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Engagement réel</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    (latest?.engagementRate ?? 0) >= 3 ? 'text-emerald-600 dark:text-emerald-400' : (latest?.engagementRate ?? 0) >= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {latest?.engagementRate ?? '-'}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">dernière mesure</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            {metricItems.map(item => (
              <Card key={item.label} className="border-border/50">
                <CardContent className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                  <p className="text-lg font-bold mt-1">{(item.value ?? 0).toLocaleString('fr-FR')}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Time series chart */}
          {metrics.length > 1 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Évolution des métriques</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="%" />
                      <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="engagement" stroke="#10b981" fill="#10b98133" strokeWidth={2} name="Engagement %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT: PostDetail
   ============================================================ */

export default function PostDetail() {
  const selectedPostId = useAppStore((s) => s.selectedPostId);
  const setView = useAppStore((s) => s.setView);
  const selectPost = useAppStore((s) => s.selectPost);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPost = useCallback(async () => {
    if (!selectedPostId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ post: Post }>(
        `/api/posts/${selectedPostId}?postId=${selectedPostId}`
      );
      setPost(data.post);
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [selectedPostId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleBack = () => {
    selectPost(null);
    setView('posts');
  };

  if (!selectedPostId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">Aucun post sélectionné</p>
        <Button variant="outline" className="mt-3" onClick={() => setView('posts')}>
          Voir les posts
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <AlertCircle className="w-8 h-8 mb-3 opacity-40" />
        <p className="text-sm">Post introuvable</p>
        <Button variant="outline" className="mt-3" onClick={handleBack}>
          Retour aux posts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour aux posts
        </button>
        {/* Export Actions */}
        {post.finalContent && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <FileDown className="w-3.5 h-3.5" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(post.finalContent || '');
                    toast.success('Contenu copié dans le presse-papiers');
                  } catch {
                    toast.error('Impossible de copier');
                  }
                }}
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Copier le contenu
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    const content = (post.finalContent || '') + (post.hashtags ? '\n\n' + post.hashtags : '');
                    await navigator.clipboard.writeText(content);
                    toast.success('Contenu + hashtags copié');
                  } catch {
                    toast.error('Impossible de copier');
                  }
                }}
              >
                <Hash className="w-4 h-4 mr-2" />
                Copier avec hashtags
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  // Generate PDF using browser print
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    const hashtagsHtml = post.hashtags ? `<p style="color:#666;margin-top:16px;">${post.hashtags}</p>` : '';
                    printWindow.document.write(`
                      <!DOCTYPE html><html><head><title>${post.subject}</title>
                      <style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.6;}
                      h1{font-size:20px;margin-bottom:4px;} .meta{color:#666;font-size:13px;margin-bottom:24px;}</style>
                      </head><body>
                      <h1>${post.subject}</h1>
                      <div class="meta">Par ${post.author?.name || 'Inconnu'} · ${POST_STATUS_LABELS[post.status]} · ${new Date(post.updatedAt).toLocaleDateString('fr-FR')}</div>
                      <pre style="white-space:pre-wrap;font-family:inherit;font-size:15px;">${post.finalContent}</pre>
                      ${hashtagsHtml}
                      </body></html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Télécharger PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Post Title */}
      <div>
        <h2 className="text-xl font-bold">{post.subject}</h2>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 h-10 p-0.5">
          <TabsTrigger value="content" className="text-xs gap-1.5 h-9">
            Contenu
          </TabsTrigger>
          <TabsTrigger value="generation" className="text-xs gap-1.5 h-9">
            <Sparkles className="w-3.5 h-3.5" />
            Génération IA
          </TabsTrigger>
          <TabsTrigger value="validation" className="text-xs gap-1.5 h-9">
            <MessageSquare className="w-3.5 h-3.5" />
            Validation
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5 h-9">
            <Clock className="w-3.5 h-3.5" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs gap-1.5 h-9">
            <BarChart3 className="w-3.5 h-3.5" />
            Métriques
          </TabsTrigger>
          <TabsTrigger value="audience" className="text-xs gap-1.5 h-9">
            <Users className="w-3.5 h-3.5" />
            Audience
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4 md:p-6">
              <ContentTab post={post} onUpdate={fetchPost} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generation" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4 md:p-6">
              <AIGenerationTab post={post} onUpdate={fetchPost} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4 md:p-6">
              <ValidationTab post={post} onUpdate={fetchPost} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4 md:p-6">
              <HistoryTab post={post} onUpdate={fetchPost} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4 md:p-6">
              <MetricsTab post={post} onUpdate={fetchPost} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4 md:p-6">
              <AudienceTab post={post} onUpdate={fetchPost} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
