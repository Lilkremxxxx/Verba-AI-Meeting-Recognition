# models/meeting.py
class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    title = Column(String)
    original_filename = Column(String)
    storage_path = Column(String)
    status = Column(String, default="QUEUED")
    created_at = Column(DateTime)