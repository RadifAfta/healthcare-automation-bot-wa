import asyncio
import edge_tts
import subprocess
import os
import imageio_ffmpeg

ff = imageio_ffmpeg.get_ffmpeg_exe()

scenes = [
    # id, start_s, cut_s, rate, pitch, text
    ("sc01", 0.50, 4.30, "+0%", "+1Hz",
     "Capek balas chat pelanggan satu-satu?"),

    ("sc02", 4.30, 7.00, "+12%", "+1Hz",
     "Dibalas besok... pelanggan keburu kabur."),

    ("sc03", 7.20, 11.90, "+0%", "+1Hz",
     "Kenalin... meja depan dot a-i."),

    ("sc04", 12.00, 23.80, "+2%", "+1Hz",
     "Asisten AI WhatsApp dua puluh empat jam. Pelanggan tinggal chat santai, mau info jam buka sampai harga treatment, langsung dijawab ramah dan instan."),

    ("sc05", 24.20, 37.70, "+0%", "+1Hz",
     "AI bantu rekomendasikan perawatan yang pas, dan kunci jadwal booking tanpa formulir ribet."),

    ("sc06", 38.00, 48.10, "+0%", "+1Hz",
     "Data booking otomatis tercatat rapi di spreadsheet klinik kamu, secara real-time."),

    ("sc07", 48.40, 56.00, "+0%", "+1Hz",
     "Ada keluhan atau hal sensitif? Tenang... AI nggak bakal asal jawab."),

    ("sc08", 56.50, 70.10, "+0%", "+1Hz",
     "Admin dapat notifikasi di WhatsApp, dan bisa langsung balas pasien saat itu juga."),

    ("sc09", 70.30, 72.90, "+12%", "+1Hz",
     "Pasien terima balasan di chat yang sama."),

    ("sc10", 73.10, 78.43, "+3%", "+1Hz",
     "Yuk, coba gratis tujuh hari, langsung di WhatsApp bisnis kamu!"),
]

def trim_silence(inp, out):
    af = (
        "silenceremove=start_periods=1:start_silence=0.02:start_threshold=-40dB,"
        "areverse,"
        "silenceremove=start_periods=1:start_silence=0.02:start_threshold=-40dB,"
        "areverse,"
        "aformat=channel_layouts=stereo:sample_rates=44100"
    )
    subprocess.run([ff, "-y", "-i", inp, "-af", af, out], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

async def test_all():
    os.makedirs("scratch/audio_test_clean", exist_ok=True)
    all_ok = True
    print("\n--- Testing Exact Scene Timing ---")
    for sid, start_s, cut_s, rate, pitch, txt in scenes:
        raw = f"scratch/audio_test_clean/{sid}_raw.mp3"
        wav = f"scratch/audio_test_clean/{sid}.wav"
        comm = edge_tts.Communicate(txt, "id-ID-GadisNeural", rate=rate, pitch=pitch)
        await comm.save(raw)
        trim_silence(raw, wav)
        
        # duration
        res = subprocess.run([ff, "-i", wav], capture_output=True, text=True)
        dur = 0.0
        for l in res.stderr.split("\n"):
            if "Duration:" in l:
                part = l.split("Duration:")[1].split(",")[0].strip()
                h, m, s = part.split(":")
                dur = float(h)*3600 + float(m)*60 + float(s)
        end_s = start_s + dur
        slot = cut_s - start_s
        margin = cut_s - end_s
        ok = margin >= 0.1
        if not ok:
            all_ok = False
        status = f"OK (margin {margin:.2f}s)" if ok else f"OVERLAP (+{-margin:.2f}s)"
        print(f"[{sid}] {start_s:5.2f}s -> {end_s:5.2f}s | cut: {cut_s:5.2f}s | dur: {dur:4.2f}s | {status}")
        print(f"       \"{txt}\"")
    print(f"\nResult: {'ALL PERFECT!' if all_ok else 'SOME OVERLAPPING'}")

if __name__ == "__main__":
    asyncio.run(test_all())
