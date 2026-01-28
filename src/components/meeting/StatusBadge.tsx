import { MeetingStatus } from '@/types/meeting';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: MeetingStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
const statusConfig: Record<MeetingStatus, {
    label: string;
    icon: typeof Clock;
    className: string;
    iconClassName?: string;
  }> = {
    QUEUED: {
      label: 'Đang chờ',
      icon: Clock,
      className: 'bg-info/10 text-info border-info/20',
    },
    PROCESSING: {
      label: 'Đang xử lý',
      icon: Loader2,
      className: 'bg-warning/10 text-warning border-warning/20',
      iconClassName: 'animate-spin',
    },
    DONE: {
      label: 'Hoàn tất',
      icon: CheckCircle2,
      className: 'bg-success/10 text-success border-success/20',
    },
    FAILED: {
      label: 'Thất bại',
      icon: AlertCircle,
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} gap-1.5`}>
      <Icon className={`h-3 w-3 ${config.iconClassName || ''}`} />
      {config.label}
    </Badge>
  );
}
