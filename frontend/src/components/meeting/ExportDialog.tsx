import { useState } from 'react';
import { FileDown, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface ExportDialogProps {
  meetingTitle: string;
  onExport: (format: 'pdf' | 'docx', scope: { summary: boolean; transcript: boolean }) => void;
}

export function ExportDialog({ meetingTitle, onExport }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeTranscript, setIncludeTranscript] = useState(true);
  const { toast } = useToast();

  const handleExport = () => {
    if (!includeSummary && !includeTranscript) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Vui lòng chọn ít nhất một nội dung để xuất.',
      });
      return;
    }

    onExport(format, { summary: includeSummary, transcript: includeTranscript });
    
    toast({
      title: 'Xuất báo cáo thành công',
      description: `File ${meetingTitle}.${format} đang được tải xuống.`,
    });
    
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Xuất báo cáo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Xuất báo cáo</DialogTitle>
          <DialogDescription>
            Chọn định dạng và nội dung bạn muốn xuất
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Format selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Định dạng file</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as 'pdf' | 'docx')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="cursor-pointer font-normal">
                  PDF
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="docx" id="docx" />
                <Label htmlFor="docx" className="cursor-pointer font-normal">
                  DOCX (Word)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Content selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Nội dung xuất</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="summary"
                  checked={includeSummary}
                  onCheckedChange={(checked) => setIncludeSummary(checked === true)}
                />
                <Label htmlFor="summary" className="cursor-pointer font-normal">
                  Tóm tắt AI (Executive Summary, Key Highlights, Action Items)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="transcript"
                  checked={includeTranscript}
                  onCheckedChange={(checked) => setIncludeTranscript(checked === true)}
                />
                <Label htmlFor="transcript" className="cursor-pointer font-normal">
                  Biên bản cuộc họp (Transcript)
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleExport} className="gradient-primary hover:opacity-90">
            <FileDown className="h-4 w-4 mr-2" />
            Tải xuống
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
