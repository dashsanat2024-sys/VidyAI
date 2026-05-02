import cv2
import numpy as np

img = cv2.imread('/Users/sanat/AI_Education/vidyai/scratch/student01_q1_full.png', cv2.IMREAD_GRAYSCALE)
H_px, W_px = img.shape
A4_W_MM = 210.0
A4_H_MM = 297.0

# 1 mm in pixels
mm_x = W_px / A4_W_MM
mm_y = H_px / A4_H_MM

# Bubble X centers
centers_mm = [42.0, 71.0, 100.0, 129.0]
bubble_r_mm = 7.0

# Bubble Y center relative to the crop
# The crop was from y_top to y_bot. 
# box_top_mm was HEADER_MM + q_idx * SLOT_MM
# y_top was box_top_mm - PAD_MM
# BUBBLE_FROM_TOP is 24mm from box_top
# So bubble Y center in the crop is (PAD_MM + 24) * mm_y
pad_mm = 3.0
bubble_y_px = int((pad_mm + 24.0) * mm_y)

options = ['A', 'B', 'C', 'D']
for i, cx_mm in enumerate(centers_mm):
    cx_px = int(cx_mm * mm_x)
    r_px = int(bubble_r_mm * mm_x)
    
    # Calculate darkness in a square around the bubble
    x1 = cx_px - r_px
    x2 = cx_px + r_px
    y1 = bubble_y_px - r_px
    y2 = bubble_y_px + r_px
    
    # ensure within bounds
    x1, x2 = max(0, x1), min(W_px, x2)
    y1, y2 = max(0, y1), min(H_px, y2)
    
    region = img[y1:y2, x1:x2]
    
    # Dark pixels are those < 128 (assuming white background)
    dark_pixels = np.sum(region < 128)
    total_pixels = region.size
    dark_ratio = dark_pixels / total_pixels if total_pixels > 0 else 0
    print(f"Option {options[i]}: dark ratio = {dark_ratio:.4f}")
