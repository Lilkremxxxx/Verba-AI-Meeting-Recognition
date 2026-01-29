/**
 * MeetingDetail - Presentational component for meeting detail view
 */

import { useState } from "react";
import { ArrowLeft, Play, Pause, FileAudio, Clock, ListChecks, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { Meeting, TranscriptSegment, AISummary, MeetingStatus } from "@/types/meeting";
import { formatTimeAgo } from "@/utils/time";
import { formatTimestamp } from "@/mocks/meetingDetailMock";

interface MeetingDetailProps {
  meeting: Meeting;
  transcript: TranscriptSegment[];
  summary: AISummary;
}

export function MeetingDetail({ meeting, transcript, summary }: MeetingDetailProps) {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const getStatusBadge = (status: MeetingStatus) => {
    const statusConfig = {
      DONE: {
        label: "Hoàn tất",
        variant: "default" as const,
        className: "bg-green-500 hover:bg-green-600",
      },
      PROCESSING: {
        label: "Đang xử lý",
        variant: "secondary" as const,
        className: "bg-orange-500 hover:bg-orange-600 text-white",
      },
      QUEUED: {
        label: "Đang chờ",
        variant: "outline" as const,
        className: "border-blue-500 text-blue-600",
      },
      FAILED: {
        label: "Thất bại",
        variant: "destructive" as const,
        className: "",
      },
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // Placeholder for actual audio playback
  };

  const totalDuration = transcript.length > 0 
    ? transcript[transcript.length - 1].endTime 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/meetings")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{meeting.title}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileAudio className="h-4 w-4" />
                <span>{meeting.original_filename}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatTimeAgo(meeting.created_at)}</span>
              </div>
              <span>•</span>
              {getStatusBadge(meeting.status)}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Audio Player Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5" />
            Ghi âm cuộc họp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              variant="default"
              onClick={handlePlayPause}
              className="gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-5 w-5" />
                  Tạm dừng
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Phát
                </>
              )}
            </Button>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{formatTimestamp(currentTime)}</span>
                <span>{formatTimestamp(totalDuration)}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Audio player placeholder - Tính năng phát audio sẽ được triển khai sau
          </p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Transcript Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="h-5 w-5" />
                Bản ghi âm
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.status !== "DONE" ? (
                <div className="py-12 text-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-accent-foreground animate-pulse" />
                  </div>
                  <p className="font-medium">Đang xử lý...</p>
                  <p className="text-sm mt-1">
                    Bản ghi âm sẽ sẵn sàng khi trạng thái chuyển sang "Hoàn tất"
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {transcript.map((segment) => (
                      <div
                        key={segment.id}
                        className="flex gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-20 text-xs text-muted-foreground pt-1">
                          {formatTimestamp(segment.startTime)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="font-medium text-sm text-primary">
                            {segment.speaker}
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">
                            {segment.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Section */}
        <div className="space-y-4">
          {/* AI Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Tóm tắt AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {meeting.status !== "DONE" ? (
                <p className="text-sm text-muted-foreground">
                  Tóm tắt sẽ được tạo sau khi xử lý hoàn tất
                </p>
              ) : (
                <>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Tóm tắt chung</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {summary.executiveSummary}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium text-sm mb-2">Điểm nổi bật</h4>
                    <ul className="space-y-2">
                      {summary.keyHighlights.map((highlight, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground flex gap-2"
                        >
                          <span className="text-primary">•</span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Công việc cần làm
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.status !== "DONE" ? (
                <p className="text-sm text-muted-foreground">
                  Danh sách công việc sẽ được tạo sau khi xử lý hoàn tất
                </p>
              ) : (
                <div className="space-y-3">
                  {summary.actionItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={item.completed}
                        className="mt-1"
                        disabled
                      />
                      <div className="flex-1 space-y-1">
                        <p
                          className={`text-sm ${
                            item.completed
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {item.text}
                        </p>
                        {item.assignee && (
                          <p className="text-xs text-muted-foreground">
                            Phụ trách: {item.assignee}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
