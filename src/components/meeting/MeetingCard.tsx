import { Meeting } from '@/types/meeting';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { FileAudio, Calendar, HardDrive, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface MeetingCardProps {
  meeting: Meeting;
  onClick: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MeetingCard({ meeting, onClick }: MeetingCardProps) {
  const isClickable = meeting.status === 'DONE';

  return (
    <motion.div
      whileHover={isClickable ? { scale: 1.01 } : undefined}
      whileTap={isClickable ? { scale: 0.99 } : undefined}
    >
      <Card
        className={`transition-all duration-200 border-border/50 ${
          isClickable
            ? 'cursor-pointer hover:shadow-soft hover:border-primary/30'
            : 'opacity-80'
        }`}
        onClick={isClickable ? onClick : undefined}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                <FileAudio className="w-6 h-6 text-accent-foreground" />
              </div>
              
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground truncate mb-1">
                  {meeting.title}
                </h3>
                <p className="text-sm text-muted-foreground truncate mb-2">
                  {meeting.fileName}
                </p>
                
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDistanceToNow(meeting.createdAt, { addSuffix: true, locale: vi })}
                  </span>
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5" />
                    {formatFileSize(meeting.fileSize)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <StatusBadge status={meeting.status} />
              {isClickable && (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
