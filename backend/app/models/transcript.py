# models/transcript.py
class Transcript(Base):
    __tablename__ = "transcripts"
    id = Column(UUID, primary_key=True)
    meeting_id = Column(UUID, ForeignKey("meetings.id"))
    text = Column(Text)              # Toàn bộ transcript
    language = Column(String)        # Ngôn ngữ nhận diện
    confidence = Column(Float)       # Độ chính xác
    processing_time = Column(Float)  # Thời gian xử lý
    created_at = Column(DateTime)