import subprocess
import os
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

os.makedirs('scratch/tiktok_simple', exist_ok=True)
os.makedirs('output', exist_ok=True)

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"

def make_simple_header(filename, title, subtitle):
    w, h = 1080, 240
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    f_title = ImageFont.truetype(FONT_BOLD, 32)
    f_sub = ImageFont.truetype(FONT_REG, 22)
    
    card_w = 980
    card_h = 100
    cx = (w - card_w) // 2
    cy = 70
    
    # Simple dark pill with subtle mint border (TikTok native style)
    draw.rounded_rectangle([cx, cy, cx + card_w, cy + card_h], radius=24, fill=(15, 23, 42, 235), outline=(52, 211, 153, 220), width=2)
    
    tw = draw.textlength(title, font=f_title)
    draw.text(((w - tw) // 2, cy + 16), title, font=f_title, fill=(255, 255, 255, 255))
    
    sw = draw.textlength(subtitle, font=f_sub)
    draw.text(((w - sw) // 2, cy + 56), subtitle, font=f_sub, fill=(251, 191, 36, 255))
    
    img.save(filename)
    print(f"Created {filename}")

# Generate simple header pills
make_simple_header('scratch/tiktok_simple/header_part1.png', 'Konsultasi & Price List Otomatis 24 Jam', 'AI jawab keluhan kulit & kirim harga resmi instan')
make_simple_header('scratch/tiktok_simple/header_part2.png', 'Booking Natural & Cek Jadwal Dokter', 'Tinggal chat santai, sistem langsung cek ketersediaan slot')
make_simple_header('scratch/tiktok_simple/header_part3.png', 'Auto Sync Real-Time ke Google Sheets', 'Sekali konfirmasi, data langsung masuk tanpa input manual')
make_simple_header('scratch/tiktok_simple/header_part4.png', 'Gimana Menurut Kalian?', 'Komen di bawah ya! Kira-kira klinik wajib pakai ini gak? 👇')

# Raw footage paths
scene1_raw = "demo bot wa/scene baru.mp4"
scene2_raw = "demo bot wa/scene baru 2.mp4"
bg_music = "scratch/audio/tiktok_lofi_chill.wav"

# --- SCENE 1 (14s): AI Skin Consult & Price List (00:00:26 - 00:00:40) ---
# In scene baru.mp4: left sidebar x=0..385. Blur sidebar, then overlay on vertical canvas
cmd_scene1 = [
    ffmpeg, "-y",
    "-ss", "00:00:26", "-to", "00:00:40",
    "-i", scene1_raw,
    "-i", "scratch/tiktok_simple/header_part1.png",
    "-filter_complex",
    "[0:v]split=2[raw1][raw2];"
    "[raw1]crop=385:1078:0:0,boxblur=25:5[blur_sidebar];"
    "[raw2][blur_sidebar]overlay=0:0[clean_vid];"
    "[clean_vid]split=2[bg_in][fg_in];"
    "[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:5,drawbox=c=black@0.45:replace=0:t=fill[bg];"
    "[fg_in]scale=1080:-1[fg];"
    "[bg][fg]overlay=(W-w)/2:(H-h)/2[vid_composed];"
    "[vid_composed][1:v]overlay=0:60[outv]",
    "-map", "[outv]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
    "scratch/tiktok_simple/clip1.mp4"
]

print("Rendering Clip 1...")
subprocess.run(cmd_scene1, check=True)

# --- SCENE 2 (16s): Natural Chat Booking & Slot Check (00:01:25 - 00:02:25, 60s sped up ~3.75x to 16s) ---
cmd_scene2 = [
    ffmpeg, "-y",
    "-ss", "00:01:25", "-to", "00:02:25",
    "-i", scene1_raw,
    "-i", "scratch/tiktok_simple/header_part2.png",
    "-filter_complex",
    "[0:v]setpts=(16/60)*PTS[fast_vid];"
    "[fast_vid]split=2[raw1][raw2];"
    "[raw1]crop=385:1078:0:0,boxblur=25:5[blur_sidebar];"
    "[raw2][blur_sidebar]overlay=0:0[clean_vid];"
    "[clean_vid]split=2[bg_in][fg_in];"
    "[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:5,drawbox=c=black@0.45:replace=0:t=fill[bg];"
    "[fg_in]scale=1080:-1[fg];"
    "[bg][fg]overlay=(W-w)/2:(H-h)/2[vid_composed];"
    "[vid_composed][1:v]overlay=0:60[outv]",
    "-map", "[outv]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
    "scratch/tiktok_simple/clip2.mp4"
]

print("Rendering Clip 2...")
subprocess.run(cmd_scene2, check=True)

# --- SCENE 3 (12s): Live Google Sheets Sync (00:00:06 - 00:00:18 from scene baru 2.mp4) ---
# In scene baru 2.mp4: left sidebar x=0..235. Blur sidebar.
cmd_scene3 = [
    ffmpeg, "-y",
    "-ss", "00:00:06", "-to", "00:00:18",
    "-i", scene2_raw,
    "-i", "scratch/tiktok_simple/header_part3.png",
    "-filter_complex",
    "[0:v]split=2[raw1][raw2];"
    "[raw1]crop=235:1078:0:0,boxblur=25:5[blur_sidebar];"
    "[raw2][blur_sidebar]overlay=0:0[clean_vid];"
    "[clean_vid]split=2[bg_in][fg_in];"
    "[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:5,drawbox=c=black@0.45:replace=0:t=fill[bg];"
    "[fg_in]scale=1080:-1[fg];"
    "[bg][fg]overlay=(W-w)/2:(H-h)/2[vid_composed];"
    "[vid_composed][1:v]overlay=0:60[outv]",
    "-map", "[outv]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
    "scratch/tiktok_simple/clip3.mp4"
]

print("Rendering Clip 3...")
subprocess.run(cmd_scene3, check=True)

# --- SCENE 4 (5s): Outro / Question (00:00:18 - 00:00:23 from scene baru 2.mp4 showing synced sheet) ---
cmd_scene4 = [
    ffmpeg, "-y",
    "-ss", "00:00:18", "-to", "00:00:23",
    "-i", scene2_raw,
    "-i", "scratch/tiktok_simple/header_part4.png",
    "-filter_complex",
    "[0:v]split=2[raw1][raw2];"
    "[raw1]crop=235:1078:0:0,boxblur=25:5[blur_sidebar];"
    "[raw2][blur_sidebar]overlay=0:0[clean_vid];"
    "[clean_vid]split=2[bg_in][fg_in];"
    "[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:5,drawbox=c=black@0.45:replace=0:t=fill[bg];"
    "[fg_in]scale=1080:-1[fg];"
    "[bg][fg]overlay=(W-w)/2:(H-h)/2[vid_composed];"
    "[vid_composed][1:v]overlay=0:60[outv]",
    "-map", "[outv]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
    "scratch/tiktok_simple/clip4.mp4"
]

print("Rendering Clip 4...")
subprocess.run(cmd_scene4, check=True)

# Concatenate clips
concat_txt = "scratch/tiktok_simple/concat.txt"
with open(concat_txt, "w") as f:
    f.write("file 'clip1.mp4'\n")
    f.write("file 'clip2.mp4'\n")
    f.write("file 'clip3.mp4'\n")
    f.write("file 'clip4.mp4'\n")

# Final Assembly with chill background music
final_output = "output/tiktok_soft_promo_aesthetic_bot.mp4"
cmd_concat = [
    ffmpeg, "-y",
    "-f", "concat", "-safe", "0", "-i", concat_txt,
    "-i", bg_music,
    "-filter_complex",
    "[1:a]volume=0.35,afade=t=in:ss=0:d=1,afade=t=out:st=45:d=2[a_chill]",
    "-map", "0:v",
    "-map", "[a_chill]",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "192k",
    "-shortest",
    final_output
]

print("Assembling final TikTok video...")
subprocess.run(cmd_concat, check=True)
print(f"DONE! Saved to {final_output}")
