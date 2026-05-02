import io
from PIL import Image
from google.cloud import vision
import os

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/Users/sanat/.config/gcloud/application_default_credentials.json" # assuming it's available or it will use default

img_path = "/Users/sanat/AI_Education/vidyai/scratch/student01_q4_full.png"
img = Image.open(img_path)
W_px, H_px = img.width, img.height

# test crop from 78%
split_x = int(W_px * 0.78)
box_crop = img.crop((split_x, 0, W_px, H_px))
box_crop.save('/Users/sanat/AI_Education/vidyai/scratch/test_q4_crop_78.png')

client = vision.ImageAnnotatorClient()
buf = io.BytesIO()
box_crop.save(buf, format='PNG')
content = buf.getvalue()
vision_image = vision.Image(content=content)
response = client.document_text_detection(image=vision_image)
text = response.full_text_annotation.text if response.full_text_annotation else ""
print(f"78% crop text: {text!r}")

# test crop from 82%
split_x = int(W_px * 0.82)
box_crop2 = img.crop((split_x, 0, W_px, H_px))
box_crop2.save('/Users/sanat/AI_Education/vidyai/scratch/test_q4_crop_82.png')

buf = io.BytesIO()
box_crop2.save(buf, format='PNG')
content = buf.getvalue()
vision_image = vision.Image(content=content)
response = client.document_text_detection(image=vision_image)
text = response.full_text_annotation.text if response.full_text_annotation else ""
print(f"82% crop text: {text!r}")
