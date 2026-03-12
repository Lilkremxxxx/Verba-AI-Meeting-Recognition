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
  Trash2,
  Mic,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  PencilLine,
  Plus,
  X
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

import { getMeetingById, getMeetingSummaryById, getTranscriptByMeetingId, updateTranscript, deleteMeeting, startTranscription } from "@/services/meetingService";
import type { Meeting, TranscriptSegment, MeetingStatus, MeetingSummary } from "@/types/meeting";
import { formatTimeAgo } from "@/utils/time";
import { exportMeetingToDocx } from "@/utils/exportDocx";
import { EditableTranscriptSegment } from "@/components/meeting/EditableTranscriptSegment";

// Format seconds to MM:SS
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

const SUMMARY_LOADING_MESSAGES = [
  "Đang lấy bản tóm tắt từ hệ thống...",
  "Đang gom các quyết định quan trọng...",
  "Đang sắp xếp đầu việc và mốc thời gian...",
];

function createEmptySummary(): MeetingSummary {
  return {
    summary: "",
    decisions: [],
    tasks: [],
    deadlines: [],
  };
}

function cloneSummary(summary: MeetingSummary): MeetingSummary {
  return {
    summary: summary.summary,
    decisions: [...summary.decisions],
    tasks: summary.tasks.map((task) => ({ ...task })),
    deadlines: summary.deadlines.map((deadline) => ({ ...deadline })),
  };
}

function normalizeMeetingSummary(summary: Partial<MeetingSummary> | null | undefined): MeetingSummary {
  return {
    summary: typeof summary?.summary === "string" ? summary.summary : "",
    decisions: Array.isArray(summary?.decisions)
      ? summary.decisions.filter((item): item is string => typeof item === "string")
      : [],
    tasks: Array.isArray(summary?.tasks)
      ? summary.tasks.map((task) => ({
          task: typeof task?.task === "string" ? task.task : "",
          owner: typeof task?.owner === "string" ? task.owner : "",
          deadline: typeof task?.deadline === "string" ? task.deadline : "",
        }))
      : [],
    deadlines: Array.isArray(summary?.deadlines)
      ? summary.deadlines.map((deadline) => ({
          date: typeof deadline?.date === "string" ? deadline.date : "",
          item: typeof deadline?.item === "string" ? deadline.item : "",
        }))
      : [],
  };
}

function hasSummaryContent(summary: MeetingSummary | null): boolean {
  if (!summary) return false;

  return Boolean(
    summary.summary.trim() ||
      summary.decisions.some((item) => item.trim()) ||
      summary.tasks.some((item) => item.task.trim() || item.owner.trim() || item.deadline.trim()) ||
      summary.deadlines.some((item) => item.date.trim() || item.item.trim())
  );
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [summaryDraft, setSummaryDraft] = useState<MeetingSummary | null>(null);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryLoadingMessageIndex, setSummaryLoadingMessageIndex] = useState(0);
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

  // Transcription state
  const [transcribing, setTranscribing] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
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
    if (!loadingSummary) {
      setSummaryLoadingMessageIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setSummaryLoadingMessageIndex((prev) => (prev + 1) % SUMMARY_LOADING_MESSAGES.length);
    }, 1400);

    return () => window.clearInterval(intervalId);
  }, [loadingSummary]);

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

  const handleStartTranscription = useCallback(async () => {
    if (!id) return;

    setTranscribing(true);
    try {
      const result = await startTranscription(id);
      if (!result.success) {
        throw new Error(result.error || "Không thể bắt đầu transcript");
      }

      toast({ title: "Đang xử lý transcript", description: "Hệ thống đang chuyển đổi âm thanh thành văn bản..." });

      // Update meeting status to PROCESSING immediately in UI
      setMeeting((prev) => prev ? { ...prev, status: "PROCESSING" } : prev);

      // Poll every 10s until status = DONE then fetch transcript
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const meetingResult = await getMeetingById(id);
          if (!meetingResult.success || !meetingResult.data) {
            // Stop polling on auth error (401)
            if (meetingResult.error?.includes("401") || meetingResult.error?.toLowerCase().includes("unauthorized")) {
              clearInterval(pollingIntervalRef.current!);
              pollingIntervalRef.current = null;
              setTranscribing(false);
              toast({
                title: "Phiên đăng nhập hết hạn",
                description: "Vui lòng đăng nhập lại để tiếp tục.",
                variant: "destructive",
              });
              navigate("/login");
            }
            return;
          }

          const updatedMeeting = meetingResult.data;
          setMeeting(updatedMeeting);

          if (updatedMeeting.status === "DONE") {
            clearInterval(pollingIntervalRef.current!);
            pollingIntervalRef.current = null;
            setTranscribing(false);

            // Fetch transcript
            const transcriptResult = await getTranscriptByMeetingId(id);
            if (transcriptResult.success && transcriptResult.data) {
              setSegments(transcriptResult.data.segments || []);
              setTranscriptError(false);
            }
            toast({ title: "Transcript hoàn tất", description: "Bản ghi âm đã sẵn sàng." });
          } else if (updatedMeeting.status === "FAILED") {
            clearInterval(pollingIntervalRef.current!);
            pollingIntervalRef.current = null;
            setTranscribing(false);
            toast({ title: "Transcript thất bại", description: "Quá trình xử lý gặp lỗi.", variant: "destructive" });
          }
        } catch {
          // ignore polling errors
        }
      }, 10000);
    } catch (err) {
      setTranscribing(false);
      toast({
        title: "Lỗi",
        description: err instanceof Error ? err.message : "Không thể bắt đầu transcript",
        variant: "destructive",
      });
    }
  }, [id, navigate, toast]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
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
        summary: exportIncludeSummary ? summary ?? undefined : undefined,
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
      const result = await getMeetingSummaryById(id);

      if (result.success && result.data) {
        const normalizedSummary = normalizeMeetingSummary(result.data);
        setSummary(normalizedSummary);
        setSummaryDraft(cloneSummary(normalizedSummary));
        setEditingSummary(false);
        toast({
          title: "Tải tóm tắt thành công",
          description: "Đã lấy dữ liệu từ endpoint GET /meetings/{meeting_id}/summary.",
        });
      } else {
        throw new Error(result.error || "Không thể lấy tóm tắt cuộc họp");
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
      const errorMessage = err instanceof Error ? err.message : "Không thể lấy tóm tắt. Vui lòng thử lại.";
      setSummaryError(errorMessage);
      toast({
        title: "Lỗi khi lấy tóm tắt",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoadingSummary(false);
    }
  }, [id, segments.length, toast]);

  const handleStartSummaryEdit = useCallback(() => {
    if (!summary) return;
    setSummaryDraft(cloneSummary(summary));
    setEditingSummary(true);
  }, [summary]);

  const handleCancelSummaryEdit = useCallback(() => {
    setSummaryDraft(summary ? cloneSummary(summary) : null);
    setEditingSummary(false);
  }, [summary]);

  const handleSaveSummaryEdit = useCallback(() => {
    if (!summaryDraft) return;

    const normalizedDraft = normalizeMeetingSummary(summaryDraft);
    setSummary(normalizedDraft);
    setSummaryDraft(cloneSummary(normalizedDraft));
    setEditingSummary(false);
    toast({
      title: "Đã cập nhật tóm tắt",
      description: "Nội dung tóm tắt đã được chỉnh sửa trên giao diện.",
    });
  }, [summaryDraft, toast]);

  const handleSummaryTextChange = useCallback((value: string) => {
    setSummaryDraft((prev) => prev ? { ...prev, summary: value } : prev);
  }, []);

  const handleDecisionChange = useCallback((index: number, value: string) => {
    setSummaryDraft((prev) => {
      if (!prev) return prev;
      const decisions = [...prev.decisions];
      decisions[index] = value;
      return { ...prev, decisions };
    });
  }, []);

  const handleAddDecision = useCallback(() => {
    setSummaryDraft((prev) => prev ? { ...prev, decisions: [...prev.decisions, ""] } : { ...createEmptySummary(), decisions: [""] });
  }, []);

  const handleRemoveDecision = useCallback((index: number) => {
    setSummaryDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        decisions: prev.decisions.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }, []);

  const handleTaskChange = useCallback((index: number, field: "task" | "owner" | "deadline", value: string) => {
    setSummaryDraft((prev) => {
      if (!prev) return prev;
      const tasks = prev.tasks.map((task, taskIndex) =>
        taskIndex === index ? { ...task, [field]: value } : task
      );
      return { ...prev, tasks };
    });
  }, []);

  const handleAddTask = useCallback(() => {
    setSummaryDraft((prev) => {
      if (!prev) {
        return {
          ...createEmptySummary(),
          tasks: [{ task: "", owner: "", deadline: "" }],
        };
      }

      return {
        ...prev,
        tasks: [...prev.tasks, { task: "", owner: "", deadline: "" }],
      };
    });
  }, []);

  const handleRemoveTask = useCallback((index: number) => {
    setSummaryDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.filter((_, taskIndex) => taskIndex !== index),
      };
    });
  }, []);

  const handleDeadlineChange = useCallback((index: number, field: "date" | "item", value: string) => {
    setSummaryDraft((prev) => {
      if (!prev) return prev;
      const deadlines = prev.deadlines.map((deadline, deadlineIndex) =>
        deadlineIndex === index ? { ...deadline, [field]: value } : deadline
      );
      return { ...prev, deadlines };
    });
  }, []);

  const handleAddDeadline = useCallback(() => {
    setSummaryDraft((prev) => {
      if (!prev) {
        return {
          ...createEmptySummary(),
          deadlines: [{ date: "", item: "" }],
        };
      }

      return {
        ...prev,
        deadlines: [...prev.deadlines, { date: "", item: "" }],
      };
    });
  }, []);

  const handleRemoveDeadline = useCallback((index: number) => {
    setSummaryDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        deadlines: prev.deadlines.filter((_, deadlineIndex) => deadlineIndex !== index),
      };
    });
  }, []);

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
  const hasSummary = hasSummaryContent(summary);

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
        <Card className="overflow-hidden border-primary/10">
          <Accordion type="single" collapsible defaultValue="summary">
            <AccordionItem value="summary" className="border-none">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-background to-primary/10 pb-4">
                <AccordionTrigger className="hover:no-underline py-0">
                  <div className="flex w-full items-center justify-between gap-4 pr-4 text-left">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Tóm tắt cuộc họp
                      </CardTitle>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Nhấn nút bên dưới để gọi endpoint <span className="font-mono text-xs">{"GET /meetings/{meeting_id}/summary"}</span>. Nhấp đúp vào nội dung sau khi tải để chỉnh sửa nhanh.
                      </p>
                    </div>
                    {hasSummary && (
                      <div className="hidden flex-wrap items-center gap-2 lg:flex">
                        <Badge variant="secondary">{summary?.decisions.length || 0} quyết định</Badge>
                        <Badge variant="secondary">{summary?.tasks.length || 0} đầu việc</Badge>
                        <Badge variant="secondary">{summary?.deadlines.length || 0} mốc</Badge>
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-5 pt-5">
                  {!hasSummary && !loadingSummary ? (
                    <div className="rounded-2xl border border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-background px-6 py-10 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
                        <Sparkles className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-semibold">Lấy tóm tắt cấu trúc cho cuộc họp</h3>
                      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Hệ thống sẽ hiển thị tổng quan, quyết định quan trọng, đầu việc cần làm và các mốc thời gian để bạn rà soát nhanh trước khi export.
                      </p>
                      <Button
                        onClick={handleSummarize}
                        disabled={!hasTranscript || loadingSummary}
                        className="mt-5 gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Tải tóm tắt cuộc họp
                      </Button>
                      {!hasTranscript && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Cần có transcript trước khi lấy summary.
                        </p>
                      )}
                    </div>
                  ) : loadingSummary ? (
                    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background px-6 py-12 text-center">
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-background shadow-sm">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/10 border-t-primary/40 [animation-duration:2.4s]" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-medium">Đang xử lý tóm tắt cuộc họp</p>
                        <p className="text-sm text-muted-foreground">{SUMMARY_LOADING_MESSAGES[summaryLoadingMessageIndex]}</p>
                      </div>
                    </div>
                  ) : summaryError ? (
                    <div className="py-4 text-center">
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
                    <div className="space-y-5">
                      <div className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 via-background to-background p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-medium">Dữ liệu tóm tắt đã sẵn sàng</p>
                          <p className="text-sm text-muted-foreground">
                            Bạn có thể chỉnh sửa trực tiếp trên giao diện trước khi xuất DOCX.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editingSummary ? (
                            <>
                              <Button onClick={handleSaveSummaryEdit} size="sm" className="gap-2">
                                <Save className="h-4 w-4" />
                                Lưu chỉnh sửa
                              </Button>
                              <Button onClick={handleCancelSummaryEdit} size="sm" variant="outline" className="gap-2">
                                <X className="h-4 w-4" />
                                Hủy
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button onClick={handleStartSummaryEdit} size="sm" variant="outline" className="gap-2">
                                <PencilLine className="h-4 w-4" />
                                Chỉnh sửa
                              </Button>
                              <Button onClick={handleSummarize} size="sm" variant="outline" className="gap-2" disabled={loadingSummary}>
                                <Sparkles className="h-4 w-4" />
                                Tải lại từ API
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {editingSummary && summaryDraft ? (
                        <div className="space-y-5">
                          <div className="rounded-2xl border bg-card p-4 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <h3 className="font-semibold">Tổng quan cuộc họp</h3>
                            </div>
                            <Textarea
                              value={summaryDraft.summary}
                              onChange={(event) => handleSummaryTextChange(event.target.value)}
                              className="min-h-[140px] resize-y"
                              placeholder="Nhập phần tóm tắt ngắn gọn của cuộc họp..."
                            />
                          </div>

                          <div className="grid gap-5 xl:grid-cols-3">
                            <div className="rounded-2xl border bg-card p-4 shadow-sm">
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  <h3 className="font-semibold">Quyết định quan trọng</h3>
                                </div>
                                <Button type="button" size="sm" variant="outline" onClick={handleAddDecision} className="gap-1">
                                  <Plus className="h-3.5 w-3.5" />
                                  Thêm
                                </Button>
                              </div>
                              <div className="space-y-3">
                                {summaryDraft.decisions.length === 0 && (
                                  <p className="text-sm text-muted-foreground">Chưa có quyết định nào. Bạn có thể thêm mới bên trên.</p>
                                )}
                                {summaryDraft.decisions.map((decision, index) => (
                                  <div key={`decision-${index}`} className="space-y-2 rounded-xl border border-border/70 p-3">
                                    <Textarea
                                      value={decision}
                                      onChange={(event) => handleDecisionChange(index, event.target.value)}
                                      className="min-h-[96px] resize-y"
                                      placeholder={`Quyết định ${index + 1}`}
                                    />
                                    <div className="flex justify-end">
                                      <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveDecision(index)} className="text-muted-foreground hover:text-destructive">
                                        Xóa
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-2xl border bg-card p-4 shadow-sm xl:col-span-2">
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <ClipboardList className="h-4 w-4 text-amber-600" />
                                  <h3 className="font-semibold">Đầu việc cần làm</h3>
                                </div>
                                <Button type="button" size="sm" variant="outline" onClick={handleAddTask} className="gap-1">
                                  <Plus className="h-3.5 w-3.5" />
                                  Thêm đầu việc
                                </Button>
                              </div>
                              <div className="space-y-3">
                                {summaryDraft.tasks.length === 0 && (
                                  <p className="text-sm text-muted-foreground">Chưa có đầu việc nào.</p>
                                )}
                                {summaryDraft.tasks.map((task, index) => (
                                  <div key={`task-${index}`} className="rounded-xl border border-border/70 p-3">
                                    <div className="grid gap-3 md:grid-cols-2">
                                      <div className="md:col-span-2">
                                        <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Nội dung</Label>
                                        <Textarea
                                          value={task.task}
                                          onChange={(event) => handleTaskChange(index, "task", event.target.value)}
                                          className="min-h-[92px] resize-y"
                                          placeholder="Ví dụ: Chuẩn bị tài liệu họp sprint tiếp theo"
                                        />
                                      </div>
                                      <div>
                                        <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Người phụ trách</Label>
                                        <Input
                                          value={task.owner}
                                          onChange={(event) => handleTaskChange(index, "owner", event.target.value)}
                                          placeholder="Ví dụ: Minh / Team Backend"
                                        />
                                      </div>
                                      <div>
                                        <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Hạn chót</Label>
                                        <Input
                                          value={task.deadline}
                                          onChange={(event) => handleTaskChange(index, "deadline", event.target.value)}
                                          placeholder="2026-03-20 hoặc Cuối tuần này"
                                        />
                                      </div>
                                    </div>
                                    <div className="mt-2 flex justify-end">
                                      <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveTask(index)} className="text-muted-foreground hover:text-destructive">
                                        Xóa đầu việc
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-2xl border bg-card p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <CalendarRange className="h-4 w-4 text-sky-600" />
                                <h3 className="font-semibold">Mốc thời gian</h3>
                              </div>
                              <Button type="button" size="sm" variant="outline" onClick={handleAddDeadline} className="gap-1">
                                <Plus className="h-3.5 w-3.5" />
                                Thêm mốc
                              </Button>
                            </div>
                            <div className="space-y-3">
                              {summaryDraft.deadlines.length === 0 && (
                                <p className="text-sm text-muted-foreground">Chưa có mốc thời gian nào.</p>
                              )}
                              {summaryDraft.deadlines.map((deadline, index) => (
                                <div key={`deadline-${index}`} className="rounded-xl border border-border/70 p-3">
                                  <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                                    <div>
                                      <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Ngày / mốc</Label>
                                      <Input
                                        value={deadline.date}
                                        onChange={(event) => handleDeadlineChange(index, "date", event.target.value)}
                                        placeholder="2026-03-15 hoặc Thứ Sáu tuần này"
                                      />
                                    </div>
                                    <div>
                                      <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Sự kiện</Label>
                                      <Input
                                        value={deadline.item}
                                        onChange={(event) => handleDeadlineChange(index, "item", event.target.value)}
                                        placeholder="Ví dụ: Chốt bản demo"
                                      />
                                    </div>
                                  </div>
                                  <div className="mt-2 flex justify-end">
                                    <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveDeadline(index)} className="text-muted-foreground hover:text-destructive">
                                      Xóa mốc
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : summary ? (
                        <div className="space-y-5" onDoubleClick={handleStartSummaryEdit}>
                          <div className="grid gap-5 xl:grid-cols-3">
                            <div className="rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm xl:col-span-2">
                              <div className="mb-3 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <h3 className="font-semibold">Bức tranh tổng quan</h3>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/85">
                                {summary.summary || "Chưa có phần mô tả tổng quan."}
                              </p>
                            </div>

                            <div className="grid gap-3">
                              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Quyết định</p>
                                <p className="mt-2 text-3xl font-bold">{summary.decisions.length}</p>
                              </div>
                              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Đầu việc</p>
                                <p className="mt-2 text-3xl font-bold">{summary.tasks.length}</p>
                              </div>
                              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Mốc thời gian</p>
                                <p className="mt-2 text-3xl font-bold">{summary.deadlines.length}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-5 xl:grid-cols-3">
                            <div className="rounded-2xl border bg-card p-5 shadow-sm">
                              <div className="mb-4 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <h3 className="font-semibold">Quyết định quan trọng</h3>
                              </div>
                              {summary.decisions.length > 0 ? (
                                <div className="space-y-3">
                                  {summary.decisions.map((decision, index) => (
                                    <div key={`decision-read-${index}`} className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm leading-6 text-foreground/90">
                                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                                        {index + 1}
                                      </span>
                                      {decision}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Chưa có quyết định nào được ghi nhận.</p>
                              )}
                            </div>

                            <div className="rounded-2xl border bg-card p-5 shadow-sm xl:col-span-2">
                              <div className="mb-4 flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-amber-600" />
                                <h3 className="font-semibold">Đầu việc cần làm</h3>
                              </div>
                              {summary.tasks.length > 0 ? (
                                <div className="grid gap-3 md:grid-cols-2">
                                  {summary.tasks.map((task, index) => (
                                    <div key={`task-read-${index}`} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                                      <p className="text-sm font-medium leading-6 text-foreground">{task.task || "Chưa có mô tả công việc"}</p>
                                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                        <p><span className="font-medium text-foreground/80">Phụ trách:</span> {task.owner || "Chưa rõ"}</p>
                                        <p><span className="font-medium text-foreground/80">Hạn chót:</span> {task.deadline || "Chưa rõ"}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Chưa có đầu việc nào được trích xuất.</p>
                              )}
                            </div>
                          </div>

                          <div className="rounded-2xl border bg-card p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                              <CalendarRange className="h-4 w-4 text-sky-600" />
                              <h3 className="font-semibold">Mốc thời gian quan trọng</h3>
                            </div>
                            {summary.deadlines.length > 0 ? (
                              <div className="space-y-3">
                                {summary.deadlines.map((deadline, index) => (
                                  <div key={`deadline-read-${index}`} className="grid gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 md:grid-cols-[220px_1fr] md:items-center">
                                    <div className="rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-sky-700 shadow-sm">
                                      {deadline.date || "Chưa rõ thời gian"}
                                    </div>
                                    <p className="text-sm leading-6 text-foreground/90">{deadline.item || "Chưa có mô tả"}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">Chưa có mốc thời gian nào trong phần summary.</p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
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
              
              {/* Start Transcription button - show when no transcript */}
              {!hasTranscript && !transcribing && (
                <Button
                  onClick={handleStartTranscription}
                  className="gap-2"
                  size="sm"
                >
                  <Mic className="h-4 w-4" />
                  Bắt đầu Transcript
                </Button>
              )}
              {transcribing && (
                <Button disabled size="sm" className="gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </Button>
              )}

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
                {transcribing ? (
                  <>
                    <p className="font-medium">Đang xử lý transcript...</p>
                    <p className="text-sm mt-1">Hệ thống đang chuyển đổi âm thanh thành văn bản, vui lòng chờ.</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Chưa có transcript</p>
                    <p className="text-sm mt-1">
                      Nhấn nút <span className="font-semibold">Bắt đầu Transcript</span> ở góc trên để xử lý bản ghi âm.
                    </p>
                  </>
                )}
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



