'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/use-app-store';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  subWeeks,
  addWeeks,
  addDays,
  parseISO,
  startOfWeek as getStartOfWeek,
  endOfWeek as getEndOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Zap,
  CalendarDays,
  Clock,
  BarChart3,
  Type,
  ImageIcon,
  Layers,
  Vote,
  FileText,
  Video,
  X,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  ArrowRight,
  PanelRightOpen,
  PanelRightClose,
  GripVertical,
} from 'lucide-react';
import type {
  ContentPlanItem,
  ContentPlanFormat,
  ContentPlanPriority,
  ContentPlanStatus,
} from '@/types';
import {
  CONTENT_PLAN_FORMAT_LABELS,
  CONTENT_PLAN_FORMAT_COLORS,
  CONTENT_PLAN_PRIORITY_LABELS,
  CONTENT_PLAN_PRIORITY_COLORS,
  CONTENT_PLAN_STATUS_LABELS,
  CONTENT_PLAN_STATUS_COLORS,
} from '@/types';

/* ============================================================
   Constants
   ============================================================ */

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

type CalendarMode = 'week' | 'month';

const FORMAT_ICONS: Record<ContentPlanFormat, React.ReactNode> = {
  text: <Type className="w-3 h-3" />,
  image: <ImageIcon className="w-3 h-3" />,
  carousel: <Layers className="w-3 h-3" />,
  poll: <Vote className="w-3 h-3" />,
  article: <FileText className="w-3 h-3" />,
  video: <Video className="w-3 h-3" />,
};

const FORMAT_PIE_COLORS = ['#64748b', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#f43f5e'];

/* ============================================================
   PlanItemCard
   ============================================================ */

function PlanItemCard({
  item,
  onClick,
  compact = false,
}: {
  item: ContentPlanItem;
  onClick: () => void;
  compact?: boolean;
}) {
  const formatColor = CONTENT_PLAN_FORMAT_COLORS[item.format as ContentPlanFormat] || CONTENT_PLAN_FORMAT_COLORS.text;
  const priorityColor = CONTENT_PLAN_PRIORITY_COLORS[item.priority as ContentPlanPriority] || CONTENT_PLAN_PRIORITY_COLORS.medium;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border border-border/40 bg-background hover:bg-muted/50 transition-all duration-150 cursor-pointer group',
        compact ? 'px-2 py-1.5' : 'px-3 py-2'
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn('shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center', formatColor)}>
          {FORMAT_ICONS[item.format as ContentPlanFormat] || FORMAT_ICONS.text}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium truncate', compact ? 'text-[11px]' : 'text-xs')}>
            {item.topic}
          </p>
          {!compact && (
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="secondary" className={cn('text-[9px] px-1.5 py-0', priorityColor)}>
                {CONTENT_PLAN_PRIORITY_LABELS[item.priority as ContentPlanPriority]}
              </Badge>
              {item.plannedTime && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {item.plannedTime}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/* ============================================================
   Item Detail Dialog
   ============================================================ */

function ItemDetailDialog({
  item,
  open,
  onClose,
  onSave,
  onDelete,
  onGoToCreatePost,
}: {
  item: ContentPlanItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ContentPlanItem>) => Promise<void>;
  onDelete: () => Promise<void>;
  onGoToCreatePost: (item: ContentPlanItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    topic: '',
    format: 'text' as ContentPlanFormat,
    priority: 'medium' as ContentPlanPriority,
    status: 'planned' as ContentPlanStatus,
    audience: '',
    notes: '',
    suggestedHashtags: '',
    plannedTime: '',
  });

  useEffect(() => {
    if (item) {
      setEditing(false);
      setFormData({
        topic: item.topic,
        format: item.format as ContentPlanFormat,
        priority: item.priority as ContentPlanPriority,
        status: item.status as ContentPlanStatus,
        audience: item.audience || '',
        notes: item.notes || '',
        suggestedHashtags: item.suggestedHashtags || '',
        plannedTime: item.plannedTime || '',
      });
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await onSave(formData);
      setEditing(false);
      toast.success('Élément mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    try {
      await onDelete();
      onClose();
      toast.success('Élément supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (!item) return null;

  const dateStr = format(parseISO(item.plannedDate), 'EEEE dd MMMM yyyy', { locale: fr });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {editing ? 'Modifier le plan' : 'Détail du contenu planifié'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date display */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="w-4 h-4" />
            <span className="capitalize">{dateStr}</span>
            {formData.plannedTime && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="w-3 h-3" />
                {formData.plannedTime}
              </Badge>
            )}
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <Badge className={cn(CONTENT_PLAN_STATUS_COLORS[item.status as ContentPlanStatus])}>
              {CONTENT_PLAN_STATUS_LABELS[item.status as ContentPlanStatus]}
            </Badge>
            <Badge className={cn(CONTENT_PLAN_FORMAT_COLORS[item.format as ContentPlanFormat])}>
              {FORMAT_ICONS[item.format as ContentPlanFormat]}
              <span className="ml-1">{CONTENT_PLAN_FORMAT_LABELS[item.format as ContentPlanFormat]}</span>
            </Badge>
          </div>

          <Separator />

          {/* AI Suggestion */}
          {item.aiSuggestion && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Suggestion IA
              </p>
              <p className="text-sm leading-relaxed">{item.aiSuggestion}</p>
            </div>
          )}

          {/* Editable fields */}
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Sujet</label>
                <Textarea
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="text-sm min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Format</label>
                  <Select value={formData.format} onValueChange={(v) => setFormData({ ...formData, format: v as ContentPlanFormat })}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTENT_PLAN_FORMAT_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Priorité</label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as ContentPlanPriority })}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTENT_PLAN_PRIORITY_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Statut</label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as ContentPlanStatus })}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTENT_PLAN_STATUS_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Heure de publication</label>
                <input
                  type="time"
                  value={formData.plannedTime}
                  onChange={(e) => setFormData({ ...formData, plannedTime: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Audience cible</label>
                <input
                  type="text"
                  value={formData.audience}
                  onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="ex: Décideurs B2B"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Hashtags suggérés</label>
                <input
                  type="text"
                  value={formData.suggestedHashtags}
                  onChange={(e) => setFormData({ ...formData, suggestedHashtags: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="#Hashtag1 #Hashtag2"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="text-sm min-h-[60px]"
                  placeholder="Notes internes..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} size="sm" className="flex-1">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  Enregistrer
                </Button>
                <Button onClick={() => setEditing(false)} variant="outline" size="sm" className="flex-1">
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">{item.topic}</h3>
              </div>

              {item.audience && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Audience : </span>
                  <span>{item.audience}</span>
                </div>
              )}

              {item.suggestedHashtags && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Hashtags : </span>
                  <span className="text-primary">{item.suggestedHashtags}</span>
                </div>
              )}

              {item.notes && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{item.notes}</p>
                </div>
              )}

              {item.postId && (
                <Badge variant="outline" className="text-xs">
                  Post lié : {item.postId.slice(0, 8)}...
                </Badge>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => setEditing(true)}
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Modifier
                </Button>
                <Button
                  onClick={() => onGoToCreatePost(item)}
                  size="sm"
                  className="flex-1 gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Créer le post
                </Button>
              </div>

              <Button
                onClick={handleDelete}
                variant="ghost"
                size="sm"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Analytics Sidebar
   ============================================================ */

function AnalyticsSidebar({
  items,
  open,
  onToggle,
}: {
  items: ContentPlanItem[];
  open: boolean;
  onToggle: () => void;
}) {
  // Format distribution
  const formatDist = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const item of items) {
      dist[item.format] = (dist[item.format] || 0) + 1;
    }
    return Object.entries(dist).map(([format, count]) => ({
      name: CONTENT_PLAN_FORMAT_LABELS[format as ContentPlanFormat] || format,
      value: count,
      format,
    }));
  }, [items]);

  // Priority distribution
  const priorityDist = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const item of items) {
      dist[item.priority] = (dist[item.priority] || 0) + 1;
    }
    return Object.entries(dist).map(([priority, count]) => ({
      name: CONTENT_PLAN_PRIORITY_LABELS[priority as ContentPlanPriority] || priority,
      value: count,
    }));
  }, [items]);

  // Days with content
  const daysWithContent = useMemo(() => {
    const days = new Set<string>();
    for (const item of items) {
      days.add(item.plannedDate.split('T')[0]);
    }
    return days.size;
  }, [items]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute -left-10 top-0 h-8 w-8 z-10"
        onClick={onToggle}
      >
        {open ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
      </Button>

      {open && (
        <Card className="border-border/50 w-[260px] shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Analyse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className="text-lg font-bold">{items.length}</p>
                <p className="text-[10px] text-muted-foreground">Éléments</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className="text-lg font-bold">{daysWithContent}</p>
                <p className="text-[10px] text-muted-foreground">Jours couverts</p>
              </div>
            </div>

            {/* Format donut chart */}
            {formatDist.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Mix de formats</p>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={formatDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {formatDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={FORMAT_PIE_COLORS[index % FORMAT_PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          fontSize: '11px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--popover)',
                        }}
                        formatter={(value: number) => [`${value} élément${value > 1 ? 's' : ''}`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formatDist.map((entry, i) => (
                    <span key={entry.format} className="flex items-center gap-1 text-[10px]">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FORMAT_PIE_COLORS[i % FORMAT_PIE_COLORS.length] }} />
                      {entry.name} ({entry.value})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Priority breakdown */}
            {priorityDist.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Répartition priorités</p>
                <div className="space-y-1">
                  {priorityDist.map((p) => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <span>{p.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{p.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
   Main AIContentCalendar Component
   ============================================================ */

export default function AIContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<CalendarMode>('week');
  const [items, setItems] = useState<ContentPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ContentPlanItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const setView = useAppStore((s) => s.setView);
  const selectPost = useAppStore((s) => s.selectPost);

  // Fetch items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let fromDate: Date;
      let toDate: Date;

      if (mode === 'week') {
        fromDate = getStartOfWeek(currentDate, { weekStartsOn: 1 });
        toDate = getEndOfWeek(currentDate, { weekStartsOn: 1 });
      } else {
        fromDate = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
        toDate = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      }

      const params = new URLSearchParams({
        fromDate: format(fromDate, 'yyyy-MM-dd'),
        toDate: format(toDate, 'yyyy-MM-dd'),
      });
      if (filterFormat !== 'all') params.set('format', filterFormat);
      if (filterPriority !== 'all') params.set('priority', filterPriority);
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const data = await apiFetch<{ items: ContentPlanItem[] }>(
        `/api/content-calendar?${params.toString()}`
      );
      setItems(data.items);
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [currentDate, mode, filterFormat, filterPriority, filterStatus]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Navigation
  const goToPrev = () => {
    setCurrentDate((d) => mode === 'month' ? subMonths(d, 1) : subWeeks(d, 1));
  };

  const goToNext = () => {
    setCurrentDate((d) => mode === 'month' ? addMonths(d, 1) : addWeeks(d, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Get items for a date
  const getItemsForDate = useCallback((date: Date): ContentPlanItem[] => {
    return items.filter((item) => {
      return isSameDay(parseISO(item.plannedDate), date);
    });
  }, [items]);

  // Generate AI calendar
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await apiFetch<{
        items: ContentPlanItem[];
        totalGenerated: number;
        totalSaved: number;
      }>('/api/content-calendar/generate', {
        method: 'POST',
        body: JSON.stringify({
          period: mode,
          includeWeekends: false,
        }),
      });
      toast.success(`${result.totalSaved} éléments générés par l'IA`);
      fetchItems();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      } else {
        toast.error('Erreur lors de la génération');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Optimize calendar
  const handleOptimize = async () => {
    if (items.length === 0) {
      toast.info('Aucun élément à optimiser');
      return;
    }
    setOptimizing(true);
    try {
      const result = await apiFetch<{
        optimizedItems: ContentPlanItem[];
        suggestions: string[];
        gaps: Array<{ date: string; suggestion: string }>;
        totalOptimized: number;
      }>('/api/content-calendar/optimize', {
        method: 'POST',
        body: JSON.stringify({ calendarItems: items }),
      });
      toast.success(`${result.totalOptimized} éléments optimisés`);
      if (result.suggestions.length > 0) {
        toast.info(result.suggestions[0], { duration: 6000 });
      }
      fetchItems();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de l'optimisation");
      }
    } finally {
      setOptimizing(false);
    }
  };

  // Save item changes
  const handleSaveItem = async (data: Partial<ContentPlanItem>) => {
    if (!selectedItem) return;
    await apiFetch(`/api/content-calendar/${selectedItem.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    fetchItems();
    setSelectedItem(null);
  };

  // Delete item
  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    await apiFetch(`/api/content-calendar/${selectedItem.id}`, {
      method: 'DELETE',
    });
    fetchItems();
    setSelectedItem(null);
  };

  // Create a new plan item for a date
  const handleQuickAdd = async (date: Date) => {
    try {
      await apiFetch('/api/content-calendar', {
        method: 'POST',
        body: JSON.stringify({
          plannedDate: format(date, 'yyyy-MM-dd'),
          topic: 'Nouveau contenu',
          format: 'text',
          priority: 'medium',
        }),
      });
      toast.success('Élément ajouté');
      fetchItems();
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  // Go to create post from plan item
  const handleGoToCreatePost = (item: ContentPlanItem) => {
    setDetailOpen(false);
    // Store pre-fill data
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('prefill_scheduledDate', `${item.plannedDate}T${item.plannedTime || '09:00'}`);
      sessionStorage.setItem('prefill_subject', item.topic);
      if (item.audience) sessionStorage.setItem('prefill_audience', item.audience);
      if (item.suggestedHashtags) sessionStorage.setItem('prefill_hashtags', item.suggestedHashtags);
    }
    selectPost(null);
    setView('create-post');
  };

  // Click item card
  const handleItemClick = (item: ContentPlanItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  // Calendar grid days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekStart = getStartOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = getEndOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const displayDays = mode === 'month' ? monthDays : weekDays;

  const headerLabel =
    mode === 'month'
      ? `${MONTH_LABELS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : `Semaine du ${format(weekStart, 'd MMM', { locale: fr })} au ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`;

  // Weekly coverage
  const weekItems = mode === 'week'
    ? items
    : items.filter((item) => {
        const d = parseISO(item.plannedDate);
        return d >= weekStart && d <= weekEnd;
      });

  if (loading && items.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-lg mx-auto" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
          <Skeleton className="h-[500px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">{headerLabel}</h2>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0"
            size="sm"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Générer avec l&apos;IA
          </Button>

          {/* Optimize Button */}
          <Button
            onClick={handleOptimize}
            disabled={optimizing || items.length === 0}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            {optimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Optimiser
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

          {/* Format filter */}
          <Select value={filterFormat} onValueChange={setFilterFormat}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Tous formats</SelectItem>
              {Object.entries(CONTENT_PLAN_FORMAT_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority filter */}
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="Priorité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Toutes</SelectItem>
              {Object.entries(CONTENT_PLAN_PRIORITY_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Tous</SelectItem>
              {Object.entries(CONTENT_PLAN_STATUS_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd&apos;hui
          </Button>

          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={mode === 'month' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-none text-xs"
              onClick={() => setMode('month')}
            >
              Mois
            </Button>
            <Button
              variant={mode === 'week' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-none text-xs"
              onClick={() => setMode('week')}
            >
              Sem.
            </Button>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
        {/* Calendar Grid */}
        <Card className="border-border/50 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border/50">
            {DAY_LABELS.map((day) => (
              <div
                key={day}
                className="px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className={cn(
            'grid grid-cols-7',
            mode === 'month' ? 'auto-rows-fr' : 'auto-rows-[180px] md:auto-rows-[260px]'
          )}>
            {displayDays.map((day) => {
              const dayItems = getItemsForDate(day);
              const inMonth = mode === 'month' ? isSameMonth(day, currentDate) : true;
              const maxShow = mode === 'month' ? 3 : 10;
              const remaining = dayItems.length - maxShow;

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'border-b border-r border-border/30 p-1.5 min-h-[80px] md:min-h-[100px] transition-colors group relative',
                    !inMonth && 'bg-muted/20',
                    isToday(day) && 'bg-primary/5',
                  )}
                >
                  {/* Date header + add button */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        'text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full',
                        isToday(day) && 'bg-primary text-primary-foreground',
                        !inMonth && 'text-muted-foreground/40',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {inMonth && (
                      <button
                        onClick={() => handleQuickAdd(day)}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                        title="Ajouter du contenu"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Items */}
                  <div className="space-y-1">
                    {dayItems.slice(0, maxShow).map((item) => (
                      <PlanItemCard
                        key={item.id}
                        item={item}
                        onClick={() => handleItemClick(item)}
                        compact={mode === 'month'}
                      />
                    ))}
                    {remaining > 0 && (
                      <button
                        onClick={() => {
                          setCurrentDate(day);
                          setMode('week');
                        }}
                        className="w-full text-center text-[10px] text-primary hover:underline py-0.5"
                      >
                        +{remaining} autre{remaining > 1 ? 's' : ''}
                      </button>
                    )}
                  </div>

                  {/* Coverage indicator */}
                  {dayItems.length > 0 && mode === 'week' && (
                    <div className="absolute bottom-1 right-1 flex gap-0.5">
                      {dayItems.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            item.priority === 'high' ? 'bg-red-400' :
                            item.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Analytics sidebar */}
        <AnalyticsSidebar
          items={items}
          open={analyticsOpen}
          onToggle={() => setAnalyticsOpen(!analyticsOpen)}
        />
      </div>

      {/* Weekly coverage summary */}
      <Card className="border-border/50">
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Couverture de la semaine
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{weekItems.length} éléments</span>
              <span className="text-muted-foreground">
                sur 5 jours ouvrés
              </span>
              <div className="flex gap-0.5 ml-2">
                {Array.from({ length: 5 }, (_, i) => {
                  const day = addDays(weekStart, i);
                  const hasContent = getItemsForDate(day).length > 0;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'w-6 h-2 rounded-sm',
                        hasContent ? 'bg-primary' : 'bg-muted'
                      )}
                      title={format(day, 'EEEE', { locale: fr })}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item Detail Dialog */}
      <ItemDetailDialog
        item={selectedItem}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedItem(null); }}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
        onGoToCreatePost={handleGoToCreatePost}
      />
    </div>
  );
}
