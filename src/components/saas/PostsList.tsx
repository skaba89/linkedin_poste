'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Search,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  FilterX,
  X,
  MoreHorizontal,
  FileDown,
  Copy,
  ClipboardList,
  FileText,
  Loader2,
  Upload,
} from 'lucide-react';
import EmptyState from './EmptyState';
import { toast } from 'sonner';
import type { Post, PostStatus, AIProvider } from '@/types';
import {
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
  AI_PROVIDER_LABELS,
} from '@/types';

const FILTERS_STORAGE_KEY = 'lp_posts_filters';

interface SavedFilters {
  status: string;
  search: string;
  provider: string;
  authorId: string;
  hasImage: boolean;
  fromDate: string;
  toDate: string;
  sortBy: string;
  sortOrder: string;
}

const defaultFilters: SavedFilters = {
  status: 'all',
  search: '',
  provider: '',
  authorId: '',
  hasImage: false,
  fromDate: '',
  toDate: '',
  sortBy: 'date',
  sortOrder: 'desc',
};

function loadFilters(): SavedFilters {
  if (typeof window === 'undefined') return defaultFilters;
  try {
    const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (saved) return { ...defaultFilters, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return defaultFilters;
}

function saveFilters(filters: SavedFilters) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }
}

export default function PostsList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SavedFilters>(defaultFilters);
  const [initialized, setInitialized] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [authors, setAuthors] = useState<{ id: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setView = useAppStore((s) => s.setView);
  const selectPost = useAppStore((s) => s.selectPost);
  const limit = 20;

  // Load saved filters on mount
  useEffect(() => {
    const saved = loadFilters();
    setFilters(saved);
    setInitialized(true);
  }, []);

  // Fetch authors for filter
  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const data = await apiFetch<{ users: { id: string; name: string }[] }>('/api/users');
        setAuthors(data.users || []);
      } catch { /* silent */ }
    };
    fetchAuthors();
  }, []);

  const fetchPosts = useCallback(async (currentFilters?: SavedFilters) => {
    const f = currentFilters || filters;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (f.status !== 'all') params.set('status', f.status);
      if (f.search.trim()) params.set('search', f.search.trim());
      if (f.provider) params.set('provider', f.provider);
      if (f.authorId) params.set('authorId', f.authorId);
      if (f.hasImage) params.set('hasImage', 'true');
      if (f.fromDate) params.set('fromDate', f.fromDate);
      if (f.toDate) params.set('toDate', f.toDate);
      if (f.sortBy) params.set('sortBy', f.sortBy);
      if (f.sortOrder) params.set('sortOrder', f.sortOrder);

      const data = await apiFetch<{ posts: Post[]; pagination: { totalPages: number; total: number } }>(
        `/api/posts?${params.toString()}`
      );
      setPosts(data.posts);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total || 0);
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    if (initialized) {
      fetchPosts();
    }
  }, [initialized, fetchPosts]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    const newFilters = { ...filters, search: value };
    setFilters(newFilters);
    setPage(1);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      saveFilters(newFilters);
      fetchPosts(newFilters);
    }, 300);
  };

  const updateFilter = (key: keyof SavedFilters, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    saveFilters(newFilters);
    fetchPosts(newFilters);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
    saveFilters(defaultFilters);
    fetchPosts(defaultFilters);
    toast.success('Filtres réinitialisés');
  };

  const handleView = (post: Post) => {
    selectPost(post.id);
    setView('post-detail');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/posts/${deleteTarget.id}?postId=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      toast.success('Post supprimé');
      setDeleteTarget(null);
      fetchPosts();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleExportPDF = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch('/api/posts/export/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAppStore.getState().token}`,
        },
        body: JSON.stringify({ type: 'posts' }),
      });
      if (!res.ok) throw new Error('Export PDF failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `posts_export_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export PDF téléchargé');
    } catch {
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/posts/import/csv', {
        method: 'POST',
        headers: { Authorization: `Bearer ${useAppStore.getState().token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'import");
        return;
      }
      if (data.errors.length > 0) {
        toast.warning(`${data.imported} post(s) importé(s), ${data.errors.length} erreur(s)`, {
          description: data.errors.slice(0, 5).join('\n') + (data.errors.length > 5 ? '\n…' : ''),
        });
      } else {
        toast.success(`${data.imported} post(s) importé(s)`);
      }
      fetchPosts();
    } catch {
      toast.error("Erreur lors de l'import CSV");
    } finally {
      setImporting(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'sujet,angle,audience,cta,hashtags,provider,statut,date_planification\n' +
      '"5 tendances IA en 2026","Perspective expert","Décideurs B2B","Abonnez-vous","#IA #Innovation #B2B","openrouter","draft","2026-05-10T09:00:00.000Z"\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_import_posts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    setDownloading(true);
    try {
      // Build params from current filters
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.provider) params.set('provider', filters.provider);
      if (filters.authorId) params.set('authorId', filters.authorId);
      if (filters.hasImage) params.set('hasImage', 'true');
      if (filters.fromDate) params.set('fromDate', filters.fromDate);
      if (filters.toDate) params.set('toDate', filters.toDate);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
      params.set('limit', '1000');

      const res = await fetch(`/api/posts/export/csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${useAppStore.getState().token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `posts_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export CSV téléchargé');
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setDownloading(false);
    }
  };

  // Bulk actions
  const allSelected = posts.length > 0 && posts.every((p) => bulkSelected.has(p.id));
  const toggleAll = () => {
    if (allSelected) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(posts.map((p) => p.id)));
    }
  };
  const toggleOne = (id: string) => {
    const next = new Set(bulkSelected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setBulkSelected(next);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      for (const id of bulkSelected) {
        await apiFetch(`/api/posts/${id}?postId=${id}`, { method: 'DELETE' });
      }
      toast.success(`${bulkSelected.size} post(s) supprimé(s)`, {
        action: { label: 'Annuler', onClick: () => {} },
      });
      setBulkSelected(new Set());
      setBulkDeleteConfirmOpen(false);
      fetchPosts();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const openBulkDeleteConfirm = () => {
    if (bulkSelected.size === 0) return;
    setBulkDeleteConfirmOpen(true);
  };

  const handleBulkStatus = async (status: string) => {
    try {
      for (const id of bulkSelected) {
        await apiFetch(`/api/posts/${id}?postId=${id}`, {
          method: 'PUT',
          body: JSON.stringify({ postId: id, status }),
        });
      }
      toast.success(`${bulkSelected.size} post(s) mis à jour`);
      setBulkSelected(new Set());
      fetchPosts();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const activeFilterCount = [
    filters.status !== 'all',
    filters.provider !== '',
    filters.authorId !== '',
    filters.hasImage,
    filters.fromDate !== '',
    filters.toDate !== '',
    filters.sortBy !== 'date' || filters.sortOrder !== 'desc',
  ].filter(Boolean).length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const allStatuses: PostStatus[] = [
    'idea', 'draft', 'pending_approval', 'approved',
    'rejected', 'scheduled', 'posted', 'failed',
  ];

  // Skeleton layout matching real content
  const TableSkeleton = () => (
    <div className="p-4 space-y-0">
      <Skeleton className="h-10 w-full mb-0" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full mt-0" />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par sujet, angle, contenu..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={filters.status}
                  onValueChange={(v) => updateFilter('status', v)}
                >
                  <SelectTrigger className="w-[160px] h-9 text-sm">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {allStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {POST_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <FilterX className="w-3.5 h-3.5" />
                  Filtres
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[18px] text-[10px]">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={handleExportPDF}
                  disabled={downloadingPdf}
                >
                  {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">PDF</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={handleExportCSV}
                  disabled={downloading}
                >
                  {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">CSV</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Import CSV</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportCSV}
                />
              </div>
              {/* Template download link */}
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors self-start"
                onClick={handleDownloadTemplate}
              >
                Télécharger le modèle CSV
              </button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-border/50">
                {/* Provider */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Provider IA</Label>
                  <Select
                    value={filters.provider || 'all'}
                    onValueChange={(v) => updateFilter('provider', v === 'all' ? '' : v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {(Object.entries(AI_PROVIDER_LABELS) as [AIProvider, string][]).map(
                        ([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Author */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Auteur</Label>
                  <Select
                    value={filters.authorId || 'all'}
                    onValueChange={(v) => updateFilter('authorId', v === 'all' ? '' : v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {authors.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* From Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Date début</Label>
                  <Input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => updateFilter('fromDate', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* To Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Date fin</Label>
                  <Input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => updateFilter('toDate', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Has Image */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Avec image uniquement</Label>
                  <div className="flex items-center h-9">
                    <Switch
                      checked={filters.hasImage}
                      onCheckedChange={(v) => updateFilter('hasImage', v)}
                    />
                    <span className="text-xs text-muted-foreground ml-2">
                      {filters.hasImage ? 'Oui' : 'Non'}
                    </span>
                  </div>
                </div>

                {/* Sort By */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Trier par</Label>
                  <div className="flex gap-2">
                    <Select
                      value={filters.sortBy}
                      onValueChange={(v) => updateFilter('sortBy', v)}
                    >
                      <SelectTrigger className="h-9 text-sm flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="subject">Sujet (A-Z)</SelectItem>
                        <SelectItem value="score">Score</SelectItem>
                        <SelectItem value="status">Statut</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {filters.sortOrder === 'asc' ? '↑' : '↓'}
                    </Button>
                  </div>
                </div>

                {/* Reset */}
                {activeFilterCount > 0 && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" className="h-9 text-xs gap-1.5 text-destructive" onClick={resetFilters}>
                      <X className="w-3 h-3" />
                      Réinitialiser les filtres
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card className="border-border/50 overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="Aucun post trouvé"
            description="Aucun post ne correspond à vos critères de recherche"
            action={{
              label: 'Créer un post',
              onClick: () => {
                selectPost(null);
                setView('create-post');
              },
              icon: <Plus className="w-3.5 h-3.5" />,
            }}
            secondaryAction={
              filters.search || activeFilterCount > 0
                ? { label: 'Réinitialiser les filtres', onClick: resetFilters }
                : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Sujet</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Auteur</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Statut</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Provider</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Score</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id} className="group">
                      <TableCell>
                        <Checkbox
                          checked={bulkSelected.has(post.id)}
                          onCheckedChange={() => toggleOne(post.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {post.imageUrl && (
                            <div className="w-8 h-8 rounded-md overflow-hidden border border-border/50 shrink-0 bg-muted">
                              <img
                                src={post.imageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <button
                            onClick={() => handleView(post)}
                            className="text-sm font-medium hover:text-primary transition-colors text-left truncate max-w-[300px] block"
                          >
                            {post.subject}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {post.author?.name || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[11px] font-medium',
                            POST_STATUS_COLORS[post.status]
                          )}
                        >
                          {POST_STATUS_LABELS[post.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {AI_PROVIDER_LABELS[post.aiProvider]}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {post.contentScore != null ? (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px] font-bold',
                              post.contentScore >= 70
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : post.contentScore >= 40
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                            )}
                          >
                            {post.contentScore}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(post.updatedAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleView(post)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {post.status !== 'posted' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(post)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Page {page} sur {totalPages} · {total} post(s)
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="icon"
                        className="h-7 w-7 text-xs"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Bulk Actions Bar */}
      {bulkSelected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-popover border border-border rounded-xl shadow-lg px-4 py-2.5 animate-in slide-in-from-bottom-4">
          <span className="text-sm font-medium">
            {bulkSelected.size} sélectionné(s)
          </span>
          <div className="w-px h-5 bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <MoreHorizontal className="w-3.5 h-3.5" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={openBulkDeleteConfirm} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer la sélection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatus('draft')}>
                Passer en brouillon
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatus('pending_approval')}>
                Soumettre pour validation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileDown className="w-4 h-4 mr-2" />
                Exporter la sélection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setBulkSelected(new Set())}
          >
            Désélectionner
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce post ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le post &quot;{deleteTarget?.subject}&quot; sera définitivement supprimé.
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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={(open) => { if (!open) setBulkDeleteConfirmOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {bulkSelected.size} post(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. {bulkSelected.size} post(s) seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
