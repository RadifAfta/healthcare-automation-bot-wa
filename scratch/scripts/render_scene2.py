import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# Scene 2: 14.0s total
# Refined composition:
# - Subclip 1: start=28, end=38 (10s) -> setpts=0.6*PTS -> 6.0s (Treatment price list)
# - Subclip 2: start=58, end=82 (24s) -> setpts=0.33333333*PTS -> 8.0s (AI skin consultation)
# - Sidebar blur + dark frost tint (boxblur=45:8 + drawbox black@0.65)
# - Feature Badge overlay
# - Subtitles: sub_03 (0..6.5s), sub_04 (6.5..14s)
# - Audio padded to 14.0s

filter_complex = (
    "[0:v]trim=start=28:end=38,setpts=PTS-STARTPTS,setpts=0.6*PTS,scale=1920:1080[v1];"
    "[1:v]trim=start=58:end=82,setpts=PTS-STARTPTS,setpts=0.33333333*PTS,scale=1920:1080[v2];"
    "[v1][v2]concat=n=2:v=1:a=0[raw_concat];"
    # Blur left chat list (x: 0..385) and add dark privacy tint
    "[raw_concat]split[orig][for_blur];"
    "[for_blur]crop=385:1080:0:0,boxblur=45:8,drawbox=x=0:y=0:w=385:h=1080:color=black@0.65:t=fill[blurred_sidebar];"
    "[orig][blurred_sidebar]overlay=0:0[v_blurred];"
    # Add Feature Badge overlay
    "[v_blurred][2:v]overlay=0:0[v_badged];"
    # Subtitles
    "[v_badged][3:v]overlay=0:0:enable='between(t,0,6.5)'[v_sub1];"
    "[v_sub1][4:v]overlay=0:0:enable='between(t,6.5,14.0)'[v];"
    "[5:a]apad=whole_dur=14.0[a]"
)

cmd = [
    ffmpeg, '-y',
    '-i', 'demo bot wa/scene baru.mp4',                             # 0: subclip 1
    '-i', 'demo bot wa/scene baru.mp4',                             # 1: subclip 2
    '-loop', '1', '-t', '14.0', '-i', 'scratch/visuals/badge_scene2.png', # 2: badge
    '-loop', '1', '-t', '6.5', '-i', 'scratch/visuals/sub_03.png',        # 3: sub 3
    '-loop', '1', '-t', '7.5', '-i', 'scratch/visuals/sub_04.png',        # 4: sub 4
    '-i', 'scratch/audio/vo_scene2.mp3',                                  # 5: audio
    '-filter_complex', filter_complex,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '14.0',
    'scratch/video_segments/scene2.mp4'
]

print("Rendering refined Scene 2...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("Error:", res.stderr)
else:
    print("Scene 2 refined successfully: scratch/video_segments/scene2.mp4")
