#!/usr/bin/env python3
"""Draw the PWA icons (original design: two FM 'operator' rings and a modulated wave).
Not M-VAVE's logo. Run: python3 tools/make-icons.py  (needs Pillow)."""
import math, os
from PIL import Image, ImageDraw

BG, FG, DIM = (18, 21, 24, 255), (170, 228, 200, 255), (70, 90, 84, 255)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')

def art(d, size, scale):
    """Draw the motif centred, fitting inside size*scale."""
    c, r = size / 2, size * scale / 2
    w = max(2, round(size * 0.035))
    # carrier + modulator rings
    for dx, col in ((-0.34, DIM), (0.34, FG)):
        cx = c + dx * r
        rr = r * 0.42
        d.ellipse([cx - rr, c - rr, cx + rr, c + rr], outline=col, width=w)
    # frequency-modulated sine across the middle, stamped as round dots for a smooth thick stroke
    pts = []
    n = 900
    for i in range(n + 1):
        t = i / n
        x = c - r * 0.92 + t * r * 1.84
        y = c - r * 0.2 * math.sin(2 * math.pi * 2.5 * t + 1.1 * math.sin(2 * math.pi * 1.5 * t))
        pts.append((x, y))
    h = w * 0.6
    for x, y in pts:
        d.ellipse([x - h, y - h, x + h, y + h], fill=FG)

def render(size, maskable):
    big = size * 4  # supersample for smooth edges
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:  # full bleed; motif inside the 80% safe zone
        d.rectangle([0, 0, big, big], fill=BG)
        art(d, big, 0.62)
    else:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=big * 0.22, fill=BG)
        art(d, big, 0.78)
    return img.resize((size, size), Image.LANCZOS)

os.makedirs(OUT, exist_ok=True)
for s in (192, 512):
    render(s, False).save(os.path.join(OUT, f'icon-{s}.png'), optimize=True)
    render(s, True).save(os.path.join(OUT, f'maskable-{s}.png'), optimize=True)
print('icons written to', os.path.normpath(OUT))
