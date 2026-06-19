import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'long' | 'short' | 'neutral' | 'score';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-secondary text-secondary-foreground',
    long: 'bg-long/15 text-long border border-long/30',
    short: 'bg-short/15 text-short border border-short/30',
    neutral: 'bg-muted text-muted-foreground',
    score: 'bg-primary/15 text-primary border border-primary/30 font-mono',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
