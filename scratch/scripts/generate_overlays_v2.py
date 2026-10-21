import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('scratch/visuals_v2', exist_ok=True)

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"

def create_unified_feature_header(filename, tag_text, caption_text, accent_color):
    """
    Creates a 1920x1080 transparent overlay with a unified top header card.
    Contains both the Feature Tag and the Spoken Caption.
    Positioned safely at the top (y=24 to y=120) so the bottom typing bar is 100% visible!
    """
    img = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    f_tag = ImageFont.truetype(FONT_BOLD, 17)
    f_cap = ImageFont.truetype(FONT_BOLD, 23)

    bw, bh = 980, 96
    bx = (1920 - bw) // 2
    by = 24

    # Outer subtle glow / border
    draw.rounded_rectangle([bx - 2, by - 2, bx + bw + 2, by + bh + 2], radius=22, fill=(0, 0, 0, 180), outline=(*accent_color, 210), width=1)
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=20, fill=(15, 23, 42, 245))

    # Pulsing accent dot
    draw.ellipse([bx + 25, by + 18, bx + 37, by + 30], fill=(*accent_color, 255))
    draw.text((bx + 46, by + 13), tag_text, font=f_tag, fill=(*accent_color, 255))

    # Caption text
    draw.text((bx + 25, by + 46), caption_text, font=f_cap, fill=(255, 255, 255, 255))

    img.save(filename)
    print(f"Created {filename}")

def create_minimal_bottom_sub(filename, text, highlight_word=None, hl_color=(245, 158, 11)):
    """
    Creates a clean, sleek subtitle capsule for Scene 1 and Scene 5 at y = 850.
    """
    img = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    f_bold = ImageFont.truetype(FONT_BOLD, 26)
    
    tw = draw.textlength(text, font=f_bold)
    cap_w = int(tw + 70)
    cap_h = 66
    cap_x = (1920 - cap_w) // 2
    cap_y = 850

    draw.rounded_rectangle([cap_x - 1, cap_y - 1, cap_x + cap_w + 1, cap_y + cap_h + 1], radius=33, fill=(0, 0, 0, 160), outline=(51, 65, 85, 200), width=1)
    draw.rounded_rectangle([cap_x, cap_y, cap_x + cap_w, cap_y + cap_h], radius=33, fill=(15, 23, 42, 235))
    
    draw.text(((1920 - tw) // 2, cap_y + 15), text, font=f_bold, fill=(255, 255, 255, 255))

    img.save(filename)
    print(f"Created {filename}")

# Accent Colors:
GOLD = (212, 175, 55)
EMERALD = (37, 211, 102)
CYAN = (56, 189, 248)

# --- SCENE 1 SUBS (at y=850, well clear of card) ---
create_minimal_bottom_sub('scratch/visuals_v2/sub_scene1_a.png', "Klinik Anda kehilangan calon pasien potensial...")
create_minimal_bottom_sub('scratch/visuals_v2/sub_scene1_b.png', "...hanya karena WhatsApp terlambat dibalas di luar jam operasional?")

# --- SCENE 2 UNIFIED TOP HEADERS ---
create_unified_feature_header(
    'scratch/visuals_v2/header_s2_a.png',
    "FITUR 1: AI BEAUTY CONSULTANT 24/7",
    "Kini hadir AI Beauty Consultant 24 Jam yang ramah & solutif",
    GOLD
)
create_unified_feature_header(
    'scratch/visuals_v2/header_s2_b.png',
    "FITUR 1: AI BEAUTY CONSULTANT 24/7",
    "Merespons keluhan kulit & menyajikan daftar harga treatment resmi instan",
    GOLD
)

# --- SCENE 3 UNIFIED TOP HEADERS ---
create_unified_feature_header(
    'scratch/visuals_v2/header_s3_a.png',
    "FITUR 2: SMART BOOKING ENGINE",
    "Pasien reservasi semudah mengobrol santai tanpa form yang kaku",
    EMERALD
)
create_unified_feature_header(
    'scratch/visuals_v2/header_s3_b.png',
    "FITUR 2: SMART BOOKING ENGINE",
    "Sistem cerdas mencocokkan jadwal dokter • Bebas double booking",
    EMERALD
)

# --- SCENE 4 UNIFIED TOP HEADERS ---
create_unified_feature_header(
    'scratch/visuals_v2/header_s4_a.png',
    "FITUR 3: REAL-TIME GOOGLE SHEETS SYNC",
    "Saat konfirmasi, data otomatis masuk ke Google Sheets detik itu juga",
    CYAN
)
create_unified_feature_header(
    'scratch/visuals_v2/header_s4_b.png',
    "FITUR 3: REAL-TIME GOOGLE SHEETS SYNC",
    "Tanpa input manual staf, operasional rapi dan bebas salah catat",
    CYAN
)

# --- SCENE 5 SUBS (at y=840) ---
create_minimal_bottom_sub('scratch/visuals_v2/sub_scene5_a.png', "Tingkatkan konversi & omzet klinik estetika Anda sekarang")
create_minimal_bottom_sub('scratch/visuals_v2/sub_scene5_b.png', "Jadwalkan Live Demo 10 Menit atau klaim Free Trial Hari Ini!")

print("All V2 overlays generated successfully!")
