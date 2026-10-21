import os
import subprocess
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
FONT_SEMI = "C:/Windows/Fonts/segoeuisl.ttf"

def draw_vector_icon(draw, icon_type, x, y, size, color):
    """Draws crisp vector icons without relying on OS emoji fonts."""
    if icon_type == "alert":
        # Warning triangle
        pts = [(x + size//2, y), (x + size, y + size), (x, y + size)]
        draw.polygon(pts, fill=color)
        # Exclamation inside
        draw.line([(x + size//2, y + size//4), (x + size//2, y + int(size*0.65))], fill=(255, 255, 255), width=int(size*0.12))
        draw.ellipse([x + size//2 - 2, y + int(size*0.8), x + size//2 + 2, y + int(size*0.8) + 4], fill=(255, 255, 255))
    elif icon_type == "clinic":
        # Medical cross
        w = size // 3
        draw.rectangle([x + w, y, x + 2*w, y + size], fill=color)
        draw.rectangle([x, y + w, x + size, y + 2*w], fill=color)
    elif icon_type == "check":
        # Checkmark
        draw.line([(x, y + int(size*0.5)), (x + int(size*0.35), y + size), (x + size, y)], fill=color, width=max(2, int(size*0.18)))
    elif icon_type == "clock":
        # Clock
        draw.ellipse([x, y, x + size, y + size], outline=color, width=2)
        draw.line([(x + size//2, y + size//4), (x + size//2, y + size//2), (x + int(size*0.75), y + size//2)], fill=color, width=2)
    elif icon_type == "sparkle":
        # 4-point star
        cx, cy = x + size//2, y + size//2
        r1, r2 = size//2, size//6
        pts = [
            (cx, cy - r1), (cx + r2, cy - r2),
            (cx + r1, cy), (cx + r2, cy + r2),
            (cx, cy + r1), (cx - r2, cy + r2),
            (cx - r1, cy), (cx - r2, cy - r2)
        ]
        draw.polygon(pts, fill=color)

def create_scene1_hook_image():
    width, height = 1920, 1080
    img = Image.new('RGBA', (width, height), (13, 22, 33, 255))
    draw = ImageDraw.Draw(img)
    
    # Background gradient: Dark luxury teal to deep midnight navy
    for y in range(height):
        ratio = y / height
        r = int(10 + ratio * 15)
        g = int(24 + ratio * 20)
        b = int(38 + ratio * 25)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
        
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    ov_draw.ellipse([-200, -200, 600, 600], fill=(212, 175, 55, 20)) # gold glow
    ov_draw.ellipse([1400, 500, 2200, 1300], fill=(37, 211, 102, 18)) # emerald glow
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)
    
    f_badge = ImageFont.truetype(FONT_BOLD, 22)
    f_title = ImageFont.truetype(FONT_BOLD, 46)
    f_card_h = ImageFont.truetype(FONT_BOLD, 26)
    f_card_t = ImageFont.truetype(FONT_REG, 22)
    f_card_alert = ImageFont.truetype(FONT_BOLD, 24)

    # Top Pill Badge
    badge_text = "TANTANGAN UTAMA KLINIK KECANTIKAN"
    bw, bh = 520, 50
    bx = (width - bw) // 2
    by = 70
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=25, fill=(220, 38, 38, 230), outline=(254, 202, 202, 180), width=2)
    draw_vector_icon(draw, "alert", bx + 22, by + 13, 24, (255, 255, 255))
    draw.text((bx + 58, by + 10), badge_text, font=f_badge, fill=(255, 255, 255, 255))
    
    # Headline
    title_line1 = "Calon Pasien Ingin Konsultasi Jam 10 Malam..."
    title_line2 = "Tapi WhatsApp Klinik Baru Dibalas Jam 9 Pagi?"
    tw1 = draw.textlength(title_line1, font=f_title)
    tw2 = draw.textlength(title_line2, font=f_title)
    draw.text(((width - tw1) // 2, 145), title_line1, font=f_title, fill=(255, 255, 255, 255))
    draw.text(((width - tw2) // 2, 210), title_line2, font=f_title, fill=(245, 180, 70, 255))

    # Center Simulation Card
    cx, cy, cw, ch = 380, 310, 1160, 480
    draw.rounded_rectangle([cx - 4, cy - 4, cx + cw + 4, cy + ch + 4], radius=24, fill=(30, 41, 59, 180), outline=(212, 175, 55, 80), width=2)
    draw.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=22, fill=(15, 23, 42, 245))
    
    # Header
    draw.rounded_rectangle([cx, cy, cx + cw, cy + 80], radius=22, fill=(30, 41, 59, 255))
    draw.rectangle([cx, cy + 50, cx + cw, cy + 80], fill=(30, 41, 59, 255))
    
    # Header Avatar & Name
    draw.ellipse([cx + 30, cy + 15, cx + 80, cy + 65], fill=(20, 184, 166, 255))
    draw_vector_icon(draw, "clinic", cx + 45, cy + 28, 22, (255, 255, 255))
    draw.text((cx + 95, cy + 16), "WhatsApp Business - Klinik Estetika & Kecantikan", font=f_card_h, fill=(255, 255, 255, 255))
    draw.text((cx + 95, cy + 48), "Status: Tutup / Offline (Di Luar Jam Operasional)", font=f_card_t, fill=(148, 163, 184, 255))
    
    # Message Card (Late Night Inquiry)
    mx1, my1, mw1, mh1 = cx + 40, cy + 110, 800, 130
    draw.rounded_rectangle([mx1, my1, mx1 + mw1, my1 + mh1], radius=16, fill=(30, 58, 70, 230), outline=(45, 212, 191, 100), width=1)
    draw.ellipse([mx1 + 20, my1 + 18, mx1 + 32, my1 + 30], fill=(94, 234, 212, 255))
    draw.text((mx1 + 42, my1 + 14), "Calon Pasien VIP  •  22:30 WIB", font=ImageFont.truetype(FONT_BOLD, 20), fill=(94, 234, 212, 255))
    chat_p1 = "Halo dok / admin, kulit wajah saya breakout berjerawat dan kusam banget."
    chat_p2 = "Saya mau tanya biaya Laser Glowing atau Detox Facial, dan besok siang jam 2 ada slot?"
    draw.text((mx1 + 25, my1 + 45), chat_p1, font=f_card_t, fill=(241, 245, 249, 255))
    draw.text((mx1 + 25, my1 + 75), chat_p2, font=f_card_t, fill=(241, 245, 249, 255))
    draw.text((mx1 + 700, my1 + 95), "22:30", font=ImageFont.truetype(FONT_REG, 17), fill=(148, 163, 184, 255))
    draw_vector_icon(draw, "check", mx1 + 750, my1 + 100, 14, (148, 163, 184))

    # Alert Box inside Card
    ax, ay, aw, ah = cx + 40, cy + 265, mw1, 95
    draw.rounded_rectangle([ax, ay, ax + aw, ay + ah], radius=16, fill=(127, 29, 29, 210), outline=(239, 68, 68, 180), width=2)
    draw_vector_icon(draw, "clock", ax + 22, ay + 20, 22, (254, 202, 202))
    draw.text((ax + 55, ay + 18), "Pesan Menggantung Selama 10,5 Jam (Tanpa Balasan)", font=f_card_alert, fill=(254, 202, 202, 255))
    draw.text((ax + 55, ay + 52), "Dampak: Calon pasien mencari klinik kompetitor yang merespons cepat.", font=f_card_t, fill=(255, 241, 242, 255))

    # Stat Card
    sx, sy, sw, sh = cx + 870, cy + 110, 250, 250
    draw.rounded_rectangle([sx, sy, sx + sw, sy + sh], radius=18, fill=(17, 24, 39, 230), outline=(245, 158, 11, 140), width=2)
    draw.text((sx + 35, sy + 30), "68%", font=ImageFont.truetype(FONT_BOLD, 54), fill=(239, 68, 68, 255))
    draw.text((sx + 20, sy + 105), "Calon pasien estetika\nlangsung beralih ke\nklinik kompetitor jika\nchat tidak direspons\ndalam 15 menit.", font=ImageFont.truetype(FONT_SEMI, 19), fill=(226, 232, 240, 255))

    # Solution Teaser
    bx2, by2, bw2, bh2 = cx + 40, cy + 385, cw - 80, 65
    draw.rounded_rectangle([bx2, by2, bx2 + bw2, by2 + bh2], radius=14, fill=(16, 185, 129, 45), outline=(52, 211, 153, 140), width=1)
    draw_vector_icon(draw, "sparkle", bx2 + 25, by2 + 20, 24, (110, 231, 183))
    draw.text((bx2 + 60, by2 + 18), "Solusi: WhatsApp AI yang Melayani 24/7 Seperti Beauty Consultant Pribadi", font=ImageFont.truetype(FONT_BOLD, 22), fill=(110, 231, 183, 255))

    img.save('scratch/visuals/scene1_hook.png')
    print("Created scratch/visuals/scene1_hook.png (clean vector)")


def create_scene5_cta_image():
    width, height = 1920, 1080
    img = Image.new('RGBA', (width, height), (10, 18, 30, 255))
    draw = ImageDraw.Draw(img)
    
    for y in range(height):
        ratio = y / height
        r = int(12 + ratio * 12)
        g = int(22 + ratio * 28)
        b = int(36 + ratio * 32)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
        
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    ov_draw.ellipse([700, 200, 1220, 720], fill=(212, 175, 55, 25))
    ov_draw.ellipse([200, 600, 800, 1200], fill=(37, 211, 102, 20))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    f_badge = ImageFont.truetype(FONT_BOLD, 22)
    f_main = ImageFont.truetype(FONT_BOLD, 52)
    f_sub = ImageFont.truetype(FONT_REG, 26)
    f_card_t = ImageFont.truetype(FONT_BOLD, 24)
    f_card_d = ImageFont.truetype(FONT_REG, 20)
    f_btn = ImageFont.truetype(FONT_BOLD, 36)

    # Badge
    badge_text = "REVOLUSI AUTOMATION KLINIK ESTETIKA"
    bw, bh = 540, 50
    bx = (width - bw) // 2
    by = 75
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=25, fill=(212, 175, 55, 40), outline=(212, 175, 55, 200), width=2)
    draw_vector_icon(draw, "sparkle", bx + 22, by + 13, 24, (254, 240, 138))
    draw.text((bx + 58, by + 10), badge_text, font=f_badge, fill=(254, 240, 138, 255))

    # Headline
    t1 = "Jangan Biarkan Pasien Berpindah ke Klinik Lain."
    t2 = "Upgrade Klinik Anda dengan AI WhatsApp Hari Ini."
    tw1 = draw.textlength(t1, font=f_main)
    tw2 = draw.textlength(t2, font=f_main)
    draw.text(((width - tw1) // 2, 150), t1, font=f_main, fill=(255, 255, 255, 255))
    draw.text(((width - tw2) // 2, 225), t2, font=f_main, fill=(212, 175, 55, 255))

    # 3 Pillar Cards
    cards = [
        ("AI Consultant 24/7", "Konsultasi keluhan kulit & daftar harga resmi dijawab seketika tanpa jeda."),
        ("Anti Double Booking", "Cek slot dokter secara cerdas & reservasi langsung via percakapan WhatsApp."),
        ("Live Sheets Sync", "Data otomatis tersimpan ke Google Sheets tanpa risiko human error staf.")
    ]
    card_w, card_h = 420, 200
    start_x = (width - (3 * card_w + 2 * 40)) // 2
    card_y = 330
    for i, (title, desc) in enumerate(cards):
        cx = start_x + i * (card_w + 40)
        draw.rounded_rectangle([cx, card_y, cx + card_w, card_y + card_h], radius=20, fill=(20, 30, 48, 220), outline=(71, 85, 105, 150), width=2)
        draw_vector_icon(draw, "sparkle", cx + 25, card_y + 30, 20, (254, 240, 138))
        draw.text((cx + 55, card_y + 26), title, font=f_card_t, fill=(254, 240, 138, 255))
        
        words = desc.split()
        l1 = " ".join(words[:5])
        l2 = " ".join(words[5:10])
        l3 = " ".join(words[10:])
        draw.text((cx + 25, card_y + 80), l1, font=f_card_d, fill=(226, 232, 240, 255))
        draw.text((cx + 25, card_y + 112), l2, font=f_card_d, fill=(226, 232, 240, 255))
        draw.text((cx + 25, card_y + 144), l3, font=f_card_d, fill=(226, 232, 240, 255))

    # CTA Button
    btn_w, btn_h = 760, 95
    btn_x = (width - btn_w) // 2
    btn_y = 590
    draw.rounded_rectangle([btn_x - 6, btn_y - 6, btn_x + btn_w + 6, btn_y + btn_h + 6], radius=48, fill=(37, 211, 102, 60))
    draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=45, fill=(37, 211, 102, 255), outline=(255, 255, 255, 200), width=2)
    
    btn_txt = "Jadwalkan Live Demo 10 Menit Sekarang"
    btw = draw.textlength(btn_txt, font=f_btn)
    draw.text(((width - btw) // 2, btn_y + 24), btn_txt, font=f_btn, fill=(10, 25, 20, 255))

    sub_txt = "Klaim Uji Coba Gratis 14 Hari untuk Klinik Estetika Anda  •  Setup Cepat & Siap Pakai"
    stw = draw.textlength(sub_txt, font=f_sub)
    draw.text(((width - stw) // 2, 725), sub_txt, font=f_sub, fill=(203, 213, 225, 255))

    img.save('scratch/visuals/scene5_cta.png')
    print("Created scratch/visuals/scene5_cta.png (clean vector)")


def create_feature_badges():
    """Generates transparent 1920x1080 PNG overlays containing top feature badges."""
    badges = [
        ("badge_scene2.png", "FITUR 1: AI BEAUTY CONSULTANT 24/7", "Konsultasi Keluhan Kulit Empatik & Daftar Harga Resmi Instan", (212, 175, 55)),
        ("badge_scene3.png", "FITUR 2: SMART BOOKING ENGINE", "Booking Percakapan Alami & Cek Slot Dokter Anti Double-Booking", (37, 211, 102)),
        ("badge_scene4.png", "FITUR 3: REAL-TIME GOOGLE SHEETS SYNC", "Data Reservasi Tersinkronisasi Otomatis Tanpa Input Manual Staf", (56, 189, 248))
    ]
    f_badge_tag = ImageFont.truetype(FONT_BOLD, 18)
    f_badge_desc = ImageFont.truetype(FONT_BOLD, 24)

    for fname, tag, desc, accent_color in badges:
        img = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        bw, bh = 860, 95
        bx = (1920 - bw) // 2
        by = 25
        
        # Frosted glass card with glow
        draw.rounded_rectangle([bx - 2, by - 2, bx + bw + 2, by + bh + 2], radius=20, fill=(0, 0, 0, 180), outline=(*accent_color, 220), width=2)
        draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=18, fill=(15, 23, 42, 235))
        
        # Accent pulse pill
        draw.rounded_rectangle([bx + 20, by + 16, bx + 20 + 12, by + 16 + 12], radius=6, fill=(*accent_color, 255))
        draw.text((bx + 42, by + 12), tag, font=f_badge_tag, fill=(*accent_color, 255))
        draw.text((bx + 42, by + 45), desc, font=f_badge_desc, fill=(255, 255, 255, 255))
        
        out_path = f"scratch/visuals/{fname}"
        img.save(out_path)
        print(f"Created {out_path}")

if __name__ == '__main__':
    create_scene1_hook_image()
    create_scene5_cta_image()
    create_feature_badges()
