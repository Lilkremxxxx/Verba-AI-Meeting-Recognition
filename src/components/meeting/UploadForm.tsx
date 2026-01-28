import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileAudio, X, AlertCircle, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UploadFormProps {
  onUpload: (title: string, file: File) => void;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ACCEPTED_FORMATS = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
};

export function UploadForm({ onUpload }: UploadFormProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    setUploadSuccess(false);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File quá lớn. Kích thước tối đa là 500MB.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Định dạng file không hợp lệ. Chỉ chấp nhận .mp3 hoặc .wav');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      if (!title) {
        const fileName = acceptedFiles[0].name.replace(/\.[^/.]+$/, '');
        setTitle(fileName);
      }
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề cuộc họp');
      return;
    }
    
    if (!file) {
      setError('Vui lòng chọn file ghi âm');
      return;
    }

    setIsUploading(true);
    setError(null);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    // Simulate upload completion
    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      setIsUploading(false);
      setUploadSuccess(true);
      onUpload(title, file);
      
      // Reset form after success
      setTimeout(() => {
        setTitle('');
        setFile(null);
        setUploadProgress(0);
        setUploadSuccess(false);
      }, 2000);
    }, 2000);
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="border-border/50 shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
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
              onChange={(e) => setTitle(e.target.value)}
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
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                      isDragActive
                        ? 'border-primary bg-accent'
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center">
                        <Upload className="h-7 w-7 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {isDragActive ? 'Thả file vào đây' : 'Kéo thả file hoặc click để chọn'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
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
                  className="border rounded-xl p-4 bg-accent/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileAudio className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground truncate max-w-[200px]">
                          {file.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)}
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

                  {isUploading && (
                    <div className="mt-4 space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-sm text-muted-foreground text-center">
                        Đang tải lên... {Math.round(uploadProgress)}%
                      </p>
                    </div>
                  )}

                  {uploadSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 flex items-center justify-center gap-2 text-success"
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
            className="w-full gradient-primary hover:opacity-90"
            disabled={isUploading || !file || !title.trim()}
          >
            {isUploading ? 'Đang tải lên...' : 'Tải lên'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
