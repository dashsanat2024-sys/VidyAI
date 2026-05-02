import app
import fitz
from PIL import Image
import os

pdf_path = "/Users/sanat/Downloads/student01.pdf"
doc = fitz.open(pdf_path)
page = doc[0]
pix = page.get_pixmap(dpi=300)
img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

MAX_W = 2480
if img.width < MAX_W:
    scale = MAX_W / img.width
    img = img.resize((MAX_W, int(img.height * scale)), Image.LANCZOS)
elif img.width > MAX_W:
    scale = MAX_W / img.width
    img = img.resize((MAX_W, int(img.height * scale)), Image.LANCZOS)

W_px, H_px = img.width, img.height
A4_H_MM = 297.0
HEADER_MM = 65.0
BOX_H_MM = 36.0
SLOT_MM = 40.0
PAD_MM = 3.0

print(f"W_px={W_px}, H_px={H_px}")

for q_idx in range(4):
    box_top_mm = HEADER_MM + q_idx * SLOT_MM
    y_top = int(H_px * (box_top_mm - PAD_MM) / A4_H_MM)
    y_bot = int(H_px * (box_top_mm + BOX_H_MM + PAD_MM) / A4_H_MM)
    y_top = max(0, min(y_top, H_px - 10))
    y_bot = max(y_top + 10, min(y_bot, H_px))
    
    split_x = int(W_px * 0.72)
    box_crop = img.crop((split_x, y_top, W_px, y_bot))
    box_crop.save(f"scratch/student01_q{q_idx+1}_box.png")
    
    full_q_crop = img.crop((0, y_top, W_px, y_bot))
    full_q_crop.save(f"scratch/student01_q{q_idx+1}_full.png")

print("Saved crops to scratch directory.")
