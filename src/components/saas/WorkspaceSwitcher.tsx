'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Plus,
  ChevronsUpDown,
  Check,
  Loader2,
  Users,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Workspace } from '@/types';
import { WORKSPACE_ROLE_LABELS, WORKSPACE_ROLE_COLORS } from '@/types';

const WORKSPACE_COOKIE = 'lp_workspace_id';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [open, setOpen] = useState(false);

  // Create workspace dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const fetchWorkspaces = useCallback(async () => {
    try {
      const data = await apiFetch<{ workspaces: Workspace[] }>('/api/workspaces');
      setWorkspaces(data.workspaces);

      // Get current workspace from cookie
      const cookieVal = document.cookie
        .split('; ')
        .find((row) => row.startsWith(WORKSPACE_COOKIE + '='))
        ?.split('=')[1];

      if (cookieVal && data.workspaces.some((w) => w.id === cookieVal)) {
        setCurrentWorkspaceId(cookieVal);
      } else if (data.workspaces.length > 0) {
        setCurrentWorkspaceId(data.workspaces[0].id);
      }
    } catch {
      // silent - backward compatible
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleSwitch = async (workspaceId: string) => {
    if (workspaceId === currentWorkspaceId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await apiFetch(`/api/workspaces/${workspaceId}/switch`, { method: 'POST' });
      setCurrentWorkspaceId(workspaceId);
      document.cookie = `${WORKSPACE_COOKIE}=${workspaceId};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      toast.success('Espace de travail changé');
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setSwitching(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreateLoading(true);
    try {
      await apiFetch('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
        }),
      });
      toast.success('Espace de travail créé');
      setNewName('');
      setNewDescription('');
      setCreateOpen(false);
      fetchWorkspaces();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Chargement...</span>
        </div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="px-3 py-2">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-auto py-2 px-2 text-sm font-medium text-[var(--sidebar-foreground)]/60 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50"
            >
              <Building2 className="w-4 h-4" />
              <span>Créer un espace de travail</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel espace de travail</DialogTitle>
              <DialogDescription>
                Créez votre premier espace de travail pour gérer votre équipe.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ws-name">Nom</Label>
                <Input
                  id="ws-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Mon agence"
                  required
                  disabled={createLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-desc">Description</Label>
                <Textarea
                  id="ws-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Description optionnelle..."
                  disabled={createLoading}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={createLoading}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1.5" />
                  )}
                  Créer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
              'text-[var(--sidebar-foreground)] hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50'
            )}
          >
            {currentWorkspace?.logoUrl ? (
              <img
                src={currentWorkspace.logoUrl}
                alt={currentWorkspace.name}
                className="w-5 h-5 rounded object-cover"
              />
            ) : (
              <Avatar className="w-5 h-5 h-5">
                <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-bold">
                  {currentWorkspace ? getInitials(currentWorkspace.name) : '?'}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="flex-1 text-left truncate">{currentWorkspace?.name || 'Espaces'}</span>
            {switching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start" side="right">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Espaces de travail
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSwitch(ws.id)}
                className={cn(
                  'flex items-center gap-2.5 w-full px-2 py-2 rounded-md text-sm transition-colors',
                  ws.id === currentWorkspaceId
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                disabled={switching}
              >
                {ws.logoUrl ? (
                  <img src={ws.logoUrl} alt={ws.name} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[9px] bg-primary/15 text-primary font-bold">
                      {getInitials(ws.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{ws.name}</p>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className={cn('text-[9px] px-1 py-0', WORKSPACE_ROLE_COLORS[ws.role])}
                    >
                      {WORKSPACE_ROLE_LABELS[ws.role]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {ws.memberCount} membre{ws.memberCount > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                {ws.id === currentWorkspaceId && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>

          <Separator className="my-1.5" />

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <button
                className="flex items-center gap-2.5 w-full px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                onClick={() => setOpen(false)}
              >
                <Plus className="w-4 h-4" />
                <span>Nouvel espace de travail</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvel espace de travail</DialogTitle>
                <DialogDescription>
                  Créez un nouvel espace pour organiser votre équipe.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ws-name-2">Nom</Label>
                  <Input
                    id="ws-name-2"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Mon agence"
                    required
                    disabled={createLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-desc-2">Description</Label>
                  <Textarea
                    id="ws-desc-2"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Description optionnelle..."
                    disabled={createLoading}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                    disabled={createLoading}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={createLoading}>
                    {createLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    ) : (
                      <Plus className="w-4 h-4 mr-1.5" />
                    )}
                    Créer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </PopoverContent>
      </Popover>
    </div>
  );
}
