'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Link,
  ClipboardPaste,
  Sparkles,
  Copy,
  Download,
  RefreshCw,
  BookOpen,
  Target,
  BarChart3,
  Wrench,
  FileDown,
  Clock,
  Save,
  Loader2,
  Check,
  X,
  ArrowRight,
  RotateCcw,
  Eye,
  PenLine,
  History,
  AlertCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================

type SourceType = 'url' | 'text';
type DocumentFormat = 'summary' | 'analysis' | 'fiche_technique' | 'synthese' | 'guide_action';
type DocumentLanguage = 'fr' | 'en';

interface GeneratedDocument {
  document: string;
  title: string;
  format: string;
  wordCount: number;
  generationTimeMs: number;
  generatedAt: string;
}

interface HistoryItem {
  id: string;
  title: string;
  format: string;
  document: string;
  sourceExcerpt: string;
  generatedAt: string;
  wordCount: number;
}

// ============================================================
// Constants
// ============================================================

const FORMAT_OPTIONS: { value: DocumentFormat; icon: string; label: string; description: string }[] = [
  { value: 'summary', icon: '📋', label: 'Résumé', description: 'Points clés structurés' },
  { value: 'analysis', icon: '🔍', label: 'Analyse', description: 'Forces, faiblesses, opportunités' },
  { value: 'fiche_technique', icon: '🛠️', label: 'Fiche Technique', description: 'Concepts, technologies, architecture' },
  { value: 'synthese', icon: '📊', label: 'Synthèse Executive', description: 'Vue d\'ensemble + recommandations' },
  { value: 'guide_action', icon: '🎯', label: "Guide d'Action", description: 'Étapes concrètes et actionnables' },
];

const FORMAT_LABELS: Record<DocumentFormat, string> = {
  summary: 'Résumé',
  analysis: 'Analyse',
  fiche_technique: 'Fiche Technique',
  synthese: 'Synthèse',
  guide_action: "Guide d'Action",
};

const FORMAT_COLORS: Record<DocumentFormat, string> = {
  summary: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  analysis: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
  fiche_technique: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  synthese: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400',
  guide_action: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
};

const FOCUS_AREA_OPTIONS = [
  { value: 'Architecture', label: 'Architecture' },
  { value: 'Technologies', label: 'Technologies' },
  { value: 'Business', label: 'Business' },
  { value: 'Méthodologie', label: 'Méthodologie' },
  { value: 'Chiffres clés', label: 'Chiffres clés' },
];

// ============================================================
// Main Component
// ============================================================

export default function ArticleGeneratorView() {
  const [activeTab, setActiveTab] = useState('generate');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-100 to-violet-100 dark:from-cyan-950/50 dark:to-violet-950/50">
          <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Générateur de Documents</h2>
          <p className="text-sm text-muted-foreground">
            Transformez vos articles LinkedIn en documents structurés
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="generate" className="gap-1.5 text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 hidden sm:inline" />
            Générer un document
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
            <History className="w-4 h-4 hidden sm:inline" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <GeneratorPanel />
        </TabsContent>
        <TabsContent value="history">
          <HistoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Generator Panel
// ============================================================

function GeneratorPanel() {
  // Source state
  const [source, setSource] = useState<SourceType>('text');
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedContent, setExtractedContent] = useState('');

  // Generation options
  const [selectedFormat, setSelectedFormat] = useState<DocumentFormat>('summary');
  const [language, setLanguage] = useState<DocumentLanguage>('fr');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);
  const [editableTitle, setEditableTitle] = useState('');
  const [editedDocument, setEditedDocument] = useState('');

  const outputRef = useRef<HTMLDivElement>(null);

  // Sync title when generatedDoc changes
  useEffect(() => {
    if (generatedDoc) {
      setEditableTitle(generatedDoc.title);
      setEditedDocument(generatedDoc.document);
    }
  }, [generatedDoc]);

  // Scroll to output when generated
  useEffect(() => {
    if (generatedDoc && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [generatedDoc]);

  // Toggle focus area
  const toggleFocusArea = (area: string) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  // Handle URL extraction
  const handleExtractUrl = async () => {
    if (!url.trim()) {
      toast.error('Veuillez entrer une URL');
      return;
    }
    setExtracting(true);
    setExtractedContent('');
    try {
      const data = await apiFetch<GeneratedDocument>('/api/article-generator/generate', {
        method: 'POST',
        body: JSON.stringify({
          source: 'url',
          url: url.trim(),
          format: 'summary',
          language,
        }),
      });
      setExtractedContent(data.document);
      toast.success('Contenu extrait avec succès !');
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Erreur lors de l'extraction");
      }
    } finally {
      setExtracting(false);
    }
  };

  // Handle document generation
  const handleGenerate = async () => {
    // Validate input
    if (source === 'url') {
      if (!url.trim()) {
        toast.error('Veuillez entrer une URL');
        return;
      }
    } else {
      if (!textContent.trim() || textContent.trim().length < 50) {
        toast.error('Veuillez entrer au moins 50 caractères de contenu');
        return;
      }
    }

    setGenerating(true);
    setGeneratedDoc(null);

    try {
      const data = await apiFetch<GeneratedDocument>('/api/article-generator/generate', {
        method: 'POST',
        body: JSON.stringify({
          source,
          url: source === 'url' ? url.trim() : undefined,
          content: source === 'text' ? textContent.trim() : undefined,
          format: selectedFormat,
          language,
          focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
        }),
      });

      setGeneratedDoc(data);

      // Save to history
      const history: HistoryItem[] = JSON.parse(localStorage.getItem('article-gen-history') || '[]');
      const historyItem: HistoryItem = {
        id: `gen-${Date.now()}`,
        title: data.title,
        format: data.format,
        document: data.document,
        sourceExcerpt:
          source === 'url'
            ? url.trim().slice(0, 120)
            : textContent.trim().slice(0, 120),
        generatedAt: data.generatedAt,
        wordCount: data.wordCount,
      };
      history.unshift(historyItem);
      // Keep only last 20
      if (history.length > 20) history.length = 20;
      localStorage.setItem('article-gen-history', JSON.stringify(history));

      toast.success(`Document généré (${data.wordCount} mots)`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error('Erreur lors de la génération');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Copy document to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedDocument);
      toast.success('Document copié dans le presse-papier');
    } catch {
      toast.error('Erreur lors de la copie');
    }
  };

  // Download document
  const handleDownload = async (format: 'markdown' | 'text') => {
    try {
      const data = await apiFetch<{
        content: string;
        filename: string;
        contentType: string;
      }>('/api/article-generator/export', {
        method: 'POST',
        body: JSON.stringify({
          title: editableTitle,
          content: editedDocument,
          format,
        }),
      });

      // Create blob and trigger download
      const blob = new Blob([data.content], { type: data.contentType });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success(`${data.filename} téléchargé`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      }
    }
  };

  // Save to posts
  const handleSaveToPosts = async () => {
    try {
      await apiFetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          subject: editableTitle,
          finalContent: editedDocument,
          aiProvider: 'openrouter',
        }),
      });
      toast.success('Document sauvegardé dans vos posts');
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      }
    }
  };

  // Regenerate
  const handleRegenerate = () => {
    setGeneratedDoc(null);
    handleGenerate();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel — Input */}
      <div className="space-y-4">
        <Card className="border-border/50 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Source du contenu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Source Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSource('url')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-sm transition-all',
                  source === 'url'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border/50 hover:bg-muted/50'
                )}
              >
                <Link className="w-4 h-4" />
                <span className="text-xs font-medium">URL d&apos;un article</span>
              </button>
              <button
                onClick={() => setSource('text')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-sm transition-all',
                  source === 'text'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border/50 hover:bg-muted/50'
                )}
              >
                <ClipboardPaste className="w-4 h-4" />
                <span className="text-xs font-medium">Coller le texte</span>
              </button>
            </div>

            {/* URL Input */}
            {source === 'url' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">URL de l&apos;article LinkedIn</Label>
                <div className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/pulse/..."
                    className="h-9 text-sm flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleExtractUrl()}
                  />
                  <Button
                    onClick={handleExtractUrl}
                    disabled={extracting || !url.trim()}
                    size="sm"
                    className="h-9 gap-1.5 shrink-0"
                  >
                    {extracting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    Extraire
                  </Button>
                </div>
                {extractedContent && (
                  <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Contenu extrait ({extractedContent.length} caractères)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] gap-1"
                        onClick={() => setExtractedContent('')}
                      >
                        <X className="w-3 h-3" />
                        Effacer
                      </Button>
                    </div>
                    <ScrollArea className="h-20">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {extractedContent.slice(0, 500)}
                        {extractedContent.length > 500 ? '...' : ''}
                      </p>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}

            {/* Text Input */}
            {source === 'text' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Contenu de l&apos;article
                  <span className="text-muted-foreground ml-1">
                    ({textContent.length}/12000 caractères)
                  </span>
                </Label>
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value.slice(0, 12000))}
                  placeholder="Collez ici le contenu de l'article LinkedIn que vous souhaitez transformer..."
                  className="min-h-[180px] text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Format Selector */}
        <Card className="border-border/50 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Format du document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {FORMAT_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setSelectedFormat(f.value)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-all',
                    selectedFormat === f.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/50 hover:bg-muted/50'
                  )}
                >
                  <span className="text-lg shrink-0">{f.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-xs font-semibold',
                        selectedFormat === f.value && 'text-primary'
                      )}
                    >
                      {f.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{f.description}</p>
                  </div>
                  {selectedFormat === f.value && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <Separator />

            {/* Language */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Langue du document</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as DocumentLanguage)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Focus Areas */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Axes de focus</Label>
              <div className="flex flex-wrap gap-2">
                {FOCUS_AREA_OPTIONS.map((area) => (
                  <button
                    key={area.value}
                    onClick={() => toggleFocusArea(area.value)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                      focusAreas.includes(area.value)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/50 text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {area.label}
                    {focusAreas.includes(area.value) && (
                      <Check className="w-3 h-3 ml-1 inline" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full gap-2"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Générer le document
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel — Output */}
      <div ref={outputRef} className="space-y-4">
        {generating && (
          <Card className="border-border/50 rounded-xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Génération en cours...</p>
                  <p className="text-xs text-muted-foreground">
                    L&apos;IA analyse et structure le contenu
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-10/12" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-9/12" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-7/12" />
              </div>
            </CardContent>
          </Card>
        )}

        {!generating && !generatedDoc && (
          <Card className="border-border/50 rounded-xl">
            <CardContent className="py-16 px-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Aucun document généré
                </p>
                <p className="text-xs text-muted-foreground/70 max-w-xs">
                  Renseignez le contenu source, choisissez un format et cliquez sur
                  &quot;Générer le document&quot;
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {generatedDoc && !generating && (
          <Card className="border-border/50 rounded-xl overflow-hidden">
            {/* Document Header */}
            <div className="gradient-primary px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={cn('text-[10px]', FORMAT_COLORS[generatedDoc.format as DocumentFormat] || 'bg-slate-100 text-slate-700')}>
                      {FORMAT_LABELS[generatedDoc.format as DocumentFormat] || generatedDoc.format}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      <Clock className="w-3 h-3 mr-1" />
                      {generatedDoc.generationTimeMs}ms
                    </Badge>
                  </div>
                  <input
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    className="w-full bg-transparent text-white text-lg font-bold border-none outline-none placeholder:text-white/50"
                    placeholder="Titre du document..."
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 shrink-0"
                  onClick={handleRegenerate}
                  title="Régénérer"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Document Content */}
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Eye className="w-3 h-3" />
                  Aperçu Markdown
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {generatedDoc.wordCount} mots
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(generatedDoc.generatedAt).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <ScrollArea className="h-[480px]">
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-code:text-foreground prose-pre:bg-muted prose-blockquote:border-l-primary prose-hr:border-border">
                  <ReactMarkdown>{editedDocument}</ReactMarkdown>
                </div>
              </ScrollArea>
            </CardContent>

            {/* Action Bar */}
            <div className="border-t border-border/50 px-6 py-3 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleCopy}>
                <Copy className="w-3.5 h-3.5" />
                Copier
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handleDownload('markdown')}
              >
                <FileDown className="w-3.5 h-3.5" />
                Markdown
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handleDownload('text')}
              >
                <Download className="w-3.5 h-3.5" />
                Texte
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleRegenerate}>
                <RotateCcw className="w-3.5 h-3.5" />
                Régénérer
              </Button>
              <Button size="sm" className="gap-1.5 text-xs" onClick={handleSaveToPosts}>
                <Save className="w-3.5 h-3.5" />
                Sauvegarder
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================================
// History Panel
// ============================================================

function HistoryPanel() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadHistory = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('article-gen-history') || '[]');
      setHistory(stored);
    } catch {
      setHistory([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const clearHistory = () => {
    localStorage.removeItem('article-gen-history');
    setHistory([]);
    toast.success('Historique effacé');
  };

  const deleteItem = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem('article-gen-history', JSON.stringify(updated));
    toast.success('Document supprimé de l\'historique');
  };

  const loadItem = (item: HistoryItem) => {
    // Copy document to clipboard for the user
    navigator.clipboard.writeText(item.document);
    toast.success('Document copié — collez-le dans l\'onglet Générer');
  };

  if (!loaded) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {history.length} document(s) enregistré(s)
          </span>
        </div>
        {history.length > 0 && (
          <Button variant="ghost" size="sm" className="text-xs text-destructive gap-1.5" onClick={clearHistory}>
            <X className="w-3.5 h-3.5" />
            Effacer tout
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <Card className="border-border/50 rounded-xl">
          <CardContent className="py-16 px-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Aucun historique
              </p>
              <p className="text-xs text-muted-foreground/70 max-w-xs">
                Les documents générés apparaîtront ici automatiquement
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <Card key={item.id} className="border-border/50 rounded-xl">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={cn(
                          'text-[10px]',
                          FORMAT_COLORS[item.format as DocumentFormat] ||
                            'bg-slate-100 text-slate-700'
                        )}
                      >
                        {FORMAT_LABELS[item.format as DocumentFormat] || item.format}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.generatedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <CardTitle className="text-sm truncate">{item.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => loadItem(item)}
                      title="Copier le contenu"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteItem(item.id)}
                      title="Supprimer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground truncate flex-1">
                    {item.sourceExcerpt}
                  </p>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {item.wordCount} mots
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
