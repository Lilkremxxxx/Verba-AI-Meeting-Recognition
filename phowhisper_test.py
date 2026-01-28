"""
PhoWhisper-large Speech-to-Text Demo
Model: vinai/PhoWhisper-large
"""

import torch
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import librosa
import soundfile as sf

def load_model():
    """Load PhoWhisper-large model và processor"""
    print("Đang tải model PhoWhisper-large...")
    model_name = "vinai/PhoWhisper-large"
    
    processor = WhisperProcessor.from_pretrained(model_name)
    model = WhisperForConditionalGeneration.from_pretrained(model_name)
    
    # Sử dụng GPU nếu có
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    
    print(f"Model đã được tải trên {device}")
    return processor, model, device

def transcribe_audio(audio_path, processor, model, device):
    """
    Chuyển đổi file audio thành text
    
    Args:
        audio_path: Đường dẫn đến file audio
        processor: WhisperProcessor
        model: WhisperForConditionalGeneration
        device: cuda hoặc cpu
    
    Returns:
        str: Text đã transcribe
    """
    print(f"\nĐang xử lý file: {audio_path}")
    
    # Load audio file
    # Whisper yêu cầu sampling rate 16000 Hz
    audio, sr = librosa.load(audio_path, sr=16000)
    
    # Preprocess audio
    input_features = processor(
        audio, 
        sampling_rate=16000, 
        return_tensors="pt"
    ).input_features
    
    # Move to device
    input_features = input_features.to(device)
    
    # Generate transcription
    print("Đang transcribe...")
    with torch.no_grad():
        predicted_ids = model.generate(input_features)
    
    # Decode transcription
    transcription = processor.batch_decode(
        predicted_ids, 
        skip_special_tokens=True
    )[0]
    
    return transcription

def main():
    # Load model
    processor, model, device = load_model()
    
    print("\n" + "="*50)
    print("PhoWhisper-large Speech-to-Text Test")
    print("="*50)
    
    # Test với file audio
    # Thay đổi đường dẫn này thành file audio của bạn
    audio_file = "test_audio.wav"  # hoặc .mp3, .m4a, etc.
    
    print(f"\nNhập đường dẫn file audio (hoặc Enter để dùng '{audio_file}'):")
    user_input = input().strip()
    if user_input:
        audio_file = user_input
    
    try:
        # Transcribe
        result = transcribe_audio(audio_file, processor, model, device)
        
        print("\n" + "="*50)
        print("KẾT QUẢ TRANSCRIPTION:")
        print("="*50)
        print(result)
        print("="*50)
        
    except FileNotFoundError:
        print(f"\n❌ Không tìm thấy file: {audio_file}")
        print("Vui lòng đảm bảo file audio tồn tại!")
    except Exception as e:
        print(f"\n❌ Lỗi: {str(e)}")

if __name__ == "__main__":
    main()

    
