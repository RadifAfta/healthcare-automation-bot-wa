import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('scratch/visuals_tiktok', exist_ok=True)

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
FONT_SEMI = "C:/Windows/Fonts/segoeuisl.ttf"

def draw_vector_icon(draw, icon_type, x, y, size, color):
    if icon_type == "clinic":
        w = size // 3
        draw.rectangle([x + w, y, x + 2*w, y + size], fill=color)
        draw.rectangle([x, y + w, x + size, y + 2*w], fill=color)
    elif icon_type == "check":
        draw.line([(x, y + int(size*0.5)), (x + int(size*0.35), y + size), (x + size, y)], fill=color, width=max(2, int(size*0.18)))
    elif icon_type == "sparkle":
        cx, cy = x + size//2, y + size//2
        r1, r2 = size//2, size//6
        pts = [
            (cx, cy - r1), (cx + r2, cy - r2),
            (cx + r1, cy), (cx + r2, cy + r2),
            (cx, cy + r1), (cx - r2, cy + r2),
            (cx - r1, cy), (cx - r2, cy - r2)
        ]
        draw.polygon(pts, fill=color)

def create_tiktok_hook_frame():
    w, h = 1080, 1920
    img = Image.new('RGBA', (w, h), (11, 19, 30, 255))
    draw = ImageDraw.Draw(img)
    
    # Sleek dark vertical gradient
    for y in range(h):
        ratio = y / h
        r = int(10 + ratio * 14)
        g = int(18 + ratio * 20)
        b = int(28 + ratio * 28)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
        
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    ov_draw.ellipse([100, 200, 980, 1080], fill=(212, 175, 55, 18))
    ov_draw.ellipse([50, 1100, 1000, 1900], fill=(37, 211, 102, 15))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    f_tag = ImageFont.truetype(FONT_BOLD, 22)
    f_hook = ImageFont.truetype(FONT_BOLD, 46)
    f_card_t = ImageFont.truetype(FONT_BOLD, 26)
    f_card_d = ImageFont.truetype(FONT_REG, 23)
    f_stat = ImageFont.truetype(FONT_BOLD, 36)

    # Top Pill
    bw, bh = 460, 52
    bx = (w - bw) // 2
    by = 180
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=26, fill=(30, 41, 59, 230), outline=(212, 175, 55, 160), width=2)
    draw_vector_icon(draw, "sparkle", bx + 22, by + 14, 24, (251, 191, 36))
    draw.text((bx + 56, by + 12), "POV: TECH SPILL AUTOMATION", font=f_tag, fill=(251, 191, 36, 255))

    # Main TikTok Headline
    line1 = "Spill Sistem Bot WhatsApp"
    line2 = "Klinik Kecantikan yang Bikin"
    line3 = "Admin Gak Perlu Lembur Lagi"
    
    lw1 = draw.textlength(line1, font=f_hook)
    lw2 = draw.textlength(line2, font=f_hook)
    lw3 = draw.textlength(line3, font=f_hook)
    
    draw.text(((w - lw1) // 2, 270), line1, font=f_hook, fill=(255, 255, 255, 255))
    draw.text(((w - lw2) // 2, 335), line2, font=f_hook, fill=(255, 255, 255, 255))
    draw.text(((w - lw3) // 2, 400), line3, font=f_hook, fill=(52, 211, 153, 255))

    # Smartphone Preview Mockup
    mx, my, mw, mh = 80, 540, 920, 880
    draw.rounded_rectangle([mx - 4, my - 4, mx + mw + 4, my + mh + 4], radius=32, fill=(30, 41, 59, 180), outline=(71, 85, 105, 140), width=2)
    draw.rounded_rectangle([mx, my, mx + mw, my + mh], radius=30, fill=(15, 23, 42, 245))

    # Mockup Header
    draw.rounded_rectangle([mx, my, mx + mw, my + 95], radius=30, fill=(30, 41, 59, 255))
    draw.rectangle([mx, my + 60, mx + mw, my + 95], fill=(30, 41, 59, 255))
    draw.ellipse([mx + 30, my + 18, mx + 85, my + 73], fill=(20, 184, 166, 255))
    draw_vector_icon(draw, "clinic", mx + 46, my + 34, 24, (255, 255, 255))
    draw.text((mx + 105, my + 20), "Lumina Aesthetic Clinic", font=f_card_t, fill=(255, 255, 255, 255))
    draw.text((mx + 105, my + 54), "Official AI WhatsApp Assistant • Online 24/7", font=ImageFont.truetype(FONT_REG, 18), fill=(148, 163, 184, 255))

    # Message 1 (Inquiry Pasien)
    m1_x, m1_y, m1_w, m1_h = mx + 40, my + 140, 680, 160
    draw.rounded_rectangle([m1_x, m1_y, m1_x + m1_w, m1_y + m1_h], radius=20, fill=(30, 58, 70, 230), outline=(45, 212, 191, 100), width=1)
    draw.text((m1_x + 25, m1_y + 18), "Pasien (Jam 22:30 WIB):", font=ImageFont.truetype(FONT_BOLD, 20), fill=(94, 234, 212, 255))
    draw.text((m1_x + 25, m1_y + 52), "Halo kak, muka saya kusam dan bekas", font=f_card_d, fill=(241, 245, 249, 255))
    draw.text((m1_x + 25, m1_y + 85), "jerawat meradang. Ada treatment apa ya,", font=f_card_d, fill=(241, 245, 249, 255))
    draw.text((m1_x + 25, m1_y + 118), "dan besok siang jam 2 ada slot kosong?", font=f_card_d, fill=(241, 245, 249, 255))

    # Message 2 (Instant AI Response)
    m2_x, m2_y, m2_w, m2_h = mx + 160, my + 330, 720, 220
    draw.rounded_rectangle([m2_x, m2_y, m2_x + m2_w, m2_y + m2_h], radius=20, fill=(15, 60, 45, 230), outline=(52, 211, 153, 120), width=1)
    draw.text((m2_x + 25, m2_y + 18), "AI Assistant (Dibalas dlm 3 Detik):", font=ImageFont.truetype(FONT_BOLD, 20), fill=(110, 231, 183, 255))
    draw.text((m2_x + 25, m2_y + 52), "Halo Kak! Untuk kulit kusam & jerawat,", font=f_card_d, fill=(241, 245, 249, 255))
    draw.text((m2_x + 25, m2_y + 85), "kami sarankan Laser Glowing & Acne Detox.", font=f_card_d, fill=(241, 245, 249, 255))
    draw.text((m2_x + 25, m2_y + 118), "Harga mulai Rp250.000 - Rp1.500.000.", font=ImageFont.truetype(FONT_BOLD, 23), fill=(251, 191, 36, 255))
    draw.text((m2_x + 25, m2_y + 151), "Slot besok jam 14:00 WIB tersedia!", font=f_card_d, fill=(241, 245, 249, 255))
    draw.text((m2_x + 25, m2_y + 184), "Mau kami bantu amankan jadwalnya? ✨", font=f_card_d, fill=(241, 245, 249, 255))

    # Real-Time Sync Indicator
    s_x, s_y, s_w, s_h = mx + 40, my + 590, 840, 110
    draw.rounded_rectangle([s_x, s_y, s_x + s_w, s_y + s_h], radius=18, fill=(17, 24, 39, 240), outline=(56, 189, 248, 140), width=2)
    draw.text((s_x + 25, s_y + 20), "⚡ Auto-Sync ke Google Sheets", font=f_stat, fill=(56, 189, 248, 255))
    draw.text((s_x + 25, s_y + 65), "Data pasien & jam booking langsung tercatat tanpa admin ketik ulang.", font=ImageFont.truetype(FONT_REG, 20), fill=(226, 232, 240, 255))

    # Bottom Teaser
    t_txt = "Simak cara kerja live demonya di video ini ⬇️"
    tw = draw.textlength(t_txt, font=ImageFont.truetype(FONT_BOLD, 26))
    draw.text(((w - tw) // 2, 1600), t_txt, font=ImageFont.truetype(FONT_BOLD, 26), fill=(251, 191, 36, 255))

    img.save('scratch/visuals_tiktok/scene1_tiktok.png')
    print("Created scratch/visuals_tiktok/scene1_tiktok.png")


def create_tiktok_outro_frame():
    w, h = 1080, 1920
    img = Image.new('RGBA', (w, h), (11, 19, 30, 255))
    draw = ImageDraw.Draw(img)
    
    for y in range(h):
        ratio = y / h
        r = int(12 + ratio * 12)
        g = int(20 + ratio * 22)
        b = int(32 + ratio * 28)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
        
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    ov_draw.ellipse([150, 400, 930, 1200], fill=(212, 175, 55, 20))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    f_head = ImageFont.truetype(FONT_BOLD, 44)
    f_sub = ImageFont.truetype(FONT_REG, 26)
    f_card_t = ImageFont.truetype(FONT_BOLD, 26)
    f_card_d = ImageFont.truetype(FONT_REG, 22)
    f_cta = ImageFont.truetype(FONT_BOLD, 32)

    # Top Question
    q1 = "Menurut kalian, klinik kecantikan"
    q2 = "udah wajib pakai sistem ini belum?"
    qw1 = draw.textlength(q1, font=f_head)
    qw2 = draw.textlength(q2, font=f_head)
    draw.text(((w - qw1) // 2, 380), q1, font=f_head, fill=(255, 255, 255, 255))
    draw.text(((w - qw2) // 2, 445), q2, font=f_head, fill=(251, 191, 36, 255))

    # Summary Cards
    reasons = [
        ("✨ 24 Jam Fast Response", "Pasien malam gak kabur ke klinik lain."),
        ("📅 Anti Double Booking", "Cek slot dokter langsung via chat."),
        ("⚡ Otomatis Google Sheets", "Admin gak repot catat manual lagi.")
    ]
    cy = 580
    for title, desc in reasons:
        draw.rounded_rectangle([100, cy, 980, cy + 130], radius=22, fill=(20, 30, 48, 220), outline=(71, 85, 105, 140), width=2)
        draw.text((140, cy + 28), title, font=f_card_t, fill=(254, 240, 138, 255))
        draw.text((140, cy + 72), desc, font=f_card_d, fill=(226, 232, 240, 255))
        cy += 165

    # Interactive Engagement Box
    bx, by, bw, bh = 100, 1160, 880, 160
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=24, fill=(16, 185, 129, 35), outline=(52, 211, 153, 180), width=2)
    draw.text((bx + 40, by + 35), "Komen pendapat kalian di bawah ya! 👇", font=f_cta, fill=(110, 231, 183, 255))
    draw.text((bx + 40, by + 88), "Atau DM untuk info setup & integrasi klinik Anda.", font=f_sub, fill=(241, 245, 249, 255))

    img.save('scratch/visuals_tiktok/scene5_tiktok.png')
    print("Created scratch/visuals_tiktok/scene5_tiktok.png")


def create_tiktok_stickers():
    """Generates clean, native TikTok-style top text stickers for scenes 2, 3, 4."""
    stickers = [
        (
            "sticker_scene2.png",
            "1. AI BEAUTY CONSULTANT",
            "Paham keluhan kulit, saran treatment & harga resmi ✨",
            (251, 191, 36) # Gold
        ),
        (
            "sticker_scene3.png",
            "2. BOOKING PERCAKAPAN ALAMI",
            "Booking santai via chat, otomatis cek jadwal dokter 📅",
            (52, 211, 153) # Emerald
        ),
        (
            "sticker_scene4.png",
            "3. REAL-TIME GOOGLE SHEETS SYNC",
            "The Magic Moment: Sekali konfirmasi, langsung auto-catat! ⚡",
            (56, 189, 248) # Cyan
        )
    ]
    f_tag = ImageFont.truetype(FONT_BOLD, 22)
    f_desc = ImageFont.truetype(FONT_BOLD, 26)

    for fname, tag, desc, color in stickers:
        img = Image.new('RGBA', (1080, 1920), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        sw, sh = 960, 120
        sx = (1080 - sw) // 2
        sy = 80
        
        draw.rounded_rectangle([sx - 2, sy - 2, sx + sw + 2, sy + sh + 2], radius=24, fill=(0, 0, 0, 180), outline=(*color, 220), width=2)
        draw.rounded_rectangle([sx, sy, sx + sw, sy + sh], radius=22, fill=(15, 23, 42, 240))
        
        draw.text((sx + 35, sy + 20), tag, font=f_tag, fill=color)
        draw.text((sx + 35, sy + 62), desc, font=f_desc, fill=(255, 255, 255, 255))
        
        out_path = f"scratch/visuals_tiktok/{fname}"
        img.save(out_path)
        print(f"Created {out_path}")

if __name__ == '__main__':
    create_tiktok_hook_frame()
    create_tiktok_outro_frame()
    create_tiktok_stickers()
