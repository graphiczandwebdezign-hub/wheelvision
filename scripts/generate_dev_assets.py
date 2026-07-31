#!/usr/bin/env python3
"""Generate development vehicle assets aligned to the authored metadata.

Produces the Chapter-6 package images for the Toyota Hilux 2025 package:
  vehicle.webp  - side-profile body with transparent wheel-arch cutouts and
                  transparent background (wheels show through from underneath)
  shadow.webp   - soft ground shadows under both wheel positions
  mask.webp     - inner wheel-arch shading (arch depth above the wheels)

The renderer is metadata-driven, so these assets are drawn exactly at the
coordinates declared in vehicles/toyota/hilux/2025/metadata.json
(front 840,1375 / rear 3090,1375, wheel diameter 455 on a 3600x2400 canvas).
Production assets will arrive through the admin asset pipeline (Sprint 9);
these exist so the engine renders end-to-end in development.

Usage:  python3 scripts/generate_dev_assets.py   (or: npm run assets:generate)
Requires: Pillow (pip install pillow)
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PACKAGE_DIR = ROOT / "vehicles" / "toyota" / "hilux" / "2025"
OUTPUT_DIR = ROOT / "public" / "vehicles" / "toyota" / "hilux" / "2025"

CANVAS_W, CANVAS_H = 3600, 2400
SS = 2  # supersample factor for anti-aliased edges


def load_metadata() -> dict:
    with open(PACKAGE_DIR / "metadata.json", "r", encoding="utf8") as fh:
        return json.load(fh)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def paint_gradient(draw: ImageDraw.ImageDraw, box: tuple, top: tuple, bottom: tuple) -> None:
    """Vertical two-stop body-paint gradient clipped to the silhouette layer."""
    x0, y0, x1, y1 = box
    height = max(1, int(y1 - y0))
    for i in range(height):
        t = i / max(1, height - 1)
        # highlight sweep near the shoulder line for a metallic feel
        sweep = math.exp(-((t - 0.32) ** 2) / 0.004) * 26
        colour = tuple(
            min(255, int(round(lerp(top[c], bottom[c], t) + sweep))) for c in range(3)
        )
        draw.line([(x0, y0 + i), (x1, y0 + i)], fill=colour + (255,))


def silhouette_mask(size: tuple, meta: dict) -> Image.Image:
    """1-bit vehicle silhouette (paint area) before arch cutouts.

    Nose points left (front wheel at x=840, rear at x=3090), per a classic
    double-cab pickup proportion set derived from the wheel positions.
    """
    w, h = size
    fx, fy = meta["frontWheel"]["x"], meta["frontWheel"]["y"]
    rx, ry = meta["rearWheel"]["x"], meta["rearWheel"]["y"]
    wheelbase = rx - fx

    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)

    nose_x = fx - wheelbase * 0.16
    tail_x = rx + wheelbase * 0.17
    ground = fy + meta["wheelDiameter"] * 0.55
    rocker = fy + 60
    shoulder = fy - 250
    bonnet = fy - 430
    roofline = fy - 780

    # Lower body: rocker panel box between nose and tail.
    d.rounded_rectangle(
        [nose_x, shoulder, tail_x, ground - 30], radius=60, fill=255
    )

    # Bonnet / front clip (slopes down toward the nose).
    d.polygon(
        [
            (nose_x, shoulder),
            (nose_x + 30, rocker),
            (fx - wheelbase * 0.06, bonnet),
            (fx + wheelbase * 0.10, bonnet - 25),
            (fx + wheelbase * 0.16, shoulder),
        ],
        fill=255,
    )

    # Cab (double cab): windscreen rake, flat roof, near-vertical rear screen.
    cab_front = fx + wheelbase * 0.16
    cab_back = fx + wheelbase * 0.62
    d.polygon(
        [
            (cab_front, shoulder + 10),
            (cab_front + wheelbase * 0.075, roofline),
            (cab_back - wheelbase * 0.06, roofline + 14),
            (cab_back, shoulder + 10),
        ],
        fill=255,
    )
    # Roof cap rounding.
    d.rounded_rectangle(
        [cab_front + wheelbase * 0.075, roofline - 28, cab_back - wheelbase * 0.055, roofline + 40],
        radius=42,
        fill=255,
    )

    # Bed.
    bed_front = cab_back + wheelbase * 0.035
    bed_top = fy - 320
    d.rounded_rectangle([bed_front, bed_top, tail_x, shoulder + 120], radius=36, fill=255)

    return mask


def apply_arch_cutouts(mask: Image.Image, meta: dict, arch_radius: int) -> Image.Image:
    """Punch transparent wheel arches out of the silhouette."""
    d = ImageDraw.Draw(mask)
    for wheel in (meta["frontWheel"], meta["rearWheel"]):
        cx, cy = wheel["x"], wheel["y"]
        d.ellipse(
            [cx - arch_radius, cy - arch_radius, cx + arch_radius, cy + arch_radius],
            fill=0,
        )
    return mask


def build_body(meta: dict) -> Image.Image:
    w, h = CANVAS_W * SS, CANVAS_H * SS
    meta_ss = json.loads(json.dumps(meta))
    meta_ss["frontWheel"] = {"x": meta["frontWheel"]["x"] * SS, "y": meta["frontWheel"]["y"] * SS}
    meta_ss["rearWheel"] = {"x": meta["rearWheel"]["x"] * SS, "y": meta["rearWheel"]["y"] * SS}
    meta_ss["wheelDiameter"] = meta["wheelDiameter"] * SS

    arch_radius = int(meta_ss["wheelDiameter"] * 0.535)

    silhouette = apply_arch_cutouts(silhouette_mask((w, h), meta_ss), meta_ss, arch_radius)

    paint = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gradient_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gradient_layer)
    paint_gradient(gd, (0, int(h * 0.22), w, int(h * 0.68)), (226, 230, 236), (146, 155, 166))
    paint.paste(gradient_layer, (0, 0), silhouette)

    d = ImageDraw.Draw(paint)

    # Darker rocker/shadow zone along the bottom of the silhouette.
    shadow_zone = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    zd = ImageDraw.Draw(shadow_zone)
    fx, fy = meta_ss["frontWheel"]["x"], meta_ss["frontWheel"]["y"]
    rx = meta_ss["rearWheel"]["x"]
    wheelbase = rx - fx
    zd.rectangle([fx - wheelbase * 0.142, fy + 55, rx + wheelbase * 0.150, fy + 118], fill=(60, 68, 78, 235))
    zd.ellipse([fx - wheelbase * 0.16, fy + 55, fx - wheelbase * 0.124, fy + 140], fill=(60, 68, 78, 235))
    paint.alpha_composite(Image.composite(shadow_zone, Image.new("RGBA", (w, h)), silhouette))

    # Glass: front + rear cab windows (reads as glazing, not paint).
    glass = (28, 38, 52, 255)
    roofline = fy - 780 * SS / SS  # keep proportional maths readable
    roofline = fy - 780
    cab_front = fx + wheelbase * 0.16
    cab_back = fx + wheelbase * 0.62
    d.polygon(
        [
            (cab_front + 120, fy - 235),
            (cab_front + 120 + wheelbase * 0.062, roofline + 105),
            (cab_front + 120 + wheelbase * 0.155, roofline + 112),
            (cab_front + 120 + wheelbase * 0.155, fy - 235),
        ],
        fill=glass,
    )
    d.polygon(
        [
            (cab_front + 120 + wheelbase * 0.185, fy - 235),
            (cab_front + 120 + wheelbase * 0.185, roofline + 122),
            (cab_back - wheelbase * 0.075, roofline + 132),
            (cab_back - wheelbase * 0.058, fy - 235),
        ],
        fill=glass,
    )
    # B-pillar.
    d.rectangle(
        [cab_front + 120 + wheelbase * 0.163, roofline + 105, cab_front + 120 + wheelbase * 0.178, fy - 228],
        fill=(84, 92, 102, 255),
    )

    # Door shut lines.
    line = (104, 112, 122, 255)
    d.line([(cab_front + 120 + wheelbase * 0.17, fy - 220), (cab_front + 120 + wheelbase * 0.17, fy + 30)], fill=line, width=10)
    d.line([(cab_back - wheelbase * 0.02, fy - 220), (cab_back - wheelbase * 0.02, fy + 30)], fill=line, width=10)

    # Bed rail line + tailgate seam.
    bed_front = cab_back + wheelbase * 0.035
    rx = meta_ss["rearWheel"]["x"]
    d.line([(bed_front + 30, fy - 300), (rx + wheelbase * 0.148, fy - 300)], fill=(120, 128, 138, 255), width=12)
    d.line([(rx + wheelbase * 0.125, fy - 290), (rx + wheelbase * 0.125, fy + 60)], fill=line, width=10)

    # Front headlamp strip + grille + bumper hint.
    nose_x = fx - wheelbase * 0.16
    d.rounded_rectangle([nose_x + 26, fy - 265, nose_x + 150, fy - 205], radius=18, fill=(240, 244, 250, 255))
    d.rounded_rectangle([nose_x + 10, fy - 60, nose_x + 190, fy + 40], radius=22, fill=(74, 82, 92, 255))

    # Mirror.
    d.rounded_rectangle([cab_front + 60, fy - 330, cab_front + 180, fy - 250], radius=20, fill=(70, 78, 88, 255))

    # Door handles.
    d.rounded_rectangle([cab_front + 120 + wheelbase * 0.10, fy - 160, cab_front + 120 + wheelbase * 0.10 + 130, fy - 132], radius=12, fill=(96, 104, 114, 255))
    d.rounded_rectangle([cab_front + 120 + wheelbase * 0.22, fy - 160, cab_front + 120 + wheelbase * 0.22 + 130, fy - 132], radius=12, fill=(96, 104, 114, 255))

    # Arch lip: darker ring tracing the arch cutout for depth (outside only).
    arch_ring = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rd = ImageDraw.Draw(arch_ring)
    lip_outer = arch_radius + 26
    for cx, cy in (
        (meta_ss["frontWheel"]["x"], meta_ss["frontWheel"]["y"]),
        (meta_ss["rearWheel"]["x"], meta_ss["rearWheel"]["y"]),
    ):
        rd.ellipse([cx - lip_outer, cy - lip_outer, cx + lip_outer, cy + lip_outer], outline=(70, 77, 87, 255), width=26)
    # Keep only the parts of the ring that sit on bodywork.
    on_body = Image.composite(arch_ring, Image.new("RGBA", (w, h)), silhouette)
    paint.alpha_composite(on_body)

    # Clip everything to the silhouette (with arch holes) and downscale.
    paint.putalpha(silhouette)
    return paint.resize((CANVAS_W, CANVAS_H), Image.LANCZOS)


def build_shadow(meta: dict) -> Image.Image:
    w, h = CANVAS_W * SS, CANVAS_H * SS
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = meta["wheelDiameter"] / 2 * SS
    cy = meta["frontWheel"]["y"] * SS + r * 0.96
    fx = meta["frontWheel"]["x"] * SS
    rx = meta["rearWheel"]["x"] * SS

    # Long soft band beneath the body + denser pads under each wheel.
    d.ellipse([fx - r * 1.1, cy - r * 0.30, rx + r * 1.25, cy + r * 0.42], fill=(2, 6, 23, 105))
    for cx in (fx, rx):
        d.ellipse([cx - r * 1.28, cy - r * 0.34, cx + r * 1.28, cy + r * 0.36], fill=(2, 6, 23, 150))

    img = img.filter(ImageFilter.GaussianBlur(radius=28 * SS))
    return img.resize((CANVAS_W, CANVAS_H), Image.LANCZOS)


def build_mask(meta: dict) -> Image.Image:
    """Inner wheel-arch shading: a soft dark crescent above each wheel."""
    w, h = CANVAS_W * SS, CANVAS_H * SS
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    arch_radius = meta["wheelDiameter"] * 0.535 * SS
    lip = arch_radius * 0.72

    for wheel in (meta["frontWheel"], meta["rearWheel"]):
        cx, cy = wheel["x"] * SS, wheel["y"] * SS
        # Concentric translucent bands forming a gradient crescent.
        for step in range(14):
            t = step / 13
            radius = arch_radius - t * lip
            alpha = int(14 + t * 78)
            d.ellipse(
                [cx - radius, cy - radius * 1.02, cx + radius, cy + radius * 0.86],
                fill=(2, 6, 23, alpha),
            )

    img = img.filter(ImageFilter.GaussianBlur(radius=14 * SS))
    return img.resize((CANVAS_W, CANVAS_H), Image.LANCZOS)


def save_webp(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=92, method=6, exact=False)
    size_kb = path.stat().st_size / 1024
    print(f"wrote {path.relative_to(ROOT)} ({size_kb:.0f} KiB, {img.size[0]}x{img.size[1]}, RGBA)")


def main() -> None:
    meta = load_metadata()
    save_webp(build_body(meta), OUTPUT_DIR / "vehicle.webp")
    save_webp(build_shadow(meta), OUTPUT_DIR / "shadow.webp")
    save_webp(build_mask(meta), OUTPUT_DIR / "mask.webp")


if __name__ == "__main__":
    main()
