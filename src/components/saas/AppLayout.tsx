'use client';

import { useEffect, useCallback, Suspense, useState, useMemo, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/use-app-store';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  FileText,
  PenSquare,
  Settings,
  ScrollText,
  Menu,
  LogOut,
  Moon,
  Sun,
  Plus,
  Linkedin,
  X,
  CalendarDays,
  BookTemplate,
  Search,
  Clock,
  BarChart3,
  FlaskConical,
  Users,
  Mic,
  Lightbulb,
  Check,
  Bell,
  CheckCheck,
  MessageSquare,
  AlertCircle,
  Send,
  XCircle,
  Info,
  AtSign,
  HelpCircle,
  Keyboard,
} from 'lucide-react';
import type { AppView, User, Post, Notification as NotificationType } from '@/types';
import LoginPage from './LoginPage';
import DashboardView from './DashboardView';
import PostsList from './PostsList';
import CreatePostForm from './CreatePostForm';
import PostDetail from './PostDetail';
import CalendarView from './CalendarView';
import PromptLibraryView from './PromptLibraryView';
import SettingsView from './SettingsView';
import AuditLogsView from './AuditLogsView';
import AnalyticsView from './AnalyticsView';
import ABTestingView from './ABTestingView';
import CompetitorWatchView from './CompetitorWatchView';
import BrandVoiceView from './BrandVoiceView';
import ContentIdeasView from './ContentIdeasView';
import OnboardingFlow from './OnboardingFlow';
import ShortcutsHelpDialog from './ShortcutsHelpDialog';
import UserProfileDialog from './UserProfileDialog';

/* ============================================================
   AnimateViewMount wrapper
   ============================================================ */
function AnimateViewMount({ children, viewKey }: { children: React.ReactNode; viewKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* ============================================================
   Command Palette
   ============================================================ */
function CommandPalette({ onShowShortcuts }: { onShowShortcuts?: () => void }) {
  const [open, setOpen] = useState(false);
  const setView = useAppStore((s) => s.setView);
  const selectPost = useAppStore((s) => s.selectPost);
  const user = useAppStore((s) => s.user);

  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await apiFetch<{ posts: Post[]; pagination: { totalPages: number } }>(
          `/api/posts?search=${encodeURIComponent(query.trim())}&limit=5`
        );
        setSearchResults(data.posts);
      } catch {
        // silent
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const views: { view: AppView; label: string; icon: React.ReactNode }[] = [
    { view: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-4 h-4" /> },
    { view: 'posts', label: 'Posts', icon: <FileText className="w-4 h-4" /> },
    { view: 'create-post', label: 'Créer un post', icon: <PenSquare className="w-4 h-4" /> },
    { view: 'calendar', label: 'Calendrier', icon: <CalendarDays className="w-4 h-4" /> },
    { view: 'prompts', label: 'Bibliothèque de Prompts', icon: <BookTemplate className="w-4 h-4" /> },
    { view: 'settings', label: 'Paramètres', icon: <Settings className="w-4 h-4" /> },
    ...(((user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'validator')
      ? [{ view: 'audit-logs' as AppView, label: "Logs d'audit", icon: <ScrollText className="w-4 h-4" /> }]
      : []),
  ];

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Rechercher des posts, naviguer..."
        onValueChange={handleSearch}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? 'Recherche en cours...' : 'Aucun résultat trouvé'}
        </CommandEmpty>
        {searchResults.length > 0 && (
          <CommandGroup heading="Posts">
            {searchResults.map((post) => (
              <CommandItem
                key={post.id}
                value={post.subject}
                onSelect={() =>
                  runCommand(() => {
                    selectPost(post.id);
                    setView('post-detail');
                  })
                }
              >
                <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="truncate">{post.subject}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {searchResults.length > 0 && <CommandSeparator />}
        <CommandGroup heading="Navigation">
          {views.map((v) => (
            <CommandItem
              key={v.view}
              value={v.label}
              onSelect={() =>
                runCommand(() => {
                  if (v.view !== 'post-detail') selectPost(null);
                  setView(v.view);
                })
              }
            >
              {v.icon}
              <span>{v.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Aide">
          <CommandItem
            value="raccourcis clavier"
            onSelect={() => runCommand(() => onShowShortcuts?.())}
          >
            <Keyboard className="w-4 h-4 mr-2 text-muted-foreground" />
            <span>Raccourcis clavier</span>
            <span className="ml-auto text-xs text-muted-foreground">?</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/* ============================================================
   Nav items
   ============================================================ */
interface NavItem {
  view: AppView;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { view: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-4 h-4" /> },
  { view: 'posts', label: 'Posts', icon: <FileText className="w-4 h-4" /> },
  { view: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { view: 'ab-testing', label: 'A/B Tests', icon: <FlaskConical className="w-4 h-4" /> },
  { view: 'calendar', label: 'Calendrier', icon: <CalendarDays className="w-4 h-4" /> },
  { view: 'competitors', label: 'Concurrents', icon: <Users className="w-4 h-4" /> },
  { view: 'brand-voice', label: 'Brand Voice', icon: <Mic className="w-4 h-4" /> },
  { view: 'content-ideas', label: 'Idées', icon: <Lightbulb className="w-4 h-4" /> },
  { view: 'prompts', label: 'Prompts', icon: <BookTemplate className="w-4 h-4" /> },
  { view: 'create-post', label: 'Créer un post', icon: <PenSquare className="w-4 h-4" /> },
  { view: 'settings', label: 'Paramètres', icon: <Settings className="w-4 h-4" /> },
  { view: 'audit-logs', label: "Logs d'audit", icon: <ScrollText className="w-4 h-4" /> },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ============================================================
   Sidebar Nav (with badges)
   ============================================================ */
function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const currentView = useAppStore((s) => s.currentView);
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const selectPost = useAppStore((s) => s.selectPost);

  const canSeeAudit = (user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'validator';

  const filteredNav = navItems.filter(
    (item) => item.view !== 'audit-logs' || canSeeAudit
  );

  const handleNav = (view: AppView) => {
    setView(view);
    if (view !== 'post-detail') {
      selectPost(null);
    }
    onNavigate?.();
  };

  // Sidebar badge counts
  const [scheduledCount, setScheduledCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [scheduledRes, pendingRes] = await Promise.all([
          apiFetch<{ posts: Post[] }>('/api/posts?status=scheduled&limit=1'),
          apiFetch<{ posts: Post[] }>('/api/posts?status=pending_approval&limit=1'),
        ]);
        setScheduledCount((scheduledRes as any).pagination?.total ?? scheduledRes.posts?.length ?? 0);
        setPendingCount((pendingRes as any).pagination?.total ?? pendingRes.posts?.length ?? 0);
      } catch {
        // silently fail
      }
    };
    fetchCounts();
  }, [currentView]);

  const getBadge = (view: AppView) => {
    if (view === 'calendar' && scheduledCount > 0) {
      return (
        <Badge
          variant="secondary"
          className="ml-auto h-5 min-w-[20px] flex items-center justify-center px-1.5 text-[10px] bg-emerald-500/20 text-emerald-300"
        >
          {scheduledCount}
        </Badge>
      );
    }
    if (view === 'posts' && pendingCount > 0) {
      return (
        <Badge
          variant="secondary"
          className="ml-auto h-5 min-w-[20px] flex items-center justify-center px-1.5 text-[10px] bg-orange-500/20 text-orange-300"
        >
          {pendingCount}
        </Badge>
      );
    }
    return null;
  };

  return (
    <nav className="flex flex-col gap-1 px-3">
      {filteredNav.map((item) => (
        <button
          key={item.view}
          onClick={() => handleNav(item.view)}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            currentView === item.view
              ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)] shadow-sm'
              : 'text-[var(--sidebar-foreground)]/60 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50'
          )}
        >
          {item.icon}
          <span className="flex-1 text-left">{item.label}</span>
          {getBadge(item.view)}
        </button>
      ))}
    </nav>
  );
}

/* ============================================================
   Relative time helper
   ============================================================ */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'à l\'instant';
  if (diffMin < 60) return `il y a ${diffMin}min`;
  if (diffHr < 24) return `il y a ${diffHr}h`;
  if (diffDay < 7) return `il y a ${diffDay}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getNotificationIcon(type: string) {
  const cls = 'w-4 h-4 shrink-0';
  switch (type) {
    case 'post_approved': return <Check className={cn(cls, 'text-emerald-500')} />;
    case 'post_rejected': return <XCircle className={cn(cls, 'text-red-500')} />;
    case 'post_published': return <Send className={cn(cls, 'text-blue-500')} />;
    case 'post_failed': return <AlertCircle className={cn(cls, 'text-red-500')} />;
    case 'comment_added': return <MessageSquare className={cn(cls, 'text-amber-500')} />;
    case 'mention': return <AtSign className={cn(cls, 'text-violet-500')} />;
    default: return <Info className={cn(cls, 'text-slate-500')} />;
  }
}

/* ============================================================
   NotificationBell
   ============================================================ */
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const selectPost = useAppStore((s) => s.selectPost);
  const setView = useAppStore((s) => s.setView);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiFetch<{ notifications: NotificationType[]; unreadCount: number }>(
        '/api/notifications'
      );
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent
    }
  }, []);

  // Fetch on mount & when popover opens
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Poll every 30 seconds for unread count
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch<{ unreadCount: number }>(
          '/api/notifications?unread=true'
        );
        setUnreadCount(data.unreadCount);
      } catch {
        // silent
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = useCallback(async (notification: NotificationType) => {
    if (notification.isRead) return;
    try {
      await apiFetch(`/api/notifications/${notification.id}`, { method: 'PUT' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
    }

    // Navigate to post if actionUrl exists
    if (notification.actionUrl) {
      const match = notification.actionUrl.match(/\/posts\/(.+)$/);
      if (match) {
        selectPost(match[1]);
        setView('post-detail');
      }
    }
  }, [selectPost, setView]);

  const markAllRead = useCallback(async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  const recentNotifications = notifications.slice(0, 10);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px] bg-red-500/10 text-red-600 dark:text-red-400">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Tout marquer comme lu
            </button>
          )}
        </div>

        <ScrollArea className="h-[320px]">
          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Les nouvelles notifications apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {recentNotifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => markAsRead(notification)}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 text-left w-full transition-colors hover:bg-muted/50 border-b border-border/30 last:border-b-0',
                    !notification.isRead && 'bg-primary/[0.03]'
                  )}
                >
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        'text-sm leading-tight truncate',
                        !notification.isRead ? 'font-semibold' : 'font-medium text-muted-foreground'
                      )}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

/* ============================================================
   Header
   ============================================================ */
function Header() {
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const setView = useAppStore((s) => s.setView);
  const selectPost = useAppStore((s) => s.selectPost);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const currentView = useAppStore((s) => s.currentView);
  const selectedPostId = useAppStore((s) => s.selectedPostId);
  const { theme, setTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleNewPost = () => {
    selectPost(null);
    setView('create-post');
  };

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (currentView === 'post-detail') {
      return [
        { label: 'Posts', view: 'posts' as AppView },
        { label: selectedPostId ? 'Détail du post' : 'Post', view: null },
      ];
    }
    return [];
  }, [currentView, selectedPostId]);

  const viewLabels: Record<AppView, string> = {
    dashboard: 'Tableau de bord',
    posts: 'Posts',
    analytics: 'Analytics',
    'ab-testing': 'A/B Tests',
    'create-post': 'Créer un post',
    'post-detail': selectedPostId ? 'Détail du post' : 'Post',
    calendar: 'Calendrier',
    prompts: 'Bibliothèque de Prompts',
    'brand-voice': 'Brand Voice',
    'content-ideas': 'Idées de Contenu',
    settings: 'Paramètres',
    'audit-logs': "Logs d'audit",
    competitors: 'Concurrents',
    login: '',
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-6 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8"
          onClick={toggleSidebar}
        >
          <Menu className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2">
          {breadcrumbs.length > 0 && (
            <>
              {breadcrumbs.map((crumb, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground/50 text-xs">/</span>}
                  {crumb.view ? (
                    <button
                      onClick={() => {
                        selectPost(null);
                        setView(crumb.view!);
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <h1 className="text-sm font-semibold">{crumb.label}</h1>
                  )}
                </div>
              ))}
            </>
          )}
          {breadcrumbs.length === 0 && (
            <h1 className="text-sm font-semibold">
              {viewLabels[currentView]}
            </h1>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Cmd+K Search */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hidden sm:flex"
              onClick={() => {
                // Trigger cmd+k
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', metaKey: true })
                );
              }}
            >
              <Search className="w-3.5 h-3.5" />
              Recherche...
              <kbd className="pointer-events-none ml-2 inline-flex h-5 items-center gap-1 rounded border border-border/60 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Recherche rapide (⌘K)</TooltipContent>
        </Tooltip>

        {((user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'editor') && currentView !== 'create-post' && (
          <Button
            size="sm"
            onClick={handleNewPost}
            className="h-8 text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nouveau post</span>
          </Button>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Changer de thème</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Changer de thème</TooltipContent>
        </Tooltip>

        <NotificationBell />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted/50 transition-colors"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {user?.name ? getInitials(user.name) : 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-sm font-medium max-w-[140px] truncate">
            {user?.name}
          </span>
        </button>

        <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Se déconnecter</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

/* ============================================================
   View Router
   ============================================================ */
function ViewRouter() {
  const currentView = useAppStore((s) => s.currentView);

  const view = (() => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'posts':
        return <PostsList />;
      case 'analytics':
        return <AnalyticsView />;
      case 'ab-testing':
        return <ABTestingView />;
      case 'create-post':
        return <CreatePostForm />;
      case 'post-detail':
        return <PostDetail />;
      case 'calendar':
        return <CalendarView />;
      case 'prompts':
        return <PromptLibraryView />;
      case 'settings':
        return <SettingsView />;
      case 'audit-logs':
        return <AuditLogsView />;
      case 'competitors':
        return <CompetitorWatchView />;
      case 'brand-voice':
        return <BrandVoiceView />;
      case 'content-ideas':
        return <ContentIdeasView />;
      default:
        return null;
    }
  })();

  return <AnimateViewMount viewKey={currentView}>{view}</AnimateViewMount>;
}

/* ============================================================
   AppLayout (main export)
   ============================================================ */
export default function AppLayout() {
  const currentView = useAppStore((s) => s.currentView);
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setToken = useAppStore((s) => s.setToken);
  const setView = useAppStore((s) => s.setView);
  const token = useAppStore((s) => s.token);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useKeyboardShortcuts({
    onToggleShortcuts: () => setShortcutsOpen((o) => !o),
    shortcutsOpen,
  });

  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);
  const setOnboardingCompletedMain = useAppStore((s) => s.setOnboardingCompleted);

  const checkAuth = useCallback(async () => {
    if (!token) {
      setView('login');
      return;
    }
    try {
      const data = await apiFetch<{ user: User }>('/api/auth/me');
      setUser(data.user);
      setView('dashboard');
    } catch {
      setUser(null);
      setToken(null);
      setView('login');
    }
  }, [token, setUser, setToken, setView]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show login page if not authenticated
  if (currentView === 'login' || !user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-[240px] md:flex-col md:fixed md:inset-y-0 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] z-40">
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-[var(--sidebar-border)]">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-primary">
            <Linkedin className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold gradient-text">
            DataSphere
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav />
        </div>

        {/* Branding footer */}
        <div className="space-y-1">
          <div className="px-4 py-3 border-t border-[var(--sidebar-border)]">
            <div className="flex items-center gap-2.5 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--sidebar-foreground)] truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>
          {/* Aide button */}
          <div className="px-4 py-2">
            <button
              onClick={() => setOnboardingCompletedMain(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[var(--sidebar-foreground)]/60 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50 transition-all duration-200 w-full"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Aide</span>
            </button>
          </div>
          <div className="px-5 pb-3">
            <p className="text-[10px] text-muted-foreground font-medium">DataSphere Innovation</p>
            <p className="text-[9px] text-muted-foreground/60">v2.0</p>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[260px] p-0 bg-[var(--sidebar)] border-[var(--sidebar-border)]">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--sidebar-border)]">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-primary">
                <Linkedin className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold gradient-text">
                DataSphere
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="py-4">
            <SidebarNav onNavigate={() => setSidebarOpen(false)} />
          </div>
          <div className="px-4 py-2 border-t border-[var(--sidebar-border)]">
            <button
              onClick={() => {
                setOnboardingCompletedMain(false);
                setSidebarOpen(false);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[var(--sidebar-foreground)]/60 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50 transition-all duration-200 w-full"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Aide</span>
            </button>
          </div>
          <div className="px-5 pb-3">
            <p className="text-[10px] text-muted-foreground font-medium">DataSphere Innovation</p>
            <p className="text-[9px] text-muted-foreground/60">v2.0</p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 md:ml-[240px] flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-4 md:p-6">
          <ViewRouter />
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette onShowShortcuts={() => setShortcutsOpen(true)} />

      {/* Shortcuts Help Dialog */}
      <ShortcutsHelpDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Onboarding Overlay */}
      {!onboardingCompleted && user && (
        <OnboardingFlow />
      )}
    </div>
  );
}
