import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileAudio, ChevronRight, AlertCircle } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { UploadForm } from "@/components/meeting/UploadForm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { getMeetings } from "@/services/meetingService";
import { Meeting, MeetingStatus } from "@/types/meeting";
import { formatTimeAgo } from "@/utils/time";

export default function Dashboard() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getMeetings();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Không thể tải danh sách cuộc họp");
      }

      // Inject ONE demo DONE meeting for testing

      // Prepend demo meeting to the list
      setMeetings([...result.data]);
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

  const handleUpload = () => {
    // After upload, refresh the meetings list
    fetchMeetings();
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý và theo dõi các cuộc họp của bạn
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload Form - Left Panel */}
          <div className="lg:col-span-1">
            <UploadForm onUpload={handleUpload} />
          </div>

          {/* Meetings List - Right Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-foreground">
                Cuộc họp của bạn
              </h2>
              {!loading && !error && meetings.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {meetings.length} cuộc họp
                </span>
              )}
            </div>

            {/* Loading State */}
            {loading && (
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
            )}

            {/* Error State */}
            {!loading && error && (
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
            )}

            {/* Empty State */}
            {!loading && !error && meetings.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-4">
                  <FileAudio className="w-10 h-10 text-accent-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Chưa có cuộc họp nào
                </h3>
                <p className="text-muted-foreground">
                  Bắt đầu bằng cách tải lên file ghi âm cuộc họp
                </p>
              </motion.div>
            )}

            {/* Meetings List */}
            {!loading && !error && meetings.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {meetings.slice(0, 5).map((meeting, index) => (
                  <motion.div
                    key={meeting.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={`p-4 transition-colors ${
                        meeting.status === "DONE"
                          ? "hover:bg-accent/50 cursor-pointer"
                          : "cursor-not-allowed opacity-60"
                      }`}
                      onClick={() => handleMeetingClick(meeting)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileAudio className="h-5 w-5 text-primary" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">
                              {meeting.title}
                            </h3>
                            {meeting.id === "demo-done-meeting" && (
                              <Badge variant="outline" className="text-xs">
                                DEMO
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <span className="truncate">
                              {meeting.original_filename}
                            </span>
                            <span>•</span>
                            <span className="whitespace-nowrap">
                              {formatTimeAgo(meeting.created_at)}
                            </span>
                          </div>
                          {meeting.status !== "DONE" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Chỉ xem được khi đã hoàn tất
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="flex-shrink-0">
                          {getStatusBadge(meeting.status)}
                        </div>

                        {/* Chevron */}
                        {meeting.status === "DONE" && (
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}

                {/* View All Button */}
                {meetings.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/meetings")}
                  >
                    Xem tất cả ({meetings.length} cuộc họp)
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
