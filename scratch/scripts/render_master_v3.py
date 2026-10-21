import subprocess
import os
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

os.makedirs('scratch/video_segments_v3', exist_ok=True)
os.makedirs('output', exist_ok=True)

# ------------------------------------------------------------------------------
# SCENE 1 V3 (8.0s)
# ------------------------------------------------------------------------------
print("\n>>> Rendering Scene 1 V3...")
filter_s1 = (
    "[0:v]scale=1920:1080,setsar=1,fps=30[bg];"
    "[bg][1:v]overlay=0:0:enable='between(t,0,4.0)'[tmp1];"
    "[tmp1][2:v]overlay=0:0:enable='between(t,4.0,8.0)'[v]"
)
cmd_s1 = [
    ffmpeg, '-y',
    '-loop', '1', '-t', '8.0', '-i', 'scratch/visuals_v3/scene1_hook.png',
    '-loop', '1', '-t', '4.0', '-i', 'scratch/visuals_v2/sub_scene1_a.png',
    '-loop', '1', '-t', '4.0', '-i', 'scratch/visuals_v2/sub_scene1_b.png',
    '-i', 'scratch/audio/vo_scene1.mp3',
    '-filter_complex', filter_s1,
    '-map', '[v]',
    '-map', '3:a',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '8.0',
    'scratch/video_segments_v3/scene1.mp4'
]
subprocess.run(cmd_s1, check=True)
print("Scene 1 V3 done.")

# ------------------------------------------------------------------------------
# SCENE 5 V3 (10.0s)
# ------------------------------------------------------------------------------
print("\n>>> Rendering Scene 5 V3...")
filter_s5 = (
    "[0:v]scale=1920:1080,setsar=1,fps=30[bg];"
    "[bg][1:v]overlay=0:0:enable='between(t,0,5.0)'[tmp1];"
    "[tmp1][2:v]overlay=0:0:enable='between(t,5.0,10.0)'[v];"
    "[3:a]apad=whole_dur=10.0[a]"
)
cmd_s5 = [
    ffmpeg, '-y',
    '-loop', '1', '-t', '10.0', '-i', 'scratch/visuals_v3/scene5_cta.png',
    '-loop', '1', '-t', '5.0', '-i', 'scratch/visuals_v2/sub_scene5_a.png',
    '-loop', '1', '-t', '5.0', '-i', 'scratch/visuals_v2/sub_scene5_b.png',
    '-i', 'scratch/audio/vo_scene5.mp3',
    '-filter_complex', filter_s5,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '10.0',
    'scratch/video_segments_v3/scene5.mp4'
]
subprocess.run(cmd_s5, check=True)
print("Scene 5 V3 done.")

# ------------------------------------------------------------------------------
# MASTER NORMALIZED CONCAT & AUDIO MIX (60.0s)
# ------------------------------------------------------------------------------
s1 = 'scratch/video_segments_v3/scene1.mp4'
s2 = 'scratch/video_segments_v2/scene2.mp4'
s3 = 'scratch/video_segments_v2/scene3.mp4'
s4 = 'scratch/video_segments_v2/scene4.mp4'
s5 = 'scratch/video_segments_v3/scene5.mp4'
bgm = 'scratch/audio/bgm.wav'
out = 'output/commercial_promo_aesthetic_clinic_60s.mp4'

print("\n>>> Assembling Final 60s Commercial Video V3...")
cmd_master = [
    ffmpeg, '-y',
    '-i', s1,
    '-i', s2,
    '-i', s3,
    '-i', s4,
    '-i', s5,
    '-i', bgm,
    '-filter_complex',
    '[0:v]setsar=1,fps=30[v0];'
    '[1:v]setsar=1,fps=30[v1];'
    '[2:v]setsar=1,fps=30[v2];'
    '[3:v]setsar=1,fps=30[v3];'
    '[4:v]setsar=1,fps=30[v4];'
    '[v0][0:a][v1][1:a][v2][2:a][v3][3:a][v4][4:a]concat=n=5:v=1:a=1[v_cat][vo_cat];'
    '[vo_cat]volume=1.15[vo];'
    '[5:a]volume=0.22[bgm_v];'
    '[vo][bgm_v]amix=inputs=2:duration=first:dropout_transition=2[aout]',
    '-map', '[v_cat]',
    '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
    '-t', '60.0',
    out
]
subprocess.run(cmd_master, check=True)
print(f"\nSUCCESS! Master Commercial Video V3 rendered to {out}")
