/**
 * MeetingDetailPage - Audio playback with transcript highlighting + Summary + Export
 * Features:
 * - Playback speed control (0.75x, 1x, 1.25x, 1.5x, 2x)
 * - Seek controls (+/- 5s)
 * - Two-way sync between audio and transcript
 * - Auto-generated summary from transcript
 * - Export to DOCX with optional summary
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Loader2, 
  AlertCircle, 
  ArrowLeft, 
  Play, 
  Pause, 
  FileAudio, 
  Clock,
  SkipForward,
  SkipBack,
  Sparkles,
  Download,
  FileText,
  Save,
  Trash2
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getMeetingById, getTranscriptByMeetingId, updateTranscript, summarizeMeeting, deleteMeeting } from "@/services/meetingService";
import type { Meeting, TranscriptSegment, MeetingStatus, SummarizeResponse } from "@/types/meeting";
import { formatTimeAgo } from "@/utils/time";
import { exportMeetingToDocx } from "@/utils/exportDocx";
import { EditableTranscriptSegment } from "@/components/meeting/EditableTranscriptSegment";

// Format seconds to MM:SS
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [summary, setSummary] = useState<string | null>(null); // Now stores plain text summary
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [loadingTranscript, setLoadingTranscript] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState(false);
  
  // Edited segments tracking - "dirty" state for unsaved edits
  // Map of segment index to edited text
  const [editedSegments, setEditedSegments] = useState<Map<number, string>>(new Map());
  const [savingTranscript, setSavingTranscript] = useState(false);
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportIncludeSummary, setExportIncludeSummary] = useState(true);
  const [exportIncludeTranscript, setExportIncludeTranscript] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef<number>(0);

  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!id) {
        setError("Meeting ID không hợp lệ");
        setLoadingMeeting(false);
        setLoadingTranscript(false);
        return;
      }

      try {
        // Fetch meeting metadata
        setLoadingMeeting(true);
        const meetingResult = await getMeetingById(id);

        if (meetingResult.success && meetingResult.data) {
          setMeeting(meetingResult.data);
        } else {
          throw new Error(meetingResult.error || "Không thể tải thông tin cuộc họp");
        }
      } catch (err) {
        console.error("Error fetching meeting:", err);
        setError(err instanceof Error ? err.message : "Không thể tải thông tin cuộc họp");
      } finally {
        setLoadingMeeting(false);
      }

      try {
        // Fetch transcript
        setLoadingTranscript(true);
        const transcriptResult = await getTranscriptByMeetingId(id);

        if (transcriptResult.success && transcriptResult.data) {
          const fetchedSegments = transcriptResult.data.segments || [];
          setSegments(fetchedSegments);
          setTranscriptError(false);
        } else {
          // Transcript not available - don't block audio playback
          console.log("Transcript not available");
          setSegments([]);
          setTranscriptError(true);
        }
      } catch (err) {
        console.error("Error fetching transcript:", err);
        setSegments([]);
        setTranscriptError(true);
      } finally {
        setLoadingTranscript(false);
      }
    };

    fetchMeetingData();
  }, [id]);

  // Update active segment based on current time (throttled)
  useEffect(() => {
    if (segments.length === 0) return;

    const activeIndex = segments.findIndex(
      (seg) => currentTime >= seg.start && currentTime < seg.end
    );

    if (activeIndex !== activeSegmentIndex) {
      setActiveSegmentIndex(activeIndex);
      
      // Auto-scroll to active segment (throttled to avoid jitter)
      const now = Date.now();
      if (activeIndex !== -1 && activeSegmentRef.current && now - lastScrollTime.current > 500) {
        lastScrollTime.current = now;
        activeSegmentRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentTime, segments, activeSegmentIndex]);

  // Audio event handlers
  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleSegmentClick = useCallback((segment: TranscriptSegment) => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = segment.start;
    audioRef.current.play();
    setIsPlaying(true);
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handleSkip = useCallback((seconds: number) => {
    if (!audioRef.current) return;

    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handlePlaybackRateChange = useCallback((rate: string) => {
    const rateNum = parseFloat(rate);
    setPlaybackRate(rateNum);
    if (audioRef.current) {
      audioRef.current.playbackRate = rateNum;
    }
  }, []);

  const handleExport = useCallback(async () => {
    if (!meeting) return;

    setExporting(true);
    try {
      await exportMeetingToDocx({
        meeting,
        segments: exportIncludeTranscript ? segments : undefined,
        summary: exportIncludeSummary && summary ? { executiveSummary: summary, keyHighlights: [], actionItems: [] } : undefined,
        includeSummary: exportIncludeSummary,
        includeTranscript: exportIncludeTranscript,
      });
      setExportDialogOpen(false);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Xuất file thất bại. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  }, [meeting, segments, summary, exportIncludeSummary, exportIncludeTranscript]);

  const handleDelete = useCallback(async () => {
    if (!id) return;

    setDeleting(true);
    try {
      const result = await deleteMeeting(id);
      
      if (result.success) {
        toast({
          title: "Đã xóa cuộc họp",
          description: "Cuộc họp đã được xóa thành công.",
        });
        // Redirect to dashboard after successful delete
        navigate("/meetings");
      } else {
        throw new Error(result.error || "Không thể xóa cuộc họp");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      toast({
        title: "Xóa thất bại",
        description: err instanceof Error ? err.message : "Không thể xóa cuộc họp. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }, [id, navigate, toast]);

  const handleSummarize = useCallback(async () => {
    if (!id || segments.length === 0) {
      toast({
        title: "Không thể tóm tắt",
        description: "Chưa có transcript để tóm tắt.",
        variant: "destructive",
      });
      return;
    }

    setLoadingSummary(true);
    setSummaryError(null);
    
    try {
      // Use CURRENT transcript state (includes unsaved edits)
      const result = await summarizeMeeting(id, segments);

      if (result.success && result.data) {
        setSummary(result.data.summary);
        toast({
          title: "Tóm tắt thành công",
          description: "Đã tạo tóm tắt cuộc họp.",
        });
      } else {
        throw new Error(result.error || "Không thể tạo tóm tắt");
      }
    } catch (err) {
      console.error("Error generating summary:", err);
      const errorMessage = err instanceof Error ? err.message : "Không thể tạo tóm tắt. Vui lòng thử lại.";
      setSummaryError(errorMessage);
      toast({
        title: "Lỗi khi tóm tắt",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoadingSummary(false);
    }
  }, [id, segments, toast]);

  const handleTextEdit = useCallback((index: number, newText: string) => {
    // Update the edited segments map
    setEditedSegments((prev) => {
      const updated = new Map(prev);
      updated.set(index, newText);
      return updated;
    });

    // Update the actual segment in the segments array
    setSegments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: newText };
      return updated;
    });
  }, []);

  const handleSaveTranscript = useCallback(async () => {
    if (!id || editedSegments.size === 0) return;

    setSavingTranscript(true);
    try {
      // Convert Map to array of {index, text}
      const editsArray = Array.from(editedSegments.entries()).map(([index, text]) => ({
        index,
        text,
      }));

      // Send PATCH request
      const result = await updateTranscript(id, editsArray);

      if (result.success && result.data) {
        // Update local state with response from backend
        setSegments(result.data.segments || []);
        
        // Clear dirty state
        setEditedSegments(new Map());

        // Show success toast
        toast({
          title: "Đã lưu chỉnh sửa",
          description: `${editsArray.length} đoạn transcript đã được cập nhật.`,
        });
      } else {
        throw new Error(result.error || "Không thể lưu chỉnh sửa");
      }
    } catch (err) {
      console.error("Error saving transcript:", err);
      toast({
        title: "Lỗi khi lưu",
        description: err instanceof Error ? err.message : "Không thể lưu chỉnh sửa. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setSavingTranscript(false);
    }
  }, [id, editedSegments, toast]);

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

  // Loading state
  if (loadingMeeting) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <div className="space-y-4">
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error || !meeting) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate("/meetings")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error || "Không thể tải thông tin cuộc họp"}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="ml-4"
              >
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  // Check if audioUrl is available
  const audioUrl = meeting.audioUrl;
  const hasAudio = !!audioUrl;
  const hasTranscript = segments.length > 0;
  const hasSummary = !!summary;

  // Success state
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/meetings")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            
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

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(true)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Xuất DOCX
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Xóa
            </Button>
          </div>
        </div>

        <Separator />

        {/* Meeting Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Thông tin cuộc họp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium">ID:</span> <span className="font-mono">{meeting.id}</span></div>
              <div><span className="font-medium">Tiêu đề:</span> {meeting.title}</div>
              <div><span className="font-medium">Trạng thái:</span> {getStatusBadge(meeting.status)}</div>
              <div><span className="font-medium">Tên file gốc:</span> {meeting.original_filename}</div>
              <div><span className="font-medium">Ngày tạo:</span> {formatTimeAgo(meeting.created_at)}</div>
              <div><span className="font-medium">Đường dẫn file:</span> <span className="font-mono break-all">{meeting.audioUrl || "(Chưa có)"}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Audio Player */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5" />
              Ghi âm cuộc họp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasAudio ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  File ghi âm chưa sẵn sàng. Vui lòng thử lại sau.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                />
                <div className="space-y-4">
                  {/* Playback Controls */}
                  <div className="flex items-center gap-4">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleSkip(-5)}
                      title="Lùi 5 giây"
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
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
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleSkip(5)}
                      title="Tua 5 giây"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                    {/* Playback Speed */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Tốc độ:</span>
                      <Select value={playbackRate.toString()} onValueChange={handlePlaybackRateChange}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.75">0.75x</SelectItem>
                          <SelectItem value="1">1x</SelectItem>
                          <SelectItem value="1.25">1.25x</SelectItem>
                          <SelectItem value="1.5">1.5x</SelectItem>
                          <SelectItem value="2">2x</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{formatTimestamp(currentTime)}</span>
                      <span>{formatTimestamp(duration)}</span>
                    </div>
                    <div
                      className="h-2 bg-secondary rounded-full overflow-hidden cursor-pointer"
                      onClick={handleSeek}
                    >
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Summary Section - Collapsible, User-Triggered */}
        <Card>
          <Accordion type="single" collapsible defaultValue="">
            <AccordionItem value="summary" className="border-none">
              <CardHeader className="pb-3">
                <AccordionTrigger className="hover:no-underline py-0">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Tóm tắt cuộc họp
                  </CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="pt-0 space-y-4">
                  {!hasSummary && !loadingSummary ? (
                    // Initial state - show summarize button
                    <div className="py-8 text-center">
                      <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-accent-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Nhấn nút bên dưới để tạo tóm tắt từ transcript hiện tại
                      </p>
                      <Button
                        onClick={handleSummarize}
                        disabled={!hasTranscript || loadingSummary}
                        className="gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Tóm tắt cuộc họp
                      </Button>
                      {!hasTranscript && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Cần có transcript để tóm tắt
                        </p>
                      )}
                    </div>
                  ) : loadingSummary ? (
                    // Loading state
                    <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Đang tóm tắt cuộc hội thoại …</span>
                    </div>
                  ) : summaryError ? (
                    // Error state
                    <div className="py-8 text-center">
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{summaryError}</AlertDescription>
                      </Alert>
                      <Button
                        onClick={handleSummarize}
                        variant="outline"
                        className="gap-2"
                      >
                        Thử lại
                      </Button>
                    </div>
                  ) : (
                    // Success state - show summary with regenerate option
                    <>
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {summary}
                      </p>
                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={handleSummarize}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={loadingSummary}
                        >
                          <Sparkles className="h-4 w-4" />
                          Tạo lại tóm tắt
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bản ghi âm chi tiết
              </CardTitle>
              
              {/* Save button - only show when there are unsaved edits */}
              {editedSegments.size > 0 && (
                <Button
                  onClick={handleSaveTranscript}
                  disabled={savingTranscript}
                  className="gap-2"
                  size="sm"
                >
                  {savingTranscript ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Lưu chỉnh sửa ({editedSegments.size})
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingTranscript ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-4 w-16" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : transcriptError || !hasTranscript ? (
              <div className="py-12 text-center text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-accent-foreground" />
                </div>
                <p className="font-medium">Chưa có transcript (đang xử lý)</p>
                <p className="text-sm mt-1">
                  Bản ghi âm vẫn có thể nghe được. Transcript sẽ sẵn sàng sau khi xử lý xong.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {segments.map((segment, index) => {
                    // Create a ref for the active segment
                    const segmentRef = index === activeSegmentIndex ? activeSegmentRef : null;
                    
                    return (
                      <div key={index} ref={segmentRef}>
                        <EditableTranscriptSegment
                          segment={segment}
                          index={index}
                          isActive={index === activeSegmentIndex}
                          isEdited={editedSegments.has(index)}
                          formatTimestamp={formatTimestamp}
                          onSegmentClick={handleSegmentClick}
                          onTextEdit={handleTextEdit}
                        />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Export Dialog */}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xuất file DOCX</DialogTitle>
              <DialogDescription>
                Chọn nội dung muốn xuất vào file Word
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-summary"
                  checked={exportIncludeSummary}
                  onCheckedChange={(checked) => setExportIncludeSummary(checked === true)}
                  disabled={!hasSummary}
                />
                <Label
                  htmlFor="include-summary"
                  className={!hasSummary ? "text-muted-foreground" : ""}
                >
                  Bao gồm tóm tắt
                  {!hasSummary && " (chưa tạo)"}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-transcript"
                  checked={exportIncludeTranscript}
                  onCheckedChange={(checked) => setExportIncludeTranscript(checked === true)}
                  disabled={!hasTranscript}
                />
                <Label
                  htmlFor="include-transcript"
                  className={!hasTranscript ? "text-muted-foreground" : ""}
                >
                  Bao gồm bản ghi âm chi tiết
                  {!hasTranscript && " (chưa có)"}
                </Label>
              </div>

              <div className="text-sm text-muted-foreground">
                Tên file: <span className="font-mono">{meeting.title || "meeting"}-{meeting.id}.docx</span>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExportDialogOpen(false)}
                disabled={exporting}
              >
                Hủy
              </Button>
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="gap-2"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xuất...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Xuất file
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận xóa cuộc họp</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa cuộc họp "{meeting.title}"? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Xóa cuộc họp
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
