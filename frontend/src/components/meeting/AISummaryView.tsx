import { motion } from 'framer-motion';
import { FileText, Lightbulb, CheckSquare, Square } from 'lucide-react';
import { AISummary, ActionItem } from '@/types/meeting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface AISummaryViewProps {
  summary: AISummary;
  onActionItemToggle?: (itemId: string) => void;
}

export function AISummaryView({ summary, onActionItemToggle }: AISummaryViewProps) {
  return (
    <div className="space-y-4">
      {/* Executive Summary */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Tóm tắt điều hành
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed">
            {summary.executiveSummary}
          </p>
        </CardContent>
      </Card>

      {/* Key Highlights */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning" />
            Điểm nhấn chính
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {summary.keyHighlights.map((highlight, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 text-sm"
              >
                <span className="w-6 h-6 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-warning">
                    {index + 1}
                  </span>
                </span>
                <span className="text-foreground">{highlight}</span>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-success" />
            Công việc cần làm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {summary.actionItems.map((item, index) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3"
              >
                <Checkbox
                  id={item.id}
                  checked={item.completed}
                  onCheckedChange={() => onActionItemToggle?.(item.id)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <label
                    htmlFor={item.id}
                    className={`text-sm cursor-pointer ${
                      item.completed
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground'
                    }`}
                  >
                    {item.text}
                  </label>
                  {item.assignee && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Phụ trách: {item.assignee}
                    </p>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
