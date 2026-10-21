import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# Scene 4: 12.0s
# From scene baru 2.mp4 at 00:00:04 to 00:00:19 (15s) -> setpts=0.8*PTS -> 12.0s

filter_complex = (
    "[0:v]trim=start=4:end=19,setpts=PTS-STARTPTS,setpts=0.8*PTS,scale=1920:1080[raw_v];"
    # Blur left chat list of WhatsApp (x: 0..240) and add dark privacy tint
    "[raw_v]split[orig][for_blur];"
    "[for_blur]crop=240:1080:0:0,boxblur=50:10,drawbox=x=0:y=0:w=240:h=1080:color=black@0.75:t=fill[blurred_sidebar];"
    "[orig][blurred_sidebar]overlay=0:0[v_blurred];"
    # Add Feature Badge overlay
    "[v_blurred][1:v]overlay=0:0[v_badged];"
    # Add Subtitle 7 (0..6.0s) and Subtitle 8 (6.0..12s)
    "[v_badged][2:v]overlay=0:0:enable='between(t,0,6.0)'[v_sub1];"
    "[v_sub1][3:v]overlay=0:0:enable='between(t,6.0,12.0)'[v];"
    # Audio padding
    "[4:a]apad=whole_dur=12.0[a]"
)

cmd = [
    ffmpeg, '-y',
    '-i', 'demo bot wa/scene baru 2.mp4',                           # 0: video
    '-loop', '1', '-t', '12.0', '-i', 'scratch/visuals/badge_scene4.png', # 1: badge
    '-loop', '1', '-t', '6.0', '-i', 'scratch/visuals/sub_07.png',        # 2: sub 7
    '-loop', '1', '-t', '6.0', '-i', 'scratch/visuals/sub_08.png',        # 3: sub 8
    '-i', 'scratch/audio/vo_scene4.mp3',                                  # 4: audio
    '-filter_complex', filter_complex,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '12.0',
    'scratch/video_segments/scene4.mp4'
]

print("Rendering refined Scene 4...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("Error:", res.stderr)
else:
    print("Scene 4 refined successfully: scratch/video_segments/scene4.mp4")
