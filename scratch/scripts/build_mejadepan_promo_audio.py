import asyncio
import edge_tts
import imageio_ffmpeg
import subprocess
import os
import numpy as np
import wave

ff = imageio_ffmpeg.get_ffmpeg_exe()

# ==========================================
# 1. Voiceover Segments Configuration
# ==========================================
# Female voice: id-ID-GadisNeural
# Tone: Conversational, friendly, casual/santai, non-robotic
# Timed to match visual scenes & subtitles precisely

vo_segments = [
    {
        'id': 'sc01_hook',
        'start_ms': 500,     # 0.50s
        'target_cut': 3.80,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Capek balas chat satu-satu?'
    },
    {
        'id': 'sc02_pain',
        'start_ms': 3700,    # 3.70s
        'target_cut': 7.00,
        'rate': '+12%',
        'pitch': '+0Hz',
        'text': 'Balasnya besok pagi, pelanggan udah keburu kabur.'
    },
    {
        'id': 'sc03_brand',
        'start_ms': 7100,    # 7.10s
        'target_cut': 11.90,
        'rate': '+8%',
        'pitch': '+0Hz',
        'text': 'Kenalkan mejadepan dot ai, AI WhatsApp yang standby 24 jam.'
    },
    {
        'id': 'sc04_chat',
        'start_ms': 12200,   # 12.20s
        'target_cut': 23.80,
        'rate': '+5%',
        'pitch': '+0Hz',
        'text': 'Pelanggan tinggal chat seperti biasa. Mau info jam buka sampai daftar harga treatment, langsung dijawab instan.'
    },
    {
        'id': 'sc05_booking',
        'start_ms': 24200,   # 24.20s
        'target_cut': 37.70,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'AI langsung jawab pertanyaan, tawarkan layanan, dan kunci booking semudah mengobrol santai.'
    },
    {
        'id': 'sc06_sheet',
        'start_ms': 38100,   # 38.10s
        'target_cut': 48.10,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Booking langsung masuk rapi ke spreadsheet secara real-time, tanpa input manual.'
    },
    {
        'id': 'sc07_handoff_trigger',
        'start_ms': 48400,   # 48.40s
        'target_cut': 56.00,
        'rate': '+3%',
        'pitch': '+0Hz',
        'text': 'Ada keluhan atau pertanyaan sensitif? Tenang, AI tidak asal jawab.'
    },
    {
        'id': 'sc08_admin_reply',
        'start_ms': 56400,   # 56.40s
        'target_cut': 70.10,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Admin langsung dapat alert di WhatsApp, dan bisa balas pasien langsung dari chat WA admin.'
    },
    {
        'id': 'sc09_patient_receives',
        'start_ms': 70200,   # 70.20s
        'target_cut': 72.90,
        'rate': '+10%',
        'pitch': '+0Hz',
        'text': 'Pasien langsung terima balasan di chat yang sama.'
    },
    {
        'id': 'sc10_cta',
        'start_ms': 73100,   # 73.10s
        'target_cut': 78.43,
        'rate': '+5%',
        'pitch': '+0Hz',
        'text': 'Coba gratis sekarang! Chat kami di WhatsApp ya.'
    }
]

def trim_silence(input_path, output_path):
    cmd = [
        ff, '-y', '-i', input_path,
        '-af', 'silenceremove=start_periods=1:start_silence=0.02:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_silence=0.02:start_threshold=-40dB,areverse',
        output_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def get_duration(file_path):
    cmd = [ff, '-i', file_path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    for line in res.stderr.split('\n'):
        if 'Duration:' in line:
            dur_str = line.split('Duration:')[1].split(',')[0].strip()
            h, m, s = dur_str.split(':')
            return float(h)*3600 + float(m)*60 + float(s)
    return 0.0

async def generate_all_vo():
    os.makedirs('scratch/audio_mejadepan', exist_ok=True)
    print("Generating and trimming VO segments...")
    trimmed_paths = []
    
    for seg in vo_segments:
        raw_path = f"scratch/audio_mejadepan/{seg['id']}_raw.mp3"
        trimmed_path = f"scratch/audio_mejadepan/{seg['id']}.wav"
        
        # 1. Edge-TTS generation
        comm = edge_tts.Communicate(seg['text'], 'id-ID-GadisNeural', rate=seg['rate'], pitch=seg['pitch'])
        await comm.save(raw_path)
        
        # 2. Trim silence & convert to wav
        trim_silence(raw_path, trimmed_path)
        dur = get_duration(trimmed_path)
        
        start_sec = seg['start_ms'] / 1000.0
        end_sec = start_sec + dur
        
        print(f"[{seg['id']}] Start: {start_sec:5.2f}s | Dur: {dur:4.2f}s | End: {end_sec:5.2f}s | Cut: {seg['target_cut']:5.2f}s")
        print(f"    Text: {seg['text']}")
        trimmed_paths.append((seg['start_ms'], trimmed_path, dur))
        
    return trimmed_paths

# ==========================================
# 2. Background Music Generation (80 seconds)
# ==========================================
def generate_promo_lofi_bgm(output_wav="scratch/audio_mejadepan/promo_bgm.wav", duration=80.0, sample_rate=44100):
    total_samples = int(sample_rate * duration)
    t = np.linspace(0, duration, total_samples, endpoint=False)
    
    # 75 BPM lo-fi chill beat
    # Progression: Cmaj7 -> Am7 -> Dm7 -> G7
    chords = [
        [130.81, 164.81, 196.00, 246.94], # Cmaj7
        [110.00, 130.81, 164.81, 196.00], # Am7
        [146.83, 174.61, 220.00, 261.63], # Dm7
        [98.00, 123.47, 146.83, 174.61]   # G7
    ]
    bar_len = 3.2
    
    audio_left = np.zeros(total_samples, dtype=np.float32)
    audio_right = np.zeros(total_samples, dtype=np.float32)
    
    num_bars = int(np.ceil(duration / bar_len))
    for b in range(num_bars):
        chord = chords[b % len(chords)]
        start_t = b * bar_len
        idx_start = int(start_t * sample_rate)
        chord_dur = int(bar_len * sample_rate)
        if idx_start >= total_samples:
            break
        if idx_start + chord_dur > total_samples:
            chord_dur = total_samples - idx_start
            
        t_chord = np.linspace(0, chord_dur / sample_rate, chord_dur, endpoint=False)
        env = np.exp(-1.1 * t_chord)
        
        for n_i, freq in enumerate(chord):
            p_l = 2 * np.pi * freq * t_chord
            p_r = 2 * np.pi * (freq * 1.001) * t_chord + 0.2
            tone_l = (np.sin(p_l) + 0.3 * np.sin(2 * p_l) + 0.1 * np.sin(3 * p_l)) * env * 0.12
            tone_r = (np.sin(p_r) + 0.3 * np.sin(2 * p_r) + 0.1 * np.sin(3 * p_r)) * env * 0.12
            pan = 0.35 + 0.3 * (n_i / len(chord))
            audio_left[idx_start:idx_start+chord_dur] += tone_l * (1.0 - pan)
            audio_right[idx_start:idx_start+chord_dur] += tone_r * pan
            
    # Soft drum beat (kick and gentle rim)
    beat_dur = 0.8
    total_beats = int(duration / beat_dur)
    for step in range(total_beats):
        b_time = step * beat_dur
        idx = int(b_time * sample_rate)
        if idx >= total_samples - sample_rate // 2:
            break
            
        # Kick (beat 0 and 2)
        if step % 2 == 0:
            k_len = int(sample_rate * 0.25)
            t_k = np.linspace(0, 0.25, k_len, endpoint=False)
            freq_k = 65.0 * np.exp(-12.0 * t_k)
            phase_k = 2 * np.pi * np.cumsum(freq_k) / sample_rate
            kick = np.sin(phase_k) * np.exp(-10.0 * t_k) * 0.20
            audio_left[idx:idx+k_len] += kick
            audio_right[idx:idx+k_len] += kick
        else:
            # Soft rim click
            s_len = int(sample_rate * 0.15)
            t_s = np.linspace(0, 0.15, s_len, endpoint=False)
            snare = (np.sin(2 * np.pi * 320.0 * t_s) * np.exp(-25.0 * t_s) + 
                     np.random.uniform(-0.1, 0.1, s_len) * np.exp(-20.0 * t_s)) * 0.07
            audio_left[idx:idx+s_len] += snare
            audio_right[idx:idx+s_len] += snare

    # Vinyl atmosphere
    vinyl = np.random.normal(0, 0.005, total_samples).astype(np.float32)
    audio_left += vinyl
    audio_right += vinyl

    # Fade in & out
    fade_in = int(sample_rate * 1.5)
    fade_out = int(sample_rate * 2.5)
    master_env = np.ones(total_samples, dtype=np.float32)
    master_env[:fade_in] = np.sin(np.linspace(0, np.pi/2, fade_in))
    master_env[-fade_out:] = np.sin(np.linspace(np.pi/2, 0, fade_out))
    
    audio_left *= master_env
    audio_right *= master_env
    
    max_val = max(float(np.max(np.abs(audio_left))), float(np.max(np.abs(audio_right))), 1e-6)
    target_peak = 0.20
    audio_left = (audio_left / max_val) * target_peak
    audio_right = (audio_right / max_val) * target_peak
    
    with wave.open(output_wav, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        interleaved = np.empty((total_samples * 2,), dtype=np.int16)
        interleaved[0::2] = (audio_left * 32767).astype(np.int16)
        interleaved[1::2] = (audio_right * 32767).astype(np.int16)
        wf.writeframes(interleaved.tobytes())
        
    print(f"Generated chill lo-fi BGM ({duration}s): {output_wav}")

# ==========================================
# 3. Master Audio Assembly & Video Mux
# ==========================================
def assemble_and_mux(vo_list, bgm_path, video_in, video_out):
    print("Assembling master audio mix with FFmpeg...")
    
    # Inputs:
    # 0: video_in (78.43s)
    # 1: bgm_path (stereo 80.0s)
    # 2..11: vo files
    inputs = ['-i', video_in, '-i', bgm_path]
    for _, path, _ in vo_list:
        inputs.extend(['-i', path])
        
    filter_parts = []
    # Delay and pan/stereo each VO input
    for idx, (delay_ms, _, _) in enumerate(vo_list):
        in_idx = idx + 2
        # Convert mono VO to stereo and delay
        filter_parts.append(f"[{in_idx}:a]aformat=channel_layouts=stereo,adelay={delay_ms}|{delay_ms},volume=1.25[a_del_{idx}];")
        
    # Mix all VO together
    vo_mix_ins = "".join([f"[a_del_{idx}]" for idx in range(len(vo_list))])
    filter_parts.append(f"{vo_mix_ins}amix=inputs={len(vo_list)}:dropout_transition=0:normalize=0[vo_all];")
    
    # Pad VO to 79 seconds so amix doesn't cut early
    filter_parts.append("[vo_all]apad=whole_dur=79.0[vo_padded];")
    
    # BGM volume adjustment (soft -22dB so voice is crystal clear)
    filter_parts.append("[1:a]aformat=channel_layouts=stereo,volume=0.20,afade=t=out:st=76.0:d=2.4[bgm_soft];")
    
    # Final audio mix: VO + BGM + Mastering (loudnorm -15 LUFS for TikTok/Reels/WhatsApp)
    filter_parts.append("[vo_padded][bgm_soft]amix=inputs=2:duration=first:dropout_transition=0,loudnorm=I=-15.0:TP=-1.5:LRA=7.0[aout]")
    
    filter_complex_str = "".join(filter_parts)
    
    # Get exact video duration
    vid_dur = get_duration(video_in)
    
    cmd = [
        ff, '-y',
        *inputs,
        '-filter_complex', filter_complex_str,
        '-map', '0:v:0',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
        '-t', f'{vid_dur:.2f}',
        video_out
    ]
    
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("FFmpeg error:", res.stderr)
        raise RuntimeError("FFmpeg muxing failed")
        
    print(f"Muxing completed successfully -> {video_out}")

async def run_pipeline():
    # Backup original silent video if not already backed up
    silent_backup = "output/mejadepan_promo_silent_backup.mp4"
    if not os.path.exists(silent_backup):
        import shutil
        shutil.copy2("output/mejadepan_promo.mp4", silent_backup)
        print(f"Created silent backup at {silent_backup}")
        
    # 1. Generate Voiceover clips
    vo_list = await generate_all_vo()
    
    # 2. Generate Lo-fi BGM (80s)
    bgm_path = "scratch/audio_mejadepan/promo_bgm.wav"
    generate_promo_lofi_bgm(bgm_path, duration=80.0)
    
    # 3. Assemble and export final video
    final_output = "output/mejadepan_promo_with_vo.mp4"
    assemble_and_mux(vo_list, bgm_path, silent_backup, final_output)
    
    # Also update output/mejadepan_promo.mp4 directly
    import shutil
    shutil.copy2(final_output, "output/mejadepan_promo.mp4")
    print("Updated output/mejadepan_promo.mp4 with the finalized video!")
    
    # Check output properties
    probe = subprocess.run([ff, '-i', "output/mejadepan_promo.mp4"], capture_output=True, text=True)
    for line in probe.stderr.split('\n'):
        if any(k in line for k in ['Duration:', 'Stream #0:0', 'Stream #0:1']):
            print("  ", line.strip())

if __name__ == '__main__':
    asyncio.run(run_pipeline())
