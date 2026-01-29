/**
 * EditableTranscriptSegment - Inline editable transcript segment
 * 
 * Features:
 * - Click to edit text inline
 * - Enter to save, Esc to cancel
 * - Visual indicator for edited segments
 * - Maintains playback sync functionality
 */

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { TranscriptSegment } from "@/types/meeting";

interface EditableTranscriptSegmentProps {
  segment: TranscriptSegment;
  index: number;
  isActive: boolean;
  isEdited: boolean;
  formatTimestamp: (seconds: number) => string;
  onSegmentClick: (segment: TranscriptSegment) => void;
  onTextEdit: (index: number, newText: string) => void;
}

export function EditableTranscriptSegment({
  segment,
  index,
  isActive,
  isEdited,
  formatTimestamp,
  onSegmentClick,
  onTextEdit,
}: EditableTranscriptSegmentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(segment.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const handleTextClick = (e: React.MouseEvent) => {
    if (!isEditing) {
      e.stopPropagation();
      setIsEditing(true);
      setEditedText(segment.text);
    }
  };

  const handleSave = () => {
    if (editedText.trim() !== segment.text) {
      onTextEdit(index, editedText.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(segment.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleContainerClick = () => {
    if (!isEditing) {
      onSegmentClick(segment);
    }
  };

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg transition-all ${
        isActive && !isEditing
          ? "bg-primary/10 border-l-4 border-primary"
          : "hover:bg-accent/50"
      } ${!isEditing ? "cursor-pointer" : ""}`}
      onClick={handleContainerClick}
    >
      {/* Timestamp */}
      <div className="flex-shrink-0 w-20 text-xs text-muted-foreground pt-1">
        {formatTimestamp(segment.start)}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        {/* Speaker */}
        <div className="flex items-center gap-2">
          <div
            className={`text-sm ${
              isActive && !isEditing
                ? "font-semibold text-primary"
                : "font-medium text-primary/70"
            }`}
          >
            {segment.speaker}
          </div>
          {isEdited && !isEditing && (
            <Badge variant="outline" className="text-xs">
              Đã chỉnh sửa
            </Badge>
          )}
        </div>

        {/* Text - Editable */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] text-sm resize-none"
              placeholder="Nhập nội dung transcript..."
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                className="gap-1"
              >
                <Check className="h-3 w-3" />
                Lưu
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="gap-1"
              >
                <X className="h-3 w-3" />
                Hủy
              </Button>
              <span className="text-xs text-muted-foreground ml-2">
                Enter để lưu, Esc để hủy
              </span>
            </div>
          </div>
        ) : (
          <div
            onClick={handleTextClick}
            className={`text-sm leading-relaxed group relative ${
              isActive
                ? "font-medium text-foreground"
                : "text-foreground/80"
            }`}
          >
            <p className="pr-8">{segment.text}</p>
            {/* Edit hint on hover */}
            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleTextClick}
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
            {/* Hover hint */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="absolute bottom-0 left-0 text-xs text-muted-foreground">
                Nhấn để chỉnh sửa
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
