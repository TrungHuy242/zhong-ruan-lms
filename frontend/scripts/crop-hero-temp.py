"""
Crop ảnh banner cũ để dùng tạm cho HeroSection.

Input:  frontend/public/temp-assets/biaa.png (1920×680)
Output: frontend/src/assets/hero-temp.jpg (crop 4:3, loại bỏ chữ mép, desaturate nhẹ nền đỏ)

Bước xử lý:
  1. Crop vùng trung tâm (loại bỏ chữ ở mép trái + chân chứa hotline/Zalo).
  2. Resize về 1024×768 (4:3) để khớp ImagePlaceholder aspectRatio.
  3. Desaturate nhẹ 20% (ImageFilter.Color 0.8) để nền đỏ màu mè bớt chói,
     hợp editorial system §9 (hairline + tối giản).
  4. JPEG quality 82 để dung lượng vừa phải (~100-150KB).
"""

from PIL import Image, ImageEnhance
import os

INPUT = "D:/TrungHuy/ZhoungRuan/zhong-ruan-lms/frontend/public/temp-assets/biaa.png"
OUTPUT_DIR = "D:/TrungHuy/ZhoungRuan/zhong-ruan-lms/frontend/src/assets"
OUTPUT = os.path.join(OUTPUT_DIR, "hero-temp.jpg")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Mở ảnh gốc
img = Image.open(INPUT).convert("RGB")
W, H = img.size
print(f"Original: {W}×{H}")

# 2. Crop vùng trung tâm — width 906, height 680, x offset 507
# Lý do: bỏ chữ ở mép trái, lấy phần người chính giữa + nền đỏ 2 bên
crop_w, crop_h = 906, 680
x_offset = (W - crop_w) // 2  # ≈ 507
cropped = img.crop((x_offset, 0, x_offset + crop_w, crop_h))
print(f"Cropped: {cropped.size}")

# 3. Resize về 1024×768 (4:3) — khớp ImagePlaceholder
target = cropped.resize((1024, 768), Image.LANCZOS)
print(f"Resized: {target.size}")

# 4. Desaturate nhẹ 20% (multiplier 0.8) — nền đỏ bớt chói
target = ImageEnhance.Color(target).enhance(0.8)
print("Desaturated 20%")

# 5. Lưu JPEG quality 82
target.save(OUTPUT, "JPEG", quality=82, optimize=True)
print(f"Saved: {OUTPUT}")
print(f"Size: {os.path.getsize(OUTPUT) / 1024:.1f} KB")
