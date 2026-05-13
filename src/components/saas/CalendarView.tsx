'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Inbox,
  List,
  Grid3X3,
  Download,
  Loader2,
} from 'lucide-react';
import EmptyState from './EmptyState';
import { toast } from 'sonner';
import type { Post } from '@/types';
import { POST_STATUS_LABELS, POST_STATUS_COLORS } from '@/types';
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
  startOfWeek as getStartOfWeek,
  endOfWeek as getEndOfWeek,
  parseISO,
} from 'date-fns';
import { fr } from 'date-fns/locale';

type CalendarMode = 'month' | 'week';

interface CalendarData {
  posts: Post[];
  unscheduledPosts: Post[];
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function PostPill({ post, onClick }: { post: Post; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-2 py-1 rounded-md text-[11px] font-medium truncate transition-all duration-150 hover:shadow-sm cursor-pointer',
        POST_STATUS_COLORS[post.status]
      )}
      title={`${post.subject} — ${POST_STATUS_LABELS[post.status]}`}
    >
      {post.subject}
    </button>
  );
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<CalendarMode>('month');
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const setView = useAppStore((s) => s.setView);
  const selectPost = useAppStore((s) => s.selectPost);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const result = await apiFetch<CalendarData>(
        `/api/posts/calendar?year=${year}&month=${month}`
      );
      setData(result);
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handlePostClick = (post: Post) => {
    selectPost(post.id);
    setView('post-detail');
  };

  const handleDayClick = (date: Date) => {
    // Pre-fill scheduled date and go to create post
    const dateStr = format(date, "yyyy-MM-dd'T'HH:mm");
    selectPost(null);
    setView('create-post');
    // Store the pre-fill date in sessionStorage for CreatePostForm to pick up
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('prefill_scheduledDate', dateStr);
    }
  };

  const goToPrev = () => {
    setCurrentDate((d) => mode === 'month' ? subMonths(d, 1) : subWeeks(d, 1));
  };

  const goToNext = () => {
    setCurrentDate((d) => mode === 'month' ? addMonths(d, 1) : addWeeks(d, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getPostsForDate = (date: Date): Post[] => {
    if (!data) return [];
    return data.posts.filter((post) => {
      if (!post.scheduledDate) return false;
      return isSameDay(parseISO(post.scheduledDate), date);
    });
  };

  // Generate month grid days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Generate week days
  const weekStart = getStartOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = getEndOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const displayDays = mode === 'month' ? monthDays : weekDays;
  const unscheduled = data?.unscheduledPosts || [];
  const scheduledCount = data?.posts?.length || 0;

  const headerLabel =
    mode === 'month'
      ? `${MONTH_LABELS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : `Semaine du ${format(weekStart, 'd MMM', { locale: fr })} au ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`;

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md mx-auto" />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);
              try {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                const from = new Date(year, month - 1, 1).toISOString().split('T')[0];
                const to = new Date(year, month, 0).toISOString().split('T')[0];
                const params = new URLSearchParams({
                  status: 'scheduled',
                  fromDate: from,
                  toDate: to,
                  limit: '1000',
                });
                const token = useAppStore.getState().token;
                const res = await fetch(`/api/posts/export/csv?${params.toString()}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `planning_${MONTH_LABELS[currentDate.getMonth()].toLowerCase()}_${year}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Planning exporté');
              } catch {
                toast.error('Erreur lors de l\'export');
              } finally {
                setDownloading(false);
              }
            }}
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Exporter
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd&apos;hui
          </Button>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={mode === 'month' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-none"
              onClick={() => setMode('month')}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={mode === 'week' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-none"
              onClick={() => setMode('week')}
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Main Grid */}
        <Card className="border-border/50 overflow-hidden">
          {scheduledCount === 0 && unscheduled.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-6 h-6" />}
              title="Aucun post ce mois"
              description="Planifiez vos publications pour ce mois"
              action={{
                label: 'Créer un post',
                onClick: () => handleDayClick(new Date()),
                icon: <Plus className="w-3.5 h-3.5" />,
              }}
            />
          ) : (
            <>
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
            mode === 'month' ? 'auto-rows-fr' : 'auto-rows-[200px] md:auto-rows-[300px]'
          )}>
            {displayDays.map((day, idx) => {
              const dayPosts = getPostsForDate(day);
              const inMonth = mode === 'month' ? isSameMonth(day, currentDate) : true;

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'border-b border-r border-border/30 p-1.5 min-h-[80px] md:min-h-[100px] transition-colors',
                    !inMonth && 'bg-muted/20',
                    isToday(day) && 'bg-primary/5',
                  )}
                >
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
                        onClick={() => handleDayClick(day)}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                        title="Créer un post ce jour"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5 group">
                    {dayPosts.slice(0, mode === 'month' ? 3 : 10).map((post) => (
                      <PostPill
                        key={post.id}
                        post={post}
                        onClick={() => handlePostClick(post)}
                      />
                    ))}
                    {dayPosts.length > (mode === 'month' ? 3 : 10) && (
                      <p className="text-[10px] text-muted-foreground pl-2">
                        +{dayPosts.length - (mode === 'month' ? 3 : 10)} autres
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
            </>
          )}
        </Card>

        {/* Unscheduled Posts Sidebar */}
        <Card className="border-border/50 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Inbox className="w-4 h-4 text-muted-foreground" />
              Non planifiés
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {unscheduled.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {unscheduled.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <CalendarDays className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p>Tous les posts sont planifiés</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <div className="divide-y divide-border/30">
                  {unscheduled.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => handlePostClick(post)}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{post.subject}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px]', POST_STATUS_COLORS[post.status])}
                        >
                          {POST_STATUS_LABELS[post.status]}
                        </Badge>
                        {post.author && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {post.author.name}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile: list view for small screens */}
      <div className="lg:hidden space-y-2">
        {unscheduled.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Inbox className="w-4 h-4 text-muted-foreground" />
                Non planifiés ({unscheduled.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30 max-h-[300px] overflow-y-auto">
                {unscheduled.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => handlePostClick(post)}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{post.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px]', POST_STATUS_COLORS[post.status])}
                      >
                        {POST_STATUS_LABELS[post.status]}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
