import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# Test stacked layout for Scene 4:
# WhatsApp chat on top (crop from scene baru 2.mp4, x: 235..955, y: 150..850 -> 720x700)
# Google Sheets on bottom (crop from scene baru 2.mp4, x: 960..1918, y: 180..780 -> 958x600)
# Background is vertical 1080x1920

filter_complex = (
    # Background
    "color=c=0x0B131E:s=1080x1920:d=1[bg];"
    # WhatsApp top crop
    "[0:v]crop=710:650:240:220,scale=1000:700[wa_top];"
    # Google Sheets bottom crop
    "[0:v]crop=940:550:965:180,scale=1000:600[gs_bottom];"
    # Compose
    "[bg][wa_top]overlay=40:250[tmp1];"
    "[tmp1][gs_bottom]overlay=40:1000[v]"
)

cmd = [
    ffmpeg, '-y',
    '-ss', '00:00:10',
    '-i', 'demo bot wa/scene baru 2.mp4',
    '-vframes', '1',
    '-filter_complex', filter_complex,
    '-map', '[v]',
    'scratch/test_tiktok_stack.jpg'
]

subprocess.run(cmd)
print("Generated scratch/test_tiktok_stack.jpg")
