'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Plus,
  UserPlus,
  Search,
  Sparkles,
  RefreshCw,
  Trash2,
  Eye,
  ChevronLeft,
  ExternalLink,
  Send,
  MessageSquare,
  Star,
  TrendingUp,
  Target,
  Users,
  ArrowRight,
  Clock,
  Linkedin,
  Mail,
  X,
  Copy,
  Check,
  BarChart3,
  Zap,
  Loader2,
  Workflow,
} from 'lucide-react';
import EmptyState from './EmptyState';
import LeadScoringDashboard from '@/components/prospecting/LeadScoringDashboard';
import {
  PROSPECT_STATUS_LABELS,
  PROSPECT_STATUS_COLORS,
  PROSPECT_SOURCE_LABELS,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_COLORS,
} from '@/types';
import type {
  Prospect,
  ProspectStatus,
  OutreachMessage,
  OutreachCampaign,
} from '@/types';

/* ============================================================
   Score Bar Component
   ============================================================ */
function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : score >= 20 ? 'text-orange-600' : 'text-slate-500';
  const bgColor = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : score >= 20 ? 'bg-orange-500' : 'bg-slate-400';

  return (
    <div className="flex items-center gap-2 w-24">
      <Progress value={score} className="h-2 flex-1" />
      <span className={cn('text-xs font-semibold min-w-[24px]', color)}>{score}</span>
    </div>
  );
}

/* ============================================================
   Pipeline View
   ============================================================ */
const PIPELINE_STAGES: ProspectStatus[] = ['new', 'contacted', 'replied', 'interested', 'converted'];

function PipelineView({ prospects, onProspectClick }: { prospects: Prospect[]; onProspectClick: (p: Prospect) => void }) {
  const grouped = useMemo(() => {
    const map: Record<string, Prospect[]> = {};
    for (const stage of PIPELINE_STAGES) {
      map[stage] = prospects.filter(p => p.status === stage);
    }
    return map;
  }, [prospects]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {PIPELINE_STAGES.map(stage => (
        <div key={stage} className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge className={cn('text-[10px]', PROSPECT_STATUS_COLORS[stage])}>
              {PROSPECT_STATUS_LABELS[stage]}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">{grouped[stage].length}</span>
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {grouped[stage].length === 0 ? (
              <div className="p-3 border border-dashed border-border/50 rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground">Aucun prospect</p>
              </div>
            ) : (
              grouped[stage].map(p => (
                <Card
                  key={p.id}
                  className="cursor-pointer border-border/50 hover:border-primary/30 hover:shadow-sm transition-all p-2.5"
                  onClick={() => onProspectClick(p)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                      {p.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{p.fullName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.company || p.title || '-'}</p>
                    </div>
                    <span className={cn('text-[9px] font-semibold', p.score >= 70 ? 'text-emerald-600' : 'text-muted-foreground')}>
                      {p.score}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Add Prospect Dialog
   ============================================================ */
function AddProspectDialog({ onCreated, externalOpen, onExternalOpenChange }: {
  onCreated: () => void;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = externalOpen !== undefined;
  const open = controlled ? externalOpen : internalOpen;
  const setOpen = controlled ? (v: boolean) => onExternalOpenChange?.(v) : setInternalOpen;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    linkedinUrl: '',
    headline: '',
    company: '',
    title: '',
    notes: '',
  });

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.fullName.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/prospects', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Prospect ajouté');
      setOpen(false);
      setForm({ fullName: '', linkedinUrl: '', headline: '', company: '', title: '', notes: '' });
      onCreated();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Ajouter un prospect
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau prospect</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nom complet *</Label>
            <Input value={form.fullName} onChange={e => updateField('fullName', e.target.value)} placeholder="Jean Dupont" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Entreprise</Label>
              <Input value={form.company} onChange={e => updateField('company', e.target.value)} placeholder="TechCorp" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Titre / Poste</Label>
              <Input value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="CTO" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">URL LinkedIn</Label>
            <Input value={form.linkedinUrl} onChange={e => updateField('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Headline / Résumé</Label>
            <Input value={form.headline} onChange={e => updateField('headline', e.target.value)} placeholder="Expert en data science..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={2} />
          </div>
          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
            Ajouter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Generate Message Dialog
   ============================================================ */
function GenerateMessageDialog({ prospect, onMessageGenerated }: {
  prospect: Prospect;
  onMessageGenerated: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [tone, setTone] = useState('professional');
  const [goal, setGoal] = useState('connect');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await apiFetch<{ message: string }>('/api/outreach/generate', {
        method: 'POST',
        body: JSON.stringify({ prospectId: prospect.id, tone, goal }),
      });
      setGeneratedMessage(data.message);
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    onMessageGenerated(generatedMessage);
    setOpen(false);
    setGeneratedMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Générer message
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Message IA personnalisé</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Ton</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professionnel</SelectItem>
                  <SelectItem value="friendly">Amical</SelectItem>
                  <SelectItem value="casual">Décontracté</SelectItem>
                  <SelectItem value="persuasive">Persuasif</SelectItem>
                  <SelectItem value="empathetic">Empathique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Objectif</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="connect">Premier contact</SelectItem>
                  <SelectItem value="meeting">Obtenir un RDV</SelectItem>
                  <SelectItem value="demo">Proposer une démo</SelectItem>
                  <SelectItem value="partnership">Partenariat</SelectItem>
                  <SelectItem value="referral">Recommandation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
              {prospect.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium">{prospect.fullName}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {prospect.title}{prospect.title && prospect.company ? ' · ' : ''}{prospect.company}
              </p>
            </div>
          </div>

          {!generatedMessage ? (
            <Button onClick={handleGenerate} disabled={generating} variant="outline" className="w-full">
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Générer le message
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{generatedMessage}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleCopy} variant="outline" size="sm" className="gap-1.5 flex-1">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copié !' : 'Copier'}
                </Button>
                <Button onClick={handleSend} size="sm" className="gap-1.5 flex-1">
                  <Send className="w-3.5 h-3.5" />
                  Envoyer
                </Button>
                <Button onClick={() => setGeneratedMessage('')} variant="ghost" size="sm">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Add To Sequence Dialog
   ============================================================ */
function AddToSequenceDialog({ prospectId, onAssigned }: { prospectId: string; onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [sequences, setSequences] = useState<{ id: string; name: string; stepsCount: number; channel: string }[]>([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      try {
        const data = await apiFetch<{ sequences: any[] }>('/api/nurture/sequences');
        setSequences(data.sequences.filter((s: any) => s.isActive));
      } catch { /* silent */ }
    };
    fetch();
  }, [open]);

  const handleAssign = async () => {
    if (!selected) return;
    setAssigning(true);
    try {
      const data = await apiFetch<{ message: string }>('/api/nurture/prospects', {
        method: 'POST',
        body: JSON.stringify({ sequenceId: selected, prospectIds: [prospectId] }),
      });
      toast.success(data.message);
      setOpen(false);
      setSelected('');
      onAssigned();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Workflow className="w-3.5 h-3.5" />
          Ajouter à une séquence
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter à une séquence</DialogTitle>
          <DialogDescription>Choisissez une séquence de nurturing pour ce prospect.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Séquence</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Choisir une séquence..." />
              </SelectTrigger>
              <SelectContent>
                {sequences.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAssign} disabled={assigning || !selected} className="w-full">
            {assigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Ajouter à la séquence
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Prospect Detail Panel
   ============================================================ */
function ProspectDetail({
  prospect: initialProspect,
  onBack,
  onUpdated,
}: {
  prospect: Prospect;
  onBack: () => void;
  onUpdated: () => void;
}) {
  const [prospect, setProspect] = useState(initialProspect);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    status: prospect.status,
    notes: prospect.notes || '',
  });
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await apiFetch<{ messages: OutreachMessage[] }>(`/api/outreach?prospectId=${prospect.id}`);
      setMessages(data.messages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [prospect.id]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const handleScoreProspect = async () => {
    try {
      const data = await apiFetch<{ prospect: Prospect; newScore: number }>('/api/prospects/score', {
        method: 'POST',
        body: JSON.stringify({ prospectId: prospect.id }),
      });
      setProspect(prev => ({ ...prev, score: data.newScore }));
      toast.success(`Score mis à jour: ${data.newScore}`);
      onUpdated();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleStatusUpdate = async () => {
    setSavingStatus(true);
    try {
      const data = await apiFetch<{ prospect: Prospect }>('/api/prospects/' + prospect.id, {
        method: 'PUT',
        body: JSON.stringify({ status: editForm.status, notes: editForm.notes }),
      });
      setProspect(prev => ({ ...prev, status: data.prospect.status, notes: data.prospect.notes || '' }));
      setEditMode(false);
      toast.success('Prospect mis à jour');
      onUpdated();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSendMessage = async (content?: string) => {
    const msg = content || newMessage;
    if (!msg.trim()) return;
    setSending(true);
    try {
      const data = await apiFetch<{ message: OutreachMessage }>('/api/outreach', {
        method: 'POST',
        body: JSON.stringify({ prospectId: prospect.id, content: msg, channel: 'linkedin' }),
      });
      setMessages(prev => [data.message, ...prev]);
      setNewMessage('');
      toast.success('Message envoyé');

      // Auto-update status to contacted
      if (prospect.status === 'new') {
        const updated = await apiFetch<{ prospect: Prospect }>('/api/prospects/' + prospect.id, {
          method: 'PUT',
          body: JSON.stringify({ status: 'contacted' }),
        });
        setProspect(prev => ({ ...prev, status: updated.prospect.status }));
        onUpdated();
      }
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch('/api/prospects/' + prospect.id, { method: 'DELETE' });
      toast.success('Prospect supprimé');
      setDeleteOpen(false);
      onBack();
      onUpdated();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const tags = prospect.tags ? (() => { try { return JSON.parse(prospect.tags); } catch { return []; } })() : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ChevronLeft className="w-4 h-4" />
          Retour
        </Button>
      </div>

      {/* Profile Header */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {prospect.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold">{prospect.fullName}</h2>
                {prospect.title && <p className="text-sm text-muted-foreground">{prospect.title}</p>}
                {prospect.company && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {prospect.company}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {prospect.linkedinUrl && (
                <a href={prospect.linkedinUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              )}
              <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge className={cn('text-[10px]', PROSPECT_STATUS_COLORS[prospect.status as ProspectStatus])}>
              {PROSPECT_STATUS_LABELS[prospect.status as ProspectStatus]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {PROSPECT_SOURCE_LABELS[prospect.source as keyof typeof PROSPECT_SOURCE_LABELS] || prospect.source}
            </Badge>
            {prospect.lastContactedAt && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(prospect.lastContactedAt).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>

          {prospect.headline && (
            <p className="text-xs text-muted-foreground mt-3 italic">"{prospect.headline}"</p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-[9px]">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Score */}
          <div className="flex items-center gap-3 mt-4 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 flex-1">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium">Score</span>
              <ScoreBar score={prospect.score} />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={handleScoreProspect}>
              <RefreshCw className="w-3 h-3" />
              Auto-score
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <GenerateMessageDialog prospect={prospect} onMessageGenerated={handleSendMessage} />
        <AddToSequenceDialog prospectId={prospect.id} onAssigned={() => {}} />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setEditMode(!editMode)}
        >
          <Eye className="w-3.5 h-3.5" />
          Modifier
        </Button>
      </div>

      {/* Edit Panel */}
      {editMode && (
        <Card className="border-primary/30 bg-primary/[0.02]">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Statut</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(prev => ({ ...prev, status: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROSPECT_STATUS_LABELS) as ProspectStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{PROSPECT_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={editForm.notes} onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} className="text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleStatusUpdate} disabled={savingStatus}>
                {savingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Enregistrer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages / Outreach */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Messages ({messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {/* Compose */}
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              className="text-sm"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            />
            <Button size="sm" onClick={() => handleSendMessage()} disabled={sending || !newMessage.trim()}>
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          <Separator />

          {/* Messages List */}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-6">
              <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Aucun message échangé</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    'p-3 rounded-lg text-sm',
                    msg.direction === 'outbound'
                      ? 'bg-primary/[0.05] ml-8'
                      : 'bg-muted/50 mr-8'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {msg.direction === 'outbound' ? (
                        <Send className="w-3 h-3 text-primary" />
                      ) : (
                        <Mail className="w-3 h-3 text-emerald-500" />
                      )}
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {msg.direction === 'outbound' ? 'Envoyé' : 'Reçu'}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {msg.sentAt ? new Date(msg.sentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : new Date(msg.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les messages associés seront également supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================================================
   Main ProspectsView
   ============================================================ */
export default function ProspectsView() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [activeTab, setActiveTab] = useState('table');
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (search) params.set('search', search);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      params.set('sortBy', sortBy);
      params.set('sortOrder', 'desc');

      const data = await apiFetch<{
        prospects: Prospect[];
        statusCounts: Record<string, number>;
      }>('/api/prospects?' + params.toString());
      setProspects(data.prospects);
      setStatusCounts(data.statusCounts || {});
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, sortBy]);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  const handleQuickScore = async (prospectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScoringIds(prev => new Set(prev).add(prospectId));
    try {
      const data = await apiFetch<{ newScore: number }>('/api/prospects/score', {
        method: 'POST',
        body: JSON.stringify({ prospectId }),
      });
      setProspects(prev => prev.map(p =>
        p.id === prospectId ? { ...p, score: data.newScore } : p
      ));
      toast.success(`Score mis à jour : ${data.newScore}`);
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setScoringIds(prev => {
        const next = new Set(prev);
        next.delete(prospectId);
        return next;
      });
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = prospects.length;
    const contacted = statusCounts['contacted'] || 0;
    const replied = statusCounts['replied'] || 0;
    const converted = statusCounts['converted'] || 0;
    const conversionRate = contacted > 0 ? Math.round((converted / contacted) * 100) : 0;
    const avgScore = total > 0 ? Math.round(prospects.reduce((sum, p) => sum + p.score, 0) / total) : 0;
    return { total, contacted, replied, converted, conversionRate, avgScore };
  }, [prospects, statusCounts]);

  const handleSeedDemo = async () => {
    try {
      const demoProspects = [
        { fullName: 'Sophie Martin', company: 'DataViz Corp', title: 'CTO', headline: 'Passionnée par la data et l\'IA', linkedinUrl: 'https://linkedin.com/in/sophie-martin' },
        { fullName: 'Thomas Durand', company: 'TechScale', title: 'VP Engineering', headline: 'Building the future of scalable tech', linkedinUrl: 'https://linkedin.com/in/thomas-durand' },
        { fullName: 'Marie Leclerc', company: 'AI Solutions', title: 'Head of Data', headline: 'Data Scientist turned Leader', linkedinUrl: 'https://linkedin.com/in/marie-leclerc' },
        { fullName: 'Lucas Bernard', company: 'CloudFirst', title: 'Directeur Technique', headline: 'Cloud architecture enthusiast', linkedinUrl: 'https://linkedin.com/in/lucas-bernard' },
        { fullName: 'Emma Petit', company: 'GrowthLab', title: 'CEO', headline: 'Scaling B2B SaaS through data', linkedinUrl: 'https://linkedin.com/in/emma-petit' },
        { fullName: 'Alexandre Moreau', company: 'DataBridge', title: 'Data Engineer', headline: 'Pipelines, analytics & insights', linkedinUrl: 'https://linkedin.com/in/alexandre-moreau' },
        { fullName: 'Camille Dubois', company: 'AnalyticsPro', title: 'CMO', headline: 'Data-driven marketing leader', linkedinUrl: 'https://linkedin.com/in/camille-dubois' },
        { fullName: 'Hugo Roux', company: 'SaaSFactory', title: 'Product Manager', headline: 'Building products users love', linkedinUrl: 'https://linkedin.com/in/hugo-roux' },
      ];

      const data = await apiFetch<{ created: number }>('/api/prospects/bulk', {
        method: 'POST',
        body: JSON.stringify({ prospects: demoProspects }),
      });
      toast.success(`${data.created} prospects de démo ajoutés`);
      fetchProspects();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  // Detail view
  if (selectedProspect) {
    return (
      <div className="max-w-2xl mx-auto">
        <ProspectDetail
          prospect={selectedProspect}
          onBack={() => { setSelectedProspect(null); fetchProspects(); }}
          onUpdated={fetchProspects}
        />
      </div>
    );
  }

  // Loading
  if (loading && prospects.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Prospecting & CRM</h2>
          <p className="text-sm text-muted-foreground">Gérez vos prospects et relations commerciales</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeedDemo} className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Données démo
          </Button>
          <AddProspectDialog onCreated={fetchProspects} externalOpen={showAddDialog} onExternalOpenChange={setShowAddDialog} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total prospects</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Contactés</p>
                <p className="text-xl font-bold">{stats.contacted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Réponses</p>
                <p className="text-xl font-bold">{stats.replied}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Taux conversion</p>
                <p className="text-xl font-bold">{stats.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Tabs */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un prospect..."
                className="pl-8 h-9 text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-full sm:w-[160px] text-sm">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {(Object.keys(PROSPECT_STATUS_LABELS) as ProspectStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{PROSPECT_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-full sm:w-[140px] text-sm">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt">Dernière activité</SelectItem>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="name">Nom</SelectItem>
                <SelectItem value="company">Entreprise</SelectItem>
                <SelectItem value="createdAt">Date de création</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="h-8">
              <TabsTrigger value="table" className="text-xs gap-1">
                <Table className="w-3 h-3" />
                Tableau
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="text-xs gap-1">
                <ArrowRight className="w-3 h-3" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="scoring" className="text-xs gap-1">
                <BarChart3 className="w-3 h-3" />
                Scoring
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="mt-4">
              {prospects.length === 0 ? (
                <Card className="border-border/50">
                  <EmptyState
                    icon={<UserPlus className="w-6 h-6" />}
                    title="Aucun prospect"
                    description="Ajoutez vos premiers prospects pour commencer votre prospection"
                    action={{
                      label: 'Ajouter un prospect',
                      onClick: () => setShowAddDialog(true),
                      icon: <Plus className="w-3.5 h-3.5" />,
                    }}
                  />
                </Card>
              ) : (
                <div className="overflow-x-auto max-h-[300px] sm:max-h-[500px] overflow-y-auto">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Prospect</TableHead>
                        <TableHead className="text-xs">Entreprise</TableHead>
                        <TableHead className="text-xs">Statut</TableHead>
                        <TableHead className="text-xs">Score</TableHead>
                        <TableHead className="text-xs">Dernier contact</TableHead>
                        <TableHead className="text-xs w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prospects.map(p => (
                        <TableRow
                          key={p.id}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => setSelectedProspect(p)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                {p.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{p.fullName}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{p.title || '-'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs truncate max-w-[140px]">{p.company || '-'}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-[9px]', PROSPECT_STATUS_COLORS[p.status as ProspectStatus])}>
                              {PROSPECT_STATUS_LABELS[p.status as ProspectStatus]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <ScoreBar score={p.score} />
                          </TableCell>
                          <TableCell>
                            <span className="text-[10px] text-muted-foreground">
                              {p.lastContactedAt
                                ? new Date(p.lastContactedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                                : '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/30"
                                onClick={(e) => handleQuickScore(p.id, e)}
                                disabled={scoringIds.has(p.id)}
                                title="Score IA"
                              >
                                {scoringIds.has(p.id) ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Zap className="w-3.5 h-3.5" />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelectedProspect(p); }}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pipeline" className="mt-4">
              <PipelineView prospects={prospects} onProspectClick={setSelectedProspect} />
            </TabsContent>

            <TabsContent value="scoring" className="mt-4">
              <LeadScoringDashboard />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
