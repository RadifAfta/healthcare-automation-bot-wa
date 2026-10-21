import asyncio
import edge_tts
import imageio_ffmpeg
import subprocess
import os

ff = imageio_ffmpeg.get_ffmpeg_exe()

# Timeline definition:
# Scene 1:  0.00s -  4.30s (Slot: 4.30s)
# Scene 2:  4.30s -  7.00s (Slot: 2.70s)
# Scene 3:  7.00s - 11.90s (Slot: 4.90s)
# Scene 4: 11.90s - 23.80s (Slot: 11.90s)
# Scene 5: 23.80s - 37.70s (Slot: 13.90s)
# Scene 6: 37.70s - 48.10s (Slot: 10.40s)
# Scene 7: 48.10s - 56.00s (Slot: 7.90s)
# Scene 8: 56.00s - 70.10s (Slot: 14.10s)
# Scene 9: 70.10s - 72.90s (Slot: 2.80s)
# Scene 10: 72.90s - 78.43s (Slot: 5.50s)

# Script crafting with natural Indonesian spoken style:
vo_segments = [
    {
        'id': 'sc1',
        'start': 0.20,
        'slot': 4.10,
        'rate': '+2%',
        'pitch': '+0Hz',
        'text': 'Capek nggak sih, harus balas chat pelanggan satu per satu?'
    },
    {
        'id': 'sc2',
        'start': 4.40,
        'slot': 2.50,
        'rate': '+8%',
        'pitch': '+0Hz',
        'text': 'Baru dibalas besok pagi... eh, mereka udah keburu booking di tempat lain.'
    },
    {
        'id': 'sc3',
        'start': 7.20,
        'slot': 4.50,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Kenalin, Meja Depan dot A-I. Asisten pintar WhatsApp yang siap balas pelanggan dan terima booking 24 jam non-stop.'
    },
    {
        'id': 'sc4',
        'start': 12.10,
        'slot': 11.40,
        'rate': '+3%',
        'pitch': '+0Hz',
        'text': 'Pelanggan cukup chat santai seperti biasa. Dari info jam buka, tanya harga, sampai detail layanan, langsung dijawab instan dan ramah.'
    },
    {
        'id': 'sc5',
        'start': 24.00,
        'slot': 13.40,
        'rate': '+3%',
        'pitch': '+0Hz',
        'text': 'Nggak cuma jawab info aja, A-I juga pintar merekomendasikan treatment dan langsung mengunci jadwal booking tanpa form yang ribet.'
    },
    {
        'id': 'sc6',
        'start': 38.00,
        'slot': 9.80,
        'rate': '+3%',
        'pitch': '+0Hz',
        'text': 'Semua data booking otomatis tercatat rapi ke spreadsheet klinik secara real-time. Nggak ada lagi drama salah catat atau rekap manual.'
    },
    {
        'id': 'sc7',
        'start': 48.30,
        'slot': 7.50,
        'rate': '+3%',
        'pitch': '+0Hz',
        'text': 'Ada keluhan atau chat sensitif dari pasien? Tenang, A-I nggak asal jawab.'
    },
    {
        'id': 'sc8',
        'start': 56.30,
        'slot': 13.50,
        'rate': '+3%',
        'pitch': '+0Hz',
        'text': 'Admin klinik langsung dapat notifikasi instan di WhatsApp, dan bisa langsung membalas pasien cukup lewat chat WA pribadi admin.'
    },
    {
        'id': 'sc9',
        'start': 70.20,
        'slot': 2.60,
        'rate': '+8%',
        'pitch': '+0Hz',
        'text': 'Dan pasien menerima balasannya di ruang chat yang sama.'
    },
    {
        'id': 'sc10',
        'start': 73.00,
        'slot': 5.20,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Yuk, cobain gratis sekarang! Langsung chat kami di WhatsApp ya.'
    }
]

def get_dur(file_path):
    cmd = [ff, '-i', file_path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    for line in res.stderr.split('\n'):
        if 'Duration:' in line:
            dur_str = line.split('Duration:')[1].split(',')[0].strip()
            h, m, s = dur_str.split(':')
            return float(h)*3600 + float(m)*60 + float(s)
    return 0.0

async def main():
    os.makedirs('scratch/vo_test', exist_ok=True)
    print("Testing VO generation and measuring durations:")
    print("-" * 60)
    for seg in vo_segments:
        out_f = f"scratch/vo_test/{seg['id']}.mp3"
        comm = edge_tts.Communicate(seg['text'], 'id-ID-GadisNeural', rate=seg['rate'], pitch=seg['pitch'])
        await comm.save(out_f)
        dur = get_dur(out_f)
        status = "OK" if dur <= seg['slot'] else "TOO LONG"
        diff = seg['slot'] - dur
        print(f"[{seg['id']}] Target Slot: {seg['slot']:4.1f}s | Audio Dur: {dur:4.2f}s | Margin: {diff:+4.2f}s [{status}]")
        print(f"      Text: {seg['text']}")

if __name__ == '__main__':
    asyncio.run(main())
