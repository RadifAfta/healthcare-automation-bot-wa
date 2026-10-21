import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('scratch/visuals_v2', exist_ok=True)

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
FONT_SEMI = "C:/Windows/Fonts/segoeuisl.ttf"

def draw_verified_badge(draw, x, y, size):
    draw.ellipse([x, y, x + size, y + size], fill=(37, 211, 102))
    # Checkmark inside
    pts = [
        (x + int(size * 0.28), y + int(size * 0.52)),
        (x + int(size * 0.45), y + int(size * 0.70)),
        (x + int(size * 0.75), y + int(size * 0.32))
    ]
    draw.line([pts[0], pts[1]], fill=(255, 255, 255), width=max(2, int(size * 0.12)))
    draw.line([pts[1], pts[2]], fill=(255, 255, 255), width=max(2, int(size * 0.12)))

# ==============================================================================
# 1. SCENE 1: PREMIUM B2B HOOK (AUTHENTIC UI, ZERO AI SLOP)
# ==============================================================================
def create_premium_scene1():
    w, h = 1920, 1080
    img = Image.new('RGBA', (w, h), (11, 15, 25, 255))
    draw = ImageDraw.Draw(img)

    # Subtle ambient gradient
    for y in range(h):
        ratio = y / h
        r = int(10 + ratio * 8)
        g = int(16 + ratio * 14)
        b = int(28 + ratio * 20)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

    f_tag = ImageFont.truetype(FONT_BOLD, 16)
    f_h1 = ImageFont.truetype(FONT_BOLD, 46)
    f_h2 = ImageFont.truetype(FONT_BOLD, 46)
    f_card_title = ImageFont.truetype(FONT_BOLD, 22)
    f_card_sub = ImageFont.truetype(FONT_REG, 16)
    f_chat_sender = ImageFont.truetype(FONT_BOLD, 18)
    f_chat_body = ImageFont.truetype(FONT_REG, 20)
    f_chat_time = ImageFont.truetype(FONT_REG, 15)
    f_stat_num = ImageFont.truetype(FONT_BOLD, 48)
    f_stat_text = ImageFont.truetype(FONT_REG, 18)
    f_sol = ImageFont.truetype(FONT_BOLD, 20)

    # 1. Minimalist Top Tag
    tag_text = "TANTANGAN OPERASIONAL KLINIK ESTETIKA"
    tw = draw.textlength(tag_text, font=f_tag)
    tx, ty = (w - tw) // 2, 60
    draw.rounded_rectangle([tx - 20, ty - 8, tx + tw + 20, ty + 28], radius=18, fill=(30, 41, 59, 200), outline=(239, 68, 68, 180), width=1)
    draw.text((tx, ty), tag_text, font=f_tag, fill=(248, 113, 113, 255))

    # 2. Main Headline
    t1 = "Calon Pasien Konsultasi Jam 10 Malam..."
    t2 = "WhatsApp Baru Dibalas Jam 9 Pagi?"
    tw1 = draw.textlength(t1, font=f_h1)
    tw2 = draw.textlength(t2, font=f_h2)
    draw.text(((w - tw1) // 2, 115), t1, font=f_h1, fill=(255, 255, 255, 255))
    draw.text(((w - tw2) // 2, 175), t2, font=f_h2, fill=(245, 158, 11, 255))

    # 3. Main Realistic WhatsApp UI Card
    cw, ch = 1100, 490
    cx, cy = (w - cw) // 2, 260

    # Card background (WhatsApp Dark Theme #111B21)
    draw.rounded_rectangle([cx - 2, cy - 2, cx + cw + 2, cy + ch + 2], radius=24, fill=(17, 24, 39, 240), outline=(51, 65, 85, 200), width=2)
    draw.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=22, fill=(17, 27, 33, 255))

    # WhatsApp Header Bar
    hw, hh = cw, 80
    draw.rounded_rectangle([cx, cy, cx + hw, cy + hh], radius=22, fill=(32, 44, 51, 255))
    draw.rectangle([cx, cy + 40, cx + hw, cy + hh], fill=(32, 44, 51, 255))

    # Avatar
    draw.ellipse([cx + 25, cy + 16, cx + 75, cy + 66], fill=(16, 185, 129, 255))
    draw.text((cx + 38, cy + 24), "L", font=ImageFont.truetype(FONT_BOLD, 28), fill=(255, 255, 255))
    
    # Clinic Title & Verified Badge
    draw.text((cx + 90, cy + 18), "Lumina Aesthetic Clinic & Dermatology", font=f_card_title, fill=(233, 237, 239, 255))
    draw_verified_badge(draw, cx + 510, cy + 22, 18)
    draw.text((cx + 90, cy + 46), "WhatsApp Business • Status: Di Luar Jam Operasional (Offline)", font=f_card_sub, fill=(134, 150, 160, 255))

    # Chat Area (WhatsApp Wallpaper Dark)
    # Incoming Patient Chat Bubble (Right side in patient's view or left side incoming)
    bx, by, bw, bh = cx + 45, cy + 115, 700, 150
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=14, fill=(32, 44, 51, 240))
    draw.text((bx + 20, by + 16), "Calon Pasien VIP", font=f_chat_sender, fill=(45, 212, 191, 255))
    draw.text((bx + 20, by + 48), "Malam admin, kulit wajah saya breakout jerawat parah dan kusam.", font=f_chat_body, fill=(233, 237, 239, 255))
    draw.text((bx + 20, by + 80), "Mau tanya biaya Laser Glowing dan apa besok siang jam 2 ada slot?", font=f_chat_body, fill=(233, 237, 239, 255))
    draw.text((bx + bw - 75, by + bh - 32), "22:30", font=f_chat_time, fill=(134, 150, 160, 255))

    # Alert strip: Unanswered message
    aw, ah = 700, 75
    ax, ay = cx + 45, cy + 285
    draw.rounded_rectangle([ax, ay, ax + aw, ay + ah], radius=12, fill=(127, 29, 29, 140), outline=(239, 68, 68, 160), width=1)
    draw.text((ax + 20, ay + 14), "Status: Pesan Tertahan 10,5 Jam Tanpa Respons", font=ImageFont.truetype(FONT_BOLD, 18), fill=(254, 202, 202, 255))
    draw.text((ax + 20, ay + 42), "Admin baru bertugas jam 09:00 WIB keesokan harinya.", font=f_card_sub, fill=(254, 226, 226, 255))

    # Right Stat Block (Clean & sleek)
    sw, sh = 280, 245
    sx, sy = cx + 775, cy + 115
    draw.rounded_rectangle([sx, sy, sx + sw, sy + sh], radius=16, fill=(15, 23, 42, 220), outline=(245, 158, 11, 140), width=1)
    draw.text((sx + 25, sy + 25), "68%", font=f_stat_num, fill=(248, 113, 113, 255))
    stat_msg = "Calon pasien estetika\nlangsung beralih ke\nklinik kompetitor jika\nchat tidak direspons\ndalam 15 menit."
    draw.text((sx + 25, sy + 95), stat_msg, font=f_stat_text, fill=(203, 213, 225, 255))

    # Bottom Solution Bar inside card
    bx3, by3, bw3, bh3 = cx + 45, cy + 380, cw - 90, 75
    draw.rounded_rectangle([bx3, by3, bx3 + bw3, by3 + bh3], radius=14, fill=(6, 78, 59, 180), outline=(52, 211, 153, 180), width=1)
    draw.text((bx3 + 25, by3 + 16), "Solusi Modern: WhatsApp AI Automation 24/7", font=f_sol, fill=(110, 231, 183, 255))
    draw.text((bx3 + 25, by3 + 44), "Melayani konsultasi, rekomendasi harga resmi, dan booking instan tanpa jeda.", font=f_card_sub, fill=(209, 250, 229, 255))

    out_file = 'scratch/visuals_v2/scene1_hook.png'
    img.save(out_file)
    print(f"Created {out_file}")

# ==============================================================================
# 2. SCENE 5: PREMIUM SHOWCASE & CTA (ZERO AI SLOP)
# ==============================================================================
def create_premium_scene5():
    w, h = 1920, 1080
    img = Image.new('RGBA', (w, h), (11, 15, 25, 255))
    draw = ImageDraw.Draw(img)

    for y in range(h):
        ratio = y / h
        r = int(10 + ratio * 10)
        g = int(18 + ratio * 18)
        b = int(30 + ratio * 24)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

    f_tag = ImageFont.truetype(FONT_BOLD, 16)
    f_h1 = ImageFont.truetype(FONT_BOLD, 48)
    f_h2 = ImageFont.truetype(FONT_REG, 24)
    f_card_t = ImageFont.truetype(FONT_BOLD, 22)
    f_card_d = ImageFont.truetype(FONT_REG, 17)
    f_btn = ImageFont.truetype(FONT_BOLD, 30)
    f_sub = ImageFont.truetype(FONT_REG, 19)

    # Top Tag
    tag_text = "TRANSFORMASI OPERASIONAL KLINIK ESTETIKA"
    tw = draw.textlength(tag_text, font=f_tag)
    tx, ty = (w - tw) // 2, 70
    draw.rounded_rectangle([tx - 20, ty - 8, tx + tw + 20, ty + 28], radius=18, fill=(30, 41, 59, 200), outline=(52, 211, 153, 180), width=1)
    draw.text((tx, ty), tag_text, font=f_tag, fill=(52, 211, 153, 255))

    # Headline
    t1 = "Otomasi WhatsApp Klinik Anda Sekarang."
    tw1 = draw.textlength(t1, font=f_h1)
    draw.text(((w - tw1) // 2, 125), t1, font=f_h1, fill=(255, 255, 255, 255))
    
    t2 = "Tingkatkan konversi konsultasi pasien 24 jam tanpa membebani jam kerja admin."
    tw2 = draw.textlength(t2, font=f_h2)
    draw.text(((w - tw2) // 2, 195), t2, font=f_h2, fill=(203, 213, 225, 255))

    # 3 Core Pillars (Clean, minimalist SaaS style cards)
    pillars = [
        ("AI Beauty Consultant 24/7", "Paham keluhan kulit pasien & menyajikan harga treatment resmi secara akurat."),
        ("Smart Booking & Anti-Bentrok", "Cek slot jadwal dokter secara alami lewat chat WhatsApp, bebas salah jadwal."),
        ("Auto Sync Google Sheets", "Data nama, no. WA, dokter & treatment langsung masuk detik itu juga.")
    ]
    pw, ph = 430, 210
    start_x = (w - (3 * pw + 2 * 35)) // 2
    card_y = 270

    for i, (title, desc) in enumerate(pillars):
        px = start_x + i * (pw + 35)
        # Clean glass card
        draw.rounded_rectangle([px, card_y, px + pw, card_y + ph], radius=18, fill=(17, 24, 39, 230), outline=(51, 65, 85, 180), width=1)
        
        # Pill number
        draw.rounded_rectangle([px + 24, card_y + 24, px + 56, card_y + 56], radius=10, fill=(30, 41, 59, 255), outline=(52, 211, 153, 150), width=1)
        draw.text((px + 34, card_y + 28), str(i + 1), font=ImageFont.truetype(FONT_BOLD, 18), fill=(52, 211, 153, 255))
        
        draw.text((px + 70, card_y + 28), title, font=f_card_t, fill=(255, 255, 255, 255))
        
        # Word wrap desc
        words = desc.split()
        lines = []
        cur = []
        for wd in words:
            cur.append(wd)
            if len(" ".join(cur)) > 32:
                lines.append(" ".join(cur))
                cur = []
        if cur:
            lines.append(" ".join(cur))
            
        ly = card_y + 85
        for l in lines[:4]:
            draw.text((px + 24, ly), l, font=f_card_d, fill=(148, 163, 184, 255))
            ly += 28

    # CTA Area (Stripe / Linear style luxury button)
    btn_w, btn_h = 680, 85
    btn_x = (w - btn_w) // 2
    btn_y = 530
    
    # Glow & button
    draw.rounded_rectangle([btn_x - 4, btn_y - 4, btn_x + btn_w + 4, btn_y + btn_h + 4], radius=42, fill=(16, 185, 129, 60))
    draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=40, fill=(16, 185, 129, 255))
    
    btn_txt = "Jadwalkan Live Demo 10 Menit"
    btw = draw.textlength(btn_txt, font=f_btn)
    draw.text(((w - btw) // 2, btn_y + 22), btn_txt, font=f_btn, fill=(10, 25, 20, 255))

    sub_txt = "Free Trial 14 Hari untuk Klinik Estetika  •  Konsultasi Setup & Integrasi Gratis"
    stw = draw.textlength(sub_txt, font=f_sub)
    draw.text(((w - stw) // 2, 645), sub_txt, font=f_sub, fill=(203, 213, 225, 255))

    # Bottom trust marks
    trust_marks = "Integrasi Resmi Meta WhatsApp Cloud API  •  Keamanan Data Pasien Terjamin  •  Google Sheets Real-Time Sync"
    tmw = draw.textlength(trust_marks, font=ImageFont.truetype(FONT_REG, 15))
    draw.text(((w - tmw) // 2, 715), trust_marks, font=ImageFont.truetype(FONT_REG, 15), fill=(100, 116, 139, 255))

    out_file = 'scratch/visuals_v2/scene5_cta.png'
    img.save(out_file)
    print(f"Created {out_file}")

if __name__ == '__main__':
    create_premium_scene1()
    create_premium_scene5()
