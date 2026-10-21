import numpy as np
import wave

def generate_tiktok_lofi(filename="scratch/audio/tiktok_lofi_chill.wav", duration=48.0, sample_rate=44100):
    total_samples = int(sample_rate * duration)
    t = np.linspace(0, duration, total_samples, endpoint=False)
    
    # 75 BPM lo-fi beat
    # 1 beat = 60 / 75 = 0.8 seconds
    # 1 bar = 3.2 seconds
    # Chords (Rhodes piano simulation):
    # Cmaj7: C3(130.81), E3(164.81), G3(196.00), B3(246.94)
    # Am7:   A2(110.00), C3(130.81), E3(164.81), G3(196.00)
    # Dm7:   D3(146.83), F3(174.61), A3(220.00), C4(261.63)
    # G7:    G2(98.00),  B2(123.47), D3(146.83), F3(174.61)
    
    chords = [
        [130.81, 164.81, 196.00, 246.94], # Cmaj7
        [110.00, 130.81, 164.81, 196.00], # Am7
        [146.83, 174.61, 220.00, 261.63], # Dm7
        [98.00, 123.47, 146.83, 174.61]   # G7
    ]
    bar_len = 3.2
    
    audio_left = np.zeros(total_samples, dtype=np.float32)
    audio_right = np.zeros(total_samples, dtype=np.float32)
    
    # Render electric piano chords
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
        # Gentle decaying envelope
        env = np.exp(-1.1 * t_chord)
        
        for n_i, freq in enumerate(chord):
            # Rhodes-like bell/sine mix
            p_l = 2 * np.pi * freq * t_chord
            p_r = 2 * np.pi * (freq * 1.001) * t_chord + 0.2
            tone_l = (np.sin(p_l) + 0.3 * np.sin(2 * p_l) + 0.1 * np.sin(3 * p_l)) * env * 0.12
            tone_r = (np.sin(p_r) + 0.3 * np.sin(2 * p_r) + 0.1 * np.sin(3 * p_r)) * env * 0.12
            pan = 0.35 + 0.3 * (n_i / len(chord))
            audio_left[idx_start:idx_start+chord_dur] += tone_l * (1.0 - pan)
            audio_right[idx_start:idx_start+chord_dur] += tone_r * pan
            
    # Soft lo-fi rhythm (gentle kick on beat 1 and 3, soft rim/click on beat 2 and 4)
    beat_dur = 0.8
    total_beats = int(duration / beat_dur)
    for step in range(total_beats):
        b_time = step * beat_dur
        idx = int(b_time * sample_rate)
        if idx >= total_samples - sample_rate // 2:
            break
            
        # Kick (beat 0 and 2 of 4)
        if step % 2 == 0:
            k_len = int(sample_rate * 0.25)
            t_k = np.linspace(0, 0.25, k_len, endpoint=False)
            freq_k = 65.0 * np.exp(-12.0 * t_k)
            phase_k = 2 * np.pi * np.cumsum(freq_k) / sample_rate
            kick = np.sin(phase_k) * np.exp(-10.0 * t_k) * 0.22
            audio_left[idx:idx+k_len] += kick
            audio_right[idx:idx+k_len] += kick
        else:
            # Soft rim click / snare
            s_len = int(sample_rate * 0.15)
            t_s = np.linspace(0, 0.15, s_len, endpoint=False)
            snare = (np.sin(2 * np.pi * 320.0 * t_s) * np.exp(-25.0 * t_s) + 
                     np.random.uniform(-0.1, 0.1, s_len) * np.exp(-20.0 * t_s)) * 0.08
            audio_left[idx:idx+s_len] += snare
            audio_right[idx:idx+s_len] += snare

    # Subtle vinyl texture
    vinyl_noise = np.random.normal(0, 0.008, total_samples).astype(np.float32)
    audio_left += vinyl_noise
    audio_right += vinyl_noise

    # Fade in & out
    fade_in = int(sample_rate * 1.0)
    fade_out = int(sample_rate * 2.0)
    master_env = np.ones(total_samples, dtype=np.float32)
    master_env[:fade_in] = np.sin(np.linspace(0, np.pi/2, fade_in))
    master_env[-fade_out:] = np.sin(np.linspace(np.pi/2, 0, fade_out))
    
    audio_left *= master_env
    audio_right *= master_env
    
    # Soft background volume (-20dB) so user's manual voiceover will easily cut through
    max_val = max(float(np.max(np.abs(audio_left))), float(np.max(np.abs(audio_right))), 1e-6)
    target_peak = 0.22
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
        
    print(f"Generated chill lo-fi background audio: {filename}")

if __name__ == '__main__':
    generate_tiktok_lofi()
