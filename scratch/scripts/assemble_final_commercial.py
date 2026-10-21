import subprocess
import os
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# 1. Create concat list for video segments
concat_list_file = "scratch/video_segments/concat_list.txt"
with open(concat_list_file, "w") as f:
    f.write("file 'scene1.mp4'\n")
    f.write("file 'scene2.mp4'\n")
    f.write("file 'scene3.mp4'\n")
    f.write("file 'scene4.mp4'\n")
    f.write("file 'scene5.mp4'\n")

print("Created concat list")

# 2. Master Concat & Audio Mix
# Inputs:
# - Concat video segments (has video and voiceover)
# - Background music: scratch/audio/bgm.wav
# Filter:
# - [0:a] is the concatenated VO
# - [1:a] is the luxury BGM
# - Mix them with sidechain / ducking or volume balancing:
#   VO volume=1.15, BGM volume=0.25, amix=inputs=2:duration=first

output_path = "output/commercial_promo_aesthetic_clinic_60s.mp4"

cmd = [
    ffmpeg, '-y',
    '-f', 'concat', '-safe', '0', '-i', concat_list_file,
    '-i', 'scratch/audio/bgm.wav',
    '-filter_complex',
    "[0:a]volume=1.15[vo];"
    "[1:a]volume=0.25[bgm];"
    "[vo][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]",
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
    '-t', '60.0',
    output_path
]

print("Assembling final master video...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("FFmpeg Error:", res.stderr)
else:
    print(f"Master commercial video successfully generated: {output_path}")

# Check output specs
probe_cmd = [ffmpeg, '-i', output_path]
res_probe = subprocess.run(probe_cmd, capture_output=True, text=True)
for line in res_probe.stderr.split('\n'):
    if any(k in line for k in ['Duration:', 'Stream #0:0', 'Stream #0:1']):
        print(line.strip())
