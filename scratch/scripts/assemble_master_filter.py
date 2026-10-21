import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# We use filter_complex concat which re-encodes seamlessly and guarantees exact framerate & sync!
# Inputs:
# 0: scene1.mp4 (8.0s)
# 1: scene2.mp4 (14.0s)
# 2: scene3.mp4 (16.0s)
# 3: scene4.mp4 (12.0s)
# 4: scene5.mp4 (10.0s)
# 5: bgm.wav (60.0s)

filter_complex = (
    # Ensure uniform 1920x1080, fps=30, sar=1:1 across all inputs
    "[0:v]fps=30,scale=1920:1080,setsar=1[v0];"
    "[1:v]fps=30,scale=1920:1080,setsar=1[v1];"
    "[2:v]fps=30,scale=1920:1080,setsar=1[v2];"
    "[3:v]fps=30,scale=1920:1080,setsar=1[v3];"
    "[4:v]fps=30,scale=1920:1080,setsar=1[v4];"
    # Concat video
    "[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[v_all];"
    # Concat voiceover
    "[0:a][1:a][2:a][3:a][4:a]concat=n=5:v=0:a=1[vo_all];"
    # Mix VO with luxury BGM
    "[vo_all]volume=1.2[vo];"
    "[5:a]volume=0.22[bgm];"
    "[vo][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]"
)

output_path = "output/commercial_promo_aesthetic_clinic_60s.mp4"

cmd = [
    ffmpeg, '-y',
    '-i', 'scratch/video_segments/scene1.mp4',
    '-i', 'scratch/video_segments/scene2.mp4',
    '-i', 'scratch/video_segments/scene3.mp4',
    '-i', 'scratch/video_segments/scene4.mp4',
    '-i', 'scratch/video_segments/scene5.mp4',
    '-i', 'scratch/audio/bgm.wav',
    '-filter_complex', filter_complex,
    '-map', '[v_all]',
    '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
    '-t', '60.0',
    output_path
]

print("Assembling master video using filter_complex concat...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("Error:", res.stderr)
else:
    print(f"Master commercial video successfully generated: {output_path}")

probe_cmd = [ffmpeg, '-i', output_path]
res_probe = subprocess.run(probe_cmd, capture_output=True, text=True)
for line in res_probe.stderr.split('\n'):
    if any(k in line for k in ['Duration:', 'Stream #0:0', 'Stream #0:1']):
        print(line.strip())
