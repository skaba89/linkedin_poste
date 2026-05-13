'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  BookTemplate,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Rocket,
  Sparkles,
  FileText,
  FileCode,
} from 'lucide-react';
import EmptyState from './EmptyState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { PromptTemplate } from '@/types';
import {
  PROMPT_CATEGORY_LABELS,
  PROMPT_CATEGORY_COLORS,
} from '@/types';

const CATEGORIES = [
  'all',
  'thought_leadership',
  'listicle',
  'storytelling',
  'controverse',
  'howto',
  'engagement',
];

interface TemplateForm {
  name: string;
  description: string;
  category: string;
  prompt: string;
  variables: string;
  isDefault: boolean;
}

const emptyForm: TemplateForm = {
  name: '',
  description: '',
  category: 'general',
  prompt: '',
  variables: '',
  isDefault: false,
};

export default function PromptLibraryView() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromptTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>(null);
  const seedAttempted = useRef(false);

  const setView = useAppStore((s) => s.setView);
  const selectPost = useAppStore((s) => s.selectPost);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (search.trim()) params.set('search', search.trim());

      const data = await apiFetch<{ templates: PromptTemplate[] }>(
        `/api/prompts?${params.toString()}`
      );
      setTemplates(data.templates);
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search]);

  const seedDefaults = useCallback(async () => {
    try {
      await apiFetch('/api/prompts/seed', { method: 'POST' });
      setSeeded(true);
      fetchTemplates();
    } catch {
      // silently fail
    }
  }, [fetchTemplates]);

  useEffect(() => {
    if (!seedAttempted.current) {
      seedAttempted.current = true;
      seedDefaults();
    }
  }, [seedDefaults]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = () => {
    setEditingTemplate(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      description: template.description || '',
      category: template.category,
      prompt: template.prompt,
      variables: template.variables || '',
      isDefault: template.isDefault,
    });
    setDialogOpen(true);
  };

  const handleDuplicate = async (template: PromptTemplate) => {
    try {
      await apiFetch('/api/prompts', {
        method: 'POST',
        body: JSON.stringify({
          name: `${template.name} (copie)`,
          description: template.description,
          category: template.category,
          prompt: template.prompt,
          variables: template.variables,
          isDefault: false,
        }),
      });
      toast.success('Template dupliqué');
      fetchTemplates();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/prompts/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Template supprimé');
      setDeleteTarget(null);
      fetchTemplates();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.prompt.trim()) {
      toast.error('Le nom et le prompt sont requis');
      return;
    }

    setSaving(true);
    try {
      let variablesJson: unknown = null;
      if (form.variables.trim()) {
        try {
          variablesJson = JSON.parse(form.variables.trim());
        } catch {
          toast.error('Le format des variables est invalide (JSON requis)');
          setSaving(false);
          return;
        }
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        prompt: form.prompt.trim(),
        variables: variablesJson,
        isDefault: form.isDefault,
      };

      if (editingTemplate) {
        await apiFetch(`/api/prompts/${editingTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Template mis à jour');
      } else {
        await apiFetch('/api/prompts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Template créé');
      }

      setDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUseTemplate = (template: PromptTemplate) => {
    // Navigate to create-post with prompt pre-filled
    selectPost(null);
    setView('create-post');
    // Store the prompt for CreatePostForm to pick up
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('prefill_angle', template.prompt);
    }
    toast.success(`Template "${template.name}" chargé dans l'angle rédactionnel`);
  };

  const truncateText = (text: string, maxLen: number) => {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
  };

  const filteredCount = templates.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookTemplate className="w-5 h-5" />
            Bibliothèque de Prompts
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gérez vos templates de prompts pour standardiser la création de contenu
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Créer un template
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un template..."
                value={search}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearch(val);
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                  searchTimeoutRef.current = setTimeout(() => {
                    fetchTemplates();
                  }, 300);
                }}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
                <SelectValue placeholder="Toutes catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {CATEGORIES.filter((c) => c !== 'all').map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {PROMPT_CATEGORY_LABELS[cat] || cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-xl" />
          ))}
        </div>
      ) : filteredCount === 0 ? (
        <EmptyState
          icon={<FileCode className="w-6 h-6" />}
          title="Aucun template de prompt"
          description={
            search || categoryFilter !== 'all'
              ? 'Essayez de modifier vos filtres'
              : 'Créez des templates réutilisables pour la génération de contenu'
          }
          action={
            !search && categoryFilter === 'all'
              ? {
                  label: 'Créer un template',
                  onClick: handleCreate,
                  icon: <Plus className="w-3.5 h-3.5" />,
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col"
            >
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm font-semibold truncate">
                        {template.name}
                      </CardTitle>
                      {template.isDefault && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 shrink-0"
                        >
                          Par défaut
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px] font-medium mt-1.5',
                        PROMPT_CATEGORY_COLORS[template.category] || PROMPT_CATEGORY_COLORS.general
                      )}
                    >
                      {PROMPT_CATEGORY_LABELS[template.category] || template.category}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleUseTemplate(template)}>
                        <Rocket className="w-4 h-4 mr-2" />
                        Utiliser
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(template)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(template)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col px-4 pb-4 gap-3">
                {template.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {template.description}
                  </p>
                )}
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground/70 line-clamp-4 whitespace-pre-wrap leading-relaxed font-mono">
                    {truncateText(template.prompt, 200)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs gap-1.5"
                  onClick={() => handleUseTemplate(template)}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Utiliser ce template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Modifier le template' : 'Nouveau template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Modifiez les détails de votre template de prompt.'
                : 'Créez un nouveau template de prompt pour standardiser vos publications.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tpl-name" className="text-sm font-medium">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tpl-name"
                placeholder="Ex: Thought Leadership"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-desc" className="text-sm font-medium">
                Description
              </Label>
              <Input
                id="tpl-desc"
                placeholder="Description courte du template"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-cat" className="text-sm font-medium">
                Catégorie
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger id="tpl-cat" disabled={saving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c !== 'all').map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {PROMPT_CATEGORY_LABELS[cat] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-prompt" className="text-sm font-medium">
                Prompt <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="tpl-prompt"
                placeholder="Rédige un post LinkedIn sur {sujet}..."
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                disabled={saving}
                rows={8}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Utilisez des variables entre accolades : {'{sujet}'}, {'{nombre}'}, etc.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-vars" className="text-sm font-medium">
                Variables (JSON, optionnel)
              </Label>
              <Textarea
                id="tpl-vars"
                placeholder='[{"name":"sujet","required":true,"placeholder":"Le sujet du post"}]'
                value={form.variables}
                onChange={(e) => setForm({ ...form, variables: e.target.value })}
                disabled={saving}
                rows={3}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.prompt.trim()}>
              {saving ? 'Enregistrement...' : editingTemplate ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le template &quot;{deleteTarget?.name}&quot; sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
