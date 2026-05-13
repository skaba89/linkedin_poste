'use client';

import { useState } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Sparkles,
  Plus,
  X,
  BarChart3,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface PollCreatorProps {
  onCreatePollPost?: (data: {
    question: string;
    options: string[];
    hashtags: string;
  }) => void;
}

export default function PollCreator({ onCreatePollPost }: PollCreatorProps) {
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [hashtags, setHashtags] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('');
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Entrez un sujet pour le sondage');
      return;
    }

    setGenerating(true);
    try {
      const data = await apiFetch<{
        question: string;
        options: string[];
        hashtags: string;
        suggestedTime: string;
      }>('/api/polls/generate', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim(),
          optionCount: Math.max(2, Math.min(4, options.filter((o) => o.trim()).length || 3)),
        }),
      });

      setQuestion(data.question);
      setOptions(data.options);
      setHashtags(data.hashtags);
      setSuggestedTime(data.suggestedTime);
      setHasGenerated(true);
      toast.success('Sondage généré avec succès');
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setGenerating(false);
    }
  };

  const addOption = () => {
    if (options.length >= 4) {
      toast.info('Maximum 4 options pour un sondage LinkedIn');
      return;
    }
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      toast.info('Minimum 2 options requises');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const handleCreatePost = () => {
    if (!question.trim()) {
      toast.error('La question du sondage est requise');
      return;
    }
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      toast.error('Au moins 2 options non vides sont requises');
      return;
    }
    onCreatePollPost?.({
      question: question.trim(),
      options: validOptions,
      hashtags: hashtags.trim(),
    });
  };

  const isFormValid =
    question.trim() && options.filter((o) => o.trim()).length >= 2;

  return (
    <div className="space-y-4">
      {/* Topic input */}
      <div className="space-y-2">
        <Label htmlFor="poll-topic" className="text-sm font-medium">
          Sujet du sondage
        </Label>
        <div className="flex gap-2">
          <Input
            id="poll-topic"
            placeholder="Ex: L'intelligence artificielle dans le recrutement"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={generating}
            className="h-10 flex-1"
          />
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !topic.trim()}
            className="gap-2 shrink-0"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Générer un sondage
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          L&apos;IA va générer une question et des options de réponse engageantes
        </p>
      </div>

      {/* Generated poll editor */}
      {hasGenerated && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Aperçu du sondage</CardTitle>
              <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Généré par l&apos;IA
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Question */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Question</Label>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Votre question de sondage..."
                rows={2}
                className="resize-none"
              />
            </div>

            <Separator />

            {/* Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Options ({options.length}/4)
                </Label>
                {options.length < 4 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={addOption}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-5 text-center shrink-0">
                      {index + 1}
                    </span>
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="h-9 flex-1"
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeOption(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Hashtags */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Hashtags</Label>
              <Input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#Sondage #LinkedIn"
                className="h-9"
              />
            </div>

            {/* Suggested time */}
            {suggestedTime && (
              <div className="flex items-center gap-2 text-xs text-cyan-600 dark:text-cyan-400">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Créneau suggéré : <strong>{suggestedTime}</strong>
                </span>
              </div>
            )}

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Aperçu du post
              </Label>
              <Card className="bg-muted/30 border-border/50">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">{question}</p>
                  <div className="space-y-2 mb-3">
                    {options
                      .filter((o) => o.trim())
                      .map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/50 bg-background"
                        >
                          <div className="w-4 h-4 rounded-full border-2 border-primary/40" />
                          <span className="text-sm">{option}</span>
                        </div>
                      ))}
                  </div>
                  {hashtags.trim() && (
                    <p className="text-xs text-muted-foreground">{hashtags}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Action */}
            <Button
              type="button"
              onClick={handleCreatePost}
              disabled={!isFormValid}
              className="w-full gap-2"
            >
              Créer le post
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state hint */}
      {!hasGenerated && (
        <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Entrez un sujet et laissez l&apos;IA créer un sondage engageant
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Les sondages LinkedIn génèrent en moyenne 2x plus d&apos;interactions
          </p>
        </div>
      )}
    </div>
  );
}
