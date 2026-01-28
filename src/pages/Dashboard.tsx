import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileAudio, Search } from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { MeetingCard } from '@/components/meeting/MeetingCard';
import { UploadForm } from '@/components/meeting/UploadForm';
import { Input } from '@/components/ui/input';
import { Meeting } from '@/types/meeting';
import { mockMeetings } from '@/data/mockMeetings';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>(mockMeetings);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const filteredMeetings = meetings.filter(
    (meeting) =>
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpload = (title: string, file: File) => {
    const newMeeting: Meeting = {
      id: 'meet-' + Math.random().toString(36).substr(2, 9),
      title,
      fileName: file.name,
      fileSize: file.size,
      status: 'QUEUED',
      createdAt: new Date(),
      updatedAt: new Date(),
      speakerMap: {},
    };

    setMeetings([newMeeting, ...meetings]);
    
    toast({
      title: 'Tải lên thành công',
      description: 'Cuộc họp đang được xếp hàng xử lý.',
    });
  };

  const handleMeetingClick = (meeting: Meeting) => {
    if (meeting.status === 'DONE') {
      navigate(`/meeting/${meeting.id}`);
    }
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
          {/* Upload Form */}
          <div className="lg:col-span-1">
            <UploadForm onUpload={handleUpload} />
          </div>

          {/* Meetings List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-foreground">
                Cuộc họp của bạn
              </h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredMeetings.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-4">
                  <FileAudio className="w-10 h-10 text-accent-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có cuộc họp nào'}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'Thử tìm kiếm với từ khóa khác'
                    : 'Bắt đầu bằng cách tải lên file ghi âm cuộc họp'}
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {filteredMeetings.map((meeting, index) => (
                  <motion.div
                    key={meeting.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <MeetingCard
                      meeting={meeting}
                      onClick={() => handleMeetingClick(meeting)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
