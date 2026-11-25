"""生成 App 图标（世界时钟）：深蓝渐变底 + 地球经线 + 时钟指针"""
import os, math
from PIL import Image, ImageDraw, ImageFilter

OUT = r"D:\Documents\world-clock\android\res"
S = 1024

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def radial_bg(size, inner, outer):
    img = Image.new("RGB", (size, size), outer)
    px = img.load()
    cx = cy = size / 2
    maxd = math.hypot(cx, cy)
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx, y - cy) / maxd
            px[x, y] = lerp(inner, outer, min(1.0, d ** 0.85))
    return img

def make_master(size=S):
    # 背景：左上亮蓝 → 右下深底
    bg = Image.new("RGB", (size, size), (15, 17, 21))
    px = bg.load()
    for y in range(size):
        for x in range(size):
            t = (x / size * 0.45 + y / size * 0.55)
            t = min(1.0, max(0.0, t))
            if t < 0.5:
                c = lerp((38, 62, 110), (24, 32, 48), t / 0.5)
            else:
                c = lerp((24, 32, 48), (14, 17, 23), (t - 0.5) / 0.5)
            px[x, y] = c

    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    cx = cy = size / 2
    R = size * 0.335
    W = int(size * 0.030)

    # 外圈光晕
    for i in range(int(size * 0.028), 0, -2):
        a = int(60 * (1 - i / (size * 0.028)))
        d.ellipse([cx - R - i, cy - R - i, cx + R + i, cy + R + i],
                  outline=(79, 140, 255, a), width=2)

    # 地球轮廓
    d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=(226, 236, 255, 255), width=W)

    # 经线（椭圆）
    for k in (0.34, 0.68):
        rx = R * k
        d.ellipse([cx - rx, cy - R, cx + rx, cy + R],
                  outline=(140, 180, 255, 170), width=max(3, int(W * 0.55)))
    # 赤道 + 两条纬线
    d.line([cx - R, cy, cx + R, cy], fill=(140, 180, 255, 170), width=max(3, int(W * 0.55)))
    for k in (-0.5, 0.5):
        yy = cy + R * k
        half = math.sqrt(max(0.0, R * R - (R * k) ** 2))
        d.line([cx - half, yy, cx + half, yy], fill=(120, 160, 235, 110), width=max(2, int(W * 0.45)))

    # 时钟指针（中心 12 点方向偏 1 点位）
    hand1 = math.radians(-58)
    hand2 = math.radians(52)
    L1 = R * 0.60
    L2 = R * 0.80
    d.line([cx, cy, cx + L1 * math.cos(hand1), cy + L1 * math.sin(hand1)],
           fill=(255, 255, 255, 255), width=int(W * 1.45))
    d.line([cx, cy, cx + L2 * math.cos(hand2), cy + L2 * math.sin(hand2)],
           fill=(79, 200, 255, 255), width=int(W * 1.0))

    # 中心点
    r0 = size * 0.020
    d.ellipse([cx - r0, cy - r0, cx + r0, cy + r0], fill=(255, 255, 255, 255))
    r1 = size * 0.009
    d.ellipse([cx - r1, cy - r1, cx + r1, cy + r1], fill=(79, 140, 255, 255))

    # 高光
    hl = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hd.ellipse([cx - R * 1.5, cy - R * 1.9, cx + R * 1.5, cy + R * 0.6],
               fill=(255, 255, 255, 26))
    hl = hl.filter(ImageFilter.GaussianBlur(size * 0.04))
    layer = Image.alpha_composite(layer, hl)

    out = Image.alpha_composite(bg.convert("RGBA"), layer)
    return out

def rounded(img, radius_ratio=0.22):
    size = img.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1],
                                           radius=int(size * radius_ratio), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out

def circle(img):
    size = img.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out

master = make_master(S)
sq = rounded(master, 0.235)
rd = circle(master)

DENS = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for name, px in DENS.items():
    folder = os.path.join(OUT, "mipmap-" + name)
    os.makedirs(folder, exist_ok=True)
    sq.resize((px, px), Image.LANCZOS).save(os.path.join(folder, "ic_launcher.png"))
    rd.resize((px, px), Image.LANCZOS).save(os.path.join(folder, "ic_launcher_round.png"))

# 大图用于分享 / 商店 / PWA
os.makedirs(os.path.join(OUT, "..", "icon"), exist_ok=True)
ICON = os.path.join(OUT, "..", "icon")
sq.resize((512, 512), Image.LANCZOS).save(os.path.join(ICON, "icon-512.png"))
sq.resize((192, 192), Image.LANCZOS).save(os.path.join(ICON, "icon-192.png"))
rd.resize((180, 180), Image.LANCZOS).save(os.path.join(ICON, "apple-touch-icon.png"))
master.resize((1024, 1024), Image.LANCZOS).save(os.path.join(ICON, "icon-1024.png"))

# maskable：安全区内缩 20%，四周补底色
pad = int(512 * 0.10)
inner = master.resize((512 - pad * 2, 512 - pad * 2), Image.LANCZOS)
bgc = Image.new("RGBA", (512, 512), (15, 17, 21, 255))
bgc.paste(inner, (pad, pad), inner)
bgc.save(os.path.join(ICON, "icon-512-maskable.png"))

print("icons done", sorted(os.listdir(ICON)))
