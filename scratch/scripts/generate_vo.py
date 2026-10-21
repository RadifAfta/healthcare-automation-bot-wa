import asyncio
import edge_tts
import subprocess
import imageio_ffmpeg
import os

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

scenes = [
    {
        'id': 'vo_scene1',
        'target_duration': 8.0,
        'rate': '+10%',
        'text': 'Klinik Anda kehilangan calon pasien potensial hanya karena chat WhatsApp terlambat dibalas di luar jam operasional?'
    },
    {
        'id': 'vo_scene2',
        'target_duration': 14.0,
        'rate': '+8%',
        'text': 'Kini hadir AI Beauty Consultant 24 jam. Merespons keluhan kulit pasien dengan ramah dan solutif, serta menyajikan daftar harga treatment resmi secara instan.'
    },
    {
        'id': 'vo_scene3',
        'target_duration': 16.0,
        'rate': '+4%',
        'text': 'Pasien bisa langsung booking perawatan semudah mengobrol santai tanpa form kaku. Sistem cerdas otomatis mencocokkan jadwal dokter, bebas risiko double booking.'
    },
    {
        'id': 'vo_scene4',
        'target_duration': 12.0,
        'rate': '+10%',
        'text': 'Saat reservasi terkonfirmasi, data otomatis masuk ke Google Sheets klinik dalam hitungan detik. Tanpa input manual staf, tanpa risiko salah catat.'
    },
    {
        'id': 'vo_scene5',
        'target_duration': 10.0,
        'rate': '+8%',
        'text': 'Tingkatkan konversi klinik estetika Anda sekarang. Jadwalkan live demo 10 menit atau klaim uji coba gratis hari ini!'
    }
]

async def gen_all():
    os.makedirs('scratch/audio', exist_ok=True)
    for s in scenes:
        out_path = f"scratch/audio/{s['id']}.mp3"
        comm = edge_tts.Communicate(s['text'], 'id-ID-GadisNeural', rate=s['rate'])
        await comm.save(out_path)
        
        # Check duration
        cmd = [ffmpeg, '-i', out_path]
        res = subprocess.run(cmd, capture_output=True, text=True)
        dur = 'Unknown'
        dur_sec = 0.0
        for line in res.stderr.split('\n'):
            if 'Duration:' in line:
                dur = line.split('Duration:')[1].split(',')[0].strip()
                h, m, sec = dur.split(':')
                dur_sec = float(h)*3600 + float(m)*60 + float(sec)
        print(f"{s['id']}: Duration = {dur_sec:.2f}s ({dur}), Target Window = {s['target_duration']}s")

if __name__ == '__main__':
    asyncio.run(gen_all())
