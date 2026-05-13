'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch, ApiClientError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Newspaper,
  Plus,
  ArrowLeft,
  PenSquare,
  Eye,
  Save,
  Send,
  Sparkles,
  Users,
  Calendar,
  Clock,
  MoreVertical,
  Trash2,
  Pause,
  Play,
  Archive,
  Loader2,
  AlertTriangle,
  Hash,
  FileText,
  ChevronRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================
// Types
// ============================================================

interface NewsletterData {
  id: string;
  name: string;
  description?: string;
  frequency: string;
  subscribersCount: number;
  lastPublishedAt?: string;
  nextScheduledAt?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { newsletterPosts: number };
  newsletterPosts?: NewsletterPostData[];
}

interface NewsletterPostData {
  id: string;
  newsletterId: string;
  postId?: string;
  title: string;
  content: string;
  excerpt?: string;
  status: string;
  publishedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Constants
// ============================================================

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Hebdomadaire',
  biweekly: 'Bimensuelle',
  monthly: 'Mensuelle',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  active: 'Active',
  paused: 'En pause',
  archived: 'Archivée',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  archived: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const POST_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  scheduled: 'Planifié',
  published: 'Publié',
  failed: 'Échoué',
};

const POST_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  scheduled: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================
// Newsletter List View
// ============================================================

function NewsletterListView({
  onSelect,
  onCreateNew,
}: {
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}) {
  const [newsletters, setNewsletters] = useState<NewsletterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchNewsletters = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const data = await apiFetch<{ newsletters: NewsletterData[] }>(
        `/api/newsletter${params}`
      );
      setNewsletters(data.newsletters);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNewsletters();
  }, [fetchNewsletters]);

  const totalPosts = newsletters.reduce(
    (acc, n) => acc + (n._count?.newsletterPosts || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            Newsletters LinkedIn
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos newsletters et publiez des articles pour vos abonnés.
          </p>
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Créer une newsletter
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Newsletters', value: newsletters.length },
          { label: 'Articles totaux', value: totalPosts },
          {
            label: 'Actives',
            value: newsletters.filter((n) => n.status === 'active').length,
          },
          {
            label: 'Abonnés total',
            value: newsletters.reduce((a, n) => a + n.subscribersCount, 0),
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {['all', 'draft', 'active', 'paused', 'archived'].map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
            className="text-xs"
          >
            {s === 'all' ? 'Toutes' : STATUS_LABELS[s]}
          </Button>
        ))}
      </div>

      {/* Newsletter Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-5 w-3/4 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      ) : newsletters.length === 0 ? (
        <Card className="p-12 text-center">
          <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {filter === 'all'
              ? 'Aucune newsletter'
              : `Aucune newsletter ${STATUS_LABELS[filter]?.toLowerCase()}`}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {filter === 'all'
              ? 'Créez votre première newsletter pour commencer à publier des articles.'
              : `Aucune newsletter avec le statut "${STATUS_LABELS[filter]}" trouvée.`}
          </p>
          {filter === 'all' && (
            <Button onClick={onCreateNew} className="gap-2">
              <Plus className="w-4 h-4" />
              Créer une newsletter
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {newsletters.map((newsletter) => (
            <Card
              key={newsletter.id}
              className="cursor-pointer hover:shadow-md transition-all group"
              onClick={() => onSelect(newsletter.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold truncate group-hover:text-primary transition-colors">
                      {newsletter.name}
                    </CardTitle>
                    {newsletter.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {newsletter.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'shrink-0 text-[10px]',
                      STATUS_COLORS[newsletter.status]
                    )}
                  >
                    {STATUS_LABELS[newsletter.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Fréquence</p>
                    <p className="text-sm font-medium mt-0.5">
                      {FREQUENCY_LABELS[newsletter.frequency]}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Abonnés</p>
                    <p className="text-sm font-medium mt-0.5">
                      {newsletter.subscribersCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Articles</p>
                    <p className="text-sm font-medium mt-0.5">
                      {newsletter._count?.newsletterPosts || 0}
                    </p>
                  </div>
                </div>
                {newsletter.lastPublishedAt && (
                  <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Dernière publication : {formatDate(newsletter.lastPublishedAt)}
                  </p>
                )}
                <div className="flex items-center justify-end mt-3 text-xs text-muted-foreground group-hover:text-primary">
                  Voir les articles
                  <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Create/Edit Newsletter Dialog
// ============================================================

function NewsletterFormDialog({
  open,
  onOpenChange,
  newsletter,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newsletter?: NewsletterData | null;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (newsletter) {
      setName(newsletter.name);
      setDescription(newsletter.description || '');
      setFrequency(newsletter.frequency);
    } else {
      setName('');
      setDescription('');
      setFrequency('monthly');
    }
  }, [newsletter, open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (newsletter) {
        await apiFetch(`/api/newsletter/${newsletter.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            frequency,
          }),
        });
      } else {
        await apiFetch('/api/newsletter', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            frequency,
          }),
        });
      }
      onOpenChange(false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {newsletter ? 'Modifier la newsletter' : 'Créer une newsletter'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nl-name">Nom de la newsletter</Label>
            <Input
              id="nl-name"
              placeholder="Ex: Veille IA Hebdo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nl-desc">Description</Label>
            <Textarea
              id="nl-desc"
              placeholder="Décrivez le contenu et l'objectif de votre newsletter..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Fréquence de publication</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="biweekly">Bimensuelle</SelectItem>
                <SelectItem value="monthly">Mensuelle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {newsletter ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Article Editor with AI Generation
// ============================================================

function ArticleEditor({
  newsletterId,
  post,
  onClose,
  onSaved,
}: {
  newsletterId: string;
  post?: NewsletterPostData | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [aiTone, setAiTone] = useState('professionnel');
  const [aiLength, setAiLength] = useState('moyen');
  const [activeTab, setActiveTab] = useState('edit');

  const isEditing = !!post;

  const handleSaveDraft = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      if (isEditing && post) {
        await apiFetch(`/api/newsletter/${newsletterId}/posts`, {
          method: 'POST',
          body: JSON.stringify({
            postId: post.id,
            title: title.trim(),
            content: content.trim(),
            excerpt: excerpt.trim() || null,
          }),
        });
      } else {
        await apiFetch(`/api/newsletter/${newsletterId}/posts`, {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            excerpt: excerpt.trim() || null,
          }),
        });
      }
      onSaved();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) return;
    setPublishing(true);
    try {
      // Save first if new
      let postIdToPublish = post?.id;
      if (!isEditing) {
        const data = await apiFetch<{ post: NewsletterPostData }>(
          `/api/newsletter/${newsletterId}/posts`,
          {
            method: 'POST',
            body: JSON.stringify({
              title: title.trim(),
              content: content.trim(),
              excerpt: excerpt.trim() || null,
            }),
          }
        );
        postIdToPublish = data.post.id;
      }
      // Publish
      if (postIdToPublish) {
        const result = await apiFetch<{
          post: NewsletterPostData;
          warning?: string;
        }>(`/api/newsletter/${newsletterId}/publish`, {
          method: 'POST',
          body: JSON.stringify({ postId: postIdToPublish }),
        });
        if (result.warning) {
          alert(result.warning);
        }
        onSaved();
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(err.message);
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const data = await apiFetch<{
        title: string;
        content: string;
        excerpt?: string;
        suggestedHashtags?: string[];
      }>('/api/newsletter/ai-generate', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim(),
          newsletterId,
          tone: aiTone,
          length: aiLength,
        }),
      });
      setTitle(data.title);
      setContent(data.content);
      setExcerpt(data.excerpt || '');
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(err.message);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {isEditing ? 'Modifier l\'article' : 'Rédiger un article'}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour
        </Button>
      </div>

      {/* AI Generation Panel */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h4 className="text-sm font-semibold">Générer avec l'IA</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <Input
              placeholder="Sujet de l'article (ex: Les tendances IA en 2025)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Ton</Label>
            <Select value={aiTone} onValueChange={setAiTone}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professionnel">Professionnel</SelectItem>
                <SelectItem value="inspirant">Inspirant</SelectItem>
                <SelectItem value="educatif">Éducatif</SelectItem>
                <SelectItem value="conversational">Conversationnel</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Longueur</Label>
            <Select value={aiLength} onValueChange={setAiLength}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="court">Court</SelectItem>
                <SelectItem value="moyen">Moyen</SelectItem>
                <SelectItem value="long">Long</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleAIGenerate}
              disabled={!topic.trim() || generating}
              className="w-full gap-2"
              variant="outline"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generating ? 'Génération...' : 'Générer'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edit" className="gap-1.5">
            <PenSquare className="w-3.5 h-3.5" />
            Rédiger
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            Aperçu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="art-title">Titre de l'article</Label>
            <Input
              id="art-title"
              placeholder="Titre accrocheur de votre article"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="art-excerpt">Résumé (aperçu)</Label>
            <Textarea
              id="art-excerpt"
              placeholder="Un court résumé qui apparaîtra dans la prévisualisation..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="art-content">Contenu (Markdown)</Label>
            <Textarea
              id="art-content"
              placeholder="Rédigez votre article ici en Markdown..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              className="font-mono text-sm"
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <Card className="p-6 max-w-3xl">
            {title ? (
              <h2 className="text-2xl font-bold mb-4">{title}</h2>
            ) : (
              <Skeleton className="h-8 w-3/4 mb-4" />
            )}
            {excerpt && (
              <p className="text-muted-foreground mb-6 italic border-l-2 border-primary/30 pl-4">
                {excerpt}
              </p>
            )}
            <Separator className="mb-6" />
            {content ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {content.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <br key={i} />;
                  if (trimmed.startsWith('### '))
                    return (
                      <h3 key={i} className="text-lg font-semibold mt-5 mb-2">
                        {trimmed.slice(4)}
                      </h3>
                    );
                  if (trimmed.startsWith('## '))
                    return (
                      <h2 key={i} className="text-xl font-semibold mt-6 mb-3">
                        {trimmed.slice(3)}
                      </h2>
                    );
                  if (trimmed.startsWith('# '))
                    return (
                      <h1 key={i} className="text-2xl font-bold mt-6 mb-3">
                        {trimmed.slice(2)}
                      </h1>
                    );
                  if (trimmed.startsWith('- '))
                    return (
                      <li key={i} className="ml-4">
                        {trimmed.slice(2)}
                      </li>
                    );
                  if (trimmed.startsWith('> '))
                    return (
                      <blockquote
                        key={i}
                        className="border-l-2 border-muted-foreground/30 pl-4 italic text-muted-foreground"
                      >
                        {trimmed.slice(2)}
                      </blockquote>
                    );
                  if (/^\*\*(.+)\*\*$/.test(trimmed))
                    return (
                      <p key={i} className="font-bold">
                        {trimmed.replace(/\*\*/g, '')}
                      </p>
                    );
                  return <p key={i}>{trimmed}</p>;
                })}
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-8">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Le contenu de l'article apparaîtra ici
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={!title.trim() || !content.trim() || saving}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Sauvegarder le brouillon
        </Button>
        <Button
          onClick={handlePublish}
          disabled={!title.trim() || !content.trim() || publishing}
          className="gap-2"
        >
          {publishing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Publier
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Newsletter Detail View
// ============================================================

function NewsletterDetailView({
  newsletterId,
  onBack,
}: {
  newsletterId: string;
  onBack: () => void;
}) {
  const [newsletter, setNewsletter] = useState<NewsletterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNewsletter, setEditingNewsletter] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsletterPostData | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchNewsletter = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ newsletter: NewsletterData }>(
        `/api/newsletter/${newsletterId}`
      );
      setNewsletter(data.newsletter);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [newsletterId]);

  useEffect(() => {
    fetchNewsletter();
  }, [fetchNewsletter]);

  const handleStatusChange = async (status: string) => {
    if (!newsletter) return;
    try {
      const data = await apiFetch<{ newsletter: NewsletterData }>(
        `/api/newsletter/${newsletterId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      );
      setNewsletter(data.newsletter);
    } catch {
      // silent
    }
  };

  const handleArchive = async () => {
    if (!newsletter) return;
    try {
      await apiFetch(`/api/newsletter/${newsletterId}`, {
        method: 'DELETE',
      });
      onBack();
    } catch {
      // silent
    }
  };

  const filteredPosts =
    newsletter?.newsletterPosts?.filter(
      (p) => filterStatus === 'all' || p.status === filterStatus
    ) || [];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Newsletter introuvable</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  const publishedCount = newsletter.newsletterPosts?.filter(
    (p) => p.status === 'published'
  ).length || 0;

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Retour aux newsletters
        </Button>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingNewsletter(true)}>
                Modifier
              </DropdownMenuItem>
              {newsletter.status === 'active' && (
                <DropdownMenuItem onClick={() => handleStatusChange('paused')}>
                  <Pause className="w-4 h-4 mr-2" />
                  Mettre en pause
                </DropdownMenuItem>
              )}
              {newsletter.status === 'paused' && (
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  <Play className="w-4 h-4 mr-2" />
                  Réactiver
                </DropdownMenuItem>
              )}
              {newsletter.status === 'draft' && (
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  <Play className="w-4 h-4 mr-2" />
                  Activer
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleArchive}
                className="text-destructive focus:text-destructive"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archiver
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
          <Newspaper className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold">{newsletter.name}</h2>
            <Badge
              variant="secondary"
              className={STATUS_COLORS[newsletter.status]}
            >
              {STATUS_LABELS[newsletter.status]}
            </Badge>
          </div>
          {newsletter.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {newsletter.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: <Users className="w-4 h-4" />,
            label: 'Abonnés',
            value: newsletter.subscribersCount,
          },
          {
            icon: <FileText className="w-4 h-4" />,
            label: 'Articles publiés',
            value: publishedCount,
          },
          {
            icon: <Calendar className="w-4 h-4" />,
            label: 'Fréquence',
            value: FREQUENCY_LABELS[newsletter.frequency],
          },
          {
            icon: <Clock className="w-4 h-4" />,
            label: 'Dernière publication',
            value: formatDate(newsletter.lastPublishedAt),
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {stat.icon}
              <span className="text-xs">{stat.label}</span>
            </div>
            <p className="text-lg font-bold">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* LinkedIn API Notice */}
      <Card className="p-3 border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Note : La publication directe de newsletters via l'API LinkedIn peut nécessiter un accès partenaire. 
            Les articles sont sauvegardés localement et la publication sur LinkedIn sera tentée automatiquement.
          </p>
        </div>
      </Card>

      {/* Articles Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Articles</h3>
          <Button
            onClick={() => {
              setEditingPost(null);
              setShowEditor(true);
            }}
            size="sm"
            className="gap-2"
          >
            <PenSquare className="w-4 h-4" />
            Rédiger un article
          </Button>
        </div>

        {/* Post status filter */}
        <div className="flex items-center gap-2">
          {['all', 'draft', 'published', 'scheduled', 'failed'].map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(s)}
              className="text-xs"
            >
              {s === 'all' ? 'Tous' : POST_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>

        {/* Posts list */}
        {filteredPosts.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filterStatus === 'all'
                ? 'Aucun article pour le moment'
                : `Aucun article "${POST_STATUS_LABELS[filterStatus]}"`}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <Card
                key={post.id}
                className="p-4 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => {
                  setEditingPost(post);
                  setShowEditor(true);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">{post.title}</h4>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px]',
                          POST_STATUS_COLORS[post.status]
                        )}
                      >
                        {POST_STATUS_LABELS[post.status]}
                      </Badge>
                    </div>
                    {post.excerpt && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(post.createdAt)}
                      </span>
                      {post.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Send className="w-3 h-3" />
                          Publié le {formatDate(post.publishedAt)}
                        </span>
                      )}
                    </div>
                    {post.errorMessage && (
                      <div className="flex items-start gap-1 mt-2 text-[10px] text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                        {post.errorMessage}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit newsletter dialog */}
      <NewsletterFormDialog
        open={editingNewsletter}
        onOpenChange={setEditingNewsletter}
        newsletter={newsletter}
      />

      {/* Article editor */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ArticleEditor
              newsletterId={newsletterId}
              post={editingPost}
              onClose={() => {
                setShowEditor(false);
                setEditingPost(null);
              }}
              onSaved={() => {
                setShowEditor(false);
                setEditingPost(null);
                fetchNewsletter();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Main Newsletter Manager
// ============================================================

export default function NewsletterManager() {
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (selectedNewsletterId) {
    return (
      <NewsletterDetailView
        key={selectedNewsletterId}
        newsletterId={selectedNewsletterId}
        onBack={() => setSelectedNewsletterId(null)}
      />
    );
  }

  return (
    <>
      <NewsletterListView
        onSelect={setSelectedNewsletterId}
        onCreateNew={() => setShowCreateDialog(true)}
      />
      <NewsletterFormDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            // Optionally refresh
          }
        }}
      />
    </>
  );
}
