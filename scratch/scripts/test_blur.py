import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# In scene baru.mp4 (1918x1078):
# Left sidebar is x: 0..382.
# We can use ffmpeg filter_complex:
# [0:v]crop=382:1078:0:0,boxblur=25:5[blur];[0:v][blur]overlay=0:0[v]
cmd = [
    ffmpeg, '-y',
    '-ss', '00:00:50',
    '-i', 'demo bot wa/scene baru.mp4',
    '-vframes', '1',
    '-filter_complex', '[0:v]crop=382:in_h:0:0,boxblur=25:5[blurred_side];[0:v][blurred_side]overlay=0:0',
    'scratch/test_blur_scene1.jpg'
]
subprocess.run(cmd)
print("Blur test generated")
