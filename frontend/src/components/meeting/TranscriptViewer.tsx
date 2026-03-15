import { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Check, X } from 'lucide-react';
import { TranscriptSegment } from '@/types/meeting';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  speakerMap: Record<string, string>;
  onSegmentClick: (startTime: number) => void;
  onSegmentEdit: (segmentId: string, newText: string) => void;
  currentTime?: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TranscriptViewer({
  segments,
  speakerMap,
  onSegmentClick,
  onSegmentEdit,
  currentTime = 0,
}: TranscriptViewerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const startEdit = (segment: TranscriptSegment) => {
    setEditingId(segment.id);
    setEditText(segment.text);
  };

  const saveEdit = (segmentId: string) => {
    onSegmentEdit(segmentId, editText);
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const isActive = (segment: TranscriptSegment) => {
    return currentTime >= segment.startTime && currentTime < segment.endTime;
  };

  return (
    <div className="space-y-3">
      {segments.map((segment, index) => {
        const displayName = speakerMap[segment.speaker] || segment.speaker;
        const active = isActive(segment);
        
        return (
          <motion.div
            key={segment.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`p-4 rounded-xl border transition-all duration-200 ${
              active
                ? 'border-primary bg-accent shadow-soft'
                : 'border-border/50 bg-card hover:border-border'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Speaker avatar */}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-foreground">{displayName}</span>
                  <button
                    onClick={() => onSegmentClick(segment.startTime)}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    {formatTime(segment.startTime)}
                  </button>
                </div>

                {/* Content */}
                {editingId === segment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[80px] text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveEdit(segment.id)}
                        className="h-8"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Lưu
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        className="h-8"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Hủy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative">
                    <p className="text-sm text-foreground leading-relaxed pr-8">
                      {segment.text}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(segment)}
                      className="h-7 w-7 absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
