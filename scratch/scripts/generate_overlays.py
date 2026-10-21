import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('scratch/visuals', exist_ok=True)

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"

def draw_vector_icon(draw, icon_type, x, y, size, color):
    if icon_type == "clinic":
        w = size // 3
        draw.rectangle([x + w, y, x + 2*w, y + size], fill=color)
        draw.rectangle([x, y + w, x + size, y + 2*w], fill=color)
    elif icon_type == "check":
        draw.line([(x, y + int(size*0.5)), (x + int(size*0.35), y + size), (x + size, y)], fill=color, width=max(2, int(size*0.18)))

def create_clinic_header():
    # 1920x1080 transparent overlay covering the top bar of WhatsApp in scene 1 (from x=383 to x=1050, y=0 to y=65)
    img = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    hx, hy, hw, hh = 385, 42, 600, 62
    # WhatsApp dark background color is #1F2C34 (31, 44, 52)
    draw.rectangle([hx, hy, hx + hw, hy + hh], fill=(31, 44, 52, 255))
    
    # Avatar
    draw.ellipse([hx + 15, hy + 8, hx + 58, hy + 51], fill=(20, 184, 166, 255))
    draw_vector_icon(draw, "clinic", hx + 27, hy + 19, 18, (255, 255, 255))
    
    # Title & Verified Badge
    f_title = ImageFont.truetype(FONT_BOLD, 19)
    f_sub = ImageFont.truetype(FONT_REG, 14)
    draw.text((hx + 70, hy + 9), "Lumina Aesthetic Clinic", font=f_title, fill=(233, 237, 239, 255))
    
    # Verified badge circle
    vx = hx + 285
    draw.ellipse([vx, hy + 12, vx + 16, hy + 28], fill=(37, 211, 102, 255))
    draw_vector_icon(draw, "check", vx + 3, hy + 15, 10, (255, 255, 255))
    
    draw.text((hx + 70, hy + 33), "AI Beauty Consultant • Online 24/7", font=f_sub, fill=(134, 150, 160, 255))
    
    img.save('scratch/visuals/clinic_header.png')
    print("Created scratch/visuals/clinic_header.png")


def create_subtitle_capsule(filename, segments):
    """
    segments: list of (text, is_highlight, color)
    """
    img = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    f_bold = ImageFont.truetype(FONT_BOLD, 26)
    f_reg = ImageFont.truetype(FONT_BOLD, 26) # bold readability for subtitles
    
    # Calculate total width
    total_w = 0
    words_data = []
    for text, is_hl, color in segments:
        font = f_bold if is_hl else f_reg
        w = draw.textlength(text, font=font)
        words_data.append((text, font, color, w))
        total_w += w
        
    pad_x = 40
    pad_y = 18
    cap_w = int(total_w + 2 * pad_x)
    cap_h = 70
    cap_x = (1920 - cap_w) // 2
    cap_y = 965
    
    # Drop shadow
    draw.rounded_rectangle([cap_x - 2, cap_y - 2, cap_x + cap_w + 2, cap_y + cap_h + 2], radius=35, fill=(0, 0, 0, 160))
    # Main pill
    draw.rounded_rectangle([cap_x, cap_y, cap_x + cap_w, cap_y + cap_h], radius=35, fill=(15, 23, 42, 235), outline=(212, 175, 55, 140), width=2)
    
    cur_x = cap_x + pad_x
    for text, font, color, w in words_data:
        draw.text((cur_x, cap_y + pad_y - 2), text, font=font, fill=color)
        cur_x += w
        
    img.save(filename)
    print(f"Created {filename}")

def generate_all_subtitles():
    GOLD = (251, 191, 36, 255)
    WHITE = (248, 250, 252, 255)
    CYAN = (56, 189, 248, 255)
    EMERALD = (52, 211, 153, 255)

    subs = [
        # Scene 1: 0 - 8s
        ("scratch/visuals/sub_01.png", [
            ("Klinik Anda ", False, WHITE),
            ("kehilangan calon pasien potensial", True, GOLD),
            ("...", False, WHITE)
        ]),
        ("scratch/visuals/sub_02.png", [
            ("...hanya karena WhatsApp ", False, WHITE),
            ("terlambat dibalas", True, (248, 113, 113, 255)),
            (" di ", False, WHITE),
            ("luar jam operasional?", True, GOLD)
        ]),
        # Scene 2: 8 - 22s (14s)
        ("scratch/visuals/sub_03.png", [
            ("Kini hadir ", False, WHITE),
            ("AI Beauty Consultant 24 Jam", True, GOLD),
            (" yang ", False, WHITE),
            ("ramah & solutif", True, CYAN)
        ]),
        ("scratch/visuals/sub_04.png", [
            ("Merespons ", False, WHITE),
            ("keluhan kulit", True, CYAN),
            (" & menyajikan ", False, WHITE),
            ("daftar harga treatment resmi", True, GOLD),
            (" instan", False, WHITE)
        ]),
        # Scene 3: 22 - 38s (16s)
        ("scratch/visuals/sub_05.png", [
            ("Pasien reservasi ", False, WHITE),
            ("semudah mengobrol santai", True, GOLD),
            (" tanpa ", False, WHITE),
            ("form yang kaku", True, (248, 113, 113, 255))
        ]),
        ("scratch/visuals/sub_06.png", [
            ("Sistem cerdas ", False, WHITE),
            ("mencocokkan jadwal dokter", True, CYAN),
            (" • ", False, WHITE),
            ("bebas double booking", True, EMERALD)
        ]),
        # Scene 4: 38 - 50s (12s)
        ("scratch/visuals/sub_07.png", [
            ("Saat konfirmasi, data ", False, WHITE),
            ("otomatis masuk ke Google Sheets", True, CYAN),
            (" detik itu juga", True, GOLD)
        ]),
        ("scratch/visuals/sub_08.png", [
            ("Tanpa input manual staf", True, GOLD),
            (", operasional rapi dan ", False, WHITE),
            ("bebas salah catat", True, EMERALD)
        ]),
        # Scene 5: 50 - 60s (10s)
        ("scratch/visuals/sub_09.png", [
            ("Tingkatkan konversi & omzet", True, GOLD),
            (" klinik estetika Anda sekarang", False, WHITE)
        ]),
        ("scratch/visuals/sub_10.png", [
            ("Jadwalkan ", False, WHITE),
            ("Live Demo 10 Menit", True, EMERALD),
            (" atau klaim ", False, WHITE),
            ("Free Trial Hari Ini!", True, GOLD)
        ]),
    ]
    
    for fname, segs in subs:
        create_subtitle_capsule(fname, segs)

if __name__ == '__main__':
    create_clinic_header()
    generate_all_subtitles()
