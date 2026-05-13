'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Eye,
  Sparkles,
  BookOpen,
  FileText,
  Users,
  Megaphone,
  Lightbulb,
  GraduationCap,
  Heart,
  HelpCircle,
  ListChecks,
  ArrowRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface PostTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  category: string;
  structure: string;
  example?: string | null;
  tags?: string | null;
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string };
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Toutes les catégories' },
  { value: 'thought_leadership', label: 'Thought Leadership' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'listicle', label: 'Listicle' },
  { value: 'howto', label: 'Guide Pratique' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'promotional', label: 'Promotionnel' },
  { value: 'personal', label: 'Personnel' },
  { value: 'general', label: 'Général' },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  thought_leadership: <Lightbulb className="w-4 h-4 text-purple-500" />,
  storytelling: <BookOpen className="w-4 h-4 text-amber-500" />,
  listicle: <ListChecks className="w-4 h-4 text-blue-500" />,
  howto: <GraduationCap className="w-4 h-4 text-emerald-500" />,
  engagement: <HelpCircle className="w-4 h-4 text-cyan-500" />,
  promotional: <Megaphone className="w-4 h-4 text-rose-500" />,
  personal: <Heart className="w-4 h-4 text-pink-500" />,
  general: <FileText className="w-4 h-4 text-slate-500" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  thought_leadership: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  storytelling: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  listicle: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  howto: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  engagement: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400',
  promotional: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  personal: 'bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400',
  general: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

const CATEGORY_LABELS: Record<string, string> = {
  thought_leadership: 'Thought Leadership',
  storytelling: 'Storytelling',
  listicle: 'Listicle',
  howto: 'Guide Pratique',
  engagement: 'Engagement',
  promotional: 'Promotionnel',
  personal: 'Personnel',
  general: 'Général',
};

export default function PostTemplatesView() {
  const [templates, setTemplates] = useState<PostTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const setView = useAppStore((s) => s.setView);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (search) params.set('search', search);
      const data = await apiFetch<{ templates: PostTemplate[] }>(
        `/api/post-templates?${params.toString()}`
      );
      setTemplates(data.templates);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (templateId: string) => {
    try {
      await apiFetch(`/api/post-templates/${templateId}?id=${templateId}`, {
        method: 'DELETE',
      });
      toast.success('Template supprimé');
      fetchTemplates();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleUseTemplate = (template: PostTemplate) => {
    sessionStorage.setItem('prefill_template_structure', template.structure);
    sessionStorage.setItem('prefill_template_name', template.name);
    setView('create-post');
    toast.success(`Template "${template.name}" chargé`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Bibliothèque de Templates</h2>
          <p className="text-sm text-muted-foreground">
            Créez et gérez des templates réutilisables pour vos posts LinkedIn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiDialogOpen(true)}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Générer avec l&apos;IA
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Créer un template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[200px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Aucun template trouvé</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Créez votre premier template ou générez-en un avec l&apos;IA
            </p>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => setAiDialogOpen(true)} className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Générer avec l&apos;IA
              </Button>
              <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Créer
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer group"
              onClick={() => {
                setSelectedTemplate(template);
                setViewDialogOpen(true);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {CATEGORY_ICONS[template.category] || CATEGORY_ICONS.general}
                      <CardTitle className="text-sm font-semibold truncate">
                        {template.name}
                      </CardTitle>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn('text-[10px]', CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general)}
                    >
                      {CATEGORY_LABELS[template.category] || template.category}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUseTemplate(template); }} className="gap-2">
                        <ArrowRight className="w-3.5 h-3.5" />
                        Utiliser dans un post
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(template.structure); toast.success('Structure copiée'); }} className="gap-2">
                        <Copy className="w-3.5 h-3.5" />
                        Copier la structure
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                        className="gap-2 text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {template.description && (
                  <CardDescription className="text-xs line-clamp-2 mb-3">
                    {template.description}
                  </CardDescription>
                )}
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap leading-relaxed mb-3">
                  {template.structure.slice(0, 200)}
                  {template.structure.length > 200 ? '...' : ''}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    <span>{template.usageCount} utilisations</span>
                  </div>
                  {template.isPublic && (
                    <Badge variant="outline" className="text-[9px] gap-1">
                      <Users className="w-2.5 h-2.5" />
                      Public
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={fetchTemplates}
      />

      {/* AI Generate Dialog */}
      <AIGenerateDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onCreated={fetchTemplates}
      />

      {/* View Template Dialog */}
      <ViewTemplateDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        template={selectedTemplate}
        onUse={handleUseTemplate}
      />
    </div>
  );
}

/* ============================================================
   Create Template Dialog
   ============================================================ */
function CreateTemplateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [structure, setStructure] = useState('');
  const [example, setExample] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setCategory('general');
      setStructure('');
      setExample('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !structure.trim()) return;
    setSaving(true);
    try {
      await apiFetch('/api/post-templates', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          category,
          structure: structure.trim(),
          example: example.trim() || undefined,
        }),
      });
      toast.success('Template créé');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Créer un template
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Hook + Story + Lesson" required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description courte du template" />
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.filter((c) => c.value !== 'all').map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Structure du template *</Label>
            <Textarea
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
              placeholder={`Ex:\n\n{hook_accrocheur}\n\n{contexte_histoire}\n\n{lecon_apprise}\n\nCTA : {appel_action}`}
              rows={8}
              required
              className="font-mono text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Utilisez des placeholders entre accolades : {'{placeholder}'}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Exemple (optionnel)</Label>
            <Textarea
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="Exemple de template rempli..."
              rows={4}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving || !name.trim() || !structure.trim()} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Créer le template
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   AI Generate Dialog
   ============================================================ */
function AIGenerateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('general');
  const [tone, setTone] = useState('professionnel');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) {
      setTopic('');
      setCategory('general');
      setTone('professionnel');
    }
  }, [open]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      await apiFetch('/api/post-templates/ai-generate', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim(),
          category,
          tone,
        }),
      });
      toast.success('Template généré par l\'IA');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Générer un template avec l&apos;IA
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="space-y-2">
            <Label>Sujet du template *</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: Lancement produit B2B" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.filter((c) => c.value !== 'all').map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ton</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professionnel">Professionnel</SelectItem>
                  <SelectItem value="inspirant">Inspirant</SelectItem>
                  <SelectItem value="educatif">Educatif</SelectItem>
                  <SelectItem value="conversational">Conversationnel</SelectItem>
                  <SelectItem value="humour">Humour</SelectItem>
                  <SelectItem value="provocateur">Provocateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={generating || !topic.trim()} className="w-full gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Générer le template
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   View Template Dialog
   ============================================================ */
function ViewTemplateDialog({
  open,
  onOpenChange,
  template,
  onUse,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PostTemplate | null;
  onUse: (template: PostTemplate) => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!template) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(template.structure);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {CATEGORY_ICONS[template.category] || CATEGORY_ICONS.general}
            <div>
              <DialogTitle className="text-base">{template.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="secondary"
                  className={cn('text-[10px]', CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general)}
                >
                  {CATEGORY_LABELS[template.category] || template.category}
                </Badge>
                {template.isPublic && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Users className="w-2.5 h-2.5" />
                    Public
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">{template.usageCount} utilisations</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {template.description && (
          <p className="text-sm text-muted-foreground">{template.description}</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Structure du template</Label>
            <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 text-xs gap-1.5">
              {copied ? <span className="text-emerald-600">Copié !</span> : <>
                <Copy className="w-3.5 h-3.5" />
                Copier
              </>}
            </Button>
          </div>
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="p-4">
              <pre className="text-sm whitespace-pre-wrap font-[inherit] leading-relaxed">
                {template.structure}
              </pre>
            </CardContent>
          </Card>
        </div>

        {template.example && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Exemple</Label>
            <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50">
              <CardContent className="p-4">
                <pre className="text-sm whitespace-pre-wrap font-[inherit] leading-relaxed">
                  {template.example}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={() => { onUse(template); onOpenChange(false); }} className="flex-1 gap-2">
            <ArrowRight className="w-4 h-4" />
            Utiliser dans un post
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
