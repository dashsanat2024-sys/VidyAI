import cv2
import numpy as np

def test_opencv_bubbles(img_path):
    image = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    
    # Resize to MAX_W = 2480
    MAX_W = 2480
    H, W = image.shape
    if W != MAX_W:
        scale = MAX_W / W
        image = cv2.resize(image, (MAX_W, int(H * scale)), interpolation=cv2.INTER_AREA)

    gray = image
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bubbles = []
    img_height, img_width = gray.shape
    min_area = (img_width * img_height) // 2000
    max_area = (img_width * img_height) // 50
    
    print(f"img_height={img_height}, img_width={img_width}, min_area={min_area}, max_area={max_area}")
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area or area > max_area:
            continue
            
        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = w / float(h) if h > 0 else 0
        
        if 0.7 <= aspect_ratio <= 1.3:
            bubbles.append({
                'x': x, 'y': y, 'w': w, 'h': h,
                'area': area, 'center_y': y + h/2
            })
            print(f"Bubble: y={y}, area={area}, aspect={aspect_ratio:.2f}")

    if not bubbles:
        print("No bubbles detected")
        return
        
    bubbles_sorted = sorted(bubbles, key=lambda b: b['center_y'])
    rows = []
    current_row = [bubbles_sorted[0]]
    y_tolerance = img_height // 40
    
    for bubble in bubbles_sorted[1:]:
        if abs(bubble['center_y'] - current_row[-1]['center_y']) <= y_tolerance:
            current_row.append(bubble)
        else:
            rows.append(current_row)
            current_row = [bubble]
    rows.append(current_row)
    
    for i, r in enumerate(rows):
        print(f"Row {i+1}: {len(r)} bubbles")

test_opencv_bubbles('/Users/sanat/Downloads/student01.pdf_page1.png')
