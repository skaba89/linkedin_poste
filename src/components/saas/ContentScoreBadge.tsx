'use client';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ContentScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

export default function ContentScoreBadge({ score, size = 'md' }: ContentScoreBadgeProps) {
  const colorClass =
    score >= 70
      ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/50'
      : score >= 40
        ? 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/50'
        : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950/50';

  const label =
    score >= 70 ? 'Bon score' : score >= 40 ? 'Score moyen' : 'Score faible';

  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold rounded-full',
            colorClass,
            sizeClass
          )}
        >
          {score}
          <span className="text-[8px] font-normal opacity-70">/100</span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
