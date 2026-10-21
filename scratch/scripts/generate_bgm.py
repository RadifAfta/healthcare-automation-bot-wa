import numpy as np
import wave

def generate_luxury_ambient_bgm(filename="scratch/audio/bgm.wav", duration=60.0, sample_rate=44100):
    total_samples = int(sample_rate * duration)
    t = np.linspace(0, duration, total_samples, endpoint=False)
    
    # Chord progression: Fmaj9 -> Am7 -> Dm9 -> Bbmaj9
    chords = [
        [174.61, 220.00, 261.63, 329.63, 392.00], # Fmaj9
        [220.00, 261.63, 329.63, 392.00, 523.25], # Am7
        [146.83, 174.61, 220.00, 261.63, 329.63], # Dm9
        [116.54, 146.83, 174.61, 220.00, 261.63]  # Bbmaj9
    ]
    chord_len = 7.5
    
    audio_left = np.zeros(total_samples, dtype=np.float32)
    audio_right = np.zeros(total_samples, dtype=np.float32)
    
    # Build warm lush pad
    for i, chord in enumerate(chords * 2):
        start_time = i * chord_len
        end_time = min(duration, (i + 1) * chord_len)
        idx_start = int(start_time * sample_rate)
        idx_end = int(end_time * sample_rate)
        chunk_len = idx_end - idx_start
        if chunk_len <= 0:
            continue
            
        t_chunk = t[idx_start:idx_end] - start_time
        
        fade_in = int(sample_rate * 1.5)
        fade_out = int(sample_rate * 1.5)
        env = np.ones(chunk_len, dtype=np.float32)
        if chunk_len > fade_in:
            env[:fade_in] = np.sin(np.linspace(0, np.pi/2, fade_in))**2
        if chunk_len > fade_out:
            env[-fade_out:] = np.sin(np.linspace(np.pi/2, 0, fade_out))**2
            
        for note_idx, freq in enumerate(chord):
            phase_l = 2 * np.pi * freq * t_chunk
            phase_r = 2 * np.pi * (freq * 1.002) * t_chunk + 0.3
            
            tone_l = (0.5 * np.sin(phase_l) + 
                      0.25 * np.sin(2 * phase_l) + 
                      0.12 * np.sin(3 * phase_l) + 
                      0.06 * np.sin(4 * phase_l))
            tone_r = (0.5 * np.sin(phase_r) + 
                      0.25 * np.sin(2 * phase_r) + 
                      0.12 * np.sin(3 * phase_r) + 
                      0.06 * np.sin(4 * phase_r))
            
            pan = 0.3 + 0.4 * (note_idx / len(chord))
            audio_left[idx_start:idx_end] += tone_l * env * (1.0 - pan) * 0.15
            audio_right[idx_start:idx_end] += tone_r * env * pan * 0.15

    # Add gentle chime / sparkle arpeggios
    rng = np.random.RandomState(42)
    bell_freqs = [523.25, 659.25, 783.99, 880.00, 1046.50, 1318.51]
    for step in range(int(duration * 2)):
        strike_time = max(0.1, step * 0.5 + rng.uniform(-0.03, 0.03))
        idx_b = int(strike_time * sample_rate)
        if idx_b < 0 or idx_b >= total_samples - sample_rate:
            continue
        bfreq = bell_freqs[step % len(bell_freqs)]
        bell_dur = int(sample_rate * 1.0)
        if idx_b + bell_dur > total_samples:
            bell_dur = total_samples - idx_b
        if bell_dur <= 0:
            continue
            
        t_b = np.linspace(0, bell_dur / sample_rate, bell_dur, endpoint=False)
        bell_env = np.exp(-4.5 * t_b)
        bell_tone = ((np.sin(2 * np.pi * bfreq * t_b) + 0.3 * np.sin(2 * np.pi * bfreq * 2.0 * t_b)) * bell_env * 0.035).astype(np.float32)
        
        pan_b = 0.5 + 0.3 * np.sin(step * 0.7)
        audio_left[idx_b:idx_b+bell_dur] += bell_tone * (1.0 - pan_b)
        audio_right[idx_b:idx_b+bell_dur] += bell_tone * pan_b

    # Master envelope
    fade_in_master = int(sample_rate * 1.5)
    fade_out_master = int(sample_rate * 2.5)
    master_env = np.ones(total_samples, dtype=np.float32)
    master_env[:fade_in_master] = np.sin(np.linspace(0, np.pi/2, fade_in_master))
    master_env[-fade_out_master:] = np.sin(np.linspace(np.pi/2, 0, fade_out_master))
    
    audio_left *= master_env
    audio_right *= master_env
    
    max_val = max(float(np.max(np.abs(audio_left))), float(np.max(np.abs(audio_right))), 1e-6)
    target_peak = 0.25 # subtle background bed
    audio_left = (audio_left / max_val) * target_peak
    audio_right = (audio_right / max_val) * target_peak
    
    with wave.open(filename, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        interleaved = np.empty((total_samples * 2,), dtype=np.int16)
        interleaved[0::2] = (audio_left * 32767).astype(np.int16)
        interleaved[1::2] = (audio_right * 32767).astype(np.int16)
        wf.writeframes(interleaved.tobytes())
    print(f"Generated luxury ambient BGM: {filename}")

if __name__ == '__main__':
    generate_luxury_ambient_bgm()
