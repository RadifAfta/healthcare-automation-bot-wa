import imageio_ffmpeg
import subprocess
import os
import wave
import numpy as np

ff = imageio_ffmpeg.get_ffmpeg_exe()

# Let's inspect all segments in scratch/audio_final
seg_ids = ["sc01", "sc02", "sc03", "sc04", "sc05", "sc06", "sc07", "sc08", "sc09", "sc10"]
for sid in seg_ids:
    wav = f"scratch/audio_final/{sid}.wav"
    if os.path.exists(wav):
        with wave.open(wav) as w:
            dur = w.getnframes() / w.getframerate()
            data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
            amp = np.max(np.abs(data))
            print(f"{sid:5}: dur={dur:5.2f}s, max_amp={amp}")
    else:
        print(f"{sid:5}: NOT FOUND")
