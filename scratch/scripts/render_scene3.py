import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# Scene 3: 16.0s
# From scene baru.mp4 at 00:01:25 to 00:02:25 (60s) -> setpts=0.26666667*PTS -> 16.0s

filter_complex = (
    "[0:v]trim=start=85:end=145,setpts=PTS-STARTPTS,setpts=0.26666667*PTS,scale=1920:1080[raw_v];"
    # Blur left chat list (x: 0..385) and add dark privacy tint
    "[raw_v]split[orig][for_blur];"
    "[for_blur]crop=385:1080:0:0,boxblur=45:8,drawbox=x=0:y=0:w=385:h=1080:color=black@0.65:t=fill[blurred_sidebar];"
    "[orig][blurred_sidebar]overlay=0:0[v_blurred];"
    # Add Feature Badge overlay
    "[v_blurred][1:v]overlay=0:0[v_badged];"
    # Add Subtitle 5 (0..7.5s) and Subtitle 6 (7.5..16s)
    "[v_badged][2:v]overlay=0:0:enable='between(t,0,7.5)'[v_sub1];"
    "[v_sub1][3:v]overlay=0:0:enable='between(t,7.5,16.0)'[v];"
    # Audio padding
    "[4:a]apad=whole_dur=16.0[a]"
)

cmd = [
    ffmpeg, '-y',
    '-i', 'demo bot wa/scene baru.mp4',                             # 0: video
    '-loop', '1', '-t', '16.0', '-i', 'scratch/visuals/badge_scene3.png', # 1: badge
    '-loop', '1', '-t', '7.5', '-i', 'scratch/visuals/sub_05.png',       # 2: sub 5
    '-loop', '1', '-t', '8.5', '-i', 'scratch/visuals/sub_06.png',       # 3: sub 6
    '-i', 'scratch/audio/vo_scene3.mp3',                                 # 4: audio
    '-filter_complex', filter_complex,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '16.0',
    'scratch/video_segments/scene3.mp4'
]

print("Rendering refined Scene 3...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("Error:", res.stderr)
else:
    print("Scene 3 refined successfully: scratch/video_segments/scene3.mp4")
