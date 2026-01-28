# PhoWhisper-large Speech-to-Text Test

## Giới thiệu
Model PhoWhisper-large của VinAI là phiên bản Whisper được fine-tune đặc biệt cho tiếng Việt, cho kết quả transcription chính xác cao.

## Cài đặt

### 1. Cài đặt dependencies
```bash
pip install -r requirements.txt
```

### 2. Chuẩn bị file audio
- Đặt file audio (*.wav, *.mp3, *.m4a, etc.) vào thư mục dự án
- Hoặc chuẩn bị đường dẫn đến file audio

## Sử dụng

### Chạy script cơ bản
```bash
python phowhisper_test.py
```

Script sẽ:
1. Tải model PhoWhisper-large từ Hugging Face
2. Yêu cầu nhập đường dẫn file audio
3. Transcribe audio thành text

### Ví dụ sử dụng trong code

```python
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import librosa

# Load model
processor = WhisperProcessor.from_pretrained("vinai/PhoWhisper-large")
model = WhisperForConditionalGeneration.from_pretrained("vinai/PhoWhisper-large")

# Load audio
audio, sr = librosa.load("your_audio.wav", sr=16000)

# Transcribe
input_features = processor(audio, sampling_rate=16000, return_tensors="pt").input_features
predicted_ids = model.generate(input_features)
transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]

print(transcription)
```

## Yêu cầu
- Python 3.8+
- GPU khuyến nghị (nhưng CPU cũng được)
- File audio định dạng: WAV, MP3, M4A, FLAC, etc.

## Lưu ý
- Lần đầu chạy sẽ mất thời gian tải model (~3GB)
- Model hoạt động tốt nhất với tiếng Việt
- Chất lượng transcription phụ thuộc vào chất lượng audio đầu vào
