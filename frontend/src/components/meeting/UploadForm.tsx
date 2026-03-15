import { useState, useCallback } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, FileAudio, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMeeting } from "@/services/meetingService";
import { formatFileSize, validateAudioFile } from "@/utils/fileValidation";

interface UploadFormProps {
  onUpload?: (title: string, file: File) => void;
}

const ACCEPTED_FORMATS = {
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
};

function getDropzoneError(rejectedFiles: FileRejection[]): string | null {
  if (rejectedFiles.length === 0) {
    return null;
  }

  const firstErrorCode = rejectedFiles[0].errors[0]?.code;

  if (firstErrorCode === "file-too-large") {
    return "File quá lớn. Kích thước tối đa là 500MB.";
  }

  if (firstErrorCode === "file-invalid-type") {
    return "Định dạng file không hợp lệ. Chỉ chấp nhận .mp3 hoặc .wav.";
  }

  return "Không thể xử lý file đã chọn. Vui lòng thử lại.";
}

export function UploadForm({ onUpload }: UploadFormProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);
      setUploadSuccess(false);

      const dropzoneError = getDropzoneError(rejectedFiles);
      if (dropzoneError) {
        setError(dropzoneError);
        return;
      }

      const selectedFile = acceptedFiles[0];
      if (!selectedFile) {
        return;
      }

      const validation = validateAudioFile(selectedFile);
      if (!validation.ok) {
        setError(validation.error || "Invalid file");
        return;
      }

      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    },
    [title],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxSize: 500 * 1024 * 1024,
    multiple: false,
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề cuộc họp.");
      return;
    }

    if (!file) {
      setError("Vui lòng chọn file ghi âm.");
      return;
    }

    const validation = validateAudioFile(file);
    if (!validation.ok) {
      setError(validation.error || "Invalid file");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await createMeeting({
        title: title.trim(),
        audio: file,
      });

      if (!result.success || !result.data) {
        const uploadError = result.error || "Không thể tải lên. Vui lòng thử lại.";
        setError(uploadError);
        toast.error("Lỗi tải lên", {
          description: uploadError,
        });
        return;
      }

      setUploadSuccess(true);
      toast.success("Tải lên thành công!", {
        description: `Cuộc họp "${title}" đã được tạo.`,
      });

      onUpload?.(title, file);

      window.setTimeout(() => {
        setTitle("");
        setFile(null);
        setUploadSuccess(false);
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.";
      setError(errorMessage);
      toast.error("Lỗi tải lên", {
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    setUploadSuccess(false);
  };

  return (
    <Card className="border-border/50 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="h-5 w-5 text-primary" />
          Tải lên cuộc họp mới
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề cuộc họp</Label>
            <Input
              id="title"
              placeholder="VD: Họp Sprint Planning Q1 2026"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isUploading}
            />
          </div>

          <div className="space-y-2">
            <Label>File ghi âm</Label>

            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div
                    {...getRootProps()}
                    className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                      isDragActive
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                    }`}
                  >
                    <input
                      {...getInputProps()}
                      accept="audio/mpeg,audio/wav,.mp3,.wav"
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
                        <Upload className="h-7 w-7 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {isDragActive
                            ? "Thả file vào đây"
                            : "Kéo thả file hoặc click để chọn"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Hỗ trợ .mp3, .wav (tối đa 500MB)
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="file-preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-xl border bg-accent/30 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileAudio className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="max-w-[200px] truncate font-medium text-foreground">
                          {file.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)} • {file.type || "Unknown type"}
                        </p>
                      </div>
                    </div>
                    {!isUploading && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={removeFile}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {uploadSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 flex items-center justify-center gap-2 text-green-600 dark:text-green-400"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Tải lên thành công!</span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="gradient-primary w-full hover:opacity-90"
            disabled={isUploading || !file || !title.trim()}
          >
            {isUploading ? "Đang tải lên..." : "Tải lên"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
