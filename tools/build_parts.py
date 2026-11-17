"""
部件圖片生成工具
================
從「香港小學習字表」(https://chineselearning.omghomework.com/) 下載每個字的逐筆筆順圖，
按 decomp.json 指定的筆畫範圍，切出各部件的透明 PNG，並生成 js/data.js。

用法（需要 Python 3 + Pillow）：
    py tools/build_parts.py            # 下載（有快取）並生成
    py tools/build_parts.py --sheet    # 另外輸出檢查用的總覽圖 tools/sheet_*.png

新增字詞：在 decomp.json 加入新字的拆分，再執行一次即可。
"""
import json, os, re, sys, time, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFont, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
CACHE = os.path.join(TOOLS, ".cache")
PARTS = os.path.join(ROOT, "assets", "parts")
CHARS = os.path.join(ROOT, "assets", "chars")
SITE = "https://chineselearning.omghomework.com/search/"
UA = {"User-Agent": "Mozilla/5.0 (component-builder)"}

for d in (CACHE, PARTS, CHARS):
    os.makedirs(d, exist_ok=True)


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def frame_info(ch):
    """回傳 (圖片網址前綴, 總筆畫數)"""
    meta = os.path.join(CACHE, f"{ord(ch):x}.json")
    if os.path.exists(meta):
        return json.load(open(meta, encoding="utf-8"))
    html = get(SITE + urllib.parse.quote(ch)).decode("utf-8", "ignore")
    m = re.search(r'"image":"(https://www\.secmenu\.com/apps/chineselearning-data/s/[^"]+?)-(\d+)\.png"', html)
    if not m:
        raise RuntimeError(f"找不到「{ch}」的筆順圖")
    info = {"prefix": m.group(1), "strokes": int(m.group(2))}
    json.dump(info, open(meta, "w", encoding="utf-8"))
    time.sleep(0.3)
    return info


def frame(ch, info, k):
    p = os.path.join(CACHE, f"{ord(ch):x}-{k}.png")
    if not os.path.exists(p):
        open(p, "wb").write(get(f"{info['prefix']}-{k}.png"))
        time.sleep(0.15)
    im = Image.open(p).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    return Image.alpha_composite(bg, im).convert("L")


def ink(img):
    """黑色筆畫 -> 不透明度 (0-255)。灰色(未寫筆畫 ≈204)及白色 -> 0"""
    return img.point(lambda v: max(0, min(255, int((175 - v) * 255 / 175))))


def parse_ranges(s):
    out = []
    for seg in s.split(","):
        a, _, b = seg.partition("-")
        out.append((int(a), int(b or a)))
    return out


def main():
    extension = "--extension" in sys.argv
    spec_file = "extension-decomp.json" if extension else "decomp.json"
    decomp = json.load(open(os.path.join(TOOLS, spec_file), encoding="utf-8"))
    data = {}
    for ch, spec in decomp.items():
        if ch.startswith("_"):
            continue
        info = frame_info(ch)
        n = info["strokes"]
        frames = {}

        def F(k):
            if k not in frames:
                frames[k] = ink(frame(ch, info, k))
            return frames[k]

        full = F(n)
        size = full.size[0]
        # 全字圖
        black = Image.new("L", full.size, 0)
        img = Image.merge("LA", (black, full))
        bb = full.point(lambda v: 255 if v > 12 else 0).getbbox()
        img.save(os.path.join(CHARS, f"{ord(ch):x}.png"), optimize=True)
        parts = []
        for i, seg in enumerate(spec.split("|")):
            name, _, rng = seg.partition(":")
            alpha = Image.new("L", full.size, 0)
            for a, b in parse_ranges(rng):
                if b > n:
                    raise RuntimeError(f"「{ch}」只有 {n} 畫，但範圍寫了 {b}")
                diff = ImageChops.subtract(F(b), F(a - 1))
                alpha = ImageChops.add(alpha, diff)
            box = alpha.point(lambda v: 255 if v > 12 else 0).getbbox()
            pad = 3
            box = (max(0, box[0] - pad), max(0, box[1] - pad), min(size, box[2] + pad), min(size, box[3] + pad))
            crop = Image.merge("LA", (Image.new("L", alpha.size, 0), alpha)).crop(box)
            fn = f"{ord(ch):x}_{i}.png"
            crop.save(os.path.join(PARTS, fn), optimize=True)
            parts.append({"n": name, "f": fn, "x": box[0], "y": box[1], "w": box[2] - box[0], "h": box[3] - box[1]})
        data[ch] = {"strokes": n, "size": size, "box": bb, "img": f"{ord(ch):x}.png", "parts": parts}
        print(ch, n, [p["n"] for p in parts])

    variable = "EXTENSION_CHAR_DATA" if extension else "CHAR_DATA"
    filename = "extension-data.js" if extension else "data.js"
    js = "// 自動生成：tools/build_parts.py（部件圖片取自香港小學習字表）\nwindow." + variable + " = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    open(os.path.join(ROOT, "js", filename), "w", encoding="utf-8").write(js)

    if "--sheet" in sys.argv:
        make_sheet(data)


def make_sheet(data):
    colors = [(230, 60, 60), (40, 120, 230), (30, 170, 80), (230, 150, 20), (150, 60, 200)]
    cell = 200
    chars = list(data)
    per = 20
    for s in range(0, len(chars), per):
        group = chars[s:s + per]
        cols = 5
        rows = (len(group) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * cell, rows * cell), "white")
        d = ImageDraw.Draw(sheet)
        for idx, ch in enumerate(group):
            info = data[ch]
            canvas = Image.new("RGB", (info["size"], info["size"]), "white")
            for pi, p in enumerate(info["parts"]):
                im = Image.open(os.path.join(PARTS, p["f"]))
                a = im.getchannel("A")
                col = Image.new("RGB", im.size, colors[pi % len(colors)])
                canvas.paste(col, (p["x"], p["y"]), a)
            canvas = canvas.resize((cell - 10, cell - 10))
            ox, oy = (idx % cols) * cell, (idx // cols) * cell
            sheet.paste(canvas, (ox + 5, oy + 5))
            d.rectangle([ox, oy, ox + cell - 1, oy + cell - 1], outline=(200, 200, 200))
        sheet.save(os.path.join(TOOLS, f"sheet_{s // per + 1}.png"))


if __name__ == "__main__":
    main()
