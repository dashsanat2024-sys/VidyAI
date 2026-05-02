import cv2
import numpy as np

def detect_bubbles_deterministic(img_path):
    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    if img is None: return
    
    # ensure it's resized similarly
    MAX_W = 2480
    H, W = img.shape
    if W != MAX_W:
        scale = MAX_W / W
        img = cv2.resize(img, (MAX_W, int(H * scale)), interpolation=cv2.INTER_AREA)
    H_px, W_px = img.shape
    
    A4_W_MM = 210.0
    A4_H_MM = 297.0
    mm_x = W_px / A4_W_MM
    mm_y = H_px / A4_H_MM
    
    centers_mm = [42.0, 71.0, 100.0, 129.0]
    options = ['A', 'B', 'C', 'D']
    bubble_r_mm = 7.0
    
    HEADER_MM = 65.0
    SLOT_MM = 40.0
    pad_mm = 3.0
    
    print(f"--- {img_path} ---")
    for q_idx in range(4):
        # We process the whole image directly using Y offsets
        box_top_mm = HEADER_MM + q_idx * SLOT_MM
        # The crop logic in app.py takes: y_top = (box_top_mm - PAD_MM)
        # But we can just use the absolute Y in the image!
        # Bubble Y is box_top_mm + 24mm
        abs_bubble_y_mm = box_top_mm + 24.0
        bubble_y_px = int(abs_bubble_y_mm * mm_y)
        
        dark_ratios = []
        for i, cx_mm in enumerate(centers_mm):
            cx_px = int(cx_mm * mm_x)
            r_px = int(bubble_r_mm * mm_x)
            
            x1 = max(0, cx_px - r_px)
            x2 = min(W_px, cx_px + r_px)
            y1 = max(0, bubble_y_px - r_px)
            y2 = min(H_px, bubble_y_px + r_px)
            
            region = img[y1:y2, x1:x2]
            
            # Apply threshold to be robust against background color
            _, thresh = cv2.threshold(region, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            
            dark_pixels = np.sum(thresh == 255)
            total_pixels = region.size
            dark_ratio = dark_pixels / total_pixels if total_pixels > 0 else 0
            dark_ratios.append(dark_ratio)
            
        max_idx = np.argmax(dark_ratios)
        max_ratio = dark_ratios[max_idx]
        sorted_ratios = sorted(dark_ratios, reverse=True)
        margin = sorted_ratios[0] - sorted_ratios[1] if len(sorted_ratios) > 1 else 0
        
        ans = options[max_idx] if max_ratio > 0.05 else None
        print(f"Q{q_idx+1}: {ans} (max_ratio={max_ratio:.4f}, margin={margin:.4f})  ratios={[round(r,4) for r in dark_ratios]}")

detect_bubbles_deterministic('/Users/sanat/Downloads/student01.pdf_page1.png')
