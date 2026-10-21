import asyncio
import edge_tts
import imageio_ffmpeg
import subprocess
import os

ff = imageio_ffmpeg.get_ffmpeg_exe()

# Refined conversational script:
# Female voice (id-ID-GadisNeural), natural, friendly, santai, clean pronunciation
vo_segments = [
    {
        'id': 'sc1',
        'target_start': 0.3,
        'slot_end': 4.3,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Capek balas chat pelanggan satu-satu?'
    },
    {
        'id': 'sc2',
        'target_start': 4.3,
        'slot_end': 7.0,
        'rate': '+10%',
        'pitch': '+0Hz',
        'text': 'Balasnya besok pagi, pelanggan udah keburu booking di tempat lain.'
    },
    {
        'id': 'sc3',
        'target_start': 7.2,
        'slot_end': 11.9,
        'rate': '+6%',
        'pitch': '+0Hz',
        'text': 'Kenalin mejadepan dot ai. AI di WhatsApp yang jawab pelanggan dan terima booking 24 jam.'
    },
    {
        'id': 'sc4',
        'target_start': 12.2,
        'slot_end': 23.8,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Pelanggan tinggal chat seperti biasa. Mau tanya jadwal atau daftar harga treatment, semuanya dijawab instan.'
    },
    {
        'id': 'sc5',
        'target_start': 24.2,
        'slot_end': 37.7,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'AI langsung jawab pertanyaan, tawarkan layanan, dan kunci jadwal booking semudah mengobrol santai.'
    },
    {
        'id': 'sc6',
        'target_start': 38.0,
        'slot_end': 48.1,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Booking langsung masuk rapi ke spreadsheet secara real-time, tanpa perlu input manual lagi.'
    },
    {
        'id': 'sc7',
        'target_start': 48.3,
        'slot_end': 56.0,
        'rate': '+3%',
        'pitch': '+0Hz',
        'text': 'Ada keluhan atau pertanyaan sensitif? Tenang, AI tidak asal jawab.'
    },
    {
        'id': 'sc8',
        'target_start': 56.3,
        'slot_end': 70.1,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Admin langsung dapat alert di WhatsApp, dan bisa langsung membalas pasien cukup dari chat WA admin.'
    },
    {
        'id': 'sc9',
        'target_start': 70.2,
        'slot_end': 72.9,
        'rate': '+10%',
        'pitch': '+0Hz',
        'text': 'Pasien menerima balasan di chat yang sama.'
    },
    {
        'id': 'sc10',
        'target_start': 73.0,
        'slot_end': 78.2,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Coba gratis sekarang. Langsung chat kami di WhatsApp ya!'
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
    os.makedirs('scratch/vo_test2', exist_ok=True)
    print("Testing Refined VO generation:")
    print("=" * 65)
    all_ok = True
    for seg in vo_segments:
        out_f = f"scratch/vo_test2/{seg['id']}.mp3"
        comm = edge_tts.Communicate(seg['text'], 'id-ID-GadisNeural', rate=seg['rate'], pitch=seg['pitch'])
        await comm.save(out_f)
        dur = get_dur(out_f)
        max_allowed = seg['slot_end'] - seg['target_start']
        is_ok = dur <= max_allowed
        if not is_ok:
            all_ok = False
        status = "OK" if is_ok else "OVERFLOW"
        print(f"[{seg['id']}] Start: {seg['target_start']:4.1f}s | Dur: {dur:4.2f}s | Ends At: {seg['target_start']+dur:4.2f}s | Limit: {seg['slot_end']:4.1f}s [{status}]")
        print(f"      Text: {seg['text']}")
    print("=" * 65)
    print(f"All slots fit: {all_ok}")

if __name__ == '__main__':
    asyncio.run(main())
