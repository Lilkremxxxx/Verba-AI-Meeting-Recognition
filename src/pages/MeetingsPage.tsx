import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileAudio, ChevronRight, Upload, AlertCircle } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { getMeetings } from "@/services/meetingService";
import { Meeting, MeetingStatus } from "@/types/meeting";
import { formatTimeAgo } from "@/utils/time";

export default function MeetingsPage() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await getMeetings();

      if (!res.success || !res.data) {
        throw new Error(res.error || "Không thể tải danh sách cuộc họp");
      }

      setMeetings([...res.data]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải danh sách cuộc họp",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

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

  const handleMeetingClick = (meeting: Meeting) => {
    console.log("Meeting clicked:", meeting.id, "Status:", meeting.status); // Debug log
    if (meeting.status !== "DONE") {
      // Don't navigate for non-DONE meetings
      console.log("Navigation blocked - status is not DONE");
      return;
    }
    console.log("Navigating to:", `/meetings/${meeting.id}`);
    navigate(`/meetings/${meeting.id}`);
  };

  const handleUploadClick = () => {
    navigate("/dashboard");
  };

  // Loading state

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cuộc họp</h1>
            <p className="text-muted-foreground mt-1">
              Danh sách các cuộc họp đã tải lên
            </p>
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-5 w-5" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cuộc họp</h1>
            <p className="text-muted-foreground mt-1">
              Danh sách các cuộc họp đã tải lên
            </p>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMeetings}
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

  // Empty state
  if (meetings.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cuộc họp</h1>
            <p className="text-muted-foreground mt-1">
              Danh sách các cuộc họp đã tải lên
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-4">
              <FileAudio className="w-10 h-10 text-accent-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              Chưa có cuộc họp nào
            </h3>
            <p className="text-muted-foreground mb-6">
              Bắt đầu bằng cách tải lên file ghi âm cuộc họp đầu tiên
            </p>
            <Button onClick={handleUploadClick} className="gap-2">
              <Upload className="h-4 w-4" />
              Tải lên cuộc họp mới
            </Button>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  // Meetings list
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cuộc họp</h1>
            <p className="text-muted-foreground mt-1">
              {meetings.length} cuộc họp
            </p>
          </div>
          <Button onClick={handleUploadClick} className="gap-2">
            <Upload className="h-4 w-4" />
            Tải lên mới
          </Button>
        </div>

        <div className="space-y-3">
          {meetings.map((meeting, index) => (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleMeetingClick(meeting)}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileAudio className="h-5 w-5 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {meeting.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span className="truncate">
                        {meeting.original_filename}
                      </span>
                      <span>•</span>
                      <span className="whitespace-nowrap">
                        {formatTimeAgo(meeting.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    {getStatusBadge(meeting.status)}
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
