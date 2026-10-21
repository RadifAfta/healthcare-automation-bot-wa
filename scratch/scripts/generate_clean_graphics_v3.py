import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('scratch/visuals_v3', exist_ok=True)

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
FONT_SEMI = "C:/Windows/Fonts/segoeuisl.ttf"

def draw_verified_badge(draw, x, y, size):
    draw.ellipse([x, y, x + size, y + size], fill=(37, 211, 102))
    pts = [
        (x + int(size * 0.28), y + int(size * 0.52)),
        (x + int(size * 0.45), y + int(size * 0.70)),
        (x + int(size * 0.75), y + int(size * 0.32))
    ]
    draw.line([pts[0], pts[1]], fill=(255, 255, 255), width=max(2, int(size * 0.12)))
    draw.line([pts[1], pts[2]], fill=(255, 255, 255), width=max(2, int(size * 0.12)))

def create_scene1_v3():
    w, h = 1920, 1080
    img = Image.new('RGBA', (w, h), (11, 15, 25, 255))
    draw = ImageDraw.Draw(img)

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
    f_sol = ImageFont.truetype(FONT_BOLD, 20)
    f_disclaimer = ImageFont.truetype(FONT_REG, 15)

    # 1. Top Category Pill
    tag_text = "TANTANGAN OPERASIONAL KLINIK ESTETIKA"
    tw = draw.textlength(tag_text, font=f_tag)
    tx, ty = (w - tw) // 2, 55
    draw.rounded_rectangle([tx - 20, ty - 8, tx + tw + 20, ty + 28], radius=18, fill=(30, 41, 59, 200), outline=(239, 68, 68, 180), width=1)
    draw.text((tx, ty), tag_text, font=f_tag, fill=(248, 113, 113, 255))

    # 2. Main Headline
    t1 = "Calon Pasien Konsultasi Jam 10 Malam..."
    t2 = "WhatsApp Baru Dibalas Jam 9 Pagi?"
    tw1 = draw.textlength(t1, font=f_h1)
    tw2 = draw.textlength(t2, font=f_h2)
    draw.text(((w - tw1) // 2, 110), t1, font=f_h1, fill=(255, 255, 255, 255))
    draw.text(((w - tw2) // 2, 170), t2, font=f_h2, fill=(245, 158, 11, 255))

    # 3. Main WhatsApp Card
    cw, ch = 1140, 510
    cx, cy = (w - cw) // 2, 245

    draw.rounded_rectangle([cx - 2, cy - 2, cx + cw + 2, cy + ch + 2], radius=24, fill=(17, 24, 39, 240), outline=(51, 65, 85, 200), width=2)
    draw.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=22, fill=(17, 27, 33, 255))

    # Header Bar
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

    # Chat Bubble (Incoming Patient)
    bx, by, bw, bh = cx + 35, cy + 115, 680, 150
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=14, fill=(32, 44, 51, 240))
    draw.text((bx + 20, by + 16), "Calon Pasien VIP", font=f_chat_sender, fill=(45, 212, 191, 255))
    draw.text((bx + 20, by + 48), "Malam admin, kulit wajah saya breakout jerawat parah dan kusam.", font=f_chat_body, fill=(233, 237, 239, 255))
    draw.text((bx + 20, by + 80), "Mau tanya biaya Laser Glowing dan apa besok siang jam 2 ada slot?", font=f_chat_body, fill=(233, 237, 239, 255))
    draw.text((bx + bw - 75, by + bh - 32), "22:30", font=f_chat_time, fill=(134, 150, 160, 255))

    # Alert Strip
    aw, ah = 680, 75
    ax, ay = cx + 35, cy + 285
    draw.rounded_rectangle([ax, ay, ax + aw, ay + ah], radius=12, fill=(127, 29, 29, 140), outline=(239, 68, 68, 160), width=1)
    draw.text((ax + 20, ay + 14), "Status: Pesan Tertahan 10,5 Jam Tanpa Respons", font=ImageFont.truetype(FONT_BOLD, 18), fill=(254, 202, 202, 255))
    draw.text((ax + 20, ay + 42), "Admin baru bertugas jam 09:00 WIB keesokan harinya.", font=f_card_sub, fill=(254, 226, 226, 255))

    # RIGHT BLOCK: NATURAL CLINIC REALITY (NO AI BUZZWORDS, HIGH CONTRAST)
    sw, sh = 350, 245
    sx, sy = cx + 745, cy + 115
    draw.rounded_rectangle([sx, sy, sx + sw, sy + sh], radius=16, fill=(15, 23, 42, 230), outline=(245, 158, 11, 140), width=1)
    
    # Natural Tag with dark background and crisp border
    draw.rounded_rectangle([sx + 20, sy + 18, sx + 220, sy + 48], radius=8, fill=(30, 41, 59, 255), outline=(245, 158, 11, 200), width=1)
    draw.text((sx + 30, sy + 23), "FAKTA PASIEN KLINIK", font=ImageFont.truetype(FONT_BOLD, 13), fill=(245, 158, 11, 255))
    
    insight_text = (
        "Calon pasien estetika cenderung\n"
        "langsung mencari & booking ke klinik\n"
        "lain saat chat konsultasi malam hari\n"
        "tidak direspons dengan cepat."
    )
    draw.text((sx + 20, sy + 64), insight_text, font=ImageFont.truetype(FONT_REG, 17), fill=(226, 232, 240, 255))
    draw.text((sx + 20, sy + 175), "• Solusi: Bot responsif 24/7", font=ImageFont.truetype(FONT_BOLD, 15), fill=(52, 211, 153, 255))
    draw.text((sx + 20, sy + 205), "• Pasien langsung terkonversi", font=ImageFont.truetype(FONT_BOLD, 15), fill=(52, 211, 153, 255))

    # Solution Bar
    bx3, by3, bw3, bh3 = cx + 35, cy + 380, cw - 70, 85
    draw.rounded_rectangle([bx3, by3, bx3 + bw3, by3 + bh3], radius=14, fill=(6, 78, 59, 180), outline=(52, 211, 153, 180), width=1)
    draw.text((bx3 + 25, by3 + 18), "Solusi Modern: WhatsApp AI Automation 24/7", font=f_sol, fill=(110, 231, 183, 255))
    draw.text((bx3 + 25, by3 + 48), "Melayani konsultasi keluhan kulit, cek jadwal dokter, dan booking instan tanpa jeda.", font=f_card_sub, fill=(209, 250, 229, 255))

    # BOTTOM ETHICAL DISCLAIMER (SIMULATION & DEMO)
    disc_text = "*Simulasi & demo visual bot WhatsApp. Nama klinik, data pasien, dan katalog harga adalah ilustrasi demo sistem."
    dtw = draw.textlength(disc_text, font=f_disclaimer)
    draw.text(((w - dtw) // 2, 780), disc_text, font=f_disclaimer, fill=(148, 163, 184, 255))

    out_file = 'scratch/visuals_v3/scene1_hook.png'
    img.save(out_file)
    print(f"Created {out_file}")

def create_scene5_v3():
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
    f_h1 = ImageFont.truetype(FONT_BOLD, 46)
    f_h2 = ImageFont.truetype(FONT_REG, 23)
    f_card_t = ImageFont.truetype(FONT_BOLD, 21)
    f_card_d = ImageFont.truetype(FONT_REG, 16)
    f_contact_title = ImageFont.truetype(FONT_BOLD, 23)
    f_contact_wa = ImageFont.truetype(FONT_BOLD, 30)
    f_contact_cta = ImageFont.truetype(FONT_BOLD, 21)
    f_sub = ImageFont.truetype(FONT_REG, 17)
    f_disclaimer = ImageFont.truetype(FONT_REG, 15)

    # Top Tag
    tag_text = "SOLUSI AUTOMATION KHUSUS KLINIK ESTETIKA"
    tw = draw.textlength(tag_text, font=f_tag)
    tx, ty = (w - tw) // 2, 50
    draw.rounded_rectangle([tx - 20, ty - 8, tx + tw + 20, ty + 28], radius=18, fill=(30, 41, 59, 200), outline=(52, 211, 153, 180), width=1)
    draw.text((tx, ty), tag_text, font=f_tag, fill=(52, 211, 153, 255))

    # Headline
    t1 = "Otomasi WhatsApp Klinik Anda Sekarang."
    tw1 = draw.textlength(t1, font=f_h1)
    draw.text(((w - tw1) // 2, 100), t1, font=f_h1, fill=(255, 255, 255, 255))
    
    t2 = "Tingkatkan konversi konsultasi pasien 24 jam tanpa membebani lembur admin."
    tw2 = draw.textlength(t2, font=f_h2)
    draw.text(((w - tw2) // 2, 162), t2, font=f_h2, fill=(203, 213, 225, 255))

    # 3 Core Pillars
    pillars = [
        ("AI Beauty Consultant 24/7", "Paham keluhan kulit pasien & menyajikan harga treatment resmi sesuai SOP klinik."),
        ("Smart Booking Anti-Bentrok", "Cek slot jadwal dokter secara real-time via WhatsApp, bebas bentrok jadwal."),
        ("Auto Sync Google Sheets", "Data nama, no. WA, dokter & treatment langsung masuk detik itu juga.")
    ]
    pw, ph = 430, 180
    start_x = (w - (3 * pw + 2 * 35)) // 2
    card_y = 220

    for i, (title, desc) in enumerate(pillars):
        px = start_x + i * (pw + 35)
        draw.rounded_rectangle([px, card_y, px + pw, card_y + ph], radius=18, fill=(17, 24, 39, 230), outline=(51, 65, 85, 180), width=1)
        
        draw.rounded_rectangle([px + 20, card_y + 18, px + 50, card_y + 48], radius=8, fill=(30, 41, 59, 255), outline=(52, 211, 153, 150), width=1)
        draw.text((px + 30, card_y + 22), str(i + 1), font=ImageFont.truetype(FONT_BOLD, 17), fill=(52, 211, 153, 255))
        draw.text((px + 62, card_y + 22), title, font=f_card_t, fill=(255, 255, 255, 255))
        
        words = desc.split()
        lines = []
        cur = []
        for wd in words:
            cur.append(wd)
            if len(" ".join(cur)) > 34:
                lines.append(" ".join(cur))
                cur = []
        if cur:
            lines.append(" ".join(cur))
            
        ly = card_y + 70
        for l in lines[:3]:
            draw.text((px + 20, ly), l, font=f_card_d, fill=(148, 163, 184, 255))
            ly += 26

    # ==========================================================================
    # PERSONAL OUTREACH CONTACT CARD (CLEAN LAYOUT - NO OVERLAP)
    # ==========================================================================
    cw, ch = 1040, 240
    cx, cy = (w - cw) // 2, 435
    
    draw.rounded_rectangle([cx - 2, cy - 2, cx + cw + 2, cy + ch + 2], radius=24, fill=(16, 185, 129, 60), outline=(52, 211, 153, 200), width=2)
    draw.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=22, fill=(15, 23, 42, 245))

    # Left Section: Info & Name (Width ~580)
    draw.text((cx + 40, cy + 26), "Tertarik Menerapkan Sistem Ini di Klinik Anda?", font=f_contact_title, fill=(255, 255, 255, 255))
    draw.text((cx + 40, cy + 64), "Hubungi: Radif (Healthcare & Bot Automation)", font=f_contact_cta, fill=(245, 158, 11, 255))
    draw.text((cx + 40, cy + 98), "Konsultasikan alur kerja & jadwal dokter klinik Anda.", font=f_sub, fill=(203, 213, 225, 255))
    
    # Right Section: WhatsApp Green Pill Box (Positioned at cx + 670, Width 330)
    bx, by, bw, bh = cx + 670, cy + 24, 330, 95
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=18, fill=(16, 185, 129, 255))
    draw.text((bx + 25, by + 16), "WhatsApp Langsung:", font=ImageFont.truetype(FONT_BOLD, 15), fill=(6, 78, 59, 255))
    draw.text((bx + 25, by + 42), "0822-2454-80975", font=f_contact_wa, fill=(10, 25, 20, 255))

    # Bottom Call To Action Banner inside Card
    bx2, by2, bw2, bh2 = cx + 30, cy + 148, cw - 60, 64
    draw.rounded_rectangle([bx2, by2, bx2 + bw2, by2 + bh2], radius=14, fill=(30, 41, 59, 220), outline=(52, 211, 153, 140), width=1)
    cta_msg = ">> Balas pesan ini / Chat WA untuk Live Demo 10 Menit & Uji Coba Gratis 14 Hari"
    draw.text((bx2 + 30, by2 + 18), cta_msg, font=ImageFont.truetype(FONT_BOLD, 18), fill=(110, 231, 183, 255))

    # Bottom Disclaimer / Note on Pricing
    disc_text = "*Seluruh katalog treatment, harga, dan jadwal dokter dikustomisasi penuh sesuai SOP & price list resmi klinik Anda."
    dtw = draw.textlength(disc_text, font=f_disclaimer)
    draw.text(((w - dtw) // 2, 715), disc_text, font=f_disclaimer, fill=(148, 163, 184, 255))

    out_file = 'scratch/visuals_v3/scene5_cta.png'
    img.save(out_file)
    print(f"Created {out_file}")

if __name__ == '__main__':
    create_scene1_v3()
    create_scene5_v3()
