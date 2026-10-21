import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

cmd = [
    ffmpeg, '-y',
    '-ss', '00:00:10',
    '-i', 'demo bot wa/scene baru 2.mp4',
    '-vframes', '1',
    '-filter_complex', '[0:v]crop=215:in_h:0:0,boxblur=40:8[blurred_side];[0:v][blurred_side]overlay=0:0',
    'scratch/test_blur_scene2_fixed.jpg'
]
subprocess.run(cmd)
print("Blur test scene 2 fixed generated")
