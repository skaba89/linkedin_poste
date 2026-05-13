'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Plus,
  Workflow,
  Search,
  Sparkles,
  RefreshCw,
  Trash2,
  Eye,
  Pause,
  Play,
  Square,
  Send,
  Users,
  Clock,
  Linkedin,
  Mail,
  MessageSquare,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  GripVertical,
  X,
  Copy,
  Check,
  Loader2,
  Zap,
  Target,
  ListChecks,
  AlertCircle,
} from 'lucide-react';
import EmptyState from './EmptyState';

/* ============================================================
   Types
   ============================================================ */
interface SequenceStep {
  delay: string;
  channel: string;
  type: string;
  template: string;
  aiGenerated: boolean;
}

interface NurtureSequence {
  id: string;
  name: string;
  description?: string;
  channel: string;
  steps: SequenceStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stepsCount: number;
  activeProspects: number;
}

interface ProspectSequence {
  id: string;
  prospectId: string;
  sequenceId: string;
  currentStep: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  totalSteps: number;
  progress: number;
  lastAction: { status: string; sentAt?: string } | null;
  prospect: {
    id: string;
    fullName: string;
    company?: string;
    title?: string;
    status: string;
    score: number;
  };
  sequence: {
    id: string;
    name: string;
    channel: string;
  };
  totalStepLogs: number;
}

interface NurtureStats {
  global: {
    totalSequences: number;
    activeSequences: number;
    totalProspectEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    repliedEnrollments: number;
    sentMessages: number;
    repliedMessages: number;
    failedMessages: number;
    responseRate: number;
    avgResponseTimeHours: number;
  };
  channelEffectiveness: {
    channel: string;
    sent: number;
    replied: number;
    responseRate: number;
  }[];
  bestSequences: {
    id: string;
    name: string;
    channel: string;
    totalProspects: number;
    activeProspects: number;
    completedProspects: number;
    sent: number;
    replied: number;
    responseRate: number;
  }[];
  funnel: { stage: string; count: number; color: string }[];
}

/* ============================================================
   Constants
   ============================================================ */
const CHANNEL_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  email: 'Email',
  whatsapp: 'WhatsApp',
  mixed: 'Multi-canal',
};

const CHANNEL_COLORS: Record<string, string> = {
  linkedin: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  email: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  whatsapp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  mixed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const CHANNEL_ICONS: Record<string, any> = {
  linkedin: Linkedin,
  email: Mail,
  whatsapp: MessageSquare,
  mixed: Send,
};

const PS_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'En pause',
  completed: 'Terminée',
  stopped: 'Arrêtée',
  replied: 'Répondu',
};

const PS_STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  stopped: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  replied: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};

const DELAY_OPTIONS = [
  { value: '0d', label: 'Immédiat (J+0)' },
  { value: '1d', label: '1 jour (J+1)' },
  { value: '2d', label: '2 jours (J+2)' },
  { value: '3d', label: '3 jours (J+3)' },
  { value: '4d', label: '4 jours (J+4)' },
  { value: '5d', label: '5 jours (J+5)' },
  { value: '7d', label: '7 jours (J+7)' },
  { value: '10d', label: '10 jours (J+10)' },
  { value: '14d', label: '14 jours (J+14)' },
  { value: '15d', label: '15 jours (J+15)' },
  { value: '21d', label: '21 jours (J+21)' },
  { value: '30d', label: '30 jours (J+30)' },
];

/* ============================================================
   Create Sequence Dialog
   ============================================================ */
function CreateSequenceDialog({ onCreated, editSequence }: {
  onCreated: () => void;
  editSequence?: NurtureSequence | null;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    channel: 'linkedin',
  });
  const [steps, setSteps] = useState<SequenceStep[]>([
    { delay: '0d', channel: 'linkedin', type: 'message', template: '', aiGenerated: true },
  ]);

  useEffect(() => {
    if (editSequence && open) {
      setForm({
        name: editSequence.name,
        description: editSequence.description || '',
        channel: editSequence.channel,
      });
      setSteps(editSequence.steps.length > 0 ? editSequence.steps : [
        { delay: '0d', channel: 'linkedin', type: 'message', template: '', aiGenerated: true },
      ]);
    }
  }, [editSequence, open]);

  const addStep = () => {
    setSteps(prev => [...prev, {
      delay: '3d',
      channel: form.channel,
      type: 'message',
      template: '',
      aiGenerated: true,
    }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof SequenceStep, value: string | boolean) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const handleGenerateTemplate = async (index: number) => {
    setGeneratingIndex(index);
    try {
      const data = await apiFetch<{ message: string }>('/api/nurture/generate', {
        method: 'POST',
        body: JSON.stringify({
          sequenceName: form.name,
          stepIndex: index,
          stepTemplate: steps[index].template || `Génère un message pour l'étape ${index + 1} de la séquence ${form.name}`,
        }),
      });
      updateStep(index, 'template', data.message);
      toast.success('Message généré avec succès');
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setGeneratingIndex(null);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    for (const step of steps) {
      if (!step.template.trim()) {
        toast.error('Chaque étape doit avoir un modèle de message');
        return;
      }
    }
    setSaving(true);
    try {
      if (editSequence) {
        await apiFetch(`/api/nurture/sequences/${editSequence.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...form, steps }),
        });
        toast.success('Séquence mise à jour');
      } else {
        await apiFetch('/api/nurture/sequences', {
          method: 'POST',
          body: JSON.stringify({ ...form, steps }),
        });
        toast.success('Séquence créée');
      }
      setOpen(false);
      setForm({ name: '', description: '', channel: 'linkedin' });
      setSteps([{ delay: '0d', channel: 'linkedin', type: 'message', template: '', aiGenerated: true }]);
      onCreated();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v && !editSequence) { setForm({ name: '', description: '', channel: 'linkedin' }); setSteps([{ delay: '0d', channel: 'linkedin', type: 'message', template: '', aiGenerated: true }]); } }}>
      <DialogTrigger asChild>
        {editSequence ? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            Modifier
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Créer une séquence
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editSequence ? 'Modifier la séquence' : 'Nouvelle séquence de nurturing'}</DialogTitle>
          <DialogDescription>
            {editSequence ? 'Modifiez les paramètres et les étapes de votre séquence.' : 'Créez une séquence de nurturing automatisée pour vos prospects.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom de la séquence *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Séquence Prospection Standard" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Canal principal</Label>
              <Select value={form.channel} onValueChange={v => setForm(p => ({ ...p, channel: v }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="mixed">Multi-canal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Décrivez l'objectif de cette séquence..." />
          </div>

          <Separator />

          {/* Steps Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                Étapes de la séquence ({steps.length})
              </Label>
              <Button variant="outline" size="sm" className="gap-1" onClick={addStep}>
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </Button>
            </div>

            {/* Timeline Preview */}
            <div className="relative pl-4 space-y-2">
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  <div className="absolute left-[-10px] top-4 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  <Card className="border-border/50 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">Étape {index + 1}</Badge>
                        <Select value={step.delay} onValueChange={v => updateStep(index, 'delay', v)}>
                          <SelectTrigger className="h-7 w-[130px] text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DELAY_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={step.channel} onValueChange={v => updateStep(index, 'channel', v)}>
                          <SelectTrigger className="h-7 w-[110px] text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStep(index, 'up')} disabled={index === 0}>
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStep(index, 'down')} disabled={index === steps.length - 1}>
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeStep(index)} disabled={steps.length <= 1}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Textarea
                        value={step.template}
                        onChange={e => updateStep(index, 'template', e.target.value)}
                        rows={3}
                        className="text-xs flex-1"
                        placeholder="Modèle de message... Utilisez {firstName}, {company}, etc."
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1 text-xs"
                        onClick={() => handleGenerateTemplate(index)}
                        disabled={generatingIndex === index}
                      >
                        {generatingIndex === index ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        IA
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={step.aiGenerated}
                        onCheckedChange={v => updateStep(index, 'aiGenerated', v)}
                        className="scale-75"
                      />
                      <span className="text-[10px] text-muted-foreground">Personnalisation IA activée</span>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
            {editSequence ? 'Mettre à jour' : 'Créer la séquence'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Assign to Sequence Dialog
   ============================================================ */
function AssignSequenceDialog({ onAssigned }: { onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [sequences, setSequences] = useState<NurtureSequence[]>([]);
  const [prospects, setProspects] = useState<{ id: string; fullName: string; company?: string }[]>([]);
  const [selectedSequence, setSelectedSequence] = useState('');
  const [selectedProspects, setSelectedProspects] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      try {
        const [seqData, prospData] = await Promise.all([
          apiFetch<{ sequences: NurtureSequence[] }>('/api/nurture/sequences'),
          apiFetch<{ prospects: { id: string; fullName: string; company?: string }[] }>('/api/prospects?limit=100'),
        ]);
        setSequences(seqData.sequences.filter(s => s.isActive));
        setProspects(prospData.prospects);
      } catch {
        // silent
      }
    };
    fetchData();
  }, [open]);

  const toggleProspect = (id: string) => {
    setSelectedProspects(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (!selectedSequence || selectedProspects.length === 0) {
      toast.error('Séquence et prospects requis');
      return;
    }
    setAssigning(true);
    try {
      const data = await apiFetch<{ message: string }>('/api/nurture/prospects', {
        method: 'POST',
        body: JSON.stringify({ sequenceId: selectedSequence, prospectIds: selectedProspects }),
      });
      toast.success(data.message);
      setOpen(false);
      setSelectedProspects([]);
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
          <Users className="w-3.5 h-3.5" />
          Assigner des prospects
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assigner à une séquence</DialogTitle>
          <DialogDescription>Sélectionnez une séquence et les prospects à y ajouter.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Séquence</Label>
            <Select value={selectedSequence} onValueChange={setSelectedSequence}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Choisir une séquence..." />
              </SelectTrigger>
              <SelectContent>
                {sequences.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.stepsCount} étapes)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Prospects ({selectedProspects.length} sélectionné{selectedProspects.length > 1 ? 's' : ''})
            </Label>
            <div className="border border-border/50 rounded-lg max-h-48 overflow-y-auto">
              {prospects.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Aucun prospect disponible
                </div>
              ) : (
                prospects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => toggleProspect(p.id)}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors border-b border-border/30 last:border-b-0',
                      selectedProspects.includes(p.id) && 'bg-primary/5'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                      selectedProspects.includes(p.id)
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/30'
                    )}>
                      {selectedProspects.includes(p.id) && <Check className="w-3 h-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{p.fullName}</p>
                      {p.company && <p className="text-muted-foreground truncate">{p.company}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <Button onClick={handleAssign} disabled={assigning || !selectedSequence || selectedProspects.length === 0} className="w-full">
            {assigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Assigner {selectedProspects.length} prospect{selectedProspects.length > 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Tab 1: Séquences
   ============================================================ */
function SequencesTab({ sequences, loading, onRefresh }: {
  sequences: NurtureSequence[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/nurture/sequences/${deleteId}`, { method: 'DELETE' });
      toast.success('Séquence supprimée');
      setDeleteId(null);
      onRefresh();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleToggleActive = async (seq: NurtureSequence) => {
    try {
      await apiFetch(`/api/nurture/sequences/${seq.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !seq.isActive }),
      });
      toast.success(seq.isActive ? 'Séquence désactivée' : 'Séquence activée');
      onRefresh();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleSeedDefault = async () => {
    try {
      const data = await apiFetch<{ message: string }>('/api/nurture/seed', { method: 'POST' });
      toast.success(data.message);
      onRefresh();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleProcess = async () => {
    try {
      const data = await apiFetch<{ message: string }>('/api/nurture/process', { method: 'POST' });
      toast.success(data.message);
      onRefresh();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <CreateSequenceDialog onCreated={onRefresh} />
        <AssignSequenceDialog onAssigned={onRefresh} />
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSeedDefault}>
          <Sparkles className="w-3.5 h-3.5" />
          Séquences par défaut
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleProcess}>
          <Zap className="w-3.5 h-3.5" />
          Traiter en attente
        </Button>
      </div>

      {sequences.length === 0 ? (
        <EmptyState
          icon={<Workflow className="w-8 h-8" />}
          title="Aucune séquence"
          description="Créez votre première séquence de nurturing ou utilisez les séquences par défaut."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sequences.map(seq => {
            const ChannelIcon = CHANNEL_ICONS[seq.channel] || Send;
            return (
              <Card key={seq.id} className={cn('border-border/50 transition-all', !seq.isActive && 'opacity-60')}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold truncate">{seq.name}</h3>
                      {seq.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{seq.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Switch
                        checked={seq.isActive}
                        onCheckedChange={() => handleToggleActive(seq)}
                        className="scale-75"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn('text-[10px]', CHANNEL_COLORS[seq.channel])}>
                      <ChannelIcon className="w-3 h-3 mr-1" />
                      {CHANNEL_LABELS[seq.channel]}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {seq.stepsCount} étape{seq.stepsCount > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Prospects actifs</p>
                        <p className="text-sm font-semibold">{seq.activeProspects}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Dernière màj</p>
                        <p className="text-xs font-medium">{new Date(seq.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Steps Timeline Mini */}
                  <div className="space-y-1">
                    {seq.steps.slice(0, 3).map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground font-medium">{step.delay}</span>
                        <span className="text-muted-foreground/60 truncate">{step.template.substring(0, 50)}...</span>
                      </div>
                    ))}
                    {seq.steps.length > 3 && (
                      <p className="text-[10px] text-muted-foreground pl-3.5">+{seq.steps.length - 3} autre{seq.steps.length - 3 > 1 ? 's' : ''} étape{seq.steps.length - 3 > 1 ? 's' : ''}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <CreateSequenceDialog onCreated={onRefresh} editSequence={seq} />
                    <Button variant="outline" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(seq.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette séquence ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les prospects assignés à cette séquence seront retirés. Cette action est irréversible.
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
   Tab 2: Prospects en séquence
   ============================================================ */
function ProspectSequencesTab({ loading, onRefresh }: {
  loading: boolean;
  onRefresh: () => void;
}) {
  const [prospectSequences, setProspectSequences] = useState<ProspectSequence[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const initializedRef = useRef(false);

  const fetchProspectSequences = useCallback(async (status?: string) => {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.set('status', status);
      const data = await apiFetch<{ prospectSequences: ProspectSequence[] }>(
        `/api/nurture/prospect-sequences?${params.toString()}`
      );
      setProspectSequences(data.prospectSequences);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      queueMicrotask(() => fetchProspectSequences('all'));
    }
  }, []);

  const handleFilterChange = (value: string) => {
    setFilterStatus(value);
    fetchProspectSequences(value);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiFetch(`/api/nurture/prospect-sequences/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast.success(`Statut mis à jour : ${PS_STATUS_LABELS[status] || status}`);
      fetchProspectSequences();
      onRefresh();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/nurture/prospect-sequences/${id}`, { method: 'DELETE' });
      toast.success('Assignation supprimée');
      fetchProspectSequences();
      onRefresh();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  if (loading) {
    return <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-[400px]" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={filterStatus} onValueChange={handleFilterChange}>
          <SelectTrigger className="h-9 w-full sm:w-[180px] text-sm">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">En pause</SelectItem>
            <SelectItem value="completed">Terminée</SelectItem>
            <SelectItem value="stopped">Arrêtée</SelectItem>
            <SelectItem value="replied">Répondu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {prospectSequences.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="Aucun prospect en séquence"
          description="Assignez des prospects à vos séquences pour commencer le nurturing."
        />
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Prospect</TableHead>
                <TableHead className="text-xs">Séquence</TableHead>
                <TableHead className="text-xs">Progression</TableHead>
                <TableHead className="text-xs">Statut</TableHead>
                <TableHead className="text-xs">Dernière action</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prospectSequences.map(ps => (
                <TableRow key={ps.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{ps.prospect.fullName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {ps.prospect.title}{ps.prospect.title && ps.prospect.company ? ' · ' : ''}{ps.prospect.company}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {CHANNEL_ICONS[ps.sequence.channel] && (() => { const Icon = CHANNEL_ICONS[ps.sequence.channel]; return <Icon className="w-3 h-3 mr-0.5" />; })()}
                        {ps.sequence.name}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-24">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-muted-foreground">{ps.currentStep}/{ps.totalSteps}</span>
                        <span className="text-[10px] font-medium">{ps.progress}%</span>
                      </div>
                      <Progress value={ps.progress} className="h-1.5" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-[10px]', PS_STATUS_COLORS[ps.status] || 'bg-slate-100 text-slate-700')}>
                      {PS_STATUS_LABELS[ps.status] || ps.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ps.lastAction?.sentAt ? (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(ps.lastAction.sentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      {ps.status === 'active' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStatusChange(ps.id, 'paused')} title="Pause">
                          <Pause className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {ps.status === 'paused' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStatusChange(ps.id, 'active')} title="Reprendre">
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {(ps.status === 'active' || ps.status === 'paused') && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleStatusChange(ps.id, 'stopped')} title="Arrêter">
                          <Square className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(ps.id)} title="Retirer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Tab 3: Statistiques
   ============================================================ */
function StatsTab({ loading }: { loading: boolean }) {
  const [stats, setStats] = useState<NurtureStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiFetch<NurtureStats>('/api/nurture/stats');
        setStats(data);
      } catch {
        // silent
      }
    };
    fetchStats();
  }, [loading]);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  const g = stats.global;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Workflow className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Séquences actives</p>
                <p className="text-xl font-bold">{g.activeSequences}</p>
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
                <p className="text-[10px] text-muted-foreground">Messages envoyés</p>
                <p className="text-xl font-bold">{g.sentMessages}</p>
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
                <p className="text-[10px] text-muted-foreground">Taux de réponse</p>
                <p className="text-xl font-bold">{g.responseRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Temps de réponse moy.</p>
                <p className="text-xl font-bold">{g.avgResponseTimeHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="w-4 h-4" />
            Pipeline de conversion
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-end gap-4 justify-center">
            {stats.funnel.map((stage, i) => {
              const maxCount = Math.max(...stats.funnel.map(s => s.count), 1);
              const height = Math.max((stage.count / maxCount) * 120, 8);
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span className="text-sm font-bold">{stage.count}</span>
                  <div
                    className={cn('w-16 sm:w-20 rounded-t-md transition-all', stage.color)}
                    style={{ height: `${height}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground text-center">{stage.stage}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Best Performing Sequences */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Meilleures séquences
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {stats.bestSequences.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucune donnée disponible</p>
            ) : (
              stats.bestSequences.slice(0, 5).map((seq, i) => (
                <div key={seq.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{seq.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {seq.totalProspects} prospect{seq.totalProspects > 1 ? 's' : ''} · {seq.sent} envoyés
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'text-sm font-bold',
                      seq.responseRate >= 30 ? 'text-emerald-600' : seq.responseRate >= 15 ? 'text-amber-600' : 'text-muted-foreground'
                    )}>
                      {seq.responseRate}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">réponse</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Channel Effectiveness */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Send className="w-4 h-4" />
              Efficacité par canal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {stats.channelEffectiveness.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucune donnée disponible</p>
            ) : (
              stats.channelEffectiveness.map((ch) => {
                const ChannelIcon = CHANNEL_ICONS[ch.channel] || Send;
                return (
                  <div key={ch.channel} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', CHANNEL_COLORS[ch.channel])}>
                      <ChannelIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{CHANNEL_LABELS[ch.channel] || ch.channel}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1">
                          <Progress value={ch.responseRate} className="h-1.5" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{ch.sent} envoyés</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{ch.responseRate}%</p>
                      <p className="text-[10px] text-muted-foreground">réponse</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Row */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{g.totalProspectEnrollments}</p>
              <p className="text-[10px] text-muted-foreground">Total assignés</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{g.activeEnrollments}</p>
              <p className="text-[10px] text-muted-foreground">En cours</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-600">{g.repliedEnrollments}</p>
              <p className="text-[10px] text-muted-foreground">Réponses</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{g.completedEnrollments}</p>
              <p className="text-[10px] text-muted-foreground">Terminées</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{g.failedMessages}</p>
              <p className="text-[10px] text-muted-foreground">Échoués</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   Main NurtureSequencesView
   ============================================================ */
export default function NurtureSequencesView() {
  const [sequences, setSequences] = useState<NurtureSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sequences');

  const fetchSequences = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ sequences: NurtureSequence[] }>('/api/nurture/sequences');
      setSequences(data.sequences);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSequences(); }, [fetchSequences]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Workflow className="w-5 h-5" />
            Nurturing & Séquences
          </h2>
          <p className="text-sm text-muted-foreground">Automatisez vos relances et fidélisez vos prospects</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="sequences" className="text-xs gap-1.5">
            <Workflow className="w-3.5 h-3.5" />
            Séquences
          </TabsTrigger>
          <TabsTrigger value="prospects" className="text-xs gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Prospects en séquence
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sequences">
          <SequencesTab sequences={sequences} loading={loading} onRefresh={fetchSequences} />
        </TabsContent>

        <TabsContent value="prospects">
          <ProspectSequencesTab loading={loading} onRefresh={fetchSequences} />
        </TabsContent>

        <TabsContent value="stats">
          <StatsTab loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
