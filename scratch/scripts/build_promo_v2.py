import asyncio
import edge_tts
import imageio_ffmpeg
import subprocess
import os
import numpy as np
import wave
import shutil

ff = imageio_ffmpeg.get_ffmpeg_exe()

# Scene cuts detected from video analysis:
# SC01:  0.00 -  4.30s | Notif WA malam: "Capek balas chat satu-satu?"
# SC02:  4.30 -  7.00s | Chat numpuk: "Balasnya besok pagi, pelanggan sudah booking di tempat lain"
# SC03:  7.00 - 11.90s | Logo screen: "mejadepan.ai"
# SC04: 11.90 - 23.80s | Demo chat AI jawab pertanyaan & list treatment
# SC05: 23.80 - 37.70s | AI tawarkan layanan & proses booking
# SC06: 37.70 - 48.10s | Google Sheets auto-terisi data booking
# SC07: 48.10 - 56.00s | Pasien kirim keluhan sensitif ke AI
# SC08: 56.00 - 70.10s | Admin dapat notif WA dan balas langsung
# SC09: 70.10 - 72.90s | Pasien terima balasan di chat
# SC10: 72.90 - 78.43s | Closing + CTA "Coba gratis 7 hari"

# Script: gaya iklan Indonesia, santai, natural, intonasi jelas
# Teknik naturalisme di edge-tts GadisNeural:
#   rate  0%  = pace normal, artikulasi paling jelas seperti narator iklan
#   rate -2%  = sedikit lebih lambat, warm & confident
#   ellipsis  = jeda napas natural
#   pitch +2Hz= sedikit lebih cerah tanpa terdengar robotik
#   volume+10%= sedikit lebih hidup / tidak tipis

SEGS = [
    # id, start_ms, slot_end_sec, rate, pitch, volume, text
    ("sc01",  600,   4.0,  "+0%",  "+2Hz", "+10%",
     "Capek balas chat pelanggan... satu-satu?"),

    ("sc02",  4200,  6.80, "+12%", "+2Hz", "+10%",
     "Balasnya besok pagi... pelanggan udah booking di tempat lain."),

    ("sc03",  7100,  11.80, "+0%", "+2Hz", "+10%",
     "Kenalin... mejadepan dot ai. "
     "Asisten AI di WhatsApp, yang siap balas pelanggan dua puluh empat jam."),

    ("sc04",  12100, 23.50, "-2%", "+2Hz", "+10%",
     "Pelanggan tinggal chat, seperti biasa. "
     "Mau tanya jam buka, harga, atau info treatment, "
     "semua langsung dijawab, ramah dan instan."),

    ("sc05",  24300, 37.40, "-2%", "+2Hz", "+10%",
     "AI langsung rekomendasikan layanan yang cocok, "
     "dan kunci jadwal booking... tanpa form yang ribet."),

    ("sc06",  38000, 47.80, "-2%", "+2Hz", "+10%",
     "Begitu booking masuk, data pasien otomatis tercatat rapi "
     "di spreadsheet klinik, secara real-time."),

    ("sc07",  48400, 55.80, "-2%", "+2Hz", "+10%",
     "Ada keluhan atau pertanyaan sensitif? "
     "Tenang... AI tidak asal jawab."),

    ("sc08",  56400, 69.80, "-2%", "+2Hz", "+10%",
     "Admin langsung dapat notifikasi di WhatsApp, "
     "dan bisa membalas pasien langsung dari sana."),

    ("sc09",  70300, 72.70, "+10%", "+2Hz", "+10%",
     "Pasien terima balasan di chat yang sama."),

    ("sc10",  73200, 78.20, "-2%", "+2Hz", "+10%",
     "Coba gratis tujuh hari. "
     "Aktif hari ini, langsung di WhatsApp bisnis kamu!"),
]


# ----------------------------------------------------------------
def get_dur(path):
    res = subprocess.run([ff, "-i", path], capture_output=True, text=True)
    for line in res.stderr.split("\n"):
        if "Duration:" in line:
            s = line.split("Duration:")[1].split(",")[0].strip()
            h, m, sec = s.split(":")
            return float(h)*3600 + float(m)*60 + float(sec)
    return 0.0


def trim_wav(inp, out):
    """Remove leading/trailing silence, output stereo WAV 44100 Hz."""
    af = (
        "silenceremove=start_periods=1:start_silence=0.03:start_threshold=-40dB,"
        "areverse,"
        "silenceremove=start_periods=1:start_silence=0.03:start_threshold=-40dB,"
        "areverse,"
        "aformat=channel_layouts=stereo:sample_rates=44100"
    )
    subprocess.run(
        [ff, "-y", "-i", inp, "-af", af, "-ar", "44100", "-ac", "2", out],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True
    )


# ----------------------------------------------------------------
# BACKGROUND MUSIC — Warm Uplifting Café / Corporate
# Fmaj7 -> Am7 -> Dm7 -> Cmaj7 at 90 BPM
# Layers: Rhodes pad + plucked guitar arp + kick/snare/hihat + shimmer
# ----------------------------------------------------------------
def make_bgm(out, dur=82.0, sr=44100):
    np.random.seed(7)
    N = int(sr * dur)
    L = np.zeros(N, np.float32)
    R = np.zeros(N, np.float32)

    # 1. Rhodes chord pads
    chords = [
        [174.61, 220.00, 261.63, 329.63],  # Fmaj7
        [220.00, 261.63, 329.63, 415.30],  # Am7
        [146.83, 174.61, 220.00, 293.66],  # Dm7
        [130.81, 164.81, 196.00, 246.94],  # Cmaj7
    ]
    bar = 2.667  # 90 BPM, 4/4
    for b in range(int(np.ceil(dur / bar))):
        ch = chords[b % 4]
        s = int(b * bar * sr)
        cl = min(int(bar * sr), N - s)
        if s >= N:
            break
        tc = np.linspace(0, cl/sr, cl, endpoint=False)
        env = np.exp(-0.9 * tc)
        fi = int(0.04 * sr)
        if fi > 0:
            env[:fi] *= np.linspace(0, 1, fi)
        for ni, freq in enumerate(ch):
            pl = 2*np.pi*freq*tc
            pr = 2*np.pi*(freq*1.001)*tc + 0.15
            tl = (np.sin(pl) + 0.35*np.sin(2*pl) + 0.12*np.sin(3*pl)) * env * 0.09
            tr = (np.sin(pr) + 0.35*np.sin(2*pr) + 0.12*np.sin(3*pr)) * env * 0.09
            pan = 0.3 + 0.4*(ni/len(ch))
            L[s:s+cl] += tl * (1 - pan)
            R[s:s+cl] += tr * pan

    # 2. Plucked guitar arpeggio
    arp = [261.63, 329.63, 392.00, 523.25,
           220.00, 261.63, 329.63, 415.30,
           146.83, 174.61, 220.00, 293.66,
           130.81, 164.81, 196.00, 246.94]
    ai = bar / 4.0
    for step in range(int(dur / ai)):
        note = arp[step % len(arp)]
        s = int(step * ai * sr)
        nl = int(min(ai * sr * 1.8, sr * 0.9, N - s))
        if nl <= 0 or s >= N:
            break
        tc = np.linspace(0, nl/sr, nl, endpoint=False)
        dc = np.exp(-6.0 * tc)
        pl = 2*np.pi*note*tc
        pr = 2*np.pi*(note*1.001)*tc + 0.05
        g  = (np.sin(pl) + 0.5*np.sin(2*pl) + 0.1*np.sin(3*pl)) * dc * 0.06
        gr = (np.sin(pr) + 0.5*np.sin(2*pr) + 0.1*np.sin(3*pr)) * dc * 0.06
        pan = 0.35 + 0.3*np.sin(step * 0.7)
        L[s:s+nl] += g  * (1 - pan)
        R[s:s+nl] += gr * pan

    # 3. Percussion at 90 BPM
    bt = 60.0 / 90.0
    for step in range(int(dur / bt) + 1):
        s = int(step * bt * sr)
        if s >= N:
            break
        s4 = step % 4
        # Kick on beat 1 & 3
        if s4 in (0, 2):
            kl = min(int(0.18*sr), N-s)
            tk = np.linspace(0, kl/sr, kl, endpoint=False)
            fk = 80 * np.exp(-20 * tk)
            pk = 2*np.pi*np.cumsum(fk)/sr
            kk = np.sin(pk) * np.exp(-18*tk) * 0.16
            L[s:s+kl] += kk
            R[s:s+kl] += kk
        # Hi-hat every beat
        hl = min(int(0.08*sr), N-s)
        if hl > 0:
            th = np.linspace(0, hl/sr, hl, endpoint=False)
            hat = np.random.uniform(-1, 1, hl) * np.exp(-60*th) * 0.035
            L[s:s+hl] += hat * 0.6
            R[s:s+hl] += hat * 0.7
        # Brushed snare on beat 2 & 4
        if s4 in (1, 3):
            sl = min(int(0.12*sr), N-s)
            if sl > 0:
                ts = np.linspace(0, sl/sr, sl, endpoint=False)
                sn = (np.sin(2*np.pi*220*ts)*np.exp(-25*ts) +
                      np.random.uniform(-1, 1, sl)*np.exp(-18*ts)) * 0.05
                L[s:s+sl] += sn
                R[s:s+sl] += sn * 0.85

    # 4. Shimmer (octave-up pad, very soft)
    for b in range(int(np.ceil(dur / bar))):
        ch = chords[b % 4]
        s = int(b * bar * sr)
        cl = min(int(bar * sr), N - s)
        if s >= N:
            break
        tc = np.linspace(0, cl/sr, cl, endpoint=False)
        env = np.exp(-1.8 * tc)
        for ni, freq in enumerate(ch):
            fh = freq * 2.0
            pl = 2*np.pi*fh*tc
            pr = 2*np.pi*(fh*1.001)*tc + 0.2
            L[s:s+cl] += np.sin(pl) * env * 0.025 * (1 - 0.4*(ni/len(ch)))
            R[s:s+cl] += np.sin(pr) * env * 0.025 * (0.4 + 0.6*(ni/len(ch)))

    # 5. Master envelope + normalize
    fin  = int(2.0 * sr)
    fout = int(3.0 * sr)
    ev = np.ones(N, np.float32)
    ev[:fin]   = np.linspace(0, 1, fin) ** 2
    ev[-fout:] = np.cos(np.linspace(0, np.pi/2, fout)) ** 2
    L *= ev; R *= ev
    pk = max(np.max(np.abs(L)), np.max(np.abs(R)), 1e-7)
    L = (L / pk) * 0.18
    R = (R / pk) * 0.18

    os.makedirs(os.path.dirname(out), exist_ok=True)
    with wave.open(out, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        iv = np.empty(N*2, dtype=np.int16)
        iv[0::2] = (L * 32767).astype(np.int16)
        iv[1::2] = (R * 32767).astype(np.int16)
        wf.writeframes(iv.tobytes())
    print(f"  BGM OK -> {out}")


# ----------------------------------------------------------------
async def gen_vo(odir):
    os.makedirs(odir, exist_ok=True)
    results = []
    print("\n-- Voice Over Segments (id-ID-GadisNeural, ad style) --")
    for sid, sms, slot_end, rate, pitch, vol, txt in SEGS:
        raw = f"{odir}/{sid}_raw.mp3"
        wav = f"{odir}/{sid}.wav"
        comm = edge_tts.Communicate(txt, voice="id-ID-GadisNeural",
                                    rate=rate, pitch=pitch, volume=vol)
        await comm.save(raw)
        trim_wav(raw, wav)
        dur   = get_dur(wav)
        start = sms / 1000.0
        end   = start + dur
        flag  = "OVER" if end > slot_end + 0.15 else "ok"
        print(f"  [{sid}] {start:.1f}s->{end:.2f}s  slot<={slot_end:.1f}s  [{flag}]")
        print(f"       \"{txt}\"")
        results.append({"sid": sid, "start_ms": sms, "wav": wav, "dur": dur})
    return results


# ----------------------------------------------------------------
def mux(vores, bgm, vin, vout):
    vd = get_dur(vin)
    fc = []
    # Delay + stereo each VO
    for i, seg in enumerate(vores):
        d = seg["start_ms"]
        fc.append(
            f"[{i+2}:a]"
            f"aformat=channel_layouts=stereo:sample_rates=48000,"
            f"adelay={d}|{d},"
            f"volume=1.30"
            f"[v{i}];"
        )
    # Mix all VO
    vj = "".join(f"[v{i}]" for i in range(len(vores)))
    fc.append(f"{vj}amix=inputs={len(vores)}:dropout_transition=0:normalize=0[vm];")
    # Pad to video duration
    fc.append(f"[vm]apad=whole_dur={vd:.3f}[vp];")
    # BGM gentle fade out
    fc.append(
        f"[1:a]aformat=channel_layouts=stereo:sample_rates=48000,"
        f"volume=0.18,"
        f"afade=t=out:st={vd-3.0:.2f}:d=3.0[bg];"
    )
    # Final mix + loudnorm mastering -14 LUFS
    fc.append(
        "[vp][bg]amix=inputs=2:duration=first:dropout_transition=0,"
        "loudnorm=I=-14.0:TP=-1.0:LRA=8.0[ao]"
    )

    cmd = [ff, "-y", "-i", vin, "-i", bgm]
    for seg in vores:
        cmd += ["-i", seg["wav"]]
    cmd += [
        "-filter_complex", "".join(fc),
        "-map", "0:v:0",
        "-map", "[ao]",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2",
        "-t", f"{vd:.3f}",
        vout
    ]
    print("\n-- Muxing final video --")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("FFmpeg error:\n", res.stderr[-3000:])
        raise RuntimeError("Muxing failed")

    fdur = get_dur(vout)
    fmb  = os.path.getsize(vout) / 1e6
    print(f"  Done! {vout}  ({fdur:.2f}s,  {fmb:.1f} MB)")

    vr = subprocess.run([ff, "-i", vout, "-af", "volumedetect", "-f", "null", "-"],
                        capture_output=True, text=True)
    for line in vr.stderr.split("\n"):
        if "mean_volume" in line or "max_volume" in line:
            print("  Audio:", line.strip())


# ----------------------------------------------------------------
async def main():
    vin  = "output/mejadepan_promo_silent_backup.mp4"
    bgm  = "scratch/audio_mejadepan_v2/bgm_warm.wav"
    vout = "output/mejadepan_promo_v2.mp4"

    print("=" * 55)
    print("  mejadepan.ai Promo — VO + BGM v2")
    print("=" * 55)

    print("\n-- Generating warm BGM --")
    make_bgm(bgm, dur=82.0)

    vores = await gen_vo("scratch/audio_mejadepan_v2")
    mux(vores, bgm, vin, vout)

    shutil.copy2(vout, "output/mejadepan_promo.mp4")
    print("  Also saved -> output/mejadepan_promo.mp4")
    print("\n  Pipeline complete!")


if __name__ == "__main__":
    asyncio.run(main())
