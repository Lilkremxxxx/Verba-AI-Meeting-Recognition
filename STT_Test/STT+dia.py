# Load model directly
from huggingface_hub import login
import os
# Đọc token từ biến môi trường HF_TOKEN (không hardcode token vào code)
login(token=os.environ.get("HF_TOKEN"))

import os
os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"] = "1"
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"
import os
# Bỏ qua kiểm tra bảo mật của Torch để load file .bin
os.environ["TRANSFORMERS_VERIFY_TORCH_LOAD_IS_SAFE"] = "false"
import librosa
import soundfile as sf

def sampling_audio_16khz(input_path):
    audio_data, current_sample_rate = librosa.load(input_path, sr = 16000)
    print(f"Audio successfully standardized to 16Khz")
    return audio_data

input_file = r"D:\Bang\Learning\FPT\Semester 7\DAT301m\PRJ2\tuantienti.mp3"
audio_16khz = sampling_audio_16khz(input_file)


from transformers import pipeline, WhisperForConditionalGeneration, WhisperProcessor

# Load model and processor explicitly
processor = WhisperProcessor.from_pretrained("vinai/PhoWhisper-medium")
model = WhisperForConditionalGeneration.from_pretrained("vinai/PhoWhisper-medium")

transcriber = pipeline(
    "automatic-speech-recognition", 
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor
)
output = transcriber(
    {"array": audio_16khz, "sampling_rate": 16000 }, return_timestamps=True
)
print(output["text"])


