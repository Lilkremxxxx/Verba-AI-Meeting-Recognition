/**
 * MeetingDetailPage - Audio playback with transcript highlighting
 * 
 * IMPORTANT: Place a demo audio file at public/audio/demo.mp3 (or demo.wav) for local testing.
 * The audio player will use this local file as a fallback until the backend provides audioUrl.
 */

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft, Play, Pause, FileAudio, Clock } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import { getMeetingById, getTranscriptByMeetingId } from "@/services/meetingService";
import type { Meeting, TranscriptSegment, MeetingStatus } from "@/types/meeting";
import { formatTimeAgo } from "@/utils/time";

// Format seconds to MM:SS
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // State
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [transcriptStatus, setTranscriptStatus] = useState<MeetingStatus | null>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [loadingTranscript, setLoadingTranscript] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  // Audio source: Use local fallback for testing
  // TODO: When backend provides audioUrl, use: meeting.audioUrl || "/audio/demo.mp3"
  const audioUrl = "/audio/demo.mp3";

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
          setTranscriptStatus(transcriptResult.data.status);
          setSegments(transcriptResult.data.segments || []);
        } else {
          // Transcript endpoint failed - show placeholder but keep audio playable
          console.log("Transcript not available, using placeholder");
          setTranscriptStatus("PROCESSING");
          setSegments([]);
        }
      } catch (err) {
        console.error("Error fetching transcript:", err);
        // Don't set error - just show processing state
        setTranscriptStatus("PROCESSING");
        setSegments([]);
      } finally {
        setLoadingTranscript(false);
      }
    };

    fetchMeetingData();
  }, [id]);

  // Update active segment based on current time
  useEffect(() => {
    if (segments.length === 0) return;

    const activeIndex = segments.findIndex(
      (seg) => currentTime >= seg.start && currentTime < seg.end
    );

    if (activeIndex !== activeSegmentIndex) {
      setActiveSegmentIndex(activeIndex);
      
      // Auto-scroll to active segment
      if (activeIndex !== -1 && activeSegmentRef.current) {
        activeSegmentRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentTime, segments, activeSegmentIndex]);

  // Audio event handlers
  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSegmentClick = (segment: TranscriptSegment) => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = segment.start;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

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
        </div>

        <Separator />

        {/* Audio Player */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5" />
              Ghi âm cuộc họp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
            
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
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5" />
              Bản ghi âm
            </CardTitle>
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
            ) : transcriptStatus !== "DONE" || segments.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-accent-foreground animate-pulse" />
                </div>
                <p className="font-medium">Đang xử lý bản ghi âm...</p>
                <p className="text-sm mt-1">
                  Bản ghi âm sẽ sẵn sàng khi trạng thái chuyển sang "Hoàn tất"
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {segments.map((segment, index) => (
                    <div
                      key={index}
                      ref={index === activeSegmentIndex ? activeSegmentRef : null}
                      className={`flex gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                        index === activeSegmentIndex
                          ? "bg-primary/10 border-l-4 border-primary"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => handleSegmentClick(segment)}
                    >
                      <div className="flex-shrink-0 w-20 text-xs text-muted-foreground pt-1">
                        {formatTimestamp(segment.start)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div
                          className={`text-sm ${
                            index === activeSegmentIndex
                              ? "font-semibold text-primary"
                              : "font-medium text-primary/70"
                          }`}
                        >
                          {segment.speaker}
                        </div>
                        <p
                          className={`text-sm leading-relaxed ${
                            index === activeSegmentIndex
                              ? "font-medium text-foreground"
                              : "text-foreground/80"
                          }`}
                        >
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
    </AppLayout>
  );
}
