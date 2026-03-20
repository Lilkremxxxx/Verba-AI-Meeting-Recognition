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
        className: "bg-green-600 hover:bg-green-700",
      },
      PROCESSING: {
        label: "Đang xử lý",
        variant: "secondary" as const,
        className: "bg-orange-500 hover:bg-orange-600 text-white",
      },
      QUEUED: {
        label: "Đang chờ",
        variant: "outline" as const,
        className: "border-green-700 text-green-700",
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
    navigate(`/meetings/${meeting.id}`);
  };

  const handleUpload = () => {
    fetchMeetings();
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Quản lý và theo dõi các cuộc họp của bạn
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <UploadForm onUpload={handleUpload} />
          </div>

          <div className="space-y-4 lg:col-span-2">
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

            {!loading && !error && meetings.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent">
                  <FileAudio className="h-10 w-10 text-accent-foreground" />
                </div>
                <h3 className="mb-1 text-lg font-medium text-foreground">
                  Chưa có cuộc họp nào
                </h3>
                <p className="text-muted-foreground">
                  Bắt đầu bằng cách tải lên file ghi âm cuộc họp
                </p>
              </motion.div>
            )}

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
                      className="cursor-pointer p-4 transition-colors hover:bg-accent/50"
                      onClick={() => handleMeetingClick(meeting)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <FileAudio className="h-5 w-5 text-primary" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate font-semibold text-foreground">
                              {meeting.title}
                            </h3>
                            {meeting.id === "demo-done-meeting" && (
                              <Badge variant="outline" className="text-xs">
                                DEMO
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="truncate">
                              {meeting.original_filename}
                            </span>
                            <span>•</span>
                            <span className="whitespace-nowrap">
                              {formatTimeAgo(meeting.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          {getStatusBadge(meeting.status)}
                        </div>

                        <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                      </div>
                    </Card>
                  </motion.div>
                ))}

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
