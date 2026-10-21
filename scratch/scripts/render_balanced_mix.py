import os
import wave
import numpy as np
import subprocess
import imageio_ffmpeg
import shutil

ff = imageio_ffmpeg.get_ffmpeg_exe()

def get_dur(path):
    res = subprocess.run([ff, "-i", path], capture_output=True, text=True)
    for line in res.stderr.split("\n"):
        if "Duration:" in line:
            s = line.split("Duration:")[1].split(",")[0].strip()
            h, m, sec = s.split(":")
            return float(h)*3600 + float(m)*60 + float(sec)
    return 0.0

def load_wav_as_float(path, target_sr=44100):
    with wave.open(path, 'rb') as w:
        nchan = w.getnchannels()
        sampwidth = w.getsampwidth()
        sr = w.getframerate()
        nframes = w.getnframes()
        data = w.readframes(nframes)
    
    if sampwidth == 2:
        arr = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
    elif sampwidth == 4:
        arr = np.frombuffer(data, dtype=np.int32).astype(np.float32) / 2147483648.0
    else:
        raise ValueError(f"Unsupported sampwidth {sampwidth}")
        
    if nchan == 1:
        stereo = np.column_stack((arr, arr))
    elif nchan == 2:
        stereo = arr.reshape((-1, 2))
    else:
        stereo = arr.reshape((-1, nchan))[:, :2]
        
    return stereo, sr

SEGS = [
    ("sc01", 500,  "scratch/audio_final/sc01.wav"),
    ("sc02", 4300, "scratch/audio_final/sc02.wav"),
    ("sc03", 7200, "scratch/audio_final/sc03.wav"),
    ("sc04", 12000, "scratch/audio_final/sc04.wav"),
    ("sc05", 24200, "scratch/audio_final/sc05.wav"),
    ("sc06", 38000, "scratch/audio_final/sc06.wav"),
    ("sc07", 48400, "scratch/audio_final/sc07.wav"),
    ("sc08", 56500, "scratch/audio_final/sc08.wav"),
    ("sc09", 70300, "scratch/audio_final/sc09.wav"),
    ("sc10", 73100, "scratch/audio_final/sc10.wav"),
]

def render_balanced_mix():
    vin = "output/mejadepan_promo_silent_backup.mp4"
    bgm_path = "scratch/audio_final/bgm_chill.wav"
    vout = "output/mejadepan_promo.mp4"
    
    total_dur = get_dur(vin)
    sr = 44100
    total_samples = int(np.ceil(total_dur * sr))
    
    print(f"Target duration: {total_dur:.3f}s ({total_samples} samples at {sr}Hz)")
    
    # 1. Voiceover Track
    vo_track = np.zeros((total_samples, 2), dtype=np.float32)
    for sid, start_ms, wav_path in SEGS:
        seg_audio, _ = load_wav_as_float(wav_path, sr)
        start_samp = int((start_ms / 1000.0) * sr)
        end_samp = start_samp + len(seg_audio)
        if end_samp > total_samples:
            seg_audio = seg_audio[:total_samples - start_samp]
            end_samp = total_samples
        # Normalize individual segment peak to 0.85
        seg_peak = np.max(np.abs(seg_audio))
        if seg_peak > 0:
            seg_audio = seg_audio * (0.85 / seg_peak)
        vo_track[start_samp:end_samp] += seg_audio
        print(f"  Placed {sid} at {start_ms/1000.0:.2f}s - {end_samp/sr:.2f}s")
        
    # 2. BGM Track
    bgm_audio, _ = load_wav_as_float(bgm_path, sr)
    if len(bgm_audio) < total_samples:
        repeats = int(np.ceil(total_samples / len(bgm_audio)))
        bgm_audio = np.tile(bgm_audio, (repeats, 1))
    bgm_audio = bgm_audio[:total_samples]
    
    # Normalize BGM so peak is 1.0
    bgm_peak = np.max(np.abs(bgm_audio))
    if bgm_peak > 0:
        bgm_audio = bgm_audio / bgm_peak

    # 3. Dynamic Auto-Ducking
    # When voice is active: BGM at 0.32 (clearly audible, pleasant background)
    # When voice is silent: BGM at 0.48 (audible swell in pauses, rich atmosphere)
    vo_mono = np.max(np.abs(vo_track), axis=1)
    win_size = int(0.04 * sr)
    kernel = np.ones(win_size, dtype=np.float32) / win_size
    vo_env = np.convolve(vo_mono, kernel, mode='same')
    
    # Smooth ducking curve (attack 80ms, release 300ms)
    target_duck = np.where(vo_env > 0.05, 0.32, 0.48).astype(np.float32)
    smooth_duck = np.zeros(total_samples, dtype=np.float32)
    current_gain = 0.48
    attack_alpha = 1.0 - np.exp(-1.0 / (0.08 * sr))
    release_alpha = 1.0 - np.exp(-1.0 / (0.30 * sr))
    
    for i in range(total_samples):
        target = target_duck[i]
        if target < current_gain:
            current_gain += (target - current_gain) * attack_alpha
        else:
            current_gain += (target - current_gain) * release_alpha
        smooth_duck[i] = current_gain
        
    bgm_ducked = bgm_audio * smooth_duck[:, np.newaxis]
    
    # Smooth fade out at the very end (last 2 seconds)
    fade_len = int(2.0 * sr)
    fade_curve = np.cos(np.linspace(0, np.pi/2, fade_len)) ** 2
    bgm_ducked[-fade_len:] *= fade_curve[:, np.newaxis]
    
    # 4. Master Mix
    master = vo_track + bgm_ducked
    
    # Soft peak limiting
    peak = np.max(np.abs(master))
    print(f"Mix peak: {peak:.3f}")
    if peak > 0.95:
        master = master * (0.95 / peak)
        
    final_peak = np.max(np.abs(master))
    final_rms = np.sqrt(np.mean(master ** 2))
    print(f"Final Master: Peak={final_peak:.3f}, RMS={final_rms:.3f}")
    
    out_wav = "scratch/audio_final/master_balanced_mix.wav"
    with wave.open(out_wav, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        master_i16 = (np.clip(master, -1.0, 1.0) * 32767.0).astype(np.int16)
        wf.writeframes(master_i16.tobytes())
    print(f"Saved master audio to {out_wav}")
    
    # 5. Mux with video
    cmd = [
        ff, "-y",
        "-i", vin,
        "-i", out_wav,
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "256k",
        "-ar", "48000",
        "-shortest",
        vout
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("FFmpeg error:", res.stderr)
        raise RuntimeError("FFmpeg muxing failed")
        
    final_size = os.path.getsize(vout) / (1024 * 1024)
    print(f"SUCCESS: {vout} ({get_dur(vout):.2f}s, {final_size:.2f} MB)")

if __name__ == "__main__":
    render_balanced_mix()
