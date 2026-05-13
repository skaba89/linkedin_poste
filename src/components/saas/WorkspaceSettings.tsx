'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2,
  Users,
  Plus,
  Trash2,
  Loader2,
  Crown,
  Shield,
  UserCircle,
  Eye,
  CheckCircle2,
  XCircle,
  Pencil,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Workspace, WorkspaceMember, WorkspaceMemberRole } from '@/types';
import { WORKSPACE_ROLE_LABELS, WORKSPACE_ROLE_COLORS } from '@/types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const roleIcons: Record<WorkspaceMemberRole, React.ReactNode> = {
  owner: <Crown className="w-3 h-3" />,
  admin: <Shield className="w-3 h-3" />,
  member: <UserCircle className="w-3 h-3" />,
  viewer: <Eye className="w-3 h-3" />,
};

export default function WorkspaceSettings() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const data = await apiFetch<{ workspaces: Workspace[] }>('/api/workspaces');
      setWorkspaces(data.workspaces);
      if (data.workspaces.length > 0 && !selectedId) {
        setSelectedId(data.workspaces[0].id);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const selected = workspaces.find((w) => w.id === selectedId);

  const handleCreated = () => {
    fetchWorkspaces();
  };

  const handleDeleted = () => {
    setSelectedId(null);
    fetchWorkspaces();
  };

  const handleUpdated = () => {
    fetchWorkspaces();
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Espaces de travail
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Gérez vos espaces de travail et les membres de votre équipe.
        </p>
      </CardHeader>
      <CardContent>
        {workspaces.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border/50 rounded-lg">
            <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">Aucun espace de travail</p>
            <p className="text-xs text-muted-foreground/60 mb-4">
              Créez votre premier espace pour collaborer avec votre équipe.
            </p>
            <CreateWorkspaceDialog onCreated={handleCreated}>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Créer un espace
              </Button>
            </CreateWorkspaceDialog>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            {/* Workspace List */}
            <div className="md:w-56 shrink-0 space-y-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setSelectedId(ws.id)}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left',
                    ws.id === selectedId
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  {ws.logoUrl ? (
                    <img src={ws.logoUrl} alt={ws.name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-bold">
                        {getInitials(ws.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ws.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {ws.memberCount} membre{ws.memberCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  {ws.role === 'owner' && (
                    <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                </button>
              ))}
              <CreateWorkspaceDialog onCreated={handleCreated}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nouvel espace
                </Button>
              </CreateWorkspaceDialog>
            </div>

            <Separator orientation="vertical" className="hidden md:block" />

            {/* Workspace Details */}
            <div className="flex-1 min-w-0">
              {selected ? (
                <WorkspaceDetail
                  workspace={selected}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ) : (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  Sélectionnez un espace de travail
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Create Workspace Dialog
   ============================================================ */
function CreateWorkspaceDialog({
  children,
  onCreated,
}: {
  children: React.ReactNode;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await apiFetch('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      toast.success('Espace de travail créé avec succès');
      setName('');
      setDescription('');
      setOpen(false);
      onCreated();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className={cn('cursor-pointer')}>
        {children}
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel espace de travail</DialogTitle>
          <DialogDescription>
            Créez un espace pour organiser votre équipe et vos comptes LinkedIn.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-ws-name">Nom de l&apos;espace *</Label>
            <Input
              id="create-ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mon agence"
              required
              disabled={loading}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-ws-desc">Description</Label>
            <Textarea
              id="create-ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle..."
              disabled={loading}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Plus className="w-4 h-4 mr-1.5" />
              )}
              Créer l&apos;espace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Workspace Detail
   ============================================================ */
function WorkspaceDetail({
  workspace,
  onUpdated,
  onDeleted,
}: {
  workspace: Workspace;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/workspaces/${workspace.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      toast.success('Espace de travail mis à jour');
      setEditing(false);
      onUpdated();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const canEdit = workspace.role === 'owner' || workspace.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Workspace Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Informations
          </h3>
          {canEdit && !editing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setEditing(true)}
            >
              <Pencil className="w-3 h-3" />
              Modifier
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
                rows={3}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()} className="gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Enregistrer
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-border/50 bg-muted/30 space-y-2">
            <p className="text-sm font-medium">{workspace.name}</p>
            {workspace.description && (
              <p className="text-sm text-muted-foreground">{workspace.description}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="secondary" className={cn('text-[10px]', WORKSPACE_ROLE_COLORS[workspace.role])}>
                {roleIcons[workspace.role]}
                <span className="ml-1">{WORKSPACE_ROLE_LABELS[workspace.role]}</span>
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                Créé le {new Date(workspace.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Members */}
      <MembersSection workspace={workspace} canManage={canEdit} onUpdated={onUpdated} />

      {/* Danger Zone */}
      {workspace.role === 'owner' && (
        <div className="space-y-3">
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Zone de danger
            </h3>
            <p className="text-xs text-muted-foreground">
              La suppression d&apos;un espace de travail est irréversible. Tous les membres seront retirés.
            </p>
            <DeleteWorkspaceDialog
              workspaceName={workspace.name}
              workspaceId={workspace.id}
              onDeleted={onDeleted}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Members Section
   ============================================================ */
function MembersSection({
  workspace,
  canManage,
  onUpdated,
}: {
  workspace: Workspace;
  canManage: boolean;
  onUpdated: () => void;
}) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('member');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<WorkspaceMember | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await apiFetch<{ members: WorkspaceMember[] }>(
        `/api/workspaces/${workspace.id}/members`
      );
      setMembers(data.members);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await apiFetch(`/api/workspaces/${workspace.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      });
      toast.success('Membre invité avec succès');
      setInviteEmail('');
      setInviteRole('member');
      setInviteOpen(false);
      fetchMembers();
      onUpdated();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setUpdatingId(memberId);
    try {
      await apiFetch(`/api/workspaces/${workspace.id}/members`, {
        method: 'PATCH',
        body: JSON.stringify({ memberId, role: newRole }),
      });
      toast.success('Rôle mis à jour');
      fetchMembers();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async () => {
    if (!removingMember) return;
    try {
      await apiFetch(`/api/workspaces/${workspace.id}/members`, {
        method: 'DELETE',
        body: JSON.stringify({ memberId: removingMember.id }),
      });
      toast.success('Membre retiré');
      setRemoveConfirmOpen(false);
      setRemovingMember(null);
      fetchMembers();
      onUpdated();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Membres ({members.length})
        </h3>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setInviteOpen(true)}
          >
            <UserCircle className="w-3 h-3" />
            Inviter un membre
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : members.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border/50 rounded-lg">
          <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucun membre</p>
          {canManage && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              Invitez des membres pour collaborer.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Membre</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Rôle</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Rejoint le</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-[9px] bg-primary/15 text-primary font-bold">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          {member.name}
                          {!member.isActive && (
                            <Badge variant="secondary" className="text-[9px] bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                              Inactif
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canManage && member.role !== 'owner' ? (
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleRoleChange(member.id, v)}
                        disabled={updatingId === member.id}
                      >
                        <SelectTrigger className="w-[130px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['admin', 'member', 'viewer'] as WorkspaceMemberRole[]).map((r) => (
                            <SelectItem key={r} value={r}>
                              <span className="flex items-center gap-1.5">
                                {roleIcons[r]}
                                {WORKSPACE_ROLE_LABELS[r]}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary" className={cn('text-[10px] gap-1', WORKSPACE_ROLE_COLORS[member.role])}>
                        {roleIcons[member.role]}
                        {WORKSPACE_ROLE_LABELS[member.role]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setRemovingMember(member);
                          setRemoveConfirmOpen(true);
                        }}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter un membre</DialogTitle>
            <DialogDescription>
              Invitez un utilisateur existant à rejoindre l&apos;espace de travail &laquo; {workspace.name} &raquo;.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Adresse email *</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="utilisateur@exemple.com"
                  required
                  disabled={inviting}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                L&apos;utilisateur doit déjà avoir un compte sur la plateforme.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={inviteRole} onValueChange={setInviteRole} disabled={inviting}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['admin', 'member', 'viewer'] as WorkspaceMemberRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      <span className="flex items-center gap-1.5">
                        {roleIcons[r]}
                        {WORKSPACE_ROLE_LABELS[r]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
                Annuler
              </Button>
              <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                {inviting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Plus className="w-4 h-4 mr-1.5" />
                )}
                Inviter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {removingMember && (
                <>
                  Vous êtes sur le point de retirer <strong>{removingMember.name}</strong> ({removingMember.email}) de l&apos;espace de travail.
                  Cette action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRemovingMember(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================================================
   Delete Workspace Dialog
   ============================================================ */
function DeleteWorkspaceDialog({
  workspaceName,
  workspaceId,
  onDeleted,
}: {
  workspaceName: string;
  workspaceId: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (confirmText !== workspaceName) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/workspaces/${workspaceId}`, { method: 'DELETE' });
      toast.success('Espace de travail supprimé');
      setOpen(false);
      setConfirmText('');
      onDeleted();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="w-3.5 h-3.5" />
        Supprimer l&apos;espace de travail
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer l&apos;espace de travail ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Tous les membres seront retirés et les données associées à cet espace pourront ne plus être accessibles.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label className="text-xs">
            Tapez <strong className="font-mono bg-destructive/10 px-1 rounded">{workspaceName}</strong> pour confirmer :
          </Label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={workspaceName}
            disabled={deleting}
            className="text-sm"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText('')}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting || confirmText !== workspaceName}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
