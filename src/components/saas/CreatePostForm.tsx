'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, Info, Link, BookTemplate, Sparkles, Clock, Mic, List, GraduationCap, HelpCircle, Megaphone, Lightbulb, Hash, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AIProvider, Post, PromptTemplate, BestTimeAnalysis, TimeRecommendation, ContentTone, ContentLength } from '@/types';
import { AI_PROVIDER_LABELS, PROMPT_CATEGORY_LABELS, PROMPT_CATEGORY_COLORS } from '@/types';
import ImageUpload from './ImageUpload';

const TONE_OPTIONS: { value: ContentTone; label: string }[] = [
  { value: 'professionnel', label: 'Professionnel et formel' },
  { value: 'inspirant', label: 'Inspirant et motivant' },
  { value: 'educatif', label: 'Educatif et informatif' },
  { value: 'conversational', label: 'Conversationnel et amical' },
  { value: 'humour', label: 'Humour et décontracté' },
  { value: 'provocateur', label: 'Provocateur et audacieux' },
  { value: 'storytelling', label: 'Storytelling captivant' },
  { value: 'expert', label: 'Expert et autoritaire' },
];

const LENGTH_OPTIONS: { value: ContentLength; label: string; description: string }[] = [
  { value: 'court', label: 'Court', description: 'Max 100 mots' },
  { value: 'moyen', label: 'Moyen', description: '100-200 mots' },
  { value: 'long', label: 'Long', description: '200-400 mots' },
];

interface QuickTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  subject: string;
  angle: string;
  hashtags: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'listicle',
    name: 'Listicle',
    icon: <List className="w-4 h-4 text-blue-500" />,
    description: 'Article sous forme de liste avec conseils pratiques',
    subject: 'X conseils pour...',
    angle: 'Listicle éducatif',
    hashtags: '#Conseils #Expertise',
  },
  {
    id: 'case-study',
    name: 'Étude de cas',
    icon: <GraduationCap className="w-4 h-4 text-green-500" />,
    description: 'Storytelling avec résultats concrets et mesurables',
    subject: 'Comment nous avons...',
    angle: 'Storytelling avec résultats',
    hashtags: '#CaseStudy #Resultats',
  },
  {
    id: 'question',
    name: 'Question',
    icon: <HelpCircle className="w-4 h-4 text-amber-500" />,
    description: 'Question engagement pour stimuler les interactions',
    subject: 'Question de la semaine...',
    angle: 'Question engagement',
    hashtags: '#Question #Communaute',
  },
  {
    id: 'annonce',
    name: 'Annonce',
    icon: <Megaphone className="w-4 h-4 text-purple-500" />,
    description: 'Lancement produit avec enthousiasme',
    subject: 'Nouvelle fonctionnalité...',
    angle: 'Lancement produit enthousiaste',
    hashtags: '#Lancement #Nouveau',
  },
  {
    id: 'lecon',
    name: 'Leçon apprise',
    icon: <Lightbulb className="w-4 h-4 text-orange-500" />,
    description: 'Leçon personnelle authentique et inspirante',
    subject: "Ce que j'ai appris...",
    angle: 'Leçon personnelle',
    hashtags: '#Lecons #Croissance',
  },
];

export default function CreatePostForm() {
  const [subject, setSubject] = useState('');
  const [angle, setAngle] = useState('');
  const [audience, setAudience] = useState('');
  const [cta, setCta] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [hashtags, setHashtags] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('openrouter');
  const [loading, setLoading] = useState(false);

  // New state: tone, length, hashtag suggestions
  const [tone, setTone] = useState<ContentTone>('professionnel');
  const [length, setLength] = useState<ContentLength>('moyen');
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [selectedHashtags, setSelectedHashtags] = useState<Set<string>>(new Set());
  const [hashtagsLoading, setHashtagsLoading] = useState(false);

  const setView = useAppStore((s) => s.setView);
  const selectPost = useAppStore((s) => s.selectPost);

  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false);
  const [bestTimeSlot, setBestTimeSlot] = useState<TimeRecommendation | null>(null);
  const [brandVoiceActive, setBrandVoiceActive] = useState(false);

  // Pre-fill scheduled date from calendar navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefill = sessionStorage.getItem('prefill_scheduledDate');
      if (prefill) {
        setScheduledDate(prefill);
        sessionStorage.removeItem('prefill_scheduledDate');
      }
      const prefillAngle = sessionStorage.getItem('prefill_angle');
      if (prefillAngle) {
        setAngle(prefillAngle);
        sessionStorage.removeItem('prefill_angle');
        // Check if this came from brand voice (via the /api/brand-voice profile)
        const bvSource = sessionStorage.getItem('brand_voice_source');
        if (bvSource) {
          setBrandVoiceActive(true);
          sessionStorage.removeItem('brand_voice_source');
        }
      }
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await apiFetch<{ templates: PromptTemplate[] }>('/api/prompts');
      setPromptTemplates(data.templates);
    } catch {
      // silently fail
    }
  }, []);

  // Fetch best time slot hint
  const fetchBestTime = useCallback(async () => {
    try {
      const data = await apiFetch<{ analysis: BestTimeAnalysis | null }>('/api/analytics/best-time');
      if (data.analysis?.topSlots && data.analysis.topSlots.length > 0) {
        setBestTimeSlot(data.analysis.topSlots[0]);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchBestTime();
  }, [fetchTemplates, fetchBestTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error('Le sujet est requis');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{ post: Post }>('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim(),
          angle: angle.trim() || undefined,
          audience: audience.trim() || undefined,
          cta: cta.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          hashtags: hashtags.trim() || undefined,
          scheduledDate: scheduledDate || undefined,
          aiProvider,
          tone,
          length,
        }),
      });

      toast.success('Post créé avec succès');
      selectPost(data.post.id);
      setView('post-detail');
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestHashtags = async () => {
    if (!subject.trim()) {
      toast.error('Entrez d\'abord un sujet pour suggérer des hashtags');
      return;
    }
    setHashtagsLoading(true);
    setSuggestedHashtags([]);
    setSelectedHashtags(new Set());
    try {
      const data = await apiFetch<{ hashtags: string[] }>('/api/posts/suggest-hashtags', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim(),
          audience: audience.trim() || undefined,
        }),
      });
      if (data.hashtags && data.hashtags.length > 0) {
        setSuggestedHashtags(data.hashtags);
      } else {
        toast.info('Aucun hashtag suggéré trouvé');
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setHashtagsLoading(false);
    }
  };

  const toggleHashtag = (tag: string) => {
    setSelectedHashtags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const applySelectedHashtags = () => {
    if (selectedHashtags.size === 0) {
      toast.info('Sélectionnez au moins un hashtag');
      return;
    }
    const current = hashtags.trim();
    const newTags = Array.from(selectedHashtags);
    const existingTags = current ? current.split(/\s+/) : [];
    const merged = [...new Set([...existingTags, ...newTags])].join(' ');
    setHashtags(merged);
    toast.success(`${newTags.length} hashtag(s) ajouté(s)`);
  };

  const applyQuickTemplate = (template: QuickTemplate) => {
    setSubject(template.subject);
    setAngle(template.angle);
    setHashtags(template.hashtags);
    toast.success(`Template "${template.name}" appliqué`);
  };

  const providerDescriptions: Record<AIProvider, string> = {
    openrouter: 'Multi-modèles via OpenRouter (GPT-4, Claude, etc.)',
    groq: 'Génération ultra-rapide via Groq (Llama, Mixtral)',
    glm: 'GLM-5 — Modèle de langage avancé',
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Nouveau post</CardTitle>
          <p className="text-sm text-muted-foreground">
            Décrivez votre idée de post LinkedIn. L&apos;IA générera des variantes de contenu.
          </p>
          {brandVoiceActive && (
            <Badge className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400 gap-1.5 mt-2">
              <Mic className="w-3 h-3" />
              Brand Voice activé
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Quick Templates Accordion */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="quick-templates" className="border-border/50">
                <AccordionTrigger className="text-sm font-medium py-2">
                  <span className="flex items-center gap-2">
                    <BookTemplate className="w-4 h-4 text-muted-foreground" />
                    Templates rapides
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {QUICK_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        className="flex items-start gap-3 rounded-lg border border-border/50 p-3 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => applyQuickTemplate(tpl)}
                        disabled={loading}
                      >
                        <div className="mt-0.5 shrink-0">{tpl.icon}</div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium">{tpl.name}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                Sujet <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                placeholder="Ex: Comment l'IA transforme le marketing B2B en 2025"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={loading}
                className="h-10"
              />
            </div>

            {/* Angle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="angle" className="text-sm font-medium">
                  Angle rédactionnel
                </Label>
                {promptTemplates.length > 0 && (
                  <Popover open={templatePopoverOpen} onOpenChange={setTemplatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                        <BookTemplate className="w-3.5 h-3.5" />
                        Templates
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 max-h-[320px] p-0" align="end">
                      <div className="px-3 py-2 border-b border-border/50">
                        <p className="text-xs font-semibold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Templates de prompts
                        </p>
                      </div>
                      <div className="max-h-[260px] overflow-y-auto">
                        {promptTemplates.map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-b-0"
                            onClick={() => {
                              setAngle(tpl.prompt);
                              setTemplatePopoverOpen(false);
                              toast.success(`Template "${tpl.name}" appliqué`);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{tpl.name}</span>
                              <Badge
                                variant="secondary"
                                className={`text-[9px] ${PROMPT_CATEGORY_COLORS[tpl.category] || PROMPT_CATEGORY_COLORS.general}`}
                              >
                                {PROMPT_CATEGORY_LABELS[tpl.category] || tpl.category}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                              {tpl.description || tpl.prompt.slice(0, 60)}
                            </p>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <Textarea
                id="angle"
                placeholder="Ex: Approche provocante qui remet en question les idées reçues, avec des statistiques concrètes"
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                disabled={loading}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Tone & Length - side by side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Tone */}
              <div className="space-y-2">
                <Label htmlFor="tone" className="text-sm font-medium">
                  Ton du contenu
                </Label>
                <Select
                  value={tone}
                  onValueChange={(v) => setTone(v as ContentTone)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-10 w-full">
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

              {/* Length */}
              <div className="space-y-2">
                <Label htmlFor="length" className="text-sm font-medium">
                  Longueur
                </Label>
                <Select
                  value={length}
                  onValueChange={(v) => setLength(v as ContentLength)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LENGTH_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          {opt.label}
                          <span className="text-xs text-muted-foreground">({opt.description})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Audience */}
            <div className="space-y-2">
              <Label htmlFor="audience" className="text-sm font-medium">
                Audience cible
              </Label>
              <Input
                id="audience"
                placeholder="Ex: Directeurs marketing, CTOs, entrepreneurs tech"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                disabled={loading}
                className="h-10"
              />
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <Label htmlFor="cta" className="text-sm font-medium">
                Call to Action
              </Label>
              <Input
                id="cta"
                placeholder="Ex: Quel est votre avis ? Partagez votre expérience en commentaire"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                disabled={loading}
                className="h-10"
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Image
              </Label>
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                onRemove={() => setImageUrl('')}
              />
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Link className="w-3 h-3" />
                {showUrlInput ? 'Masquer le champ URL' : 'Ou entrer une URL'}
              </button>
              {showUrlInput && (
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={loading}
                  className="h-10"
                  type="url"
                />
              )}
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="hashtags" className="text-sm font-medium">
                  Hashtags
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleSuggestHashtags}
                  disabled={hashtagsLoading || !subject.trim()}
                >
                  {hashtagsLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  Suggérer
                </Button>
              </div>
              <Input
                id="hashtags"
                placeholder="#Marketing #IA #B2B #Leadership"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                disabled={loading}
                className="h-10"
              />
              {suggestedHashtags.length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Hash className="w-3 h-3" />
                    Hashtags suggérés — cliquez pour sélectionner
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedHashtags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedHashtags.has(tag) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
                        onClick={() => toggleHashtag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {selectedHashtags.size > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={applySelectedHashtags}
                      disabled={loading}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Ajouter {selectedHashtags.size} hashtag(s)
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Scheduled Date */}
            <div className="space-y-2">
              <Label htmlFor="scheduledDate" className="text-sm font-medium">
                Date planifiée (optionnel)
              </Label>
              <Input
                id="scheduledDate"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                disabled={loading}
                className="h-10"
              />
              {bestTimeSlot && (
                <button
                  type="button"
                  onClick={() => {
                    // Generate a datetime-local value for next occurrence of this day+hour
                    const now = new Date();
                    const dayMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 0: 0 };
                    const targetDay = dayMap[bestTimeSlot.dayOfWeek] ?? 1;
                    const targetHour = bestTimeSlot.hour;
                    const diff = (targetDay - now.getDay() + 7) % 7;
                    const target = new Date(now);
                    target.setDate(target.getDate() + diff);
                    target.setHours(targetHour, 0, 0, 0);
                    if (target <= now) target.setDate(target.getDate() + 7);
                    const pad = (n: number) => String(n).padStart(2, '0');
                    const val = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
                    setScheduledDate(val);
                  }}
                  className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors w-full"
                >
                  <Clock className="w-3 h-3" />
                  <span>Meilleur créneau suggéré : <strong>{bestTimeSlot.dayLabel} à {bestTimeSlot.slotLabel}</strong> ({bestTimeSlot.avgEngagement}% engagement)</span>
                </button>
              )}
            </div>

            {/* AI Provider */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="aiProvider" className="text-sm font-medium">
                  Fournisseur IA
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">
                    {providerDescriptions[aiProvider]}
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={aiProvider}
                onValueChange={(v) => setAiProvider(v as AIProvider)}
                disabled={loading}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(AI_PROVIDER_LABELS) as [AIProvider, string][]).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading || !subject.trim()}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Création...
                  </>
                ) : (
                  'Créer le post'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setView('posts')}
                disabled={loading}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
