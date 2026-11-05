#!/usr/bin/env python3
"""KebunKu — jana aset imej untuk Android / Play Store (v3.5).

PNG dan JAR tidak boleh dihantar melalui snapshot push GitHub, jadi aset
binari TIDAK di-commit dalam repo ini. Sebaliknya, skrip ini menjana semula
aset daripada logo SVG sedia ada (www/assets/logo.svg) dengan PIL sahaja
(tiada rangkaian, tiada kebergantungan luar):

  assets/icon.png        — ikon pelancar 1024x1024
  assets/splash.png      — splash 2732x2732 atas latar krim
  <play-assets>/feature-graphic.png — grafik ciri Play Store 1024x500

Skrip ini juga dijalankan oleh build GitHub Actions SEBELUM
`npx @capacitor/assets generate`, supaya ikon/splash sentiasa dijana
daripada logo yang sama.

Logo dilukis semula dengan primitif PIL yang menghampiri logo.svg:
latar segi empat tepat bersudut bulat warna krim + sempadan hijau,
daun hijau (lengkung Bezier kubik), urat daun emas, dan baris ladang hijau.

Penggunaan:
  python3 scripts/make-assets.py [--repo DIR] [--play-assets DIR]
"""
import argparse
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HIJAU = (30, 77, 43)        # #1E4D2B
HIJAU_GELAP = (22, 58, 34)  # #163A22
KRIM = (247, 244, 236)      # #F7F4EC
EMAS = (192, 138, 26)       # #C08A1A
EMAS_TERANG = (231, 196, 106)  # emas yang lebih terang, untuk teks atas hijau
PUTIH = (255, 255, 255)


def bezier(p0, p1, p2, p3, n=40):
    """Sampel lengkung Bezier kubik -> senarai titik (x, y)."""
    pts = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        x = (mt ** 3) * p0[0] + 3 * (mt ** 2) * t * p1[0] + 3 * mt * (t ** 2) * p2[0] + (t ** 3) * p3[0]
        y = (mt ** 3) * p0[1] + 3 * (mt ** 2) * t * p1[1] + 3 * mt * (t ** 2) * p2[1] + (t ** 3) * p3[1]
        pts.append((x, y))
    return pts


def lukis_logo(draw, ox, oy, s):
    """Lukis logo KebunKu (asal viewBox 96x96) pada draw, offset (ox, oy),
    skala s (saiz piksel = 96 * s)."""
    def P(x, y):
        return (ox + x * s, oy + y * s)

    # Latar: segi empat bersudut bulat warna krim + sempadan hijau.
    draw.rounded_rectangle([P(2, 2), P(94, 94)], radius=22 * s,
                           fill=KRIM, outline=HIJAU, width=max(1, int(2 * s)))
    # Daun: dua lengkung Bezier kubik (mengikut path dalam logo.svg).
    daun = bezier((48, 14), (70, 24), (78, 44), (48, 76))
    daun += bezier((48, 76), (18, 44), (26, 24), (48, 14))
    draw.polygon([P(x, y) for x, y in daun], fill=HIJAU)
    # Urat daun emas (garis + hujung bulat).
    for (x1, y1, x2, y2, w) in [(48, 22, 48, 68, 3), (48, 40, 60, 32, 2.5), (48, 50, 36, 42, 2.5)]:
        lw = max(1, int(w * s))
        draw.line([P(x1, y1), P(x2, y2)], fill=EMAS, width=lw)
        r = lw / 2
        for (cx, cy) in [(x1, y1), (x2, y2)]:
            px, py = P(cx, cy)
            draw.ellipse([px - r, py - r, px + r, py + r], fill=EMAS)
    # Baris ladang di bawah daun.
    for (x1, y1, x2, y2) in [(22, 80, 34, 74), (38, 80, 48, 73), (58, 80, 68, 74), (74, 80, 82, 76)]:
        lw = max(1, int(3 * s))
        draw.line([P(x1, y1), P(x2, y2)], fill=HIJAU, width=lw)
        r = lw / 2
        for (cx, cy) in [(x1, y1), (x2, y2)]:
            px, py = P(cx, cy)
            draw.ellipse([px - r, py - r, px + r, py + r], fill=HIJAU)


def cari_font(bold=False, saiz=40):
    """Cari fon TrueType sistem (DejaVu biasa ada di Linux/CI); jika tiada,
    guna fon lalai PIL."""
    calon = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in calon:
        try:
            return ImageFont.truetype(path, saiz)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def buat_icon(laluan):
    img = Image.new("RGB", (1024, 1024), KRIM)
    d = ImageDraw.Draw(img)
    lukis_logo(d, 0, 0, 1024 / 96)
    img.save(laluan, "PNG")
    return img.size


def buat_splash(laluan):
    img = Image.new("RGB", (2732, 2732), KRIM)
    d = ImageDraw.Draw(img)
    saiz_logo = 1024
    lukis_logo(d, (2732 - saiz_logo) // 2, (2732 - saiz_logo) // 2, saiz_logo / 96)
    img.save(laluan, "PNG")
    return img.size


def buat_feature_graphic(laluan):
    img = Image.new("RGB", (1024, 500), HIJAU_GELAP)
    d = ImageDraw.Draw(img)
    saiz_logo = 300
    lukis_logo(d, 70, (500 - saiz_logo) // 2, saiz_logo / 96)
    # Garis emas pemisah menegak.
    d.rectangle([400, 110, 406, 390], fill=EMAS)
    # Teks: "KebunKu" + tagline baharu (v3.6) — dua baris supaya muat.
    fon_judul = cari_font(bold=True, saiz=96)
    fon_tag = cari_font(bold=False, saiz=36)
    d.text((440, 140), "KebunKu", font=fon_judul, fill=KRIM)
    d.text((440, 260), "Semua Rekod Kebun,", font=fon_tag, fill=KRIM)
    d.text((440, 310), "Dalam Satu Tempat.", font=fon_tag, fill=EMAS_TERANG)
    img.save(laluan, "PNG")
    return img.size


def main(argv=None):
    ap = argparse.ArgumentParser(description="Jana aset imej KebunKu (ikon, splash, feature graphic).")
    ap.add_argument("--repo", default=None, help="Folder root repo (lalai: folder induk scripts/)")
    ap.add_argument("--play-assets", default=None,
                    help="Folder output grafik Play Store (lalai: <workspace>/kebunku-play-assets)")
    args = ap.parse_args(argv)

    repo = Path(args.repo).resolve() if args.repo else Path(__file__).resolve().parent.parent
    assets = repo / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    if args.play_assets:
        play_dir = Path(args.play_assets).resolve()
    else:
        # Repo di ~/workspace/kebunku -> grafik di ~/workspace/kebunku-play-assets
        play_dir = repo.parent / "kebunku-play-assets"
    play_dir.mkdir(parents=True, exist_ok=True)

    hasil = []
    hasil.append(("assets/icon.png", buat_icon(assets / "icon.png")))
    hasil.append(("assets/splash.png", buat_splash(assets / "splash.png")))
    hasil.append((str(play_dir / "feature-graphic.png"), buat_feature_graphic(play_dir / "feature-graphic.png")))

    for nama, (w, h) in hasil:
        print(f"{nama}: {w}x{h}")
    print("Siap. assets/icon.png dan assets/splash.png TIDAK di-commit (binari) —")
    print("ia dijana semula semasa build (GitHub Actions menjalankan skrip ini")
    print("sebelum `npx @capacitor/assets generate`).")
    print("feature-graphic.png dimuat naik manual dalam Play Console.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
