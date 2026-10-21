import asyncio
import edge_tts
import imageio_ffmpeg
import subprocess
import os

ff = imageio_ffmpeg.get_ffmpeg_exe()

# Meticulously timed VO segments
segments = [
    {
        'id': 'sc01_hook',
        'start': 0.50,
        'slot_end': 3.80,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Capek balas chat satu-satu?'
    },
    {
        'id': 'sc02_pain',
        'start': 3.80,
        'slot_end': 7.00,
        'rate': '+8%',
        'pitch': '+0Hz',
        'text': 'Balasnya besok pagi, pelanggan udah booking di tempat lain.'
    },
    {
        'id': 'sc03_brand',
        'start': 7.20,
        'slot_end': 11.90,
        'rate': '+8%',
        'pitch': '+0Hz',
        'text': 'Kenalkan mejadepan dot ai. AI di WhatsApp yang jawab pelanggan dan terima booking 24 jam.'
    },
    {
        'id': 'sc04_chat',
        'start': 12.20,
        'slot_end': 23.80,
        'rate': '+5%',
        'pitch': '+0Hz',
        'text': 'Pelanggan tinggal chat seperti biasa. Mau info jam buka sampai daftar harga treatment, langsung dijawab instan.'
    },
    {
        'id': 'sc05_booking',
        'start': 24.20,
        'slot_end': 37.70,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'AI langsung jawab pertanyaan, tawarkan layanan, dan kunci booking semudah mengobrol santai.'
    },
    {
        'id': 'sc06_sheet',
        'start': 38.00,
        'slot_end': 48.10,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Booking langsung masuk rapi ke spreadsheet secara real-time, tanpa input manual.'
    },
    {
        'id': 'sc07_handoff_trigger',
        'start': 48.40,
        'slot_end': 56.00,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Ada keluhan atau pertanyaan sensitif? Tenang, AI tidak asal jawab.'
    },
    {
        'id': 'sc08_admin_reply',
        'start': 56.40,
        'slot_end': 70.10,
        'rate': '+4%',
        'pitch': '+0Hz',
        'text': 'Admin langsung dapat alert di WhatsApp, dan bisa balas pasien langsung dari chat WA admin.'
    },
    {
        'id': 'sc09_patient_receives',
        'start': 70.20,
        'slot_end': 72.90,
        'rate': '+12%',
        'pitch': '+0Hz',
        'text': 'Pasien menerima balasan di chat yang sama.'
    },
    {
        'id': 'sc10_cta',
        'start': 73.00,
        'slot_end': 78.43,
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

async def generate_and_check():
    os.makedirs('scratch/vo_mejadepan', exist_ok=True)
    print("Generating VO and validating timings:")
    print("=" * 70)
    all_fit = True
    prev_end = 0.0
    for s in segments:
        out_f = f"scratch/vo_mejadepan/{s['id']}.mp3"
        comm = edge_tts.Communicate(s['text'], 'id-ID-GadisNeural', rate=s['rate'], pitch=s['pitch'])
        await comm.save(out_f)
        dur = get_dur(out_f)
        end_time = s['start'] + dur
        
        # Check collision with previous
        no_overlap_prev = s['start'] >= prev_end
        fits_scene = end_time <= s['slot_end'] + 0.3 # allowable 0.3s transition breath
        
        status = "OK" if (no_overlap_prev and fits_scene) else "CHECK"
        if not (no_overlap_prev and fits_scene):
            all_fit = False
            
        print(f"[{s['id']}] Start: {s['start']:5.2f}s | Dur: {dur:4.2f}s | Ends: {end_time:5.2f}s | Cut: {s['slot_end']:5.2f}s | Status: {status}")
        print(f"       Text: {s['text']}")
        prev_end = end_time
    print("=" * 70)
    print("Overall fit:", all_fit)

if __name__ == '__main__':
    asyncio.run(generate_and_check())
