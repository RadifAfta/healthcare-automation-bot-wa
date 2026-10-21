import asyncio
import edge_tts
import imageio_ffmpeg
import subprocess
import os
import numpy as np
import wave
import shutil

ff = imageio_ffmpeg.get_ffmpeg_exe()

# Scene breakdown & exact timings:
# SC01:  0.00 -  4.30s | Notif WA masuk malam: "Capek balas chat pelanggan satu-satu?"
# SC02:  4.30 -  7.00s | Chat numpuk: "Dibalas besok... pelanggan keburu kabur."
# SC03:  7.00 - 11.90s | Logo screen: "Kenalin... meja depan dot a-i."
# SC04: 11.90 - 23.80s | Demo chat AI: "Asisten AI WhatsApp 24 jam..."
# SC05: 23.80 - 37.70s | Booking AI: "AI bantu rekomendasikan perawatan..."
# SC06: 37.70 - 48.10s | Sheets: "Data booking otomatis tercatat rapi..."
# SC07: 48.10 - 56.00s | Komplain: "Ada keluhan atau hal sensitif? Tenang..."
# SC08: 56.00 - 70.10s | Admin WA: "Admin dapat notifikasi di WhatsApp..."
# SC09: 70.10 - 72.90s | Chat pasien: "Pasien terima balasan di chat yang sama."
# SC10: 72.90 - 78.43s | CTA: "Yuk, coba gratis tujuh hari..."

SEGS = [
    ("sc01", 500,   4.30, "+0%",  "+1Hz", "+8%",
     "Capek balas chat pelanggan satu-satu?"),

    ("sc02", 4300,  7.00, "+12%", "+1Hz", "+8%",
     "Dibalas besok... pelanggan keburu kabur."),

    ("sc03", 7200,  11.90, "+0%", "+1Hz", "+8%",
     "Kenalin... meja depan dot a-i."),

    ("sc04", 12000, 23.80, "+2%", "+1Hz", "+8%",
     "Asisten AI WhatsApp dua puluh empat jam. Pelanggan tinggal chat santai, mau info jam buka sampai harga treatment, langsung dijawab ramah dan instan."),

    ("sc05", 24200, 37.70, "+0%", "+1Hz", "+8%",
     "AI bantu rekomendasikan perawatan yang pas, dan kunci jadwal booking tanpa formulir ribet."),

    ("sc06", 38000, 48.10, "+0%", "+1Hz", "+8%",
     "Data booking otomatis tercatat rapi di spreadsheet klinik kamu, secara real-time."),

    ("sc07", 48400, 56.00, "+0%", "+1Hz", "+8%",
     "Ada keluhan atau hal sensitif? Tenang... AI nggak bakal asal jawab."),

    ("sc08", 56500, 70.10, "+0%", "+1Hz", "+8%",
     "Admin dapat notifikasi di WhatsApp, dan bisa langsung balas pasien saat itu juga."),

    ("sc09", 70300, 72.90, "+12%", "+1Hz", "+8%",
     "Pasien terima balasan di chat yang sama."),

    ("sc10", 73100, 78.43, "+3%", "+1Hz", "+8%",
     "Yuk, coba gratis tujuh hari, langsung di WhatsApp bisnis kamu!"),
]


def get_dur(path):
    res = subprocess.run([ff, "-i", path], capture_output=True, text=True)
    for line in res.stderr.split("\n"):
        if "Duration:" in line:
            s = line.split("Duration:")[1].split(",")[0].strip()
            h, m, sec = s.split(":")
            return float(h)*3600 + float(m)*60 + float(sec)
    return 0.0


def trim_and_enhance_vo(inp, out):
    """Trim silence and apply studio vocal EQ & gentle compression."""
    af = (
        "silenceremove=start_periods=1:start_silence=0.02:start_threshold=-42dB,"
        "areverse,"
        "silenceremove=start_periods=1:start_silence=0.02:start_threshold=-42dB,"
        "areverse,"
        "highpass=f=85,"
        "equalizer=f=3200:t=q:w=1.2:g=2.2,"
        "equalizer=f=9500:t=q:w=1.0:g=1.5,"
        "acompressor=threshold=-18dB:ratio=2.2:attack=20:release=120:makeup=1.5,"
        "aformat=channel_layouts=stereo:sample_rates=44100"
    )
    subprocess.run(
        [ff, "-y", "-i", inp, "-af", af, out],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True
    )


# -----------------------------------------------------------------------------
# Backsound Santai / Chill Café Lofi (80 BPM, Warm Rhodes + Gentle Plucks + Beat)
# -----------------------------------------------------------------------------
def make_chill_bgm(out, dur=82.0, sr=44100):
    np.random.seed(42)
    N = int(sr * dur)
    L = np.zeros(N, np.float32)
    R = np.zeros(N, np.float32)

    bpm = 80.0
    bar = (60.0 / bpm) * 4.0  # 3.0 sec per bar

    # Chords: Fmaj9 -> Am9 -> Dm9 -> Cmaj9
    chords = [
        # bass, notes
        (87.31,  [174.61, 220.00, 261.63, 329.63, 392.00]),  # Fmaj9
        (110.00, [220.00, 261.63, 329.63, 392.00, 493.88]),  # Am9
        (73.42,  [146.83, 174.61, 220.00, 261.63, 329.63]),  # Dm9
        (65.41,  [130.81, 164.81, 196.00, 246.94, 293.66]),  # Cmaj9
    ]

    num_bars = int(np.ceil(dur / bar))
    for b in range(num_bars):
        root, notes = chords[b % len(chords)]
        s = int(b * bar * sr)
        cl = min(int(bar * sr), N - s)
        if s >= N:
            break
        tc = np.linspace(0, cl / sr, cl, endpoint=False)

        # 1. Warm electric bass (subtle, rounded)
        t_bass = tc
        env_b = np.exp(-1.2 * t_bass)
        p_b = 2 * np.pi * root * t_bass
        bass_wave = (np.sin(p_b) + 0.35 * np.sin(2 * p_b)) * env_b * 0.14
        L[s:s+cl] += bass_wave
        R[s:s+cl] += bass_wave

        # 2. Rhodes chord pad (gentle decay, stereo spread)
        env_c = np.exp(-0.85 * tc)
        for i, f in enumerate(notes):
            # slight detune for warmth
            pl = 2 * np.pi * f * tc
            pr = 2 * np.pi * (f * 1.0008) * tc + 0.1
            tl = (np.sin(pl) + 0.28 * np.sin(2*pl) + 0.08 * np.sin(3*pl)) * env_c * 0.065
            tr = (np.sin(pr) + 0.28 * np.sin(2*pr) + 0.08 * np.sin(3*pr)) * env_c * 0.065
            pan = 0.3 + 0.4 * (i / len(notes))
            L[s:s+cl] += tl * (1 - pan)
            R[s:s+cl] += tr * pan

    # 3. Acoustic guitar pluck arpeggios
    arp = [261.63, 329.63, 392.00, 523.25,
           220.00, 261.63, 329.63, 440.00,
           174.61, 220.00, 261.63, 349.23,
           196.00, 246.94, 293.66, 392.00]
    beat_step = bar / 8.0  # eighth notes
    total_steps = int(dur / beat_step)
    for st in range(total_steps):
        note = arp[st % len(arp)]
        s = int(st * beat_step * sr)
        nl = min(int(beat_step * sr * 1.6), N - s)
        if s >= N or nl <= 0:
            break
        tc = np.linspace(0, nl / sr, nl, endpoint=False)
        env_g = np.exp(-7.5 * tc)
        pl = 2 * np.pi * note * tc
        pr = 2 * np.pi * (note * 1.001) * tc + 0.04
        g_l = (np.sin(pl) + 0.4 * np.sin(2*pl)) * env_g * 0.045
        g_r = (np.sin(pr) + 0.4 * np.sin(2*pr)) * env_g * 0.045
        pan = 0.35 + 0.3 * np.sin(st * 0.6)
        L[s:s+nl] += g_l * (1 - pan)
        R[s:s+nl] += g_r * pan

    # 4. Chill beat (gentle kick on 1 & 3, soft rim click on 2 & 4, light hi-hat)
    beat_dur = 60.0 / bpm
    total_beats = int(dur / beat_dur)
    for b in range(total_beats):
        s = int(b * beat_dur * sr)
        if s >= N:
            break
        b4 = b % 4

        # Kick on 0 and 2
        if b4 in (0, 2):
            kl = min(int(0.20 * sr), N - s)
            tk = np.linspace(0, kl / sr, kl, endpoint=False)
            fk = 75 * np.exp(-15 * tk)
            pk = 2 * np.pi * np.cumsum(fk) / sr
            kick = np.sin(pk) * np.exp(-14 * tk) * 0.15
            L[s:s+kl] += kick
            R[s:s+kl] += kick

        # Rim / soft snare on 1 and 3
        if b4 in (1, 3):
            sl = min(int(0.12 * sr), N - s)
            ts = np.linspace(0, sl / sr, sl, endpoint=False)
            snare = (np.sin(2*np.pi*280*ts)*np.exp(-30*ts) +
                     np.random.uniform(-0.6, 0.6, sl)*np.exp(-22*ts)) * 0.045
            L[s:s+sl] += snare * 0.8
            R[s:s+sl] += snare

        # Soft shaker / hihat on each beat
        hl = min(int(0.06 * sr), N - s)
        th = np.linspace(0, hl / sr, hl, endpoint=False)
        hat = np.random.uniform(-0.5, 0.5, hl) * np.exp(-70 * th) * 0.025
        L[s:s+hl] += hat * 0.5
        R[s:s+hl] += hat * 0.7

    # 5. Master envelope & normalization
    fade_in = int(1.5 * sr)
    fade_out = int(3.0 * sr)
    ev = np.ones(N, np.float32)
    ev[:fade_in] = np.sin(np.linspace(0, np.pi/2, fade_in))
    ev[-fade_out:] = np.cos(np.linspace(0, np.pi/2, fade_out))
    L *= ev
    R *= ev

    # Normalize peak to -12 dB for comfortable background mixing
    peak = max(np.max(np.abs(L)), np.max(np.abs(R)), 1e-6)
    target_gain = 0.22 / peak
    L *= target_gain
    R *= target_gain

    os.makedirs(os.path.dirname(out), exist_ok=True)
    with wave.open(out, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        iv = np.empty(N * 2, dtype=np.int16)
        iv[0::2] = (L * 32767).astype(np.int16)
        iv[1::2] = (R * 32767).astype(np.int16)
        wf.writeframes(iv.tobytes())
    print(f"  Chill BGM generated -> {out} ({dur:.1f}s)")


# -----------------------------------------------------------------------------
# Generate Voiceover
# -----------------------------------------------------------------------------
async def generate_all_vo(odir):
    os.makedirs(odir, exist_ok=True)
    results = []
    print("\n-- Generating Female Commercial Voiceover (id-ID-GadisNeural) --")
    for sid, sms, cut_s, rate, pitch, vol, txt in SEGS:
        raw = f"{odir}/{sid}_raw.mp3"
        wav = f"{odir}/{sid}.wav"
        comm = edge_tts.Communicate(txt, voice="id-ID-GadisNeural",
                                    rate=rate, pitch=pitch, volume=vol)
        await comm.save(raw)
        trim_and_enhance_vo(raw, wav)
        dur = get_dur(wav)
        start = sms / 1000.0
        end = start + dur
        margin = cut_s - end
        status = f"OK (+{margin:.2f}s)" if margin >= 0 else f"OVER (+{-margin:.2f}s)"
        print(f"  [{sid}] {start:5.2f}s -> {end:5.2f}s | cut: {cut_s:5.2f}s | dur: {dur:4.2f}s | {status}")
        print(f"       \"{txt}\"")
        results.append({"sid": sid, "start_ms": sms, "wav": wav, "dur": dur})
    return results


# -----------------------------------------------------------------------------
# Master Assembly & Video Mux with Auto-Ducking
# -----------------------------------------------------------------------------
def mux_master(vores, bgm_path, video_in, video_out):
    v_dur = get_dur(video_in)
    print(f"\n-- Muxing Video with Voiceover + Auto-Ducked BGM --")
    print(f"  Input Video: {video_in} ({v_dur:.2f}s)")

    fc = []
    # 1. Position each VO segment with adelay and set clean stereo format
    for i, seg in enumerate(vores):
        d = seg["start_ms"]
        fc.append(
            f"[{i+2}:a]"
            f"aformat=channel_layouts=stereo:sample_rates=48000,"
            f"adelay={d}|{d},"
            f"volume=1.20"
            f"[v{i}];"
        )
    # 2. Mix all voiceover tracks
    v_inputs = "".join(f"[v{i}]" for i in range(len(vores)))
    fc.append(f"{v_inputs}amix=inputs={len(vores)}:dropout_transition=0:normalize=0[vo_mix];")
    # Pad VO to video length
    fc.append(f"[vo_mix]apad=whole_dur={v_dur:.3f}[vo_padded];")

    # 3. Process BGM: stereo 48k, gentle initial level, sidechain ducking by VO
    # When VO talks, BGM ducks smoothly by ~6dB, then recovers in pauses
    fc.append(
        f"[1:a]aformat=channel_layouts=stereo:sample_rates=48000,"
        f"volume=0.22,"
        f"afade=t=out:st={v_dur-2.5:.2f}:d=2.5[bg_ready];"
    )
    fc.append(
        "[bg_ready][vo_padded]sidechaincompress="
        "threshold=0.035:ratio=3.5:attack=40:release=350[bg_ducked];"
    )

    # 4. Final mix of VO + Ducked BGM, mastered to standard -14 LUFS
    fc.append(
        "[vo_padded][bg_ducked]amix=inputs=2:duration=first:dropout_transition=0,"
        "loudnorm=I=-14.0:TP=-1.0:LRA=7.0[audio_master]"
    )

    cmd = [ff, "-y", "-i", video_in, "-i", bgm_path]
    for seg in vores:
        cmd += ["-i", seg["wav"]]
    cmd += [
        "-filter_complex", "".join(fc),
        "-map", "0:v:0",
        "-map", "[audio_master]",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2",
        "-t", f"{v_dur:.3f}",
        video_out
    ]

    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("FFmpeg error:\n", res.stderr[-2000:])
        raise RuntimeError("Muxing failed")

    out_dur = get_dur(video_out)
    out_size = os.path.getsize(video_out) / (1024 * 1024)
    print(f"  Success: {video_out} ({out_dur:.2f}s, {out_size:.2f} MB)")

    # Volume detect check
    vr = subprocess.run([ff, "-i", video_out, "-af", "volumedetect", "-f", "null", "-"],
                        capture_output=True, text=True)
    for line in vr.stderr.split("\n"):
        if "mean_volume" in line or "max_volume" in line:
            print("  Audio Check:", line.strip())


async def main():
    vin = "output/mejadepan_promo_silent_backup.mp4"
    bgm = "scratch/audio_final/bgm_chill.wav"
    vout_temp = "output/mejadepan_promo_v3.mp4"
    vout_final = "output/mejadepan_promo.mp4"

    print("=" * 60)
    print("  Mejadepan.ai Commercial Promo — Final Master Build")
    print("  Natural Female Ad VO + Chill Café BGM + Auto-Ducking")
    print("=" * 60)

    make_chill_bgm(bgm, dur=82.0)
    vores = await generate_all_vo("scratch/audio_final")
    mux_master(vores, bgm, vin, vout_temp)

    # Copy to target file output/mejadepan_promo.mp4
    shutil.copy2(vout_temp, vout_final)
    print(f"\n>>> Updated main video: {vout_final}")
    print(">>> All done!")


if __name__ == "__main__":
    asyncio.run(main())
