from pathlib import Path
from PIL import Image

root = Path('/home/ubuntu/workout-tracker-android/assets/images')
names = [
    'icon.png',
    'splash-icon.png',
    'favicon.png',
    'android-icon-foreground.png',
    'android-icon-background.png',
    'android-icon-monochrome.png',
]
for name in names:
    path = root / name
    image = Image.open(path).convert('RGB')
    image.thumbnail((768, 768), Image.Resampling.LANCZOS)
    image.save(path, format='PNG', optimize=True, compress_level=9)
    print(name, path.stat().st_size)
