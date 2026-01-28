import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, FileAudio } from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { AudioPlayer } from '@/components/meeting/AudioPlayer';
import { TranscriptViewer } from '@/components/meeting/TranscriptViewer';
import { SpeakerManager } from '@/components/meeting/SpeakerManager';
import { AISummaryView } from '@/components/meeting/AISummaryView';
import { ExportDialog } from '@/components/meeting/ExportDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockMeetings } from '@/data/mockMeetings';
import { TranscriptSegment, Meeting } from '@/types/meeting';
import { useToast } from '@/hooks/use-toast';

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Find meeting from mock data
  const initialMeeting = mockMeetings.find((m) => m.id === id);
  
  const [meeting, setMeeting] = useState<Meeting | undefined>(initialMeeting);
  const [audioTime, setAudioTime] = useState(0);
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);
  const [hasChanges, setHasChanges] = useState(false);

  if (!meeting || meeting.status !== 'DONE') {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-4">
            <FileAudio className="w-10 h-10 text-accent-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            Không tìm thấy cuộc họp
          </h3>
          <p className="text-muted-foreground mb-4">
            Cuộc họp không tồn tại hoặc chưa hoàn tất xử lý
          </p>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  const handleSegmentClick = (startTime: number) => {
    setSeekTime(startTime);
    // Reset after seeking
    setTimeout(() => setSeekTime(undefined), 100);
  };

  const handleSegmentEdit = (segmentId: string, newText: string) => {
    if (!meeting.transcript) return;
    
    const updatedTranscript = meeting.transcript.map((seg) =>
      seg.id === segmentId ? { ...seg, text: newText } : seg
    );
    
    setMeeting({ ...meeting, transcript: updatedTranscript });
    setHasChanges(true);
  };

  const handleSpeakerRename = (originalName: string, newName: string) => {
    const updatedSpeakerMap = { ...meeting.speakerMap, [originalName]: newName };
    setMeeting({ ...meeting, speakerMap: updatedSpeakerMap });
    setHasChanges(true);
  };

  const handleActionItemToggle = (itemId: string) => {
    if (!meeting.summary) return;
    
    const updatedActionItems = meeting.summary.actionItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    
    setMeeting({
      ...meeting,
      summary: { ...meeting.summary, actionItems: updatedActionItems },
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    // Mock save - in real app, this would send to API
    toast({
      title: 'Đã lưu thay đổi',
      description: 'Các thay đổi của bạn đã được lưu thành công.',
    });
    setHasChanges(false);
  };

  const handleExport = (
    format: 'pdf' | 'docx',
    scope: { summary: boolean; transcript: boolean }
  ) => {
    // Mock export - in real app, this would generate and download file
    console.log('Exporting:', { format, scope, meeting });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="h-10 w-10 flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{meeting.title}</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {meeting.fileName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Button onClick={handleSave} className="gradient-primary hover:opacity-90">
                  <Save className="h-4 w-4 mr-2" />
                  Lưu thay đổi
                </Button>
              </motion.div>
            )}
            <ExportDialog meetingTitle={meeting.title} onExport={handleExport} />
          </div>
        </div>

        {/* Audio Player */}
        {meeting.audioUrl && (
          <AudioPlayer
            audioUrl={meeting.audioUrl}
            currentTime={seekTime}
            onTimeUpdate={setAudioTime}
          />
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Transcript Section */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="transcript" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="transcript">Biên bản</TabsTrigger>
                <TabsTrigger value="summary">Tóm tắt AI</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transcript" className="mt-0">
                {meeting.transcript && (
                  <TranscriptViewer
                    segments={meeting.transcript}
                    speakerMap={meeting.speakerMap}
                    onSegmentClick={handleSegmentClick}
                    onSegmentEdit={handleSegmentEdit}
                    currentTime={audioTime}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="summary" className="mt-0">
                {meeting.summary && (
                  <AISummaryView
                    summary={meeting.summary}
                    onActionItemToggle={handleActionItemToggle}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <SpeakerManager
              speakerMap={meeting.speakerMap}
              onSpeakerRename={handleSpeakerRename}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
