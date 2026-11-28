# Promo video pipeline (HNK walkthrough)
1. `node run.js` — captures gameplay clips frame by frame (virtual clock, 1080×1920) into `clips/`.
2. `python3 music.py` — synthesizes the original soundtrack (`music.wav`) from `timeline.json`.
3. `node render.js` — renders the motion-graphics edit (`comp.html`) frame by frame into `frames/`.
4. `ffmpeg -framerate 30 -i frames/%05d.jpg -i music.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest HNK_walkthrough.mp4`
Run with `NODE_PATH=$(npm root -g)`; the scripts expect the game at /home/user/GTA---FILIPINO-VER.
