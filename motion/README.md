# Services motion clips

Remotion source for the looping clips in the Services section (Enterprise Systems and Applied AI pillars).
Each composition id maps to `public/videos/services/<id with _>.mp4` and its poster `public/images/services/<group>/<id>.webp`.

```bash
cd motion && npm install
npx remotion studio                # preview / edit
npx remotion render src/index.ts systems-3 out/systems_3.mp4 --codec=h264 --crf=16
```

Web encodes (from the master render):

```bash
ffmpeg -i out/systems_3.mp4 -an -vf scale=1600:900:flags=lanczos -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart ../public/videos/services/systems_3.mp4
ffmpeg -i out/systems_3.mp4 -an -vf scale=960:540:flags=lanczos -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart ../public/videos/services/systems_3_mobile.mp4
```
