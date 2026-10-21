import subprocess
import os
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

os.makedirs('scratch/video_segments_v2', exist_ok=True)
os.makedirs('output', exist_ok=True)

# ------------------------------------------------------------------------------
# SCENE 1 (8.0s)
# ------------------------------------------------------------------------------
print("\n>>> Rendering Scene 1 V2...")
filter_s1 = (
    "[0:v]scale=1920:1080,fps=30[bg];"
    "[bg][1:v]overlay=0:0:enable='between(t,0,4.0)'[tmp1];"
    "[tmp1][2:v]overlay=0:0:enable='between(t,4.0,8.0)'[v]"
)
cmd_s1 = [
    ffmpeg, '-y',
    '-loop', '1', '-t', '8.0', '-i', 'scratch/visuals_v2/scene1_hook.png',
    '-loop', '1', '-t', '4.0', '-i', 'scratch/visuals_v2/sub_scene1_a.png',
    '-loop', '1', '-t', '4.0', '-i', 'scratch/visuals_v2/sub_scene1_b.png',
    '-i', 'scratch/audio/vo_scene1.mp3',
    '-filter_complex', filter_s1,
    '-map', '[v]',
    '-map', '3:a',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '8.0',
    'scratch/video_segments_v2/scene1.mp4'
]
subprocess.run(cmd_s1, check=True)
print("Scene 1 V2 done.")

# ------------------------------------------------------------------------------
# SCENE 2 (14.0s)
# ------------------------------------------------------------------------------
print("\n>>> Rendering Scene 2 V2...")
filter_s2 = (
    "[0:v]trim=start=28:end=38,setpts=PTS-STARTPTS,setpts=0.6*PTS,scale=1920:1080[v1];"
    "[1:v]trim=start=58:end=82,setpts=PTS-STARTPTS,setpts=0.33333333*PTS,scale=1920:1080[v2];"
    "[v1][v2]concat=n=2:v=1:a=0[raw_concat];"
    "[raw_concat]split[orig][for_blur];"
    "[for_blur]crop=385:1080:0:0,boxblur=45:8,drawbox=x=0:y=0:w=385:h=1080:color=black@0.65:t=fill[blurred_sidebar];"
    "[orig][blurred_sidebar]overlay=0:0[v_blurred];"
    "[v_blurred][2:v]overlay=0:0:enable='between(t,0,6.5)'[tmp1];"
    "[tmp1][3:v]overlay=0:0:enable='between(t,6.5,14.0)'[v];"
    "[4:a]apad=whole_dur=14.0[a]"
)
cmd_s2 = [
    ffmpeg, '-y',
    '-i', 'demo bot wa/scene baru.mp4',
    '-i', 'demo bot wa/scene baru.mp4',
    '-loop', '1', '-t', '6.5', '-i', 'scratch/visuals_v2/header_s2_a.png',
    '-loop', '1', '-t', '7.5', '-i', 'scratch/visuals_v2/header_s2_b.png',
    '-i', 'scratch/audio/vo_scene2.mp3',
    '-filter_complex', filter_s2,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '14.0',
    'scratch/video_segments_v2/scene2.mp4'
]
subprocess.run(cmd_s2, check=True)
print("Scene 2 V2 done.")

# ------------------------------------------------------------------------------
# SCENE 3 (16.0s)
# ------------------------------------------------------------------------------
print("\n>>> Rendering Scene 3 V2...")
filter_s3 = (
    "[0:v]trim=start=85:end=145,setpts=PTS-STARTPTS,setpts=0.26666667*PTS,scale=1920:1080[raw_v];"
    "[raw_v]split[orig][for_blur];"
    "[for_blur]crop=385:1080:0:0,boxblur=45:8,drawbox=x=0:y=0:w=385:h=1080:color=black@0.65:t=fill[blurred_sidebar];"
    "[orig][blurred_sidebar]overlay=0:0[v_blurred];"
    "[v_blurred][1:v]overlay=0:0:enable='between(t,0,7.5)'[tmp1];"
    "[tmp1][2:v]overlay=0:0:enable='between(t,7.5,16.0)'[v];"
    "[3:a]apad=whole_dur=16.0[a]"
)
cmd_s3 = [
    ffmpeg, '-y',
    '-i', 'demo bot wa/scene baru.mp4',
    '-loop', '1', '-t', '7.5', '-i', 'scratch/visuals_v2/header_s3_a.png',
    '-loop', '1', '-t', '8.5', '-i', 'scratch/visuals_v2/header_s3_b.png',
    '-i', 'scratch/audio/vo_scene3.mp3',
    '-filter_complex', filter_s3,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '16.0',
    'scratch/video_segments_v2/scene3.mp4'
]
subprocess.run(cmd_s3, check=True)
print("Scene 3 V2 done.")

# ------------------------------------------------------------------------------
# SCENE 4 (12.0s)
# ------------------------------------------------------------------------------
print("\n>>> Rendering Scene 4 V2...")
filter_s4 = (
    "[0:v]trim=start=4:end=19,setpts=PTS-STARTPTS,setpts=0.8*PTS,scale=1920:1080[raw_v];"
    "[raw_v]split[orig][for_blur];"
    "[for_blur]crop=240:1080:0:0,boxblur=50:10,drawbox=x=0:y=0:w=240:h=1080:color=black@0.75:t=fill[blurred_sidebar];"
    "[orig][blurred_sidebar]overlay=0:0[v_blurred];"
    "[v_blurred][1:v]overlay=0:0:enable='between(t,0,6.0)'[tmp1];"
    "[tmp1][2:v]overlay=0:0:enable='between(t,6.0,12.0)'[v];"
    "[3:a]apad=whole_dur=12.0[a]"
)
cmd_s4 = [
    ffmpeg, '-y',
    '-i', 'demo bot wa/scene baru 2.mp4',
    '-loop', '1', '-t', '6.0', '-i', 'scratch/visuals_v2/header_s4_a.png',
    '-loop', '1', '-t', '6.0', '-i', 'scratch/visuals_v2/header_s4_b.png',
    '-i', 'scratch/audio/vo_scene4.mp3',
    '-filter_complex', filter_s4,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '12.0',
    'scratch/video_segments_v2/scene4.mp4'
]
subprocess.run(cmd_s4, check=True)
print("Scene 4 V2 done.")

# ------------------------------------------------------------------------------
# SCENE 5 (10.0s)
# ------------------------------------------------------------------------------
print("\n>>> Rendering Scene 5 V2...")
filter_s5 = (
    "[0:v]scale=1920:1080,fps=30[bg];"
    "[bg][1:v]overlay=0:0:enable='between(t,0,5.0)'[tmp1];"
    "[tmp1][2:v]overlay=0:0:enable='between(t,5.0,10.0)'[v];"
    "[3:a]apad=whole_dur=10.0[a]"
)
cmd_s5 = [
    ffmpeg, '-y',
    '-loop', '1', '-t', '10.0', '-i', 'scratch/visuals_v2/scene5_cta.png',
    '-loop', '1', '-t', '5.0', '-i', 'scratch/visuals_v2/sub_scene5_a.png',
    '-loop', '1', '-t', '5.0', '-i', 'scratch/visuals_v2/sub_scene5_b.png',
    '-i', 'scratch/audio/vo_scene5.mp3',
    '-filter_complex', filter_s5,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '10.0',
    'scratch/video_segments_v2/scene5.mp4'
]
subprocess.run(cmd_s5, check=True)
print("Scene 5 V2 done.")

# ------------------------------------------------------------------------------
# CONCAT & FINAL MASTER ASSEMBLY
# ------------------------------------------------------------------------------
concat_list_file = "scratch/video_segments_v2/concat_list.txt"
with open(concat_list_file, "w") as f:
    f.write("file 'scene1.mp4'\n")
    f.write("file 'scene2.mp4'\n")
    f.write("file 'scene3.mp4'\n")
    f.write("file 'scene4.mp4'\n")
    f.write("file 'scene5.mp4'\n")

output_path = "output/commercial_promo_aesthetic_clinic_60s.mp4"

print("\n>>> Assembling Final 60s Commercial Video V2...")
cmd_master = [
    ffmpeg, '-y',
    '-f', 'concat', '-safe', '0', '-i', concat_list_file,
    '-i', 'scratch/audio/bgm.wav',
    '-filter_complex',
    "[0:a]volume=1.15[vo];"
    "[1:a]volume=0.22[bgm];"
    "[vo][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]",
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
    '-t', '60.0',
    output_path
]
subprocess.run(cmd_master, check=True)
print(f"\nSUCCESS! Master Commercial Video V2 rendered to {output_path}")
