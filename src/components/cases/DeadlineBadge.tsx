import { differenceInDays, format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeadlineBadgeProps {
  dueDate: string | null;
  status?: string;
  className?: string;
}

export function DeadlineBadge({ dueDate, status, className }: DeadlineBadgeProps) {
  if (!dueDate || status === 'resolved') {
    return null;
  }

  const dueDateParsed = parseISO(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysLeft = differenceInDays(dueDateParsed, today);

  // Determine color based on days left
  let colorClass = '';
  let textClass = '';
  
  if (daysLeft < 0) {
    // Overdue
    colorClass = 'bg-destructive/20 border-destructive';
    textClass = 'text-destructive';
  } else if (daysLeft < 7) {
    // Red: less than 7 days
    colorClass = 'bg-red-500/20 border-red-500';
    textClass = 'text-red-600 dark:text-red-400';
  } else if (daysLeft <= 14) {
    // Yellow: 7-14 days
    colorClass = 'bg-yellow-500/20 border-yellow-500';
    textClass = 'text-yellow-600 dark:text-yellow-400';
  } else {
    // Green: more than 14 days
    colorClass = 'bg-green-500/20 border-green-500';
    textClass = 'text-green-600 dark:text-green-400';
  }

  const Icon = daysLeft < 7 ? AlertTriangle : Clock;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1 font-medium border',
        colorClass,
        textClass,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {daysLeft < 0 ? (
        <span>Overdue by {Math.abs(daysLeft)} day{Math.abs(daysLeft) !== 1 ? 's' : ''}</span>
      ) : daysLeft === 0 ? (
        <span>Due Today</span>
      ) : (
        <span>{daysLeft} Day{daysLeft !== 1 ? 's' : ''} Left</span>
      )}
    </Badge>
  );
}

export function DeadlineBadgeCompact({ dueDate, status, className }: DeadlineBadgeProps) {
  if (!dueDate || status === 'resolved') {
    return null;
  }

  const dueDateParsed = parseISO(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysLeft = differenceInDays(dueDateParsed, today);

  let colorClass = '';
  
  if (daysLeft < 0) {
    colorClass = 'text-destructive';
  } else if (daysLeft < 7) {
    colorClass = 'text-red-600 dark:text-red-400';
  } else if (daysLeft <= 14) {
    colorClass = 'text-yellow-600 dark:text-yellow-400';
  } else {
    colorClass = 'text-green-600 dark:text-green-400';
  }

  return (
    <span className={cn('text-xs font-medium', colorClass, className)}>
      {daysLeft < 0 ? (
        `${Math.abs(daysLeft)}d overdue`
      ) : daysLeft === 0 ? (
        'Due today'
      ) : (
        `${daysLeft}d left`
      )}
    </span>
  );
}
