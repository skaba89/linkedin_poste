'use client';

import { useState } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Languages, Copy, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'EN', label: 'Anglais', flag: '🇬🇧' },
  { code: 'ES', label: 'Espagnol', flag: '🇪🇸' },
  { code: 'DE', label: 'Allemand', flag: '🇩🇪' },
  { code: 'IT', label: 'Italien', flag: '🇮🇹' },
  { code: 'PT', label: 'Portugais', flag: '🇵🇹' },
  { code: 'NL', label: 'Néerlandais', flag: '🇳🇱' },
  { code: 'AR', label: 'Arabe', flag: '🇸🇦' },
  { code: 'ZH', label: 'Chinois', flag: '🇨🇳' },
  { code: 'JA', label: 'Japonais', flag: '🇯🇵' },
  { code: 'KO', label: 'Coréen', flag: '🇰🇷' },
];

interface Translation {
  language: string;
  code: string;
  content: string;
  hashtags: string;
  notes?: string;
}

interface PostTranslatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onUseTranslation?: (content: string, language: string) => void;
}

export default function PostTranslator({
  open,
  onOpenChange,
  content,
  onUseTranslation,
}: PostTranslatorProps) {
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set());
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [translating, setTranslating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedLanguages.size === LANGUAGES.length) {
      setSelectedLanguages(new Set());
    } else {
      setSelectedLanguages(new Set(LANGUAGES.map((l) => l.code)));
    }
  };

  const handleTranslate = async () => {
    if (selectedLanguages.size === 0) {
      toast.error('Sélectionnez au moins une langue');
      return;
    }
    if (!content.trim()) {
      toast.error('Le contenu à traduire est vide');
      return;
    }

    setTranslating(true);
    setTranslations([]);
    try {
      const data = await apiFetch<{ translations: Translation[] }>(
        '/api/posts/translate',
        {
          method: 'POST',
          body: JSON.stringify({
            content: content.trim(),
            targetLanguages: Array.from(selectedLanguages),
          }),
        }
      );
      setTranslations(data.translations);
      toast.success(
        `${data.translations.length} traduction(s) générée(s)`
      );
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setTranslating(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUse = (translation: Translation) => {
    const fullContent = translation.hashtags
      ? `${translation.content}\n\n${translation.hashtags}`
      : translation.content;
    onUseTranslation?.(fullContent, translation.code);
    toast.success(`Version ${translation.language} appliquée`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
            Traduire le post
          </DialogTitle>
        </DialogHeader>

        {/* Content preview */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Contenu original</Label>
          <div className="rounded-lg bg-muted/50 border border-border/50 p-3 max-h-[120px] overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap line-clamp-6">
              {content.trim() || (
                <span className="text-muted-foreground italic">
                  Aucun contenu à traduire
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Language selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Langues cibles ({selectedLanguages.size} sélectionnée{selectedLanguages.size > 1 ? 's' : ''})
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={selectAll}
            >
              {selectedLanguages.size === LANGUAGES.length
                ? 'Tout désélectionner'
                : 'Tout sélectionner'}
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {LANGUAGES.map((lang) => (
              <label
                key={lang.code}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all duration-200',
                  selectedLanguages.has(lang.code)
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/50 hover:border-border'
                )}
              >
                <Checkbox
                  checked={selectedLanguages.has(lang.code)}
                  onCheckedChange={() => toggleLanguage(lang.code)}
                  className="sr-only"
                />
                <span className="text-base">{lang.flag}</span>
                <span className="text-xs font-medium">{lang.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Translate button */}
        <Button
          onClick={handleTranslate}
          disabled={translating || selectedLanguages.size === 0 || !content.trim()}
          className="w-full gap-2"
        >
          {translating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Traduction en cours...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Traduire en {selectedLanguages.size} langue{selectedLanguages.size > 1 ? 's' : ''}
            </>
          )}
        </Button>

        {/* Translations results */}
        {translations.length > 0 && (
          <div className="flex-1 min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-sm font-medium">
                Traductions ({translations.length})
              </Label>
            </div>
            <ScrollArea className="h-[300px] pr-1">
              <div className="space-y-3">
                {translations.map((translation, index) => {
                  const langInfo = LANGUAGES.find(
                    (l) => l.code === translation.code
                  );
                  const translationId = `${translation.code}-${index}`;
                  return (
                    <div
                      key={translationId}
                      className="rounded-lg border border-border/50 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">
                            {langInfo?.flag || '🌐'}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-xs font-medium"
                          >
                            {translation.language}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() =>
                              handleCopy(
                                translation.hashtags
                                  ? `${translation.content}\n\n${translation.hashtags}`
                                  : translation.content,
                                translationId
                              )
                            }
                          >
                            {copiedId === translationId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            {copiedId === translationId ? 'Copié' : 'Copier'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleUse(translation)}
                          >
                            Utiliser
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {translation.content}
                      </p>
                      {translation.hashtags && (
                        <div className="flex flex-wrap gap-1">
                          {translation.hashtags
                            .split(/\s+/)
                            .filter(Boolean)
                            .map((tag, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {tag}
                              </Badge>
                            ))}
                        </div>
                      )}
                      {translation.notes && (
                        <p className="text-[11px] text-muted-foreground italic">
                          💡 {translation.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
