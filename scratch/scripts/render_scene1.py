import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# Scene 1: 8.0s
# Inputs:
# - Background image: scratch/visuals/scene1_hook.png
# - Overlay 1: scratch/visuals/sub_01.png (0.0s - 4.0s)
# - Overlay 2: scratch/visuals/sub_02.png (4.0s - 8.0s)
# - Audio: scratch/audio/vo_scene1.mp3 padded to 8.0s

filter_complex = (
    "[0:v]scale=1920:1080,fps=30[bg];"
    "[bg][1:v]overlay=0:0:enable='between(t,0,4.0)'[tmp1];"
    "[tmp1][2:v]overlay=0:0:enable='between(t,4.0,8.0)'[v]"
)

cmd = [
    ffmpeg, '-y',
    '-loop', '1', '-t', '8.0', '-i', 'scratch/visuals/scene1_hook.png',
    '-loop', '1', '-t', '4.0', '-i', 'scratch/visuals/sub_01.png',
    '-loop', '1', '-t', '4.0', '-i', 'scratch/visuals/sub_02.png',
    '-i', 'scratch/audio/vo_scene1.mp3',
    '-filter_complex', filter_complex,
    '-map', '[v]',
    '-map', '3:a',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '8.0',
    'scratch/video_segments/scene1.mp4'
]

print("Rendering Scene 1...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("Error:", res.stderr)
else:
    print("Scene 1 rendered successfully: scratch/video_segments/scene1.mp4")
