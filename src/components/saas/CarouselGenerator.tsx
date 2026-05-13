'use client';

import { useState, useCallback, useRef } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  FileDown,
  Download,
  PenSquare,
  Type,
  AlignLeft,
  Quote,
  Hash,
  MousePointerClick,
  Palette,
  User,
  Briefcase,
  ChevronDown,
  Eye,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================

interface Slide {
  id: string;
  heading: string;
  body: string;
  type: 'title' | 'content' | 'quote' | 'stat' | 'cta';
}

interface Branding {
  primaryColor: string;
  fontName: string;
  authorName: string;
  authorTitle: string;
}

const TONE_OPTIONS = [
  { value: 'professionnel', label: 'Professionnel' },
  { value: 'inspirant', label: 'Inspirant' },
  { value: 'educatif', label: 'Educatif' },
  { value: 'humoristique', label: 'Humoristique' },
  { value: 'provocateur', label: 'Provocateur' },
];

const SLIDE_COUNT_OPTIONS = [
  { value: '5', label: '5 diapositives' },
  { value: '7', label: '7 diapositives' },
  { value: '10', label: '10 diapositives' },
];

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Roboto Mono', label: 'Roboto Mono' },
  { value: 'DM Sans', label: 'DM Sans' },
];

const SLIDE_TYPE_CONFIG: Record<Slide['type'], { label: string; icon: React.ReactNode; color: string }> = {
  title: { label: 'Titre', icon: <Type className="w-3.5 h-3.5" />, color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400' },
  content: { label: 'Contenu', icon: <AlignLeft className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
  quote: { label: 'Citation', icon: <Quote className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  stat: { label: 'Statistique', icon: <Hash className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  cta: { label: 'CTA', icon: <MousePointerClick className="w-3.5 h-3.5" />, color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' },
};

const DEFAULT_BRANDING: Branding = {
  primaryColor: '#1E3A8A',
  fontName: 'Inter',
  authorName: '',
  authorTitle: '',
};

let slideIdCounter = 0;
function createSlide(overrides?: Partial<Slide>): Slide {
  slideIdCounter++;
  return {
    id: `slide-${Date.now()}-${slideIdCounter}`,
    heading: '',
    body: '',
    type: 'content',
    ...overrides,
  };
}

// ============================================================
// SortableSlideItem
// ============================================================

function SortableSlideItem({
  slide,
  index,
  onUpdate,
  onDelete,
}: {
  slide: Slide;
  index: number;
  onUpdate: (id: string, updates: Partial<Slide>) => void;
  onDelete?: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const typeConfig = SLIDE_TYPE_CONFIG[slide.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative rounded-lg border border-border/50 bg-card hover:border-border transition-all duration-200"
    >
      {/* Drag handle & slide number */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <div className="flex-1" />
        <Select
          value={slide.type}
          onValueChange={(v) => onUpdate(slide.id, { type: v as Slide['type'] })}
        >
          <SelectTrigger className="h-6 w-auto text-[11px] gap-1 px-2 py-0 border-0 bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SLIDE_TYPE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key} className="text-xs">
                <span className="flex items-center gap-1.5">
                  {cfg.icon}
                  {cfg.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className={`text-[10px] ${typeConfig.color} border-0`}>
          {typeConfig.label}
        </Badge>
        {onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onDelete(slide.id)}
                className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Supprimer</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Slide content */}
      <div className="p-3 space-y-2">
        <Input
          placeholder={
            slide.type === 'title' ? 'Titre principal...' :
            slide.type === 'stat' ? 'Chiffre clé (ex: 87%)...' :
            slide.type === 'quote' ? 'Auteur de la citation...' :
            'Titre de la diapositive...'
          }
          value={slide.heading}
          onChange={(e) => onUpdate(slide.id, { heading: e.target.value })}
          className="h-8 text-sm font-medium border-border/40 bg-background/50"
        />
        <Textarea
          placeholder={
            slide.type === 'cta' ? 'Appelez à l\'action (ex: Abonnez-vous pour plus de contenu)...' :
            slide.type === 'quote' ? 'Texte de la citation...' :
            slide.type === 'stat' ? 'Description de la statistique...' :
            'Contenu principal (max 40 mots)...'
          }
          value={slide.body}
          onChange={(e) => onUpdate(slide.id, { body: e.target.value })}
          rows={2}
          className="text-sm resize-none border-border/40 bg-background/50"
        />
      </div>
    </div>
  );
}

// ============================================================
// SlidePreview - mini preview of a single slide
// ============================================================

function SlidePreview({
  slide,
  branding,
  index,
  total,
}: {
  slide: Slide;
  branding: Branding;
  index: number;
  total: number;
}) {
  const isLight = index % 2 !== 0;
  const typeConfig = SLIDE_TYPE_CONFIG[slide.type];

  // Simplified CSS preview
  const darkBg = `linear-gradient(135deg, ${branding.primaryColor}dd, ${branding.primaryColor})`;
  const lightBg = `linear-gradient(135deg, ${branding.primaryColor}15, ${branding.primaryColor}08)`;

  return (
    <div
      className="relative aspect-square rounded-lg overflow-hidden border border-border/50 shadow-sm"
      style={{ background: isLight ? lightBg : darkBg }}
    >
      {/* Slide number badge */}
      <div className="absolute top-1.5 right-1.5">
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-black/20 text-white/70">
          {index + 1}/{total}
        </span>
      </div>

      {/* Type badge */}
      <div className="absolute top-1.5 left-1.5">
        <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${typeConfig.color}`}>
          {typeConfig.label}
        </span>
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
        {slide.type === 'stat' ? (
          <>
            <p
              className="text-lg font-bold leading-tight"
              style={{ color: branding.primaryColor }}
            >
              {slide.heading || '87%'}
            </p>
            <p className="text-[9px] text-muted-foreground mt-1 line-clamp-3">
              {slide.body || 'Description'}
            </p>
          </>
        ) : slide.type === 'quote' ? (
          <>
            <p className="text-2xl text-primary/20 leading-none">&ldquo;</p>
            <p
              className="text-[10px] font-medium mt-1 line-clamp-3"
              style={{ color: isLight ? '#1a1a1a' : '#fff' }}
            >
              {slide.body || 'Citation...'}
            </p>
            <p className="text-[8px] mt-1" style={{ color: branding.primaryColor }}>
              {slide.heading || '— Auteur'}
            </p>
          </>
        ) : (
          <>
            <p
              className="text-[11px] font-bold leading-tight"
              style={{ color: isLight ? '#1a1a1a' : '#fff' }}
            >
              {slide.heading || 'Titre'}
            </p>
            <p
              className="text-[8px] mt-1 line-clamp-3"
              style={{ color: isLight ? '#666' : '#ccc' }}
            >
              {slide.body || 'Contenu...'}
            </p>
          </>
        )}
      </div>

      {/* Footer bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-5"
        style={{ background: `${branding.primaryColor}30` }}
      >
        <p className="text-[6px] text-center py-0.5 truncate px-2" style={{ color: branding.primaryColor }}>
          {branding.authorName || 'Votre nom'}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Main CarouselGenerator Component
// ============================================================

export default function CarouselGenerator() {
  const setView = useAppStore((s) => s.setView);
  const user = useAppStore((s) => s.user);

  // AI generation state
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professionnel');
  const [slideCount, setSlideCount] = useState('7');
  const [aiLoading, setAiLoading] = useState(false);

  // Slides state
  const [slides, setSlides] = useState<Slide[]>([]);

  // Branding state
  const [branding, setBranding] = useState<Branding>({
    ...DEFAULT_BRANDING,
    authorName: user?.name || '',
    authorTitle: user?.role === 'admin' ? 'Administrateur' : user?.role === 'editor' ? 'Editeur' : '',
  });

  // PDF state
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  // Show preview panel
  const [showPreview, setShowPreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ---- AI Generate ----
  const handleAIGenerate = useCallback(async () => {
    if (!topic.trim()) {
      toast.error('Entrez un sujet pour le carrousel');
      return;
    }
    setAiLoading(true);
    try {
      const data = await apiFetch<{
        slides: Array<{ heading: string; body: string; type: string }>;
        title: string;
        description: string;
      }>('/api/carousel/ai-generate', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim(),
          slideCount: Number(slideCount),
          tone,
          language: 'fr',
        }),
      });

      const mappedSlides: Slide[] = data.slides.map((s) =>
        createSlide({
          heading: s.heading,
          body: s.body,
          type: (s.type as Slide['type']) || 'content',
        })
      );

      setSlides(mappedSlides);
      setPdfBase64(null);
      toast.success(`${mappedSlides.length} diapositives générées par l'IA`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de la génération IA");
      }
    } finally {
      setAiLoading(false);
    }
  }, [topic, tone, slideCount]);

  // ---- Slide CRUD ----
  const updateSlide = useCallback((id: string, updates: Partial<Slide>) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const deleteSlide = useCallback((id: string) => {
    setSlides((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length > 0 && filtered[0].type !== 'title') {
        filtered[0] = { ...filtered[0], type: 'title' };
      }
      if (filtered.length > 1) {
        filtered[filtered.length - 1] = { ...filtered[filtered.length - 1], type: 'cta' };
      }
      return filtered;
    });
    setPdfBase64(null);
    toast.info('Diapositive supprimée');
  }, []);

  const addSlide = useCallback((type?: Slide['type']) => {
    const newSlide = createSlide({
      type: type || 'content',
      heading: 'Nouvelle diapositive',
      body: 'Contenu ici...',
    });
    setSlides((prev) => {
      const updated = [...prev];
      // Insert before last (CTA) slide if exists
      if (updated.length > 1 && updated[updated.length - 1].type === 'cta') {
        updated.splice(updated.length - 1, 0, newSlide);
      } else {
        updated.push(newSlide);
      }
      return updated;
    });
    setPdfBase64(null);
    toast.info('Diapositive ajoutée');
  }, []);

  // ---- Drag & Drop ----
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSlides((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setPdfBase64(null);
  }, []);

  // ---- PDF Generate ----
  const handleGeneratePDF = useCallback(async () => {
    if (slides.length === 0) {
      toast.error('Générez ou créez des diapositives d\'abord');
      return;
    }

    if (!branding.authorName.trim()) {
      toast.error('Entrez votre nom dans la section branding');
      return;
    }

    setPdfLoading(true);
    try {
      const data = await apiFetch<{
        success: boolean;
        base64: string;
        slideCount: number;
        filename: string;
      }>('/api/carousel/generate', {
        method: 'POST',
        body: JSON.stringify({
          slides: slides.map(({ id: _id, ...rest }) => rest),
          style: 'professional',
          branding,
        }),
      });

      setPdfBase64(data.base64);
      setPdfFilename(data.filename);
      toast.success(`Carrousel PDF généré (${data.slideCount} diapositives)`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      } else {
        toast.error('Erreur lors de la génération du PDF');
      }
    } finally {
      setPdfLoading(false);
    }
  }, [slides, branding]);

  // ---- Download PDF ----
  const handleDownload = useCallback(() => {
    if (!pdfBase64) return;

    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${pdfBase64}`;
    link.download = pdfFilename || 'carousel-linkedin.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Téléchargement lancé');
  }, [pdfBase64, pdfFilename]);

  // ---- Create post with carousel ----
  const handleCreatePost = useCallback(() => {
    setView('create-post');
  }, [setView]);

  // ---- Reset ----
  const handleReset = useCallback(() => {
    setSlides([]);
    setPdfBase64(null);
    setPdfFilename('');
    setTopic('');
    toast.info('Carrousel réinitialisé');
  }, []);

  const hasContent = slides.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Générateur de Carrousels</h2>
            <p className="text-sm text-muted-foreground">
              Créez des carrousels LinkedIn professionnels avec l&apos;IA
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ====== LEFT PANEL - Content Editor ====== */}
        <div className="lg:col-span-3 space-y-4">
          {/* AI Generation Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Génération IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Topic */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Sujet du carrousel</Label>
                <Input
                  placeholder="Ex: Les 7 tendances IA qui transforment le marketing en 2025"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={aiLoading}
                  className="h-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAIGenerate();
                    }
                  }}
                />
              </div>

              {/* Tone & Count */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Ton</Label>
                  <Select value={tone} onValueChange={setTone} disabled={aiLoading}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Nombre de slides</Label>
                  <Select value={slideCount} onValueChange={setSlideCount} disabled={aiLoading}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SLIDE_COUNT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Generate button */}
              <Button
                onClick={handleAIGenerate}
                disabled={aiLoading || !topic.trim()}
                className="w-full h-10"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Générer avec l&apos;IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Slides Editor */}
          {hasContent && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlignLeft className="w-4 h-4 text-muted-foreground" />
                    Diapositives
                    <Badge variant="secondary" className="text-xs">
                      {slides.length}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => addSlide('content')}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Ajouter
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ajouter une diapositive</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1.5 text-muted-foreground"
                          onClick={handleReset}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Réinitialiser</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={slides.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                      <AnimatePresence mode="popLayout">
                        {slides.map((slide, index) => (
                          <motion.div
                            key={slide.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                          >
                            <SortableSlideItem
                              slide={slide}
                              index={index}
                              onUpdate={updateSlide}
                              onDelete={slides.length > 2 ? deleteSlide : undefined}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Quick add buttons */}
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30">
                  <span className="text-[11px] text-muted-foreground mr-1">Ajouter :</span>
                  {(Object.entries(SLIDE_TYPE_CONFIG) as [Slide['type'], typeof SLIDE_TYPE_CONFIG[Slide['type']]][]).map(
                    ([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => addSlide(key)}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-border/40 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {cfg.icon}
                        {cfg.label}
                      </button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!hasContent && (
            <Card className="border-dashed border-2 border-border/40">
              <CardContent className="py-16 text-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mx-auto mb-4">
                  <Layers className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-base font-semibold text-muted-foreground mb-1">
                  Aucune diapositive
                </h3>
                <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto">
                  Entrez un sujet ci-dessus et laissez l&apos;IA générer votre carrousel, ou ajoutez des diapositives manuellement.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ====== RIGHT PANEL - Preview & Branding ====== */}
        <div className="lg:col-span-2 space-y-4">
          {/* Branding Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Color picker */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded border border-border/50"
                    style={{ backgroundColor: branding.primaryColor }}
                  />
                  Couleur principale
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
                    className="w-10 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={branding.primaryColor}
                    onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
                    className="h-9 flex-1 font-mono text-sm"
                    placeholder="#1E3A8A"
                    maxLength={7}
                  />
                </div>
              </div>

              {/* Font */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Police</Label>
                <Select
                  value={branding.fontName}
                  onValueChange={(v) => setBranding((b) => ({ ...b, fontName: v }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-3" />

              {/* Author */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Nom de l&apos;auteur
                </Label>
                <Input
                  placeholder="Votre nom"
                  value={branding.authorName}
                  onChange={(e) => setBranding((b) => ({ ...b, authorName: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  Titre / Fonction
                </Label>
                <Input
                  placeholder="Ex: CEO & Fondateur"
                  value={branding.authorTitle}
                  onChange={(e) => setBranding((b) => ({ ...b, authorTitle: e.target.value }))}
                  className="h-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  Aperçu
                </CardTitle>
                {hasContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? 'Masquer' : 'Afficher'}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPreview ? 'rotate-180' : ''}`} />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!hasContent ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground/60">
                    L&apos;aperçu apparaîtra ici
                  </p>
                </div>
              ) : showPreview ? (
                <div className="grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {slides.map((slide, index) => (
                    <SlidePreview
                      key={slide.id}
                      slide={slide}
                      branding={branding}
                      index={index}
                      total={slides.length}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {slides.slice(0, 6).map((slide, index) => (
                    <div
                      key={slide.id}
                      className="aspect-square rounded border border-border/40 flex items-center justify-center"
                      style={{
                        background: index % 2 === 0
                          ? `${branding.primaryColor}20`
                          : `${branding.primaryColor}08`,
                      }}
                    >
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                  {slides.length > 6 && (
                    <div className="aspect-square rounded border border-border/40 bg-muted/30 flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground">
                        +{slides.length - 6}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleGeneratePDF}
              disabled={pdfLoading || !hasContent || !branding.authorName.trim()}
              className="w-full h-11"
            >
              {pdfLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Génération du PDF...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Générer le carrousel PDF
                </>
              )}
            </Button>

            {pdfBase64 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="w-full h-10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger le PDF
                </Button>
                <Button
                  onClick={handleCreatePost}
                  variant="ghost"
                  className="w-full h-10"
                >
                  <PenSquare className="w-4 h-4 mr-2" />
                  Créer un post avec ce carrousel
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
