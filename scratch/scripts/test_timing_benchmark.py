import asyncio
import edge_tts
import subprocess
import os
import imageio_ffmpeg

ff = imageio_ffmpeg.get_ffmpeg_exe()

test_cases = [
    # id, rate, pitch, text, max_allowed_dur
    ('sc01', '+0%', '+1Hz', 'Capek balas chat pelanggan satu-satu?', 3.5),
    ('sc02_opt1', '+10%', '+1Hz', 'Dibalas besok... pelanggan udah keburu kabur.', 2.5),
    ('sc02_opt2', '+12%', '+1Hz', 'Balasnya besok? Pelanggan udah pindah ke tempat lain.', 2.5),
    ('sc02_opt3', '+8%', '+1Hz', 'Dibalas besok, pelanggan keburu kabur.', 2.5),
    ('sc03_opt1', '+2%', '+1Hz', 'Kenalin, meja depan dot a-i. Asisten AI WhatsApp dua puluh empat jam.', 4.5),
    ('sc03_opt2', '+0%', '+1Hz', 'Kenalin, meja depan dot a-i. Asisten pintar WhatsApp yang standby non-stop.', 4.5),
    ('sc04', '+0%', '+1Hz', 'Pelanggan tinggal chat santai. Mau info jam buka, harga, sampai treatment, langsung dijawab instan.', 10.0),
    ('sc05', '+0%', '+1Hz', 'AI bantu rekomendasikan perawatan yang pas, dan kunci jadwal booking tanpa formulir ribet.', 11.0),
    ('sc06', '+0%', '+1Hz', 'Data booking otomatis tercatat rapi di spreadsheet klinik kamu, secara real-time.', 8.0),
    ('sc07', '+0%', '+1Hz', 'Ada keluhan atau hal sensitif? Tenang... AI nggak bakal asal jawab.', 6.5),
    ('sc08', '+0%', '+1Hz', 'Admin dapat notifikasi di WhatsApp, dan bisa langsung balas pasien saat itu juga.', 12.0),
    ('sc09', '+5%', '+1Hz', 'Pasien terima balasan di chat yang sama.', 2.5),
    ('sc10_opt1', '+0%', '+1Hz', 'Coba gratis tujuh hari sekarang di WhatsApp bisnis kamu!', 4.5),
    ('sc10_opt2', '+0%', '+1Hz', 'Yuk, coba gratis tujuh hari, langsung di WhatsApp bisnis kamu!', 4.5),
]

async def run_tests():
    os.makedirs('scratch/test_timing', exist_ok=True)
    for tid, rate, pitch, txt, max_d in test_cases:
        mp3 = f'scratch/test_timing/{tid}.mp3'
        comm = edge_tts.Communicate(txt, 'id-ID-GadisNeural', rate=rate, pitch=pitch)
        await comm.save(mp3)
        res = subprocess.run([ff, '-i', mp3], capture_output=True, text=True)
        dur = 0.0
        for l in res.stderr.split('\n'):
            if 'Duration:' in l:
                part = l.split('Duration:')[1].split(',')[0].strip()
                h, m, s = part.split(':')
                dur = float(h)*3600 + float(m)*60 + float(s)
        status = 'OK' if dur <= max_d else f'OVER (+{dur-max_d:.2f}s)'
        print(f'{tid:12} dur: {dur:5.2f}s | max: {max_d:4.1f}s | [{status}] -> "{txt}"')

if __name__ == '__main__':
    asyncio.run(run_tests())
