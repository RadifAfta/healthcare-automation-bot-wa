import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# Scene 5: 10.0s
# Inputs:
# - Background image: scratch/visuals/scene5_cta.png
# - Overlay 1: scratch/visuals/sub_09.png (0.0s - 5.0s)
# - Overlay 2: scratch/visuals/sub_10.png (5.0s - 10.0s)
# - Audio: scratch/audio/vo_scene5.mp3 padded to 10.0s

filter_complex = (
    "[0:v]scale=1920:1080,fps=30[bg];"
    "[bg][1:v]overlay=0:0:enable='between(t,0,5.0)'[tmp1];"
    "[tmp1][2:v]overlay=0:0:enable='between(t,5.0,10.0)'[v];"
    "[3:a]apad=whole_dur=10.0[a]"
)

cmd = [
    ffmpeg, '-y',
    '-loop', '1', '-t', '10.0', '-i', 'scratch/visuals/scene5_cta.png',
    '-loop', '1', '-t', '5.0', '-i', 'scratch/visuals/sub_09.png',
    '-loop', '1', '-t', '5.0', '-i', 'scratch/visuals/sub_10.png',
    '-i', 'scratch/audio/vo_scene5.mp3',
    '-filter_complex', filter_complex,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '10.0',
    'scratch/video_segments/scene5.mp4'
]

print("Rendering Scene 5...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("Error:", res.stderr)
else:
    print("Scene 5 rendered successfully: scratch/video_segments/scene5.mp4")
