import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

cmd = [
    ffmpeg, '-y',
    '-ss', '00:00:10',
    '-i', 'demo bot wa/scene baru 2.mp4',
    '-vframes', '1',
    '-filter_complex', '[0:v]crop=190:in_h:0:0,boxblur=25:5[blurred_side];[0:v][blurred_side]overlay=0:0',
    'scratch/test_blur_scene2.jpg'
]
subprocess.run(cmd)
print("Blur test scene 2 generated")
