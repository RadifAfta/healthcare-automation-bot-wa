import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# Option A: Crop out sidebar (x: 385..1918), scale to 1080 width, with blurred ambient background of the video
# Option B: Vertical crop focused on chat bubbles (width: 800, height: 1078, x: 700) scaled to 1080x1920

# Let's test Option A:
cmd_a = [
    ffmpeg, '-y',
    '-ss', '00:00:35',
    '-i', 'demo bot wa/scene baru.mp4',
    '-vframes', '1',
    '-filter_complex',
    "[0:v]crop=in_w-385:in_h:385:0[active_chat];"
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:8,drawbox=x=0:y=0:w=1080:h=1920:color=black@0.5:t=fill[bg];"
    "[active_chat]scale=1080:-1[fg];"
    "[bg][fg]overlay=0:(H-h)/2",
    'scratch/test_tiktok_optA.jpg'
]
subprocess.run(cmd_a)

# Let's test Option B (zoomed close-up on conversation):
cmd_b = [
    ffmpeg, '-y',
    '-ss', '00:00:35',
    '-i', 'demo bot wa/scene baru.mp4',
    '-vframes', '1',
    '-filter_complex',
    "[0:v]crop=1080*1078/1920:1078:650:0,scale=1080:1920",
    'scratch/test_tiktok_optB.jpg'
]
subprocess.run(cmd_b)

print("Generated test options")
