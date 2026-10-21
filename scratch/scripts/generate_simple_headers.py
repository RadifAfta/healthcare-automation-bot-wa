import subprocess
import os
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

os.makedirs('scratch/tiktok_simple', exist_ok=True)
os.makedirs('output', exist_ok=True)

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"

# Create clean, simple top text stickers (native TikTok style, NOT formal slides)
def make_simple_header(filename, title, subtitle):
    w, h = 1080, 260
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    f_title = ImageFont.truetype(FONT_BOLD, 30)
    f_sub = ImageFont.truetype(FONT_BOLD, 22)
    
    # Simple sleek rounded pill
    card_w = 980
    card_h = 100
    cx = (w - card_w) // 2
    cy = 80
    
    draw.rounded_rectangle([cx, cy, cx + card_w, cy + card_h], radius=24, fill=(15, 23, 42, 220), outline=(52, 211, 153, 200), width=2)
    
    tw = draw.textlength(title, font=f_title)
    draw.text(((w - tw) // 2, cy + 18), title, font=f_title, fill=(255, 255, 255, 255))
    
    sw = draw.textlength(subtitle, font=f_sub)
    draw.text(((w - sw) // 2, cy + 58), subtitle, font=f_sub, fill=(251, 191, 36, 255))
    
    img.save(filename)
    print(f"Created {filename}")

make_simple_header('scratch/tiktok_simple/header_part1.png', 'Konsultasi Kulit & Price List 24 Jam', 'AI jawab keluhan pasien & kasih daftar harga resmi instan')
make_simple_header('scratch/tiktok_simple/header_part2.png', 'Booking Natural Tanpa Form Kaku', 'Pasien santai chat jadwal, sistem otomatis cek slot dokter')
make_simple_header('scratch/tiktok_simple/header_part3.png', 'Real-Time Auto Sync ke Google Sheets', 'Sekali konfirmasi, data langsung masuk tanpa ketik manual!')
make_simple_header('scratch/tiktok_simple/header_part4.png', 'Gimana Menurut Kalian?', 'Komen pendapat kalian di bawah ya!')
